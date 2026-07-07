import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const start = startOfMonth(new Date()).toISOString();
  const end = endOfMonth(new Date()).toISOString();

  // Fetch sales globally to calculate conversion and average ticket
  const { data: sales } = await supabase
    .from("daily_sales")
    .select("store_code, actual_sales, customer_count, impulse_sales, date")
    .gte("date", start)
    .lte("date", end);

  let totalSales = 0;
  let totalCustomers = 0;
  let totalImpulse = 0;

  const kpisByStore: Record<string, { sales: number; customers: number; impulse: number }> = {};

  if (sales) {
    for (const sale of sales) {
      totalSales += sale.actual_sales;
      totalCustomers += sale.customer_count;
      totalImpulse += (sale.impulse_sales || 0);

      if (!kpisByStore[sale.store_code]) {
        kpisByStore[sale.store_code] = { sales: 0, customers: 0, impulse: 0 };
      }
      kpisByStore[sale.store_code].sales += sale.actual_sales;
      kpisByStore[sale.store_code].customers += sale.customer_count;
      kpisByStore[sale.store_code].impulse += (sale.impulse_sales || 0);
    }
  }

  const globalTicket = totalCustomers > 0 ? totalSales / totalCustomers : 0;
  const globalImpulsePercentage = totalSales > 0 ? (totalImpulse / totalSales) * 100 : 0;

  const storesData = Object.entries(kpisByStore).map(([store, data]) => {
    const ticket = data.customers > 0 ? data.sales / data.customers : 0;
    const impulsePct = data.sales > 0 ? (data.impulse / data.sales) * 100 : 0;
    return { store, ticket, impulsePct };
  }).sort((a, b) => b.ticket - a.ticket);

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-[#e51d2e] mb-6">KPIs Globales (Mes Actual)</h1>
      
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Ticket Promedio Global</p>
          <p className="text-4xl font-black text-slate-900 mt-2">${globalTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Impulsos Globales</p>
          <p className="text-4xl font-black text-slate-900 mt-2">{globalImpulsePercentage.toFixed(2)}%</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Ranking Ticket Promedio</h2>
        <div className="space-y-4">
          {storesData.map(s => (
            <div key={s.store} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
              <span className="font-bold text-slate-800">{s.store}</span>
              <div className="text-right">
                <p className="font-mono text-slate-900 font-black">${s.ticket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400">Impulsos: {s.impulsePct.toFixed(1)}%</p>
              </div>
            </div>
          ))}
          {storesData.length === 0 && <p className="text-sm text-slate-500">No hay datos</p>}
        </div>
      </div>
    </div>
  );
}
