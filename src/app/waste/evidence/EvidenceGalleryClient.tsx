"use client";

import { useState } from "react";
import { Download, Calendar as CalendarIcon, Loader2, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchEvidenceByDate } from "./actions";
import { toast } from "sonner";

type EvidenceRecord = {
  id: string;
  reason: string;
  image_url: string | null;
  transport_evidence: Record<string, string> | null;
  created_at: string;
  qty: number;
  unit: string;
  area: string | null;
  observation: string | null;
  transport_driver: string | null;
  transport_plate: string | null;
  transport_comment: string | null;
  deposited_by: string | null;
  store_code: string | null;
  products: { name: string } | { name: string }[] | null;
};

const REASON_LABELS: Record<string, string> = {
  averia_transporte: "Avería de transporte",
  reporte_calidad: "Calidad",
  calidad_nacional: "Calidad nacional",
  fecha_corta_cedi: "Fecha corta CEDI",
};

export default function EvidenceGalleryClient() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
      const endOfDay = new Date(`${selectedDate}T23:59:59.999`).toISOString();

      const { records, error } = await fetchEvidenceByDate(startOfDay, endOfDay);

      if (error) {
        throw new Error(error);
      }

      if (!records || records.length === 0) {
        toast.info("No hay evidencias reportadas para esta fecha.");
        setIsDownloading(false);
        return;
      }

      toast.loading("Recopilando evidencias...");

      const zip = new JSZip();
      let totalFiles = 0;
      let downloadedFiles = 0;

      type DownloadTask = {
        folder: string;
        fileName: string;
        url: string;
      };

      const tasks: DownloadTask[] = [];
      const evidenceImageKeys = new Set(["novedad", "lote", "proveedor", "cantidades"]);

      for (const record of records as EvidenceRecord[]) {
        const productData = Array.isArray(record.products) ? record.products[0] : record.products;
        const productName = productData?.name?.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase() || "PRODUCTO";
        const folderName = `${productName}/${record.id.substring(0, 8)}`;
        const folder = zip.folder(folderName);

        if (
          record.reason === "averia_transporte" ||
          record.reason === "reporte_calidad" ||
          record.reason === "calidad_nacional" ||
          record.reason === "fecha_corta_cedi"
        ) {
          const evidences = (record.transport_evidence || {}) as Record<string, string>;
          const txtLines = [
            `Tipo de registro: ${REASON_LABELS[record.reason] || record.reason}`,
            `Producto: ${productData?.name || "Producto no identificado"}`,
            `Cantidad: ${record.qty} ${record.unit}`,
            `Fecha y hora: ${new Date(record.created_at).toLocaleString("es-CO")}`,
            `Reportado por: ${record.deposited_by || "N/A"}`,
            `Codigo tienda: ${record.store_code || "N/A"}`,
            `Area: ${record.area || "N/A"}`,
          ];

          if (record.reason === "averia_transporte") {
            txtLines.push(
              `Conductor: ${record.transport_driver || "N/A"}`,
              `Placa: ${record.transport_plate || "N/A"}`,
            );
          }

          if (evidences.proveedor_texto) {
            txtLines.push(`Proveedor: ${evidences.proveedor_texto}`);
          }
          if (evidences.lote_texto) {
            txtLines.push(`Lote: ${evidences.lote_texto}`);
          }
          if (evidences.fecha_vencimiento) {
            txtLines.push(`Fecha de vencimiento: ${evidences.fecha_vencimiento}`);
          }

          txtLines.push(
            `Descripcion de la novedad: ${record.transport_comment || evidences.novedad_texto || record.observation || "Sin descripcion"}`,
          );

          folder?.file("DETALLE.txt", txtLines.join("\r\n"));
        }

        if (record.transport_evidence) {
          const evidences = record.transport_evidence as Record<string, string>;
          for (const [type, url] of Object.entries(evidences)) {
            if (evidenceImageKeys.has(type) && url) {
              tasks.push({
                folder: folderName,
                fileName: `${type.toUpperCase()}.jpg`,
                url,
              });
            }
          }
        } else if (record.image_url) {
          tasks.push({
            folder: folderName,
            fileName: `EVIDENCIA_${record.id.substring(0, 8)}.jpg`,
            url: record.image_url,
          });
        }
      }

      totalFiles = tasks.length;

      if (totalFiles === 0) {
        toast.dismiss();
        toast.info("Los registros de esta fecha no contienen imágenes válidas.");
        setIsDownloading(false);
        return;
      }

      for (const task of tasks) {
        try {
          const response = await fetch(task.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();

          zip.folder(task.folder)?.file(task.fileName, blob);
          downloadedFiles++;
          setDownloadProgress(Math.round((downloadedFiles / totalFiles) * 100));
        } catch (e) {
          console.error(`Failed to download ${task.url}`, e);
        }
      }

      toast.dismiss();
      toast.loading("Empaquetando ZIP...");

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `Evidencias_${selectedDate}.zip`);

      toast.dismiss();
      toast.success(`¡Descarga completada! (${downloadedFiles} fotos)`);
    } catch (err: unknown) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : "Error al descargar las evidencias");
      console.error(err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
      <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-4">
        <div className="rounded-xl bg-red-50 p-3 text-red-600">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Galería de evidencias</h2>
          <p className="text-xs font-medium text-slate-500">
            Descarga las fotos de avería y calidad organizadas por producto.
          </p>
        </div>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Selecciona una fecha</label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 font-medium text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !selectedDate}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 hover:from-red-500 hover:to-red-400"
          >
            {isDownloading ? (
              <>
                <div
                  className="absolute bottom-0 left-0 top-0 bg-black/10 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
                <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
                <span className="relative z-10">Descargando {downloadProgress}%...</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>Descargar evidencias (ZIP)</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 lg:p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Resumen de descarga
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-900">
            Evidencias organizadas por producto y fecha
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El ZIP conserva la trazabilidad del reporte y agrupa las fotos por producto,
            dejando a mano la evidencia visual y el detalle operativo del registro.
          </p>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-700">Incluye:</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Fotos por producto y por registro.</li>
              <li>Archivo `DETALLE.txt` cuando aplica transporte, calidad o fecha corta.</li>
              <li>Nombre de archivo listo para auditoría y consulta posterior.</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            El archivo `.zip` contendrá carpetas por cada producto reportado con sus respectivas
            fotos de evidencia (Rótulo, Proveedor, Cantidades, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}
