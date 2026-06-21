"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Truck } from "lucide-react";
import { toast } from "sonner";

type Props = {
  storeName: string;
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

export default function TruckArrivalReportCard({ storeName }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [pallets, setPallets] = useState("");
  const [driver, setDriver] = useState("");
  const [plate, setPlate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [novelty, setNovelty] = useState("S/N.");

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
      await navigator.clipboard.writeText(reportText);
      toast.success("Reporte del camión copiado.");
    } catch {
      toast.error("No se pudo copiar el reporte.");
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
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(229,29,46,0.18)] transition active:scale-[0.98]"
        >
          <Copy className="h-4 w-4" />
          Copiar reporte del camión
        </button>
      </div>
    </section>
  );
}
