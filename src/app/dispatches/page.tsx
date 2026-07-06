import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import Link from "next/link";
import { ArrowLeft, Plus, Clock, CheckCircle2, FileText } from "lucide-react";
import DispatchCard from "./DispatchCard";

export default async function DispatchesPage() {
  const supabase = await createClient();
  const { profile } = await requireAuth();

  const { data: dispatches } = await supabase
    .from("dispatch_differences")
    .select(`
      *,
      dispatch_evidences (
        id, created_at
      )
    `)
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false });

  const activeDispatches = dispatches?.filter((d) => d.status === "pendiente") || [];
  const historicalDispatches =
    dispatches?.filter((d) => d.status !== "pendiente") || [];
  const resolvedDispatches = historicalDispatches.filter(
    (d) => d.status === "aplicado",
  ).length;
  const totalEvidence =
    dispatches?.reduce(
      (count, dispatch) => count + (dispatch.dispatch_evidences?.length || 0),
      0,
    ) || 0;

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="mb-6 mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:mt-0 lg:p-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-rose-500">
              Seguimiento de despacho
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Diferencias
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Controla los casos abiertos, revisa evidencias y mantén el
              seguimiento operativo sin perder contexto.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
              <div className="rounded-2xl border border-amber-100 bg-white px-3 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">
                  Pendientes
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {activeDispatches.length}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                  Resueltos
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {resolvedDispatches}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Evidencias
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {totalEvidence}
                </p>
              </div>
            </div>

            <Link
              href="/dispatches/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#e51d2e] px-5 text-sm font-bold text-white shadow-sm transition-transform hover:bg-[#c91528] active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" />
              Nueva diferencia
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-6 xl:space-y-0">
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Seguimiento Pendiente ({activeDispatches.length})
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Casos activos
            </span>
          </div>

          {activeDispatches.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400 opacity-50" />
              <p className="text-sm font-medium text-slate-600">
                No hay diferencias pendientes.
              </p>
              <p className="mt-1 text-xs text-slate-400">Todo está al día.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeDispatches.map((dispatch) => (
                <DispatchCard key={dispatch.id} dispatch={dispatch} />
              ))}
            </div>
          )}
        </section>

        {historicalDispatches.length > 0 && (
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold text-slate-900">Historial</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Consulta rápida
              </span>
            </div>
            <div className="grid gap-3">
              {historicalDispatches.map((dispatch) => (
                <DispatchCard key={dispatch.id} dispatch={dispatch} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
