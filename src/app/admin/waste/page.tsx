import { createClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";

export default async function AdminWastePage() {
  const supabase = await createClient();

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  // Fetch all waste globally in last 30 days
  const { data: wasteEvents } = await supabase
    .from("waste_events")
    .select(`
      id,
      store_code,
      reason,
      status,
      created_at,
      waste_products (
        product_id,
        quantity,
        cost,
        products (
          name,
          quadrant
        )
      )
    `)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false });

  // Agrupar por tienda
  const costByStore: Record<string, number> = {};
  // Agrupar por producto
  const wasteByProduct: Record<string, { name: string; qty: number; cost: number; quadrant: string }> = {};
  
  let totalCost = 0;

  if (wasteEvents) {
    for (const event of wasteEvents) {
      if (!costByStore[event.store_code]) costByStore[event.store_code] = 0;
      
      let eventCost = 0;
      if (event.waste_products) {
        for (const wp of event.waste_products) {
          const wpcost = (wp.cost || 0) * wp.quantity;
          eventCost += wpcost;
          
          const prod = Array.isArray(wp.products) ? wp.products[0] : wp.products;
          const productInfo = prod as { name?: string | null; quadrant?: string | null } | null;
          const pName = productInfo?.name || "Desconocido";
          const pQuad = productInfo?.quadrant || "N/A";
          
          if (!wasteByProduct[pName]) {
            wasteByProduct[pName] = { name: pName, qty: 0, cost: 0, quadrant: pQuad };
          }
          wasteByProduct[pName].qty += wp.quantity;
          wasteByProduct[pName].cost += wpcost;
        }
      }
      costByStore[event.store_code] += eventCost;
      totalCost += eventCost;
    }
  }

  const topStores = Object.entries(costByStore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topProducts = Object.values(wasteByProduct)
    .sort((a, b) => b.cost - a.cost)
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
          <h2 className="mb-4 text-lg font-bold text-slate-800">Top 10 Productos Destruidos</h2>
          <div className="space-y-4">
            {topProducts.map(p => (
              <div key={p.name} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm max-w-[200px] truncate">{p.name}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{p.quadrant}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-red-600 font-bold">${p.cost.toLocaleString()}</p>
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
