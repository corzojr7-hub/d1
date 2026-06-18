import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, CheckCircle2, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { requireAuth } from "@/lib/supabase/require-auth";

export const metadata = {
  title: "Retroalimentaciones — SCO",
};

export default async function FeedbackIndex() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/instructions" className="text-xs text-zinc-400 underline-offset-2 hover:underline">
        Volver a Instrucciones
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">
          Retroalimentaciones
        </h1>
        <Link
          href="/instructions/feedback/new"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-md transition hover:bg-amber-600 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Llamados de atención y compromisos
      </p>

      <div className="mt-6 space-y-4">
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${fb.status === "resuelto" ? "opacity-60 grayscale" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {fb.type === "llamado_atencion" ? (
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  ) : (
                    <MessageSquareWarning className="h-5 w-5 text-amber-500" />
                  )}
                  <span className={`text-xs font-bold uppercase tracking-wider ${fb.type === "llamado_atencion" ? "text-red-600" : "text-amber-600"}`}>
                    {fb.type === "llamado_atencion" ? "Llamado de atención" : "Retroalimentación"}
                  </span>
                </div>
                {fb.status === "resuelto" && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Resuelto
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-lg font-bold text-slate-800 leading-tight">
                Para: {fb.directed_to}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Motivo: <span className="text-slate-800">{fb.reason}</span>
              </p>
              
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100">
                <p className="font-semibold text-slate-800 mb-1 text-xs uppercase tracking-wide">Descripción:</p>
                <p>{fb.description}</p>
              </div>

              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 border border-blue-100">
                <p className="font-semibold text-blue-800 mb-1 text-xs uppercase tracking-wide">Compromiso:</p>
                <p>{fb.commitment}</p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Por: {fb.created_by}</span>
                <span>{new Date(fb.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/50 px-4 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">
              No hay retroalimentaciones registradas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
