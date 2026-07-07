import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DailySale } from "@/lib/domain/types";
import AppSelect from "@/components/dashboard/AppSelect";
import PosAssistantFilter from "@/components/dashboard/PosAssistantFilter";
import { requireAuth } from "@/lib/supabase/require-auth";
import { savePosMetric } from "./actions";
import type { StoreAssistant } from "@/lib/domain/types";

const ExportDataButton = dynamic(() => import("@/components/dashboard/ExportDataButton"), {
  loading: () => <InlineControlSkeleton />,
});
const PosMetricsImportButton = dynamic(() => import("@/components/dashboard/PosMetricsImportButton"), {
  loading: () => <InlineControlSkeleton />,
});
const PosMetricsCharts = dynamic(() => import("@/components/dashboard/PosMetricsCharts"), {
  loading: () => <ChartGridSkeleton />,
});
const SalesTrendsChart = dynamic(() => import("@/components/dashboard/SalesTrendsChart"), {
  loading: () => <ChartSkeleton />,
});

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

type WasteRowForDashboard = {
  created_at?: string | null;
  qty?: number | null;
  reason?: string | null;
  deposited_by?: string | null;
  area?: string | null;
  status?: string | null;
  products?: { name?: string | null } | null;
};

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

function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mb-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="h-4 w-40 rounded-full bg-slate-100" />
        <div className="mt-3 h-9 w-56 rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
      </div>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ChartSkeleton />
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 rounded-[24px] border border-slate-200/80 bg-white shadow-sm" />
          ))}
        </div>
      </section>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="h-4 w-36 rounded-full bg-slate-100" />
      <div className="mt-3 h-6 w-56 rounded-2xl bg-slate-100" />
      <div className="mt-5 h-64 rounded-2xl bg-slate-50" />
    </div>
  );
}

function ChartGridSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <ChartSkeleton key={item} />
      ))}
    </div>
  );
}

function InlineControlSkeleton() {
  return <div className="h-10 w-32 rounded-2xl bg-slate-100" />;
}

export const metadata: Metadata = {
  title: "Indicadores Comerciales - Sistema Operativo",
};

export default function DashboardPage(props: {
  searchParams: Promise<{
    posStatus?: string;
    posMessage?: string;
    posDate?: string;
    posAssistant?: string;
  }>;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent {...props} />
    </Suspense>
  );
}

