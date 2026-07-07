import PeriodFilter from "../PeriodFilter";
import {
  formatCop,
  type AdminSearchParams,
  requireAdminContext,
  resolveAdminPeriod,
} from "../admin-metrics";

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const period = resolveAdminPeriod(params.period);
  const { supabase } = await requireAdminContext();
  const budgetMonths = [...new Set([period.startDate.slice(0, 7), period.endDate.slice(0, 7)])];

  const [
    { data: sales, error: salesError },
    { data: budgets, error: budgetsError },
    { data: stores },
  ] = await Promise.all([
    supabase
      .from("daily_sales")
      .select("store_code, amount, date")
      .gte("date", period.startDate)
      .lte("date", period.endDate),
    supabase
      .from("sales_budgets")
      .select("store_code, budget_amount, month_year")
      .in("month_year", budgetMonths),
    supabase
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo"),
  ]);

  if (salesError) {
    throw new Error(`No se pudieron cargar las ventas globales: ${salesError.message}`);
  }

  if (budgetsError) {
    throw new Error(`No se pudieron cargar los presupuestos globales: ${budgetsError.message}`);
  }

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const salesByStore = new Map<string, number>();
  const budgetsByStore = new Map<string, number>();

  for (const sale of sales || []) {
    const amount = Number(sale.amount || 0);
    salesByStore.set(sale.store_code, (salesByStore.get(sale.store_code) || 0) + amount);
  }

  for (const budget of budgets || []) {
    const amount = Number(budget.budget_amount || 0);
    budgetsByStore.set(budget.store_code, (budgetsByStore.get(budget.store_code) || 0) + amount);
  }

  const storeCodes = [...new Set([...salesByStore.keys(), ...budgetsByStore.keys()])];
  const rows = storeCodes
    .map((storeCode) => {
      const salesAmount = salesByStore.get(storeCode) || 0;
      const budgetAmount = budgetsByStore.get(storeCode) || 0;
      return {
        storeCode,
        storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
        salesAmount,
        budgetAmount,
        fulfillment: budgetAmount > 0 ? (salesAmount / budgetAmount) * 100 : 0,
      };
    })
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, 10);

  const totalSales = Array.from(salesByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const totalBudget = Array.from(budgetsByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const fulfillment = totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0;

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Ventas globales
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Cumplimiento regional</h1>
            <p className="mt-1 text-sm text-slate-500">
              Venta real contra presupuesto para {period.label.toLowerCase()}.
            </p>
          </div>
          <PeriodFilter active={period.key} pathname="/admin/sales" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard label="Venta real" value={formatCop(totalSales)} />
        <MetricCard label="Presupuesto" value={formatCop(totalBudget)} />
        <MetricCard label="Cumplimiento" value={`${fulfillment.toFixed(1)}%`} />
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-black text-slate-950">Top 10 tiendas por venta</h2>
        <div className="mt-4 space-y-4">
          {rows.map((row, index) => (
            <div key={row.storeCode} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {index + 1}. {row.storeName}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {row.storeCode}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black text-slate-950">
                  {row.fulfillment.toFixed(1)}%
                </p>
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>{formatCop(row.salesAmount)}</span>
                <span>{formatCop(row.budgetAmount)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#e51d2e]"
                  style={{ width: `${Math.min(100, row.fulfillment)}%` }}
                />
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No hay ventas ni presupuestos para este periodo.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
