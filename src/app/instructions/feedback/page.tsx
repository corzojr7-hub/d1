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

  const totalFeedbacks = feedbacks?.length || 0;
  const resolvedFeedbacks =
    feedbacks?.filter((fb) => fb.status === "resuelto").length || 0;
  const pendingFeedbacks = totalFeedbacks - resolvedFeedbacks;

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm lg:p-6">
        <Link
          href="/instructions"
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Volver a Instrucciones
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
              Seguimiento humano
            </p>
            <h1 className="text-2xl font-black text-slate-900">
              Retroalimentaciones
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Llamados de atención, compromisos y actas listos para consulta y descarga.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">
                  Pendientes
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {pendingFeedbacks}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                  Resueltos
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {resolvedFeedbacks}
                </p>
              </div>
            </div>

            <Link
              href="/instructions/feedback/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-bold text-white shadow-md shadow-amber-200/70 transition-transform hover:scale-[1.01] hover:bg-amber-600 active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" />
              Nuevo registro
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => {
            const parsedActa = parseActaReason(fb.reason);
            const isActa = Boolean(parsedActa);
            const isLlamado = fb.type === "llamado_atencion" && !isActa;

            return (
              <div
                key={fb.id}
                className={`rounded-[24px] border bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6 ${
                  fb.status === "resuelto" ? "border-emerald-200/80 bg-emerald-50/20" : "border-slate-200/80"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isActa ? (
                        <FileBadge2 className="h-5 w-5 text-slate-700" />
                      ) : isLlamado ? (
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                      ) : (
                        <MessageSquareWarning className="h-5 w-5 text-amber-500" />
                      )}
                      <span
                        className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                          isActa
                            ? "text-slate-700"
                            : isLlamado
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}
                      >
                        {isActa
                          ? "Acta de compromiso"
                          : isLlamado
                            ? "Llamado de atención"
                            : "Retroalimentación"}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-black leading-tight text-slate-900">
                      Para: {fb.directed_to}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Motivo:{" "}
                      <span className="text-slate-800">
                        {parsedActa?.cleanReason || fb.reason}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {fb.status === "resuelto" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resuelto
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-800">
                      Descripción
                    </p>
                    <p>{fb.description}</p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Compromiso
                    </p>
                    <p>{fb.commitment}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
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
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-4 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">
              No hay retroalimentaciones registradas.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Cuando empieces a registrar llamados, compromisos o actas, aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
