"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { addDispatchEvidence, closeDispatchDifference } from "../actions";

type DispatchEvidence = {
  id: string;
  created_at: string;
  evidence_url: string;
  notes?: string | null;
};

type DispatchRecord = {
  id: string;
  status: "pendiente" | "aplicado" | "rechazado" | "anulado" | string;
  created_at: string;
  dispatch_date: string;
  truck_plate: string;
  driver_name: string;
  category: string;
  description: string;
  initial_evidence_url?: string | null;
  dispatch_evidences?: DispatchEvidence[] | null;
};

export default function DispatchDetailsClient({
  dispatch,
}: {
  dispatch: DispatchRecord;
}) {
  const [isPending, startTransition] = useTransition();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");

  const isPendingStatus = dispatch.status === "pendiente";
  const daysPending = differenceInDays(new Date(), new Date(dispatch.created_at));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hasEvidenceToday = dispatch.dispatch_evidences?.some((ev) => {
    return new Date(ev.created_at) >= todayStart;
  });

  const handleUploadEvidence = async () => {
    if (!evidenceUrl) {
      toast.error("Debes subir una foto primero");
      return;
    }

    startTransition(async () => {
      const res = await addDispatchEvidence(dispatch.id, evidenceUrl, notes);
      if (res.success) {
        toast.success("Evidencia subida correctamente");
        setEvidenceUrl("");
        setNotes("");
      } else {
        toast.error(res.error || "Error al subir evidencia");
      }
    });
  };

  const handleClose = async (status: "aplicado" | "rechazado" | "anulado") => {
    if (
      !confirm(
        `¿Estás seguro de marcar esta diferencia como ${status.toUpperCase()}?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await closeDispatchDifference(dispatch.id, status);
      if (res.success) {
        toast.success(`Diferencia marcada como ${status}`);
      } else {
        toast.error(res.error || "Error al actualizar");
      }
    });
  };

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-6xl 2xl:px-10">
      <div className="mb-6 mt-6 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm lg:mt-0 lg:p-6">
        <Link
          href="/dispatches"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Diferencias
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
              Seguimiento diario
            </p>
            <h1 className="text-2xl font-black leading-tight text-slate-900">
              Placa: {dispatch.truck_plate}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {dispatch.driver_name} •{" "}
              {format(new Date(dispatch.dispatch_date), "dd MMM yyyy", {
                locale: es,
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-[340px]">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Estado
              </p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  dispatch.status === "pendiente"
                    ? "bg-amber-100 text-amber-800"
                    : dispatch.status === "aplicado"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {dispatch.status}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Días abiertos
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {isPendingStatus ? daysPending : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-6 xl:space-y-0">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
                {dispatch.category}
              </span>
              {isPendingStatus && (
                <span className="text-xs font-medium text-slate-500">
                  Lleva pendiente:{" "}
                  <strong className="text-slate-900">{daysPending} días</strong>
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {dispatch.description}
            </p>

            {dispatch.initial_evidence_url && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-bold text-slate-500">
                  FOTO DEL RÓTULO INICIAL
                </p>
                <img
                  src={dispatch.initial_evidence_url}
                  alt="Rótulo inicial de la diferencia"
                  className="max-h-48 w-full rounded-xl border border-slate-200 object-cover"
                />
              </div>
            )}
          </div>

          {isPendingStatus && (
            <div
              className={`rounded-[28px] border-2 p-5 shadow-sm lg:p-6 ${
                hasEvidenceToday
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              {hasEvidenceToday ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                  <h3 className="font-bold text-emerald-900">
                    Evidencia al día
                  </h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    Ya comprobaste hoy que el estado sigue pendiente. Regresa
                    mañana.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-blue-900">
                    <ShieldCheck className="h-5 w-5" />
                    Evidencia diaria requerida
                  </h3>
                  <p className="mb-4 text-sm text-blue-800">
                    Para no perder la trazabilidad, toma un screenshot del
                    sistema de inventarios mostrando que el caso sigue pendiente.
                  </p>

                  <div className="space-y-3">
                    {evidenceUrl ? (
                      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-blue-300 bg-white p-4">
                        <img
                          src={evidenceUrl}
                          alt="Vista previa del screenshot"
                          className="mb-2 h-20 rounded object-contain"
                        />
                        <button
                          onClick={() => setEvidenceUrl("")}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const url = prompt(
                            "Simulador: Ingresa URL del screenshot",
                            "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=200&auto=format&fit=crop",
                          );
                          if (url) setEvidenceUrl(url);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white py-3 font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Camera className="h-5 w-5" />
                        Tomar screenshot de hoy
                      </button>
                    )}

                    <input
                      type="text"
                      placeholder="Nota opcional (ej: Sigue en bandeja 1)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      onClick={handleUploadEvidence}
                      disabled={isPending || !evidenceUrl}
                      className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isPending ? "Guardando..." : "Guardar evidencia"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPendingStatus && (
            <div className="rounded-[28px] border border-red-100 bg-red-50 p-5 lg:p-6">
              <h3 className="mb-2 font-bold text-red-900">Cerrar caso</h3>
              <p className="mb-4 text-xs text-red-700">
                Una vez resuelto por inventarios, cierra la diferencia para
                detener el seguimiento diario.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => handleClose("aplicado")}
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  Aplicaron
                </button>
                <button
                  onClick={() => handleClose("rechazado")}
                  disabled={isPending}
                  className="rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                >
                  Rechazaron
                </button>
              </div>
              <button
                onClick={() => handleClose("anulado")}
                disabled={isPending}
                className="mt-2 w-full rounded-lg bg-slate-200 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300"
              >
                Anular error mío
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <FileText className="h-5 w-5 text-slate-400" />
              Diario de trazabilidad
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Seguimiento visual
            </span>
          </div>

          <div className="space-y-4">
            {dispatch.dispatch_evidences?.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-500">
                  No hay evidencias registradas todavía.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Cuando subas seguimiento diario, se verá aquí la línea
                  completa del caso.
                </p>
              </div>
            ) : (
              <div className="relative ml-3 space-y-6 border-l-2 border-slate-200 pl-4">
                {dispatch.dispatch_evidences?.map((ev) => (
                  <div key={ev.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-4 border-white bg-blue-500" />
                    <div className="mb-1 text-xs font-bold text-slate-500">
                      {format(new Date(ev.created_at), "dd MMM yyyy, h:mm a", {
                        locale: es,
                      })}
                    </div>
                    {ev.notes && (
                      <p className="mb-2 text-sm text-slate-700">{ev.notes}</p>
                    )}
                    <img
                      src={ev.evidence_url}
                      alt="Evidencia diaria de seguimiento"
                      className="h-24 rounded-xl border border-slate-200 object-cover shadow-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