async function DashboardContent(props: {
  searchParams: Promise<{
    posStatus?: string;
    posMessage?: string;
    posDate?: string;
    posAssistant?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { profile } = await requireAuth();
  const supabase = await createClient();

  if (!profile) return <div>Cargando...</div>;

  const impulsePromise = supabase
    .from("impulse_records")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(90);

  const posPromise = supabase
    .from("pos_metrics")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(450);

  const salesPromise = supabase
    .from("daily_sales")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: true })
    .limit(365);

  const wastePromise = supabase
    .from("waste_records")
    .select("created_at, qty, reason, deposited_by, area, status, products(name)")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(365);

  const [
    { data: impulseRecords },
    { data: rawPosMetrics },
    { data: dailySales },
    { data: allWaste },
  ] = (await Promise.all([impulsePromise, posPromise, salesPromise, wastePromise])) as [
    { data: ImpulseRecordForDashboard[] | null },
    { data: PosMetricRow[] | null },
    { data: DailySale[] | null },
    { data: WasteRowForDashboard[] | null },
  ];

  const posMetrics: PosMetricForDashboard[] = (rawPosMetrics || []).map((item) => ({
    assistant: item.assistant,
    productivity: item.productivity,
    scan: Number(item.scan ?? item.cancellations ?? 0),
    cancellations: Number(item.scan != null ? item.cancellations || 0 : 0),
    voids: Number(item.voids || 0),
    date: item.date,
  }));

  const assistantOptions = getAssistantOptions(profile);

  const bogotaToday = getBogotaDateParts();
  const currentMonthPrefix = `${bogotaToday.year}-${String(bogotaToday.month).padStart(2, "0")}`;
  const todayKey = `${currentMonthPrefix}-${String(bogotaToday.day).padStart(2, "0")}`;
  const previousMonthDate = subMonths(new Date(`${currentMonthPrefix}-01T00:00:00`), 1);
  const previousMonthPrefix = format(previousMonthDate, "yyyy-MM");
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
  const daysInCurrentMonth = new Date(bogotaToday.year, bogotaToday.month, 0).getDate();
  const averageDailySale = bogotaToday.day > 0 ? currentSalesMtd / bogotaToday.day : 0;
  const forecastedTotal = averageDailySale * daysInCurrentMonth;
  const salesDeltaPercent =
    previousSalesMtd > 0
      ? ((currentSalesMtd - previousSalesMtd) / previousSalesMtd) * 100
      : currentSalesMtd > 0
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

  const wasteExportData = (allWaste || []).map((item) => ({
    created_at: item.created_at || undefined,
    qty: item.qty || 0,
    reason: item.reason || undefined,
    deposited_by: item.deposited_by || undefined,
    area: item.area || undefined,
    status: item.status || undefined,
    products: item.products?.name ? { name: item.products.name } : undefined,
  }));

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
  const posToday = getDailyPosMetric(todayKey);
  const posYesterday = getDailyPosMetric(yesterdayKey);
  const posPreviousMonthSameDay = getDailyPosMetric(previousMonthSameDayKey);
  const posCurrentMtdProductivity = averagePosMetric(posCurrentMtd, "productivity");
  const posPreviousMtdProductivity = averagePosMetric(posPreviousMtd, "productivity");
  const posCurrentMtdScan = averagePosMetric(posCurrentMtd, "scan");
  const posPreviousMtdScan = averagePosMetric(posPreviousMtd, "scan");
  const posCurrentMtdCancellations = sumPosMetric(posCurrentMtd, "cancellations");
  const posPreviousMtdCancellations = sumPosMetric(posPreviousMtd, "cancellations");
  const posCurrentMtdVoids = sumPosMetric(posCurrentMtd, "voids");
  const posPreviousMtdVoids = sumPosMetric(posPreviousMtd, "voids");
  const posStatus = searchParams.posStatus;
  const posMessage = searchParams.posMessage;
  const posDate = searchParams.posDate || todayKey;
  const posFormDefaults = getDailyPosMetric(posDate);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
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

      <div className="mb-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">Lectura comercial</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0a3875] sm:text-[2rem]">Indicadores</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Lectura de ventas, merma, impulso y productividad para revisar el pulso comercial real de la tienda.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Tienda</p>
              <p className="mt-1 text-sm font-black text-slate-900">{profile.store_name || profile.store_code}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-500">Corte de hoy</p>
              <p className="mt-1 text-sm font-black text-blue-900">{formatDayLabel(todayKey)}</p>
            </div>
            <div className="sm:self-end">
              <ExportDataButton
                wasteData={wasteExportData}
                impulseData={impulseRecords || []}
                posData={posMetrics || []}
              />
            </div>
          </div>
        </div>
      </div>

      <section className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Lectura ejecutiva
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Tendencia comercial de la tienda
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                La primera mirada para entender ventas, impulso y productividad sin entrar todavía al detalle operativo.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
              Primero mira la tendencia. Luego baja al detalle.
            </div>
          </div>

          <div className="mt-5">
            <SalesTrendsChart data={dailySales || []} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Qué revisar primero
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-900">
              Atajos ejecutivos
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Abre el frente que necesites sin perder la lectura general de la tienda.
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href="#ventas-merma"
                className="group rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Ventas y merma
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">{formatCop(currentSalesMtd)}</p>
                    <p
                      className={`mt-1 text-[11px] font-bold ${
                        salesDeltaPercent >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {salesDeltaPercent >= 0 ? "+" : ""}
                      {salesDeltaPercent.toFixed(1)}% vs mes anterior
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
                </div>
              </Link>

              <Link
                href="#productividad-pos"
                className="group rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Productividad POS
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatMetric(posToday.productivity)} · {formatMetric(posToday.scan)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Hoy, artículos por minuto y escaneo.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-rose-500" />
                </div>
              </Link>

              <Link
                href="/sales"
                className="group rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Ventas operativas
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">Registro y presupuesto</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Entra al dato diario sin mezclarlo con la lectura ejecutiva.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-500" />
                </div>
              </Link>

              <Link
                href="/impulses"
                className="group rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Impulso comercial
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {impulseRecords?.length || 0} registros
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Revisa quién movió más unidades esta semana.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-amber-500" />
                </div>
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <div className="space-y-6 xl:space-y-8">
        <section
          id="ventas-merma"
          data-pdf-section="life-for-life"
          className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-5 lg:p-6"
        >
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
                Life for Life
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Comparativo del dia {bogotaToday.day} vs {previousMonthPrefix}
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
                  Dia {bogotaToday.day}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
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

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Venta promedio diaria
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCop(averageDailySale)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Proyeccion: {formatCop(forecastedTotal)}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Productividad POS
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatMetric(posToday.productivity)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Escaneo hoy: {formatMetric(posToday.scan)}</p>
            </div>
          </div>

        </section>

        <section
          id="productividad-pos"
          data-pdf-section="productividad-pos"
          className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-4 lg:p-5 xl:p-6"
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
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

          <div className="mb-4 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <PosAssistantFilter
                assistantOptions={assistantOptions}
                selectedAssistant={selectedAssistant}
                posDate={posDate}
              />
            </div>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(340px,390px)_minmax(0,1fr)]">
            <form action={savePosMetric} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
                    Carga diaria
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Registrar productividad POS</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Meta articulos/min: 30. Meta escaneo: 15 o mas.
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
                  <p className="mt-2 text-sm font-bold text-slate-800">30 articulos/min</p>
                  <p className="mt-1 text-xs text-slate-500">Escaneo ideal: 15 o mas</p>
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
                    Articulos por minuto
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

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Hoy vs ayer
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-violet-50 p-3">
                    <p className="text-xs font-bold text-violet-700">Articulos/min</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.productivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {formatMetric(posYesterday.productivity)} | {getMetricDelta(posToday.productivity, posYesterday.productivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.scan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {formatMetric(posYesterday.scan)} | {getMetricDelta(posToday.scan, posYesterday.scan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.cancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {posYesterday.cancellations} | {getMetricDelta(posToday.cancellations, posYesterday.cancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.voids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayer: {posYesterday.voids} | {getMetricDelta(posToday.voids, posYesterday.voids).toFixed(1)}%
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
                    <p className="text-xs font-bold text-violet-700">Articulos/min</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.productivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMonthSameDay.productivity)} | {getMetricDelta(posToday.productivity, posPreviousMonthSameDay.productivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posToday.scan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMonthSameDay.scan)} | {getMetricDelta(posToday.scan, posPreviousMonthSameDay.scan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.cancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMonthSameDay.cancellations} | {getMetricDelta(posToday.cancellations, posPreviousMonthSameDay.cancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posToday.voids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMonthSameDay.voids} | {getMetricDelta(posToday.voids, posPreviousMonthSameDay.voids).toFixed(1)}%
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
                    <p className="text-xs font-bold text-violet-700">Articulos/min promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdProductivity)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMtdProductivity)} | {getMetricDelta(posCurrentMtdProductivity, posPreviousMtdProductivity).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-700">Escaneo promedio</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatMetric(posCurrentMtdScan)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {formatMetric(posPreviousMtdScan)} | {getMetricDelta(posCurrentMtdScan, posPreviousMtdScan).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">Cancelaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdCancellations}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMtdCancellations} | {getMetricDelta(posCurrentMtdCancellations, posPreviousMtdCancellations).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Anulaciones</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{posCurrentMtdVoids}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Antes: {posPreviousMtdVoids} | {getMetricDelta(posCurrentMtdVoids, posPreviousMtdVoids).toFixed(1)}%
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

