import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ImpulseCharts from "@/components/dashboard/ImpulseCharts";
import PosMetricsCharts from "@/components/dashboard/PosMetricsCharts";

export const metadata: Metadata = {
  title: "Estadísticas — Sistema Operativo",
};

import ExportDataButton from "@/components/dashboard/ExportDataButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, store_code")
    .eq("user_id", user?.id)
    .single();

  if (!profile) return <div>Cargando...</div>;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch Waste (Merma) (Límite rápido por rendimiento)
  const wastePromise = adminClient
    .from("waste_records")
    .select("*, products(name)")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(300); // Acortado a 300 para gráficos de 30 días según auditoría

  // 2. Fetch Impulse Records (Límite rápido)
  const impulsePromise = adminClient
    .from("impulse_records")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(30); // Acortado a 30 días

  // 3. Fetch POS Metrics (Límite rápido)
  const posPromise = adminClient
    .from("pos_metrics")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(30); // Acortado a 30 días

  // 4. Fetch Audits (Auditorías completadas)
  const auditsPromise = adminClient
    .from("audits")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("date", { ascending: false })
    .limit(30); // Acortado a 30 días

  // Ejecutar en paralelo (O(1) latency)
  const [
    { data: allWaste },
    { data: impulseRecords },
    { data: posMetrics }
  ] = await Promise.all([wastePromise, impulsePromise, posPromise]);

  let topProducts: any[] = [];
  let reasonData: any[] = [];
  let userWasteData: any[] = [];

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
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0a3875] tracking-tight">Estadísticas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
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
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Impulso y Ventas</h2>
          </div>
          <ImpulseCharts data={impulseRecords || []} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Merma (Prevención)</h2>
          </div>
          <DashboardCharts 
            topProducts={topProducts} 
            reasonData={reasonData} 
            userWasteData={userWasteData} 
          />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Productividad Caja</h2>
          </div>
          <PosMetricsCharts data={posMetrics || []} />
        </section>
      </div>
    </div>
  );
}
