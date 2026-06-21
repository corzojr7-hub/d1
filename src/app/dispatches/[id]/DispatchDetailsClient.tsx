"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Camera, CheckCircle2, XCircle, FileText, UploadCloud, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { addDispatchEvidence, closeDispatchDifference } from "../actions";

export default function DispatchDetailsClient({ dispatch }: { dispatch: any }) {
  const [isPending, startTransition] = useTransition();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  
  const isPendingStatus = dispatch.status === "pendiente";
  const daysPending = differenceInDays(new Date(), new Date(dispatch.created_at));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hasEvidenceToday = dispatch.dispatch_evidences?.some((ev: any) => {
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
    if (!confirm(`¿Estás seguro de marcar esta diferencia como ${status.toUpperCase()}?`)) return;

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
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl px-4 sm:px-6">
      <div className="mb-6 mt-6">
        <Link
          href="/dispatches"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Diferencias
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              Placa: {dispatch.truck_plate}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {dispatch.driver_name} • {format(new Date(dispatch.dispatch_date), "dd MMM yyyy", { locale: es })}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
            dispatch.status === "pendiente" ? "bg-amber-100 text-amber-800" :
            dispatch.status === "aplicado" ? "bg-emerald-100 text-emerald-800" :
            "bg-red-100 text-red-800"
          }`}>
            {dispatch.status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Resumen */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase">
              {dispatch.category}
            </span>
            {isPendingStatus && (
              <span className="text-xs font-medium text-slate-500">
                Lleva pendiente: <strong className="text-slate-900">{daysPending} días</strong>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {dispatch.description}
          </p>
          
          {dispatch.initial_evidence_url && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">FOTO DEL RÓTULO INICIAL</p>
              <img 
                src={dispatch.initial_evidence_url} 
                alt="Rótulo" 
                className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
              />
            </div>
          )}
        </div>

        {/* Módulo de Subida (Solo si está pendiente) */}
        {isPendingStatus && (
          <div className={`p-5 rounded-2xl border-2 shadow-sm ${
            hasEvidenceToday ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"
          }`}>
            {hasEvidenceToday ? (
              <div className="text-center py-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <h3 className="font-bold text-emerald-900">Evidencia al día</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Ya comprobaste hoy que el estado sigue pendiente. Regresa mañana.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5" />
                  Evidencia Diaria Requerida
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Para no perder la trazabilidad, toma un screenshot del sistema de inventarios mostrando que el caso sigue pendiente.
                </p>
                
                <div className="space-y-3">
                  {evidenceUrl ? (
                    <div className="flex flex-col items-center border-2 border-dashed border-blue-300 rounded-xl p-4 bg-white">
                      <img src={evidenceUrl} className="h-20 object-contain mb-2 rounded" />
                      <button onClick={() => setEvidenceUrl("")} className="text-xs text-red-500 hover:underline">Quitar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const url = prompt("Simulador: Ingresa URL del screenshot", "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=200&auto=format&fit=crop");
                        if (url) setEvidenceUrl(url);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                    >
                      <Camera className="h-5 w-5" />
                      Tomar Screenshot de Hoy
                    </button>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Nota opcional (ej: Sigue en bandeja 1)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  
                  <button
                    onClick={handleUploadEvidence}
                    disabled={isPending || !evidenceUrl}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Guardando..." : "Guardar Evidencia"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline de Evidencias */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Diario de Trazabilidad
          </h3>
          
          <div className="space-y-4">
            {dispatch.dispatch_evidences?.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay evidencias registradas todavía.</p>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-6">
                {dispatch.dispatch_evidences?.map((ev: any) => (
                  <div key={ev.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500 border-4 border-white" />
                    <div className="text-xs font-bold text-slate-500 mb-1">
                      {format(new Date(ev.created_at), "dd MMM yyyy, h:mm a", { locale: es })}
                    </div>
                    {ev.notes && (
                      <p className="text-sm text-slate-700 mb-2">{ev.notes}</p>
                    )}
                    <img src={ev.evidence_url} className="h-24 rounded-lg border border-slate-200 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Cierre */}
        {isPendingStatus && (
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-900 mb-2">Cerrar Caso</h3>
            <p className="text-xs text-red-700 mb-4">
              Una vez resuelto por inventarios, cierra la diferencia para detener el seguimiento diario.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleClose("aplicado")}
                disabled={isPending}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Aplicaron
              </button>
              <button 
                onClick={() => handleClose("rechazado")}
                disabled={isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Rechazaron
              </button>
            </div>
            <button 
                onClick={() => handleClose("anulado")}
                disabled={isPending}
                className="w-full mt-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors"
              >
                Anular Error Mío
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
