import PeriodFilter from "../PeriodFilter";
import {
  formatCop,
  type AdminSearchParams,
  requireAdminContext,
  resolveAdminPeriod,
} from "../admin-metrics";

export default async function AdminWastePage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const period = resolveAdminPeriod(params.period);
  const { supabase } = await requireAdminContext();

  const [
    { data: weeklyWaste, error: weeklyWasteError },
    { data: wasteRecords, error: wasteRecordsError },
    { data: stores },
  ] = await Promise.all([
    supabase
      .from("weekly_waste")
      .select("store_code, waste_amount, week_start, week_end")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("week_end", period.startDate)
      .lte("week_start", period.endDate),
    supabase
      .from("waste_records")
      .select("store_code, qty, reason, area, created_at, products(name)")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("created_at", period.startIso)
      .lte("created_at", period.endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo")
      .neq("store_code", "ADMIN-CENTRAL"),
  ]);

  if (weeklyWasteError) {
    throw new Error(`No se pudo cargar la merma semanal global: ${weeklyWasteError.message}`);
  }

  if (wasteRecordsError) {
    throw new Error(`No se pudo cargar el detalle global de merma: ${wasteRecordsError.message}`);
  }

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const activeStoreCodes = new Set(storeNames.keys());
  const costByStore = new Map<string, number>();
  const unitsByStore = new Map<string, number>();
  const productsByQty = new Map<string, { name: string; qty: number; area: string }>();

  for (const entry of weeklyWaste || []) {
    if (!activeStoreCodes.has(entry.store_code)) continue;
    const amount = Number(entry.waste_amount || 0);
    costByStore.set(entry.store_code, (costByStore.get(entry.store_code) || 0) + amount);
  }

  for (const record of wasteRecords || []) {
    if (!activeStoreCodes.has(record.store_code)) continue;
    const qty = Number(record.qty || 0);
    const product = Array.isArray(record.products) ? record.products[0] : record.products;
    const productInfo = product as { name?: string | null } | null;
    const name = productInfo?.name || record.reason || "Desconocido";

    unitsByStore.set(record.store_code, (unitsByStore.get(record.store_code) || 0) + qty);
    if (!productsByQty.has(name)) {
      productsByQty.set(name, { name, qty: 0, area: record.area || "N/A" });
    }
    productsByQty.get(name)!.qty += qty;
  }

  const totalCost = Array.from(costByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const totalUnits = Array.from(unitsByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const storesWithWaste = new Set([...costByStore.keys(), ...unitsByStore.keys()]).size;
  const topStores = [...new Set([...costByStore.keys(), ...unitsByStore.keys()])]
    .map((storeCode) => ({
      storeCode,
      storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
      cost: costByStore.get(storeCode) || 0,
      units: unitsByStore.get(storeCode) || 0,
    }))
    .sort((a, b) => b.cost - a.cost || b.units - a.units)
    .slice(0, 10);
  const topProducts = Array.from(productsByQty.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Merma global
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Control regional de perdida</h1>
            <p className="mt-1 text-sm text-slate-500">
              Costo semanal y registros operativos para {period.label.toLowerCase()}.
            </p>
          </div>
          <PeriodFilter active={period.key} pathname="/admin/waste" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard label="Costo registrado" value={formatCop(totalCost)} />
        <MetricCard label="Unidades registradas" value={String(totalUnits)} />
        <MetricCard label="Tiendas con merma" value={String(storesWithWaste)} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Top 10 tiendas por costo">
          {topStores.map((store, index) => (
            <div
              key={store.storeCode}
              className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {index + 1}. {store.storeName}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {store.storeCode} · {store.units} uds
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">{formatCop(store.cost)}</p>
            </div>
          ))}
          {topStores.length === 0 ? <EmptyState text="No hay merma registrada para este periodo." /> : null}
        </Panel>

        <Panel title="Top 10 productos por cantidad">
          {topProducts.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {index + 1}. {product.name}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {product.area}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">{product.qty} uds</p>
            </div>
          ))}
          {topProducts.length === 0 ? <EmptyState text="No hay productos registrados para este periodo." /> : null}
        </Panel>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
      {text}
    </p>
  );
}
