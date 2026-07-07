import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";

export default async function AdminWastePage() {
  const supabase = await createClient();

  const thirtyDaysAgo = subDays(new Date(), 30);
  const thirtyDaysAgoDate = format(thirtyDaysAgo, "yyyy-MM-dd");
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const [{ data: weeklyWaste }, { data: wasteRecords }] = await Promise.all([
    supabase
      .from("weekly_waste")
      .select("store_code, waste_amount, week_start")
      .gte("week_start", thirtyDaysAgoDate),
    supabase
      .from("waste_records")
      .select("store_code, qty, reason, area, created_at, products(name)")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false }),
  ]);

  const costByStore: Record<string, number> = {};
  const wasteByProduct: Record<string, { name: string; qty: number; area: string }> = {};
  
  let totalCost = 0;

  if (weeklyWaste) {
    for (const entry of weeklyWaste) {
      const amount = Number(entry.waste_amount || 0);
      costByStore[entry.store_code] = (costByStore[entry.store_code] || 0) + amount;
      totalCost += amount;
    }
  }

  if (wasteRecords) {
    for (const record of wasteRecords) {
      const product = Array.isArray(record.products) ? record.products[0] : record.products;
      const productInfo = product as { name?: string | null } | null;
      const name = productInfo?.name || record.reason || "Desconocido";

      if (!wasteByProduct[name]) {
        wasteByProduct[name] = { name, qty: 0, area: record.area || "N/A" };
      }
      wasteByProduct[name].qty += Number(record.qty || 0);
    }
  }

  const topStores = Object.entries(costByStore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topProducts = Object.values(wasteByProduct)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-[#e51d2e] mb-6">Merma Global (Últimos 30 días)</h1>
      
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Costo Total de Merma Regional</p>
        <p className="text-4xl font-black text-slate-900 mt-2">${totalCost.toLocaleString()}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Top 10 Tiendas (Más Merma)</h2>
          <div className="space-y-4">
            {topStores.map(([store, cost]) => (
              <div key={store} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
                <span className="font-semibold text-slate-700">{store}</span>
                <span className="font-mono text-red-600 font-bold">${cost.toLocaleString()}</span>
              </div>
            ))}
            {topStores.length === 0 && <p className="text-sm text-slate-500">No hay datos</p>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Top 10 Productos Registrados</h2>
          <div className="space-y-4">
            {topProducts.map(p => (
              <div key={p.name} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm max-w-[200px] truncate">{p.name}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{p.area}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400">{p.qty} uds</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-slate-500">No hay datos</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
