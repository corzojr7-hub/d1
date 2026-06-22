import type { Metadata } from "next";
import Link from "next/link";
import { format, subDays, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { DailySale } from "@/lib/domain/types";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import AppSelect from "@/components/dashboard/AppSelect";
import ExportDataButton from "@/components/dashboard/ExportDataButton";
import ImpulseCharts from "@/components/dashboard/ImpulseCharts";
import PosAssistantFilter from "@/components/dashboard/PosAssistantFilter";
import PosMetricsImportButton from "@/components/dashboard/PosMetricsImportButton";
import PosMetricsCharts from "@/components/dashboard/PosMetricsCharts";
import SalesTrendsChart from "@/components/dashboard/SalesTrendsChart";
import { requireAuth } from "@/lib/supabase/require-auth";
import { savePosMetric } from "./actions";
import type { StoreAssistant } from "@/lib/domain/types";

type WasteRecordForDashboard = {
  qty: number;
  reason?: string | null;
  deposited_by?: string | null;
  created_at?: string;
  products?: { name?: string | null } | null;
};

type ImpulseRecordForDashboard = {
  assistant?: string | null;
  quantity: number;
  date: string;
};

type PosMetricForDashboard = {
  assistant?: string | null;
  productivity?: number | null;
  scan?: number | null;
  cancellations?: number | null;
  voids?: number | null;
  date: string;
};

type PosMetricRow = {
  assistant?: string | null;
  productivity?: number | null;
  scan?: number | null;
  cancellations?: number | null;
  voids?: number | null;
  date: string;
};

type TopProduct = { name: string; qty: number };
type ReasonData = { name: string; value: number };
const TEAM_OPTION = "__team__";

function getBogotaDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  return { year, month, day };
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getMetricDelta(current: number, previous: number) {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : 0;
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(`${date}T12:00:00`));
}

