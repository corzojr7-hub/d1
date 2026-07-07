import { createClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";

export default async function AdminInstructionsPage() {
  const supabase = await createClient();

  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  // Fetch all instructions globally in last 7 days
  const { data: instructions } = await supabase
    .from("instructions")
    .select("id, store_code, status, title, created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  let totalCompletadas = 0;
  let totalPendientes = 0;
  let totalEnProgreso = 0;

  const statsByStore: Record<string, { completadas: number; pendientes: number; total: number }> = {};

  if (instructions) {
    for (const inst of instructions) {
      if (!statsByStore[inst.store_code]) {
        statsByStore[inst.store_code] = { completadas: 0, pendientes: 0, total: 0 };
      }
      statsByStore[inst.store_code].total += 1;

      if (inst.status === "completado") {
        totalCompletadas += 1;
        statsByStore[inst.store_code].completadas += 1;
      } else if (inst.status === "pendiente") {
        totalPendientes += 1;
        statsByStore[inst.store_code].pendientes += 1;
      } else if (inst.status === "en_progreso") {
        totalEnProgreso += 1;
        statsByStore[inst.store_code].pendientes += 1; // Count as pending/in progress
      }
    }
  }

  const storesData = Object.entries(statsByStore).map(([store, data]) => {
    const fulfillment = data.total > 0 ? (data.completadas / data.total) * 100 : 0;
    return { store, ...data, fulfillment };
  }).sort((a, b) => a.pendientes - b.pendientes); // Menos pendientes primero

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold text-[#e51d2e] mb-6">Tareas Globales (Últimos 7 días)</h1>
      
      <div className="grid gap-4 grid-cols-3 mb-8">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase">Completadas</p>
          <p className="text-2xl font-black text-green-600 mt-1">{totalCompletadas}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase">En Progreso</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{totalEnProgreso}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pendientes</p>
          <p className="text-2xl font-black text-red-600 mt-1">{totalPendientes}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Cumplimiento por Tienda</h2>
        <div className="space-y-4">
          {storesData.map(s => (
            <div key={s.store} className="border-b border-slate-50 pb-4 last:border-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800">{s.store}</span>
                <span className={`font-black ${s.fulfillment >= 100 ? "text-green-600" : s.fulfillment > 50 ? "text-amber-500" : "text-red-600"}`}>
                  {s.fulfillment.toFixed(0)}% completado
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>{s.completadas} hechas</span>
                <span>{s.pendientes} pdtes</span>
              </div>
              <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-green-500"
                  style={{ width: `${s.fulfillment}%` }}
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
