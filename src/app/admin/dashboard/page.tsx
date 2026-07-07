import PeriodFilter from "../PeriodFilter";
import {
  formatCop,
  type AdminSearchParams,
  requireAdminContext,
  resolveAdminPeriod,
} from "../admin-metrics";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const period = resolveAdminPeriod(params.period);
  const { supabase } = await requireAdminContext();

  const [{ data: sales, error: salesError }, { data: stores }] = await Promise.all([
    supabase
      .from("daily_sales")
      .select("store_code, amount, date")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("date", period.startDate)
      .lte("date", period.endDate),
    supabase
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo")
      .neq("store_code", "ADMIN-CENTRAL"),
  ]);

  if (salesError) {
    throw new Error(`No se pudieron cargar los indicadores globales: ${salesError.message}`);
  }

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const activeStoreCodes = new Set(storeNames.keys());
  const salesByStore = new Map<string, number>();
  const activeDates = new Set<string>();

  for (const sale of sales || []) {
    if (!activeStoreCodes.has(sale.store_code)) continue;
    const amount = Number(sale.amount || 0);
    salesByStore.set(sale.store_code, (salesByStore.get(sale.store_code) || 0) + amount);
    activeDates.add(sale.date);
  }

  const totalSales = Array.from(salesByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const activeStores = Array.from(salesByStore.values()).filter((amount) => amount > 0).length;
  const dailyAverage = activeDates.size > 0 ? totalSales / activeDates.size : 0;
  const ranking = Array.from(salesByStore.entries())
    .map(([storeCode, amount]) => ({
      storeCode,
      storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Indicadores globales
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Lectura regional</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ventas consolidadas por tienda para {period.label.toLowerCase()}.
            </p>
          </div>
          <PeriodFilter active={period.key} pathname="/admin/dashboard" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard label="Venta regional" value={formatCop(totalSales)} />
        <MetricCard label="Tiendas con venta" value={String(activeStores)} />
        <MetricCard label="Promedio diario" value={formatCop(dailyAverage)} />
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-black text-slate-950">Top 10 tiendas por venta</h2>
        <div className="mt-4 space-y-3">
          {ranking.map((store, index) => (
            <div
              key={store.storeCode}
              className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {index + 1}. {store.storeName}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {store.storeCode}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">{formatCop(store.amount)}</p>
            </div>
          ))}
          {ranking.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No hay ventas registradas para este periodo.
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
