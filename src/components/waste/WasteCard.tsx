"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, X, Pencil, Trash2, Copy } from "lucide-react";
import { updateWasteStatus, deleteWasteRecord } from "@/app/waste/actions";
import EditWasteModal from "./EditWasteModal";
import { WASTE_REASONS, getLabel } from "@/lib/domain/catalogs";
import type { WasteReason } from "@/lib/domain/types";

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
  store_code?: string;
  store_name?: string;
  transport_driver?: string | null;
  transport_plate?: string | null;
  transport_comment?: string | null;
  transport_evidence?: Record<string, string> | null;
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
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(record.created_at));
  const formattedDateTime = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(record.created_at));

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

  let productName = record.products?.name ?? record.barcode_id;

  if (
    productName === record.barcode_id &&
    record.observation &&
    record.observation.includes(
      "Mermado automáticamente desde Radar FEFO. Producto: ",
    )
  ) {
    productName = record.observation.replace(
      "Mermado automáticamente desde Radar FEFO. Producto: ",
      "",
    );
  }

  async function handleCopyTransportReport() {
    const report = [
      "Reporte de novedad de transporte",
      `Tienda: ${record.store_name || "Sin tienda"}`,
      `Codigo tienda: ${record.store_code || "Sin codigo"}`,
      `Fecha y hora: ${formattedDateTime}`,
      `Conductor: ${record.transport_driver || "N/A"}`,
      `Placa: ${record.transport_plate || "N/A"}`,
      `Producto afectado: ${productName}`,
      `Unidades afectadas: ${record.qty} ${record.unit}`,
      `Motivo: ${getLabel(WASTE_REASONS, record.reason as WasteReason)}`,
      `Descripcion: ${record.transport_comment || record.observation || "Sin descripcion"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(report);
      toast.success("Reporte copiado para WhatsApp");
    } catch {
      toast.error("No se pudo copiar el reporte");
    }
  }

  return (
    <>
      <div
        className={`relative rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition ${
          pending || isDeleting ? "opacity-50" : "hover:shadow-md"
        }`}
      >
        <div className="absolute right-4 top-4 flex items-center gap-1">
          {userRole === "supervisor" && (
            <button
              onClick={() => setShowEdit(true)}
              disabled={isDeleting}
              className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-slate-50 hover:text-blue-500 disabled:opacity-50"
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
                  } catch {
                    toast.error("Error al eliminar la merma");
                    setIsDeleting(false);
                  }
                }
              }}
              disabled={isDeleting}
              className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              title="Eliminar merma"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pr-16">
          <span className="max-w-[140px] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-800 ring-1 ring-blue-100">
            {record.area || "Sin área"}
          </span>
          <span className="text-[11px] text-slate-400">
            {formattedDate || "\u00A0"}
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[18px] font-black leading-snug tracking-tight text-slate-900">
            {productName}
          </p>
          <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right">
            <span className="text-xl font-black leading-none text-blue-700 tabular-nums">
              {record.qty}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {record.unit}
            </span>
          </div>
        </div>

        <p className="mt-1 font-mono text-[11px] text-slate-400">
          {record.barcode_id}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
          <span className={`font-semibold ${reasonColors[record.reason] ?? "text-slate-600"}`}>
            Motivo: {getLabel(WASTE_REASONS, record.reason as WasteReason)}
          </span>
          <span className="text-[12px] text-slate-400">
            Lugar: {record.area}
          </span>
        </div>

        {record.observation &&
        record.reason !== "averia_transporte" &&
        record.reason !== "reporte_calidad" ? (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-slate-600">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Observación
            </span>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
              {record.observation}
            </p>
          </div>
        ) : null}

        {record.reason === "averia_transporte" ||
        record.reason === "reporte_calidad" ? (
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3 text-[12px] text-amber-900">
            {record.reason === "averia_transporte" && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                    Conductor
                  </span>
                  <span>{record.transport_driver || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                    Placa
                  </span>
                  <span>{record.transport_plate || "N/A"}</span>
                </div>
              </div>
            )}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                Novedad
              </span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                {record.transport_comment || "Sin comentario"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {record.image_url || record.transport_evidence ? (
              <button
                type="button"
                onClick={() => setShowImage(true)}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 transition-colors hover:bg-emerald-100 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700">
                  Ver Evidencia
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <CameraOff className="h-3.5 w-3.5 text-slate-300" />
                <span className="text-[11px] text-slate-400">
                  Sin evidencia
                </span>
              </div>
            )}
            {record.reason === "averia_transporte" && (
              <button
                type="button"
                onClick={handleCopyTransportReport}
                className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 transition-colors hover:bg-blue-100 active:scale-95"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-700">
                  Copiar reporte
                </span>
              </button>
            )}
          </div>

          <select
            value={record.status}
            onChange={handleChange}
            disabled={pending || userRole !== "supervisor"}
            className={`rounded-full border-0 bg-slate-50 px-3 py-1.5 text-[11px] font-bold outline-none ring-1 ring-slate-200 transition hover:ring-slate-300 disabled:opacity-50 ${
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

      {showImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setShowImage(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {(record.reason === "averia_transporte" ||
            record.reason === "reporte_calidad") &&
          record.transport_evidence ? (
            <div className="grid max-h-[85vh] w-full max-w-4xl grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
              {Object.entries(record.transport_evidence).map(([type, url]) => (
                <div key={type} className="flex flex-col gap-2">
                  <span className="text-sm font-semibold capitalize text-white/80">
                    {type}
                  </span>
                  <img
                    src={url as string}
                    alt={`Evidencia ${type} - ${productName}`}
                    className="w-full rounded-xl bg-white/5 object-contain shadow-2xl"
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
            <p className="mt-1 text-xs text-white/50">
              {record.reason} • {record.qty} {record.unit}
            </p>
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
