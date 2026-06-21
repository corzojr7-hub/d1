"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Truck } from "lucide-react";
import { toast } from "sonner";
import { markTruckReportSent, saveTruckReport } from "@/app/actions/truck-report";
import type { TruckReportPayload } from "@/lib/truck-report";

type Props = {
  storeName: string;
  initialReports: Array<{
    id: string;
    author: string;
    created_at: string;
    payload: TruckReportPayload;
  }>;
};

const ARRIVAL_AREAS = [
  "Secos",
  "Distribución",
  "Fruver",
  "Fríos",
  "Congelados",
] as const;

function formatBogotaNow(date: Date) {
  const formatted = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);

  return formatted.replace(",", "");
}

export default function TruckArrivalReportCard({ storeName, initialReports }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [pallets, setPallets] = useState("");
  const [driver, setDriver] = useState("");
  const [plate, setPlate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [novelty, setNovelty] = useState("S/N.");
  const [isSaving, setIsSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const needsTemperature =
    selectedAreas.includes("Fríos") || selectedAreas.includes("Congelados");

  const reportText = useMemo(() => {
    const lines = [
      "*REPORTE DE LLEGADA CAMIÓN*",
      `Fecha y hora: ${formatBogotaNow(now)}`,
      `TIENDA: *${storeName.toUpperCase()}*`,
      `Cuadrantes recibidos: *${selectedAreas.join(", ")}*`,
      `Estibas recibidas: *${pallets}*`,
      `Conductor: *${driver.toUpperCase()}*`,
      `Placa: *${plate.toUpperCase()}*`,
    ];

    if (needsTemperature) {
      lines.push(`Temperatura de fríos/congelados: *${temperature}°C*`);
    }

    lines.push(`Novedad inicial: ${novelty}`);
    return lines.join("\n");
  }, [driver, needsTemperature, novelty, now, pallets, plate, selectedAreas, storeName, temperature]);

  function toggleArea(area: string) {
    setSelectedAreas((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area],
    );
  }

  async function handleCopy() {
    if (selectedAreas.length === 0) {
      toast.error("Selecciona al menos un cuadrante.");
      return;
    }
    if (!pallets.trim() || !driver.trim() || !plate.trim() || !novelty.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }
    if (needsTemperature && !temperature.trim()) {
      toast.error("Ingresa la temperatura de fríos o congelados.");
      return;
    }

    try {
      setIsSaving(true);
      await saveTruckReport({
        reportText,
        reportedAt: now.toISOString(),
        storeName,
        arrivalAreas: selectedAreas,
        pallets,
        driver,
        plate,
        temperature: needsTemperature ? temperature : "",
        novelty,
      });
      await navigator.clipboard.writeText(reportText);
      toast.success("Reporte guardado y copiado.");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar o copiar el reporte.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkSent(id: string) {
    try {
      setSendingId(id);
      await markTruckReportSent(id);
      toast.success("Reporte marcado como enviado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar como enviado.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <section className="mx-4 mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Reporte Express
          </p>
          <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
            Llegada de camión
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Llena los datos mínimos y copia el mensaje listo para WhatsApp.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
            Cuadrantes que llegaron
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ARRIVAL_AREAS.map((area) => {
              const active = selectedAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`rounded-2xl px-3 py-2 text-left text-[12px] font-bold transition ${
                    active
                      ? "bg-[#e51d2e] text-white shadow-[0_10px_20px_rgba(229,29,46,0.16)]"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Estibas recibidas
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={pallets}
              onChange={(e) => setPallets(e.target.value)}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]"
              placeholder="Ej. 24"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Temperatura
            </span>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              disabled={!needsTemperature}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={needsTemperature ? "Ej. -3" : "Solo fríos o congelados"}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Conductor
            </span>
            <input
              type="text"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]"
              placeholder="Ej. Andrés Chitiva"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Placa
            </span>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase text-slate-800 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]"
              placeholder="Ej. LUL 693"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
            Novedad inicial
          </span>
          <textarea
            rows={3}
            value={novelty}
            onChange={(e) => setNovelty(e.target.value)}
            className="w-full resize-none rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]"
            placeholder="Ej. S/N. o estibas caídas, lluvia, discusión con el conductor..."
          />
        </label>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Vista previa
          </p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-[12px] font-medium leading-relaxed text-slate-800">
            {reportText}
          </pre>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={isSaving}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(229,29,46,0.18)] transition active:scale-[0.98]"
        >
          <Copy className="h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar y copiar reporte"}
        </button>

        {initialReports.length > 0 && (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Reportes de hoy
            </p>

            <div className="mt-3 space-y-3">
              {initialReports.map((report) => {
                const sent = Boolean(report.payload.sentAt);
                return (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
                          {report.payload.arrivalAreas.join(", ")}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-900">
                          {report.payload.pallets} estibas · {report.payload.driver}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {new Intl.DateTimeFormat("es-CO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Bogota",
                          }).format(new Date(report.created_at))}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          sent
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}
                      >
                        {sent ? "Enviado" : "Pendiente"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(report.payload.reportText);
                            toast.success("Reporte copiado.");
                          } catch {
                            toast.error("No se pudo copiar el reporte.");
                          }
                        }}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Copiar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkSent(report.id)}
                        disabled={sendingId === report.id}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {sent ? "Marcar reenviado" : "Marcar enviado"}
                      </button>
                    </div>

                    {report.payload.sentAt && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Enviado por {report.payload.sentBy || report.author} el{" "}
                        {new Intl.DateTimeFormat("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Bogota",
                        }).format(new Date(report.payload.sentAt))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
