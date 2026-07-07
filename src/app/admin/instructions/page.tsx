import PeriodFilter from "../PeriodFilter";
import {
  type AdminSearchParams,
  requireAdminContext,
  resolveAdminPeriod,
} from "../admin-metrics";

export default async function AdminInstructionsPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const period = resolveAdminPeriod(params.period);
  const { supabase } = await requireAdminContext();

  const [{ data: instructions, error: instructionsError }, { data: stores }] = await Promise.all([
    supabase
      .from("instructions")
      .select("id, store_code, status, created_at")
      .gte("created_at", period.startIso)
      .lte("created_at", period.endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo"),
  ]);

  if (instructionsError) {
    throw new Error(`No se pudieron cargar las tareas globales: ${instructionsError.message}`);
  }

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const statsByStore = new Map<string, { completed: number; pending: number; inProgress: number; total: number }>();
  let completed = 0;
  let pending = 0;
  let inProgress = 0;

  for (const instruction of instructions || []) {
    const stats =
      statsByStore.get(instruction.store_code) ||
      { completed: 0, pending: 0, inProgress: 0, total: 0 };
    stats.total += 1;

    if (instruction.status === "cumplida") {
      completed += 1;
      stats.completed += 1;
    } else if (instruction.status === "en_proceso") {
      inProgress += 1;
      stats.inProgress += 1;
    } else {
      pending += 1;
      stats.pending += 1;
    }

    statsByStore.set(instruction.store_code, stats);
  }

  const rows = Array.from(statsByStore.entries())
    .map(([storeCode, stats]) => ({
      storeCode,
      storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
      ...stats,
      completion: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }))
    .sort((a, b) => b.pending - a.pending || b.total - a.total)
    .slice(0, 10);

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Tareas globales
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Cumplimiento por tienda</h1>
            <p className="mt-1 text-sm text-slate-500">
              Estado regional de instrucciones para {period.label.toLowerCase()}.
            </p>
          </div>
          <PeriodFilter active={period.key} pathname="/admin/instructions" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard label="Cumplidas" value={String(completed)} />
        <MetricCard label="En proceso" value={String(inProgress)} />
        <MetricCard label="Pendientes" value={String(pending)} />
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-black text-slate-950">Top 10 tiendas con pendientes</h2>
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
                  {row.completion.toFixed(0)}%
                </p>
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>{row.completed} cumplidas</span>
                <span>{row.pending + row.inProgress} abiertas</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#e51d2e]"
                  style={{ width: `${Math.min(100, row.completion)}%` }}
                />
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No hay tareas registradas para este periodo.
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
