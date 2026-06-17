"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, X, Pencil, Trash2 } from "lucide-react";
import { updateWasteStatus, deleteWasteRecord } from "@/app/waste/actions";
import EditWasteModal from "./EditWasteModal";

type WasteRecord = {
  id: string;
  barcode_id: string;
  qty: number;
  unit: string;
  reason: string;
  deposited_by: string;
  area: string;
  status: string;
  observation: string;
  image_url: string | null;
  created_at: string;
  products: { name: string } | null;
  author?: string;
  transport_driver?: string | null;
  transport_plate?: string | null;
  transport_comment?: string | null;
  transport_evidence?: any;
};

const statuses = [
  "pendiente_revision",
  "revisado",
  "recuperable",
  "no_recuperable",
  "requiere_seguimiento",
  "anulado",
];

const statusLabels: Record<string, string> = {
  pendiente_revision: "Pendiente revisión",
  revisado: "Revisado",
  recuperable: "Recuperable",
  no_recuperable: "No recuperable",
  requiere_seguimiento: "Requiere seg.",
  anulado: "Anulado",
};

const statusTextColors: Record<string, string> = {
  pendiente_revision: "text-amber-600",
  revisado: "text-emerald-600",
  recuperable: "text-blue-600",
  no_recuperable: "text-red-600",
  requiere_seguimiento: "text-purple-600",
  anulado: "text-slate-400",
};

const reasonColors: Record<string, string> = {
  vencido: "text-red-600",
  danado: "text-orange-600",
  perdida: "text-red-700",
  otro: "text-slate-600",
};

export default function WasteCard({ record, userRole }: { record: WasteRecord, userRole?: string }) {
  const [pending, startTransition] = useTransition();
  const [showImage, setShowImage] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(async () => {
      try {
        await updateWasteStatus(record.id, newStatus);
        toast.success("Estado actualizado");
      } catch {
        toast.error("Error al actualizar");
      }
    });
  }

  const productName = record.products?.name ?? record.barcode_id;

  return (
    <>
      <div
        className={`relative rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition ${
          pending || isDeleting ? "opacity-50" : "hover:shadow-md"
        }`}
      >
        <div className="absolute right-4 top-4 flex items-center gap-1">
          {userRole === "supervisor" && (
            <button
              onClick={() => setShowEdit(true)}
              disabled={isDeleting}
              className="rounded-full p-1.5 text-slate-300 hover:bg-slate-50 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="Editar merma"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          
          {userRole === "supervisor" && (
            <button
              onClick={async () => {
                if (window.confirm("¿Seguro que deseas eliminar esta merma de forma permanente?")) {
                  setIsDeleting(true);
                  try {
                    await deleteWasteRecord(record.id);
                    toast.success("Merma eliminada");
                  } catch (error) {
                    toast.error("Error al eliminar la merma");
                    setIsDeleting(false);
                  }
                }
              }}
              disabled={isDeleting}
              className="rounded-full p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Eliminar merma"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Fila 1: Categoría / Área + Fecha */}
        <div className="flex items-center gap-3 pr-8">
          <span className="text-xs font-bold text-blue-900 truncate max-w-[120px]">
            {record.area || "Sin área"}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(record.created_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Fila 2: Producto + Cantidad */}
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-lg font-bold text-slate-800 leading-snug">
            {productName}
          </p>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-xl font-extrabold tabular-nums text-blue-600 leading-none">
              {record.qty}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {record.unit}
            </span>
          </div>
        </div>

        {/* Fila 3: Barcode */}
        <p className="mt-1 font-mono text-xs text-slate-400">
          {record.barcode_id}
        </p>

        {/* Fila 4: Motivo + Lugar */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className={`font-semibold ${reasonColors[record.reason] ?? "text-slate-600"}`}>
            Motivo: {record.reason}
          </span>
          <span className="text-slate-400">
            Lugar: {record.area}
          </span>
        </div>

        {/* Detalles Adicionales */}
        {(record.reason === "averia_transporte" || record.reason === "reporte_calidad") && (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-xs text-amber-900">
            {record.reason === "averia_transporte" && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <span className="font-semibold block text-amber-700">Conductor:</span>
                  <span>{record.transport_driver || "N/A"}</span>
                </div>
                <div>
                  <span className="font-semibold block text-amber-700">Placa:</span>
                  <span>{record.transport_plate || "N/A"}</span>
                </div>
              </div>
            )}
            <div>
              <span className="font-semibold block text-amber-700">Novedad:</span>
              <p className="whitespace-pre-wrap">{record.transport_comment || "Sin comentario"}</p>
            </div>
          </div>
        )}

        {/* Fila 5: Evidencia + Select Estado */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            {record.image_url || record.transport_evidence ? (
              <button
                type="button"
                onClick={() => setShowImage(true)}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 transition-colors hover:bg-emerald-100 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">
                  Ver Evidencia
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <CameraOff className="h-3.5 w-3.5 text-slate-300" />
                <span className="text-xs text-slate-400">
                  Sin evidencia
                </span>
              </div>
            )}
          </div>

          <select
            value={record.status}
            onChange={handleChange}
            disabled={pending || userRole !== "supervisor"}
            className={`rounded-lg border-0 bg-transparent px-1 py-0.5 text-xs font-bold outline-none ring-1 ring-slate-200 transition hover:ring-slate-300 disabled:opacity-50 ${
              statusTextColors[record.status] ?? "text-slate-600"
            }`}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal / Visor de Imágenes */}
      {showImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setShowImage(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 z-10"
          >
            <X className="h-6 w-6" />
          </button>
          
          {(record.reason === "averia_transporte" || record.reason === "reporte_calidad") && record.transport_evidence ? (
            <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(record.transport_evidence).map(([type, url]) => (
                <div key={type} className="flex flex-col gap-2">
                  <span className="text-white/80 text-sm font-semibold capitalize">{type}</span>
                  <img 
                    src={url as string} 
                    alt={`Evidencia ${type} - ${productName}`} 
                    className="w-full rounded-xl object-contain shadow-2xl bg-white/5"
                  />
                </div>
              ))}
            </div>
          ) : record.image_url ? (
            <img 
              src={record.image_url} 
              alt={`Evidencia de merma - ${productName}`} 
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : null}
          
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold text-white/90">{productName}</p>
            <p className="mt-1 text-xs text-white/50">{record.reason} • {record.qty} {record.unit}</p>
          </div>
        </div>
      )}

      {showEdit && (
        <EditWasteModal 
          record={record} 
          onClose={() => setShowEdit(false)} 
        />
      )}
    </>
  );
}
