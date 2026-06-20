import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Plus,
  CheckCircle2,
  MessageSquareWarning,
  ShieldAlert,
  FileBadge2,
} from "lucide-react";
import { requireAuth } from "@/lib/supabase/require-auth";
import FeedbackPrintButton from "./FeedbackPrintButton";
import { parseActaReason } from "./actaTemplates";

export const metadata = {
  title: "Retroalimentaciones - SCO",
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
    <div className="mx-auto max-w-md px-4 py-8 lg:max-w-3xl lg:px-6 xl:max-w-4xl">
      <Link href="/instructions" className="text-xs text-zinc-400 underline-offset-2 hover:underline">
        Volver a Instrucciones
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">Retroalimentaciones</h1>
        <Link
          href="/instructions/feedback/new"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-md transition hover:bg-amber-600 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Llamados de atencion, compromisos y actas listas para descargar
      </p>

      <div className="mt-6 space-y-4">
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => {
            const parsedActa = parseActaReason(fb.reason);
            const isActa = Boolean(parsedActa);
            const isLlamado = fb.type === "llamado_atencion" && !isActa;

            return (
              <div
                key={fb.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                  fb.status === "resuelto" ? "opacity-60 grayscale" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isActa ? (
                      <FileBadge2 className="h-5 w-5 text-slate-700" />
                    ) : isLlamado ? (
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                    ) : (
                      <MessageSquareWarning className="h-5 w-5 text-amber-500" />
                    )}
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isActa ? "text-slate-700" : isLlamado ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {isActa
                        ? "Acta de compromiso"
                        : isLlamado
                          ? "Llamado de atencion"
                          : "Retroalimentacion"}
                    </span>
                  </div>
                  {fb.status === "resuelto" && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Resuelto
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-lg font-bold leading-tight text-slate-800">
                  Para: {fb.directed_to}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Motivo: <span className="text-slate-800">{parsedActa?.cleanReason || fb.reason}</span>
                </p>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-800">
                    Descripcion:
                  </p>
                  <p>{fb.description}</p>
                </div>

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Compromiso:
                  </p>
                  <p>{fb.commitment}</p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400 sm:gap-4">
                    <span>Por: {fb.created_by}</span>
                    <span>{new Date(fb.created_at).toLocaleDateString("es-CO")}</span>
                  </div>
                  <FeedbackPrintButton
                    feedback={{
                      directed_to: fb.directed_to,
                      type: fb.type,
                      reason: fb.reason,
                      description: fb.description,
                      commitment: fb.commitment,
                      created_by: fb.created_by,
                      created_at: fb.created_at,
                    }}
                  />
                </div>
              </div>
            );
          })
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
