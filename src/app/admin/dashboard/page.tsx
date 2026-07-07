import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth } from "date-fns";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const start = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: sales } = await supabase
    .from("daily_sales")
    .select("store_code, amount, date")
    .gte("date", start);

  let totalSales = 0;

  const salesByStore: Record<string, number> = {};

  if (sales) {
    for (const sale of sales) {
      const amount = Number(sale.amount || 0);
      totalSales += amount;
      salesByStore[sale.store_code] = (salesByStore[sale.store_code] || 0) + amount;
    }
  }

  const storesData = Object.entries(salesByStore)
    .map(([store, amount]) => ({ store, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-[#e51d2e] mb-6">KPIs Globales (Mes Actual)</h1>
      
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Venta Global Mes</p>
          <p className="text-4xl font-black text-slate-900 mt-2">${totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Tiendas con Venta</p>
          <p className="text-4xl font-black text-slate-900 mt-2">{storesData.length}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Ranking Ventas</h2>
        <div className="space-y-4">
          {storesData.map(s => (
            <div key={s.store} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
              <span className="font-bold text-slate-800">{s.store}</span>
              <div className="text-right">
                <p className="font-mono text-slate-900 font-black">${s.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          ))}
          {storesData.length === 0 && <p className="text-sm text-slate-500">No hay datos</p>}
        </div>
      </div>
    </div>
  );
}