function getAssistantOptions(profile: {
  display_name?: string;
  supervisor_name?: string;
  second_in_charge?: string;
  third_in_charge?: string;
  assistants?: StoreAssistant[];
}) {
  const values = [
    profile.supervisor_name || profile.display_name || "",
    profile.second_in_charge || "",
    profile.third_in_charge || "",
    ...(profile.assistants || []).map((assistant) => assistant.name || ""),
  ];

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export const metadata: Metadata = {
  title: "Estadísticas - Sistema Operativo",
};

export default async function DashboardPage(props: {
  searchParams: Promise<{
    posStatus?: string;
    posMessage?: string;
    posDate?: string;
    posAssistant?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { profile } = await requireAuth();

  if (!profile) return <div>Cargando...</div>;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const wastePromise = adminClient
    .from("waste_records")
    .select("*, products(name)")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(300);

  const impulsePromise = adminClient
    .from("impulse_records")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(90);

  const posPromise = adminClient
    .from("pos_metrics")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(450);

  const salesPromise = adminClient
    .from("daily_sales")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: true })
    .limit(365);

  const [
    { data: allWaste },
    { data: impulseRecords },
    { data: rawPosMetrics },
    { data: dailySales },
  ] = (await Promise.all([wastePromise, impulsePromise, posPromise, salesPromise])) as [
    { data: WasteRecordForDashboard[] | null },
    { data: ImpulseRecordForDashboard[] | null },
    { data: PosMetricRow[] | null },
    { data: DailySale[] | null },
  ];

  const posMetrics: PosMetricForDashboard[] = (rawPosMetrics || []).map((item) => ({
    assistant: item.assistant,
    productivity: item.productivity,
    scan: Number(item.scan ?? item.cancellations ?? 0),
    cancellations: Number(item.scan != null ? item.cancellations || 0 : 0),
    voids: Number(item.voids || 0),
    date: item.date,
  }));

  let topProducts: TopProduct[] = [];
  let reasonData: ReasonData[] = [];
  let userWasteData: ReasonData[] = [];
  const assistantOptions = getAssistantOptions(profile);

  const bogotaToday = getBogotaDateParts();
  const currentMonthPrefix = `${bogotaToday.year}-${String(bogotaToday.month).padStart(2, "0")}`;
  const todayKey = `${currentMonthPrefix}-${String(bogotaToday.day).padStart(2, "0")}`;
  const previousMonthDate = subMonths(new Date(`${currentMonthPrefix}-01T00:00:00`), 1);
  const previousMonthPrefix = format(previousMonthDate, "yyyy-MM");
  const previousYearMonthPrefix = format(
    subYears(new Date(`${currentMonthPrefix}-01T00:00:00`), 1),
    "yyyy-MM",
  );
  const yesterdayKey = format(subDays(new Date(`${todayKey}T12:00:00`), 1), "yyyy-MM-dd");
  const previousMonthSameDayKey = format(
    subMonths(new Date(`${todayKey}T12:00:00`), 1),
    "yyyy-MM-dd",
  );

  const currentMonthSales = (dailySales || []).filter((sale) => sale.date.startsWith(currentMonthPrefix));
  const previousMonthSales = (dailySales || []).filter((sale) => sale.date.startsWith(previousMonthPrefix));

  const salesByDayCurrent = new Map<number, number>();
  currentMonthSales.forEach((sale) => {
    const day = Number(sale.date.slice(8, 10));
    salesByDayCurrent.set(day, (salesByDayCurrent.get(day) || 0) + Number(sale.amount || 0));
  });

  const salesByDayPrevious = new Map<number, number>();
  previousMonthSales.forEach((sale) => {
    const day = Number(sale.date.slice(8, 10));
    salesByDayPrevious.set(day, (salesByDayPrevious.get(day) || 0) + Number(sale.amount || 0));
  });

  const currentSalesMtd = Array.from(salesByDayCurrent.entries())
    .filter(([day]) => day <= bogotaToday.day)
    .reduce((sum, [, amount]) => sum + amount, 0);
  const previousSalesMtd = Array.from(salesByDayPrevious.entries())
    .filter(([day]) => day <= bogotaToday.day)
    .reduce((sum, [, amount]) => sum + amount, 0);
  const currentSalesExactDay = salesByDayCurrent.get(bogotaToday.day) || 0;
  const previousSalesExactDay = salesByDayPrevious.get(bogotaToday.day) || 0;
  const salesDeltaPercent =
    previousSalesMtd > 0
      ? ((currentSalesMtd - previousSalesMtd) / previousSalesMtd) * 100
      : currentSalesMtd > 0
        ? 100
        : 0;

  const impulseCurrentMtd = (impulseRecords || [])
    .filter((item) => item.date.startsWith(currentMonthPrefix))
    .filter((item) => Number(item.date.slice(8, 10)) <= bogotaToday.day)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const impulsePreviousMtd = (impulseRecords || [])
    .filter((item) => item.date.startsWith(previousMonthPrefix))
    .filter((item) => Number(item.date.slice(8, 10)) <= bogotaToday.day)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const impulseDeltaPercent =
    impulsePreviousMtd > 0
      ? ((impulseCurrentMtd - impulsePreviousMtd) / impulsePreviousMtd) * 100
      : impulseCurrentMtd > 0
        ? 100
        : 0;

  const wasteCurrentMtd = (allWaste || [])
    .filter((item) => (item.created_at || "").slice(0, 7) === currentMonthPrefix)
    .filter((item) => Number((item.created_at || "").slice(8, 10)) <= bogotaToday.day)
    .reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const wastePreviousMtd = (allWaste || [])
    .filter((item) => (item.created_at || "").slice(0, 7) === previousMonthPrefix)
    .filter((item) => Number((item.created_at || "").slice(8, 10)) <= bogotaToday.day)
    .reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const wasteDeltaPercent =
    wastePreviousMtd > 0
      ? ((wasteCurrentMtd - wastePreviousMtd) / wastePreviousMtd) * 100
      : wasteCurrentMtd > 0
        ? 100
        : 0;

  const selectedAssistant =
    (searchParams.posAssistant || "").trim() ||
    assistantOptions[0] ||
    profile.supervisor_name ||
    profile.display_name;

  const isTeamView = selectedAssistant === TEAM_OPTION;
  const selectedAssistantLabel = isTeamView ? "Equipo general" : selectedAssistant;
  const selectedAssistantMetrics = isTeamView
    ? posMetrics
    : posMetrics.filter((item) => (item.assistant || "").trim() === selectedAssistant);
  const posFormAssistantDefault =
    !isTeamView && selectedAssistant ? selectedAssistant : assistantOptions[0] || "";

  const posDailyStats = new Map<
    string,
    {
      count: number;
      productivitySum: number;
      scanSum: number;
      cancellationsSum: number;
      voidsSum: number;
    }
  >();
  selectedAssistantMetrics.forEach((item) => {
    const existing = posDailyStats.get(item.date) || {
      count: 0,
      productivitySum: 0,
      scanSum: 0,
      cancellationsSum: 0,
      voidsSum: 0,
    };
    existing.count += 1;
    existing.productivitySum += Number(item.productivity || 0);
    existing.scanSum += Number(item.scan || 0);
    existing.cancellationsSum += Number(item.cancellations || 0);
    existing.voidsSum += Number(item.voids || 0);
    posDailyStats.set(item.date, existing);
  });

  const posDailyMetrics = Array.from(posDailyStats.entries())
    .map(([date, stats]) => ({
      date,
      day: Number(date.slice(8, 10)),
      productivity: stats.count > 0 ? stats.productivitySum / stats.count : 0,
      scan: stats.count > 0 ? stats.scanSum / stats.count : 0,
      cancellations: stats.cancellationsSum,
      voids: stats.voidsSum,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const getDailyPosMetric = (date: string) =>
    posDailyMetrics.find((item) => item.date === date) || {
      date,
      day: 0,
      productivity: 0,
      scan: 0,
      cancellations: 0,
      voids: 0,
    };

  const averagePosMetric = (
    items: Array<{ productivity: number; scan: number }>,
    key: "productivity" | "scan",
  ) => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item[key], 0) / items.length;
  };

  const sumPosMetric = (
    items: Array<{ cancellations: number; voids: number }>,
    key: "cancellations" | "voids",
  ) => items.reduce((sum, item) => sum + item[key], 0);

  const posCurrentMtd = posDailyMetrics.filter(
    (item) => item.date.startsWith(currentMonthPrefix) && item.day <= bogotaToday.day,
  );
  const posPreviousMtd = posDailyMetrics.filter(
    (item) => item.date.startsWith(previousMonthPrefix) && item.day <= bogotaToday.day,
  );
  const posPreviousYearMtd = posDailyMetrics.filter(
    (item) => item.date.startsWith(previousYearMonthPrefix) && item.day <= bogotaToday.day,
  );
  const posToday = getDailyPosMetric(todayKey);
  const posYesterday = getDailyPosMetric(yesterdayKey);
  const posPreviousMonthSameDay = getDailyPosMetric(previousMonthSameDayKey);
  const posCurrentMtdProductivity = averagePosMetric(posCurrentMtd, "productivity");
  const posPreviousMtdProductivity = averagePosMetric(posPreviousMtd, "productivity");
  const posCurrentMtdScan = averagePosMetric(posCurrentMtd, "scan");
  const posPreviousMtdScan = averagePosMetric(posPreviousMtd, "scan");
  const posPreviousYearMtdProductivity = averagePosMetric(posPreviousYearMtd, "productivity");
  const posPreviousYearMtdScan = averagePosMetric(posPreviousYearMtd, "scan");
  const posCurrentMtdCancellations = sumPosMetric(posCurrentMtd, "cancellations");
  const posPreviousMtdCancellations = sumPosMetric(posPreviousMtd, "cancellations");
  const posCurrentMtdVoids = sumPosMetric(posCurrentMtd, "voids");
  const posPreviousMtdVoids = sumPosMetric(posPreviousMtd, "voids");
  const posPreviousYearMtdCancellations = sumPosMetric(posPreviousYearMtd, "cancellations");
  const posPreviousYearMtdVoids = sumPosMetric(posPreviousYearMtd, "voids");
  const posStatus = searchParams.posStatus;
  const posMessage = searchParams.posMessage;
  const posDate = searchParams.posDate || todayKey;
  const posFormDefaults = getDailyPosMetric(posDate);

  if (allWaste) {
    const productCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    allWaste.forEach((item) => {
      const productName = item.products?.name || "Desconocido";
      productCounts[productName] = (productCounts[productName] || 0) + Number(item.qty);

      const reason = item.reason || "Otro";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + Number(item.qty);

      const user = item.deposited_by || "Desconocido";
      userCounts[user] = (userCounts[user] || 0) + Number(item.qty);
    });

    topProducts = Object.entries(productCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    reasonData = Object.entries(reasonCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    userWasteData = Object.entries(userCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8">
      <Link
        href="/"
        className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Volver
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0a3875]">Estadísticas</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Métricas y eficiencia de la tienda
          </p>
        </div>
        <ExportDataButton
          wasteData={allWaste || []}
          impulseData={impulseRecords || []}
          posData={posMetrics || []}
        />
      </div>

      <div className="space-y-8">
        <section
          data-pdf-section="life-for-life"
          className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
              Life for Life
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Comparativo del día {bogotaToday.day} vs {previousMonthPrefix}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Corte acumulado del mes actual frente al mismo punto del mes anterior.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-fit">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Mes actual
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {format(new Date(`${currentMonthPrefix}-01T12:00:00`), "MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">
                  Punto de corte
                </p>
                <p className="mt-1 text-lg font-black text-blue-900">
                  Día {bogotaToday.day}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Ventas MTD
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCop(currentSalesMtd)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Antes: {formatCop(previousSalesMtd)}</p>
              <p
                className={`mt-2 text-[11px] font-bold ${
                  salesDeltaPercent >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {salesDeltaPercent >= 0 ? "+" : ""}
                {salesDeltaPercent.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Impulso MTD
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{impulseCurrentMtd}</p>
              <p className="mt-1 text-[11px] text-slate-500">Antes: {impulsePreviousMtd}</p>
              <p
                className={`mt-2 text-[11px] font-bold ${
                  impulseDeltaPercent >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {impulseDeltaPercent >= 0 ? "+" : ""}
                {impulseDeltaPercent.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Merma MTD
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{wasteCurrentMtd} uds</p>
              <p className="mt-1 text-[11px] text-slate-500">Antes: {wastePreviousMtd} uds</p>
              <p
                className={`mt-2 text-[11px] font-bold ${
                  wasteDeltaPercent <= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {wasteDeltaPercent >= 0 ? "+" : ""}
                {wasteDeltaPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-[12px] text-blue-900">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">
              Día comparable
            </p>
            <p className="mt-2 text-sm">
              Venta del día {bogotaToday.day}: <span className="font-black">{formatCop(currentSalesExactDay)}</span>
              {" "}vs{" "}
              <span className="font-black">{formatCop(previousSalesExactDay)}</span> en el mismo día
              del mes anterior.
            </p>
          </div>
        </section>

        <section data-pdf-section="ventas">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">Ventas</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Comportamiento comercial</h2>
            <p className="mt-1 text-sm text-slate-500">Lectura por día, semana y mes con el mismo corte del tablero.</p>
          </div>
          <SalesTrendsChart data={dailySales || []} />
        </section>

        <section data-pdf-section="impulso">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">Impulso</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Movimiento por colaborador</h2>
            <p className="mt-1 text-sm text-slate-500">Evolución diaria y participación del equipo en piso.</p>
          </div>
          <ImpulseCharts data={impulseRecords || []} />
        </section>

        <section data-pdf-section="merma">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">Merma</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Prevención y trazabilidad</h2>
            <p className="mt-1 text-sm text-slate-500">Productos críticos, motivos más frecuentes y registradores con más casos.</p>
          </div>
          <DashboardCharts topProducts={topProducts} reasonData={reasonData} userWasteData={userWasteData} />
        </section>

        <section
          data-pdf-section="productividad-pos"
          className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm sm:p-5 lg:p-6"
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
                Productividad POS
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Rendimiento por asistente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seguimiento diario de productividad, escaneo y novedades de caja.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600">
                {selectedAssistantLabel}
              </span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                Corte {formatDayLabel(posDate)}
              </span>
            </div>
          </div>

          {posStatus && posMessage ? (
            <div
              className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                posStatus === "success"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-red-50 text-red-700 ring-1 ring-red-100"
              }`}
            >
              {posMessage}
            </div>
          ) : null}

          <div className="mb-4 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <PosAssistantFilter
                assistantOptions={assistantOptions}
                selectedAssistant={selectedAssistant}
                posDate={posDate}
              />
            </div>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <form action={savePosMetric} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
                    Carga diaria
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Registrar productividad POS</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Meta artículos/min: 30. Meta escaneo: 15 o más.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                  {formatDayLabel(posDate)}
                </div>
              </div>

              {profile.role === "supervisor" || profile.role === "admin" ? (
                <div className="mt-4 flex justify-end">
                  <PosMetricsImportButton date={posDate} assistantOptions={assistantOptions} />
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <input name="date" type="hidden" value={posDate} />

                <div className="rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-700">
                    Meta sugerida
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">30 artículos/min</p>
                  <p className="mt-1 text-xs text-slate-500">Escaneo ideal: 15 o más</p>
                </div>

                <AppSelect
                  label="Colaborador"
                  name="assistant"
                  defaultValue={posFormAssistantDefault}
                  options={assistantOptions.map((assistant) => ({
                    value: assistant,
                    label: assistant,
                  }))}
                />

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Artículos por minuto
                  </span>
                  <input
                    name="productivity"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={posFormDefaults.productivity ? posFormDefaults.productivity.toFixed(1) : ""}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Escaneo
                  </span>
                  <input
                    name="scan"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={posFormDefaults.scan ? posFormDefaults.scan.toFixed(1) : ""}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Cancelaciones
                  </span>
                  <input
                    name="cancellations"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={posFormDefaults.cancellations || ""}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Anulaciones
                  </span>
                  <input
                    name="voids"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={posFormDefaults.voids || ""}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white"
                  />
                </label>
              </div>

              <button type="submit" className="app-cta-primary mt-5 w-full justify-center text-sm font-bold">
                Guardar productividad POS
              </button>
            </form>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Hoy vs ayer
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-bold text-violet-700">Artículos/min</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.productivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {formatMetric(posYesterday.productivity)} · {getMetricDelta(posToday.productivity, posYesterday.productivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.scan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {formatMetric(posYesterday.scan)} · {getMetricDelta(posToday.scan, posYesterday.scan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.cancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {posYesterday.cancellations} · {getMetricDelta(posToday.cancellations, posYesterday.cancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.voids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {posYesterday.voids} · {getMetricDelta(posToday.voids, posYesterday.voids).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Hoy vs hace un mes
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-bold text-violet-700">Artículos/min</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.productivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMonthSameDay.productivity)} · {getMetricDelta(posToday.productivity, posPreviousMonthSameDay.productivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.scan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMonthSameDay.scan)} · {getMetricDelta(posToday.scan, posPreviousMonthSameDay.scan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.cancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMonthSameDay.cancellations} · {getMetricDelta(posToday.cancellations, posPreviousMonthSameDay.cancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.voids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMonthSameDay.voids} · {getMetricDelta(posToday.voids, posPreviousMonthSameDay.voids).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Mes actual vs mes pasado
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-bold text-violet-700">Artículos/min promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdProductivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMtdProductivity)} · {getMetricDelta(posCurrentMtdProductivity, posPreviousMtdProductivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdScan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMtdScan)} · {getMetricDelta(posCurrentMtdScan, posPreviousMtdScan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdCancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMtdCancellations} · {getMetricDelta(posCurrentMtdCancellations, posPreviousMtdCancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdVoids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMtdVoids} · {getMetricDelta(posCurrentMtdVoids, posPreviousMtdVoids).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Mes actual vs mismo mes año anterior
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-bold text-violet-700">Artículos/min promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdProductivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousYearMtdProductivity)} · {getMetricDelta(posCurrentMtdProductivity, posPreviousYearMtdProductivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdScan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousYearMtdScan)} · {getMetricDelta(posCurrentMtdScan, posPreviousYearMtdScan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdCancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousYearMtdCancellations} · {getMetricDelta(posCurrentMtdCancellations, posPreviousYearMtdCancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdVoids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousYearMtdVoids} · {getMetricDelta(posCurrentMtdVoids, posPreviousYearMtdVoids).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <PosMetricsCharts data={selectedAssistantMetrics || []} />
        </section>
      </div>
    </div>
  );
}
