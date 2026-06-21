import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import Link from "next/link";
import { ArrowLeft, Plus, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import DispatchCard from "./DispatchCard";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

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

  const activeDispatches = dispatches?.filter(d => d.status === "pendiente") || [];
  const historicalDispatches = dispatches?.filter(d => d.status !== "pendiente") || [];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl px-4 sm:px-6">
      <div className="mb-6 mt-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Diferencias</h1>
            <p className="text-sm text-slate-500">
              Trazabilidad diaria de despachos
            </p>
          </div>
          <Link
            href="/dispatches/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Seguimiento Pendiente ({activeDispatches.length})</h2>
          </div>
          
          {activeDispatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No hay diferencias pendientes.</p>
              <p className="text-xs text-slate-400 mt-1">Todo está al día.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeDispatches.map(dispatch => (
                <DispatchCard key={dispatch.id} dispatch={dispatch} />
              ))}
            </div>
          )}
        </section>

        {historicalDispatches.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-900">Historial</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {historicalDispatches.map(dispatch => (
                <DispatchCard key={dispatch.id} dispatch={dispatch} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
