import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth } from "date-fns";

export default async function AdminSalesPage() {
  const supabase = await createClient();

  const currentDate = new Date();
  const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthYear = format(currentDate, "yyyy-MM");

  const { data: sales } = await supabase
    .from("daily_sales")
    .select("store_code, amount, date")
    .gte("date", start);

  const { data: budgets } = await supabase
    .from("sales_budgets")
    .select("store_code, budget_amount")
    .eq("month_year", monthYear);

  const salesByStore: Record<string, number> = {};
  const budgetByStore: Record<string, number> = {};
  let totalSales = 0;
  let totalBudget = 0;

  if (sales) {
    for (const sale of sales) {
      const amount = Number(sale.amount || 0);
      if (!salesByStore[sale.store_code]) salesByStore[sale.store_code] = 0;
      salesByStore[sale.store_code] += amount;
      totalSales += amount;
    }
  }

  if (budgets) {
    for (const budget of budgets) {
      const amount = Number(budget.budget_amount || 0);
      if (!budgetByStore[budget.store_code]) budgetByStore[budget.store_code] = 0;
      budgetByStore[budget.store_code] += amount;
      totalBudget += amount;
    }
  }

  const fulfillment = totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0;

  const storesData = Object.keys({ ...salesByStore, ...budgetByStore }).map(store => {
    const s = salesByStore[store] || 0;
    const b = budgetByStore[store] || 0;
    const f = b > 0 ? (s / b) * 100 : 0;
    return { store, sales: s, budget: b, fulfillment: f };
  }).sort((a, b) => b.fulfillment - a.fulfillment);

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-[#e51d2e] mb-6">Ventas Globales (Mes Actual)</h1>
      
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Cumplimiento Regional</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-4xl font-black text-slate-900">{fulfillment.toFixed(1)}%</p>
          <p className="text-sm font-semibold text-slate-400">del presupuesto mensual</p>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${fulfillment >= 100 ? "bg-green-500" : fulfillment >= 90 ? "bg-amber-400" : "bg-red-500"}`}
            style={{ width: `${Math.min(100, fulfillment)}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between text-sm font-bold text-slate-700">
          <p>Real: ${totalSales.toLocaleString()}</p>
          <p>Meta: ${totalBudget.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Ranking por Tienda</h2>
        <div className="space-y-4">
          {storesData.map(s => (
            <div key={s.store} className="border-b border-slate-50 pb-4 last:border-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800">{s.store}</span>
                <span className={`font-black ${s.fulfillment >= 100 ? "text-green-600" : "text-red-600"}`}>
                  {s.fulfillment.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Venta: ${s.sales.toLocaleString()}</span>
                <span>Meta: ${s.budget.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${s.fulfillment >= 100 ? "bg-green-500" : s.fulfillment >= 90 ? "bg-amber-400" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, s.fulfillment)}%` }}
                />
              </div>
            </div>
          ))}
          {storesData.length === 0 && <p className="text-sm text-slate-500">No hay datos</p>}
        </div>
      </div>
    </div>
  );
}
