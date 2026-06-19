"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Calendar as CalendarIcon, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ShiftData = {
  type?: string;
  shift?: string;
};

type ScheduleRow = {
  assistant: string;
  total_hours: string | number;
  [key: string]: string | number | ShiftData | undefined;
};

type ScheduleData = ScheduleRow[] | { schedule?: ScheduleRow[] } | null | undefined;

type ScheduleItem = {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  schedule_data?: ScheduleData;
};

export default function ClientSchedule({ initialSchedules }: { initialSchedules: ScheduleItem[] }) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [weekStart, setWeekStart] = useState("");
  const [holidays, setHolidays] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);

  // Helper to colorize shifts
  const getShiftColor = (type: string) => {
    if (!type) return "bg-slate-100 text-slate-600";
    const t = type.toLowerCase();
    if (t.includes("apertura")) return "bg-blue-100 text-blue-700";
    if (t.includes("cierre")) return "bg-indigo-100 text-indigo-700";
    if (t.includes("intermedio")) return "bg-amber-100 text-amber-700";
    if (t.includes("descanso")) return "bg-emerald-100 text-emerald-700";
    if (t.includes("partido")) return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

  async function handleGenerate() {
    if (!weekStart) {
      toast.error("Selecciona la fecha de inicio de semana.");
      return;
    }

    setIsGenerating(true);
    const dateStart = new Date(weekStart);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 6); // Lunes a Domingo

    const holidaysArr = holidays.split(",").map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: dateStart.toISOString().split("T")[0],
          weekEnd: dateEnd.toISOString().split("T")[0],
          holidays: holidaysArr
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar malla.");

      setSchedules([data.schedule, ...schedules]);
      toast.success("Malla generada con éxito.");
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar malla.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta malla?")) return;
    try {
      const res = await fetch("/api/schedule/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      setSchedules(schedules.filter(s => s.id !== id));
      toast.success("Malla eliminada");
      if (selectedSchedule?.id === id) setSelectedSchedule(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const selectedScheduleRows: ScheduleRow[] = selectedSchedule
    ? Array.isArray(selectedSchedule.schedule_data)
      ? selectedSchedule.schedule_data
      : selectedSchedule.schedule_data?.schedule ?? []
    : [];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 pb-5 pt-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)]">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 text-white transition-colors hover:bg-white/28"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Planificación operativa
            </p>
            <h1 className="mt-1 text-lg font-black leading-tight text-white">
              Malla de Horarios
            </h1>
            <p className="mt-1 text-[12px] leading-tight text-white/88">
              Generador semanal con IA
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
            {schedules.length} mallas
          </span>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        <button
          onClick={() => setShowModal(true)}
          className="group relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e51d2e] via-[#f22435] to-[#ff5b6b] p-5 text-left text-white shadow-[0_18px_36px_rgba(229,29,46,0.24)] transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-6 -top-6 text-white/10">
            <Sparkles className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/15">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/72">
                Generación asistida
              </p>
              <h2 className="mt-1 text-[18px] font-black leading-tight">
                Generar Malla con IA
              </h2>
              <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-white/84">
                Arma automáticamente los turnos de la semana sin pelearte con la planilla.
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/92 ring-1 ring-white/12">
            Abrir generador
          </div>
        </button>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
            Horarios generados
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
            {schedules.length} recientes
          </span>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <CalendarIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              Aún no has generado ninguna malla.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Crea la primera semana desde el generador IA para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-1">
            {schedules.map(sch => (
              <div key={sch.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Semana
                    </p>
                    <p className="mt-1 text-[15px] font-black text-slate-900">
                      {sch.week_start} al {sch.week_end}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      sch.status === "publicado"
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-amber-100 text-amber-700 ring-1 ring-amber-100"
                    }`}
                  >
                    {sch.status === "publicado" ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-[12px] font-medium text-slate-500">
                    Toca el chevrón para ver la malla completa.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(sch.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedSchedule(sch)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Configuración
            </p>
            <h2 className="mt-1 text-[18px] font-black text-slate-900">
              Nueva Malla Semanal
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              La IA tomará las reglas de tu tienda y las aplicará a esta semana.
            </p>

            <div className="mb-6 space-y-4 pt-5">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Inicio de semana (lunes)
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={e => setWeekStart(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Días festivos (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. lunes, jueves..."
                  value={holidays}
                  onChange={e => setHolidays(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Separados por comas si hay más de uno.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#e51d2e] py-3 text-sm font-bold text-white transition-colors hover:bg-[#c71a29] disabled:opacity-70"
              >
                {isGenerating ? "Generando..." : "Crear malla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-right">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Malla abierta
                </p>
                <h2 className="mt-0.5 text-sm font-black text-slate-900">
                  Malla de Horarios
                </h2>
                <p className="text-[10px] text-slate-500">
                  {selectedSchedule.week_start} al {selectedSchedule.week_end}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${selectedSchedule.status === 'publicado' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-100' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-100'}`}>
              {selectedSchedule.status === 'publicado' ? 'Publicado' : 'Borrador'}
            </span>
          </header>

          <div className="flex-1 overflow-auto px-4 pb-4 pt-4">
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap text-xs text-left">
                  <thead>
                    <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                      <th className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50/95 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-[6px_0_14px_-10px_rgba(15,23,42,0.35)]">
                        Asistente
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Lunes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Martes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Miércoles
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Jueves
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Viernes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Sábado
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Domingo
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Total Hrs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedScheduleRows.map((row: ScheduleRow, i: number) => (
                      <tr key={i} className="border-b border-slate-100/80 odd:bg-white even:bg-slate-50/20 hover:bg-slate-50">
                        <td className="sticky left-0 z-20 border-r border-slate-200/80 bg-white px-4 py-3 font-bold text-slate-900 shadow-[8px_0_16px_-12px_rgba(15,23,42,0.35)]">
                          {row.assistant}
                        </td>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                          const shiftData = row[day] as ShiftData | undefined;
                          if (!shiftData) {
                            return <td key={day} className="border-r border-slate-200/80 bg-slate-50/40 p-2"></td>;
                          }
                          return (
                            <td key={day} className="border-r border-slate-200/80 bg-white p-2">
                              <div className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center ring-1 shadow-sm ${getShiftColor(shiftData.type ?? "")}`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.14em]">{shiftData.type}</span>
                                {shiftData.shift !== "Descanso" && (
                                  <span className="mt-0.5 text-[11px] font-medium opacity-90">{shiftData.shift}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="bg-slate-50/80 px-4 py-3 text-center text-[14px] font-black text-slate-900 ring-1 ring-inset ring-slate-100">
                          {row.total_hours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedScheduleRows.length === 0 && (
                  <div className="border-t border-slate-200/80 bg-slate-50/80 p-6 text-center text-slate-500">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Estado técnico
                    </p>
                    <p className="mb-4 text-sm text-rose-500">
                      El formato devuelto por la IA no fue el esperado. Aquí tienes los datos en crudo para que puedas ver el horario:
                    </p>
                    <div className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-left text-[10px] font-mono whitespace-pre-wrap text-emerald-400 ring-1 ring-slate-800/60">
                      {JSON.stringify(selectedSchedule.schedule_data, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
