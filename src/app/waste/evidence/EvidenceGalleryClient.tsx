"use client";

import { useState } from "react";
import { Download, Calendar as CalendarIcon, Loader2, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchEvidenceByDate } from "./actions";
import { toast } from "sonner";

export default function EvidenceGalleryClient() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // 1. Fetch records for the selected date
      // We use start of day and end of day in local time for the selected date
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

      // 2. Extract all images and organize by product
      const zip = new JSZip();
      let totalFiles = 0;
      let downloadedFiles = 0;

      type DownloadTask = {
        folder: string;
        fileName: string;
        url: string;
      };

      const tasks: DownloadTask[] = [];

      for (const record of records as any[]) {
        const productData = Array.isArray(record.products) ? record.products[0] : record.products;
        const productName = productData?.name?.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() || "PRODUCTO";
        const folderName = `${productName}`;

        if (record.transport_evidence) {
          // Multiple evidences (transport/quality)
          const evidences = record.transport_evidence as Record<string, string>;
          for (const [type, path] of Object.entries(evidences)) {
            if (path) {
              const url = `${supabaseUrl}/storage/v1/object/public/waste-evidence/${path}`;
              tasks.push({
                folder: folderName,
                fileName: `${type.toUpperCase()}.jpg`,
                url
              });
            }
          }
        } else if (record.image_url) {
          // Single evidence
          const url = `${supabaseUrl}/storage/v1/object/public/waste-evidence/${record.image_url}`;
          tasks.push({
            folder: folderName,
            fileName: `EVIDENCIA_${record.id.substring(0, 8)}.jpg`,
            url
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

      // 3. Download all files
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
          // We continue with other files even if one fails
        }
      }

      toast.dismiss();
      toast.loading("Empaquetando ZIP...");

      // 4. Generate ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `Evidencias_${selectedDate}.zip`);

      toast.dismiss();
      toast.success(`¡Descarga completada! (${downloadedFiles} fotos)`);

    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Error al descargar las evidencias");
      console.error(err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Galería de Evidencias</h2>
          <p className="text-xs text-slate-500 font-medium">Descarga las fotos de Avería y Calidad organizadas por producto.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Selecciona una fecha</label>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading || !selectedDate}
          className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] overflow-hidden"
        >
          {isDownloading ? (
            <>
              <div 
                className="absolute left-0 top-0 bottom-0 bg-black/10 transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
              <Loader2 className="w-5 h-5 animate-spin relative z-10" />
              <span className="relative z-10">Descargando {downloadProgress}%...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Descargar Evidencias (ZIP)</span>
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          El archivo .zip contendrá carpetas por cada producto reportado con sus respectivas fotos de evidencia (Rotulo, Proveedor, Cantidades, etc.).
        </p>
      </div>
    </div>
  );
}
