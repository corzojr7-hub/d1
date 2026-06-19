import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Estadísticas — Sistema Operativo",
};

export default async function DashboardPage() {
  const { profile } = await requireAuth();

  if (!profile) return <div>Cargando...</div>;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Fetch Waste (Merma) (límite rápido por rendimiento)
  const wastePromise = adminClient
    .from("waste_records")
    .select("*, products(name)")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(300); // Acortado a 300 para gráficos de 30 días según auditoría

  // 2. Fetch Impulse Records (límite rápido)
  const impulsePromise = adminClient
    .from("impulse_records")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(30); // Acortado a 30 días

  // 3. Fetch POS Metrics (límite rápido)
  const posPromise = adminClient
    .from("pos_metrics")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(30); // Acortado a 30 días

  // 4. Fetch Sales (últimos meses para tendencia)
  const salesPromise = adminClient
    .from("daily_sales")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: true })
    .limit(365);

  // Ejecutar en paralelo (O(1) latency)
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

  if (allWaste) {
    const productCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    allWaste.forEach((item) => {
      const prodName = item.products?.name || "Desconocido";
      productCounts[prodName] = (productCounts[prodName] || 0) + Number(item.qty);

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
          <h1 className="text-2xl font-black tracking-tight text-[#0a3875]">Estadísticas</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Métricas y eficiencia de la tienda</p>
        </div>
        <ExportDataButton
          wasteData={allWaste || []}
          impulseData={impulseRecords || []}
          posData={posMetrics || []}
        />
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">Ventas</h2>
            <p className="mt-1 text-sm text-slate-500">Comportamiento por día, semana y mes.</p>
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
            <h2 className="text-lg font-bold text-slate-800">Merma (Prevención)</h2>
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
