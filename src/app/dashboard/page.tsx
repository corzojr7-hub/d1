import type { Metadata } from "next";
import Link from "next/link";
import { format, subMonths } from "date-fns";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { DailySale } from "@/lib/domain/types";
import { requireAuth } from "@/lib/supabase/require-auth";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ImpulseCharts from "@/components/dashboard/ImpulseCharts";
import PosMetricsCharts from "@/components/dashboard/PosMetricsCharts";
import SalesTrendsChart from "@/components/dashboard/SalesTrendsChart";
import ExportDataButton from "@/components/dashboard/ExportDataButton";

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
  cancellations?: number | null;
  voids?: number | null;
  date: string;
};

type TopProduct = { name: string; qty: number };
type ReasonData = { name: string; value: number };

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

export const metadata: Metadata = {
  title: "Estadisticas - Sistema Operativo",
};

export default async function DashboardPage() {
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
    .limit(30);

  const salesPromise = adminClient
    .from("daily_sales")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: true })
    .limit(365);

  const [
    { data: allWaste },
    { data: impulseRecords },
    { data: posMetrics },
    { data: dailySales },
  ] = (await Promise.all([wastePromise, impulsePromise, posPromise, salesPromise])) as [
    { data: WasteRecordForDashboard[] | null },
    { data: ImpulseRecordForDashboard[] | null },
    { data: PosMetricForDashboard[] | null },
    { data: DailySale[] | null },
  ];

  let topProducts: TopProduct[] = [];
  let reasonData: ReasonData[] = [];
  let userWasteData: ReasonData[] = [];

  const bogotaToday = getBogotaDateParts();
  const currentMonthPrefix = `${bogotaToday.year}-${String(bogotaToday.month).padStart(2, "0")}`;
  const previousMonthDate = subMonths(new Date(`${currentMonthPrefix}-01T00:00:00`), 1);
  const previousMonthPrefix = format(previousMonthDate, "yyyy-MM");

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
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-24 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8">
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
          <h1 className="text-2xl font-black tracking-tight text-[#0a3875]">Estadisticas</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Metricas y eficiencia de la tienda
          </p>
        </div>
        <ExportDataButton
          wasteData={allWaste || []}
          impulseData={impulseRecords || []}
          posData={posMetrics || []}
        />
      </div>

      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Life for Life
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              Comparativo del dia {bogotaToday.day} vs {previousMonthPrefix}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Corte acumulado del mes actual frente al mismo punto del mes anterior.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
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

            <div className="rounded-2xl bg-slate-50 p-4">
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

            <div className="rounded-2xl bg-slate-50 p-4">
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

          <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-[12px] text-blue-800">
            Venta del dia {bogotaToday.day}: <span className="font-black">{formatCop(currentSalesExactDay)}</span>
            {" "}vs{" "}
            <span className="font-black">{formatCop(previousSalesExactDay)}</span> en el mismo dia
            del mes anterior.
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">Ventas</h2>
            <p className="mt-1 text-sm text-slate-500">Comportamiento por dia, semana y mes.</p>
          </div>
          <SalesTrendsChart data={dailySales || []} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Impulso</h2>
          </div>
          <ImpulseCharts data={impulseRecords || []} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Merma (Prevencion)</h2>
          </div>
          <DashboardCharts topProducts={topProducts} reasonData={reasonData} userWasteData={userWasteData} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Productividad Caja</h2>
          </div>
          <PosMetricsCharts data={posMetrics || []} />
        </section>
      </div>
    </div>
  );
}
