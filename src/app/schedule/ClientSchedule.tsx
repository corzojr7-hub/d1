"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Calendar as CalendarIcon, CheckCircle2, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientSchedule({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [weekStart, setWeekStart] = useState("");
  const [holidays, setHolidays] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

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
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col flex-1">
            <h1 className="text-lg font-bold leading-tight text-white">
              Malla de Horarios
            </h1>
            <p className="text-[10px] text-white/90">
              Generador Semanal con IA
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 text-white/10">
            <Sparkles className="w-24 h-24" />
          </div>
          <Sparkles className="w-8 h-8 relative z-10" />
          <div className="relative z-10 text-center">
            <h2 className="font-bold text-lg">Generar Malla con IA</h2>
            <p className="text-xs text-white/80 mt-1">Arma automáticamente los turnos de la semana</p>
          </div>
        </button>

        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">Horarios Generados</h3>
        
        {schedules.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
            <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aún no has generado ninguna malla.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(sch => (
              <div key={sch.id} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Semana</p>
                  <p className="text-sm font-bold text-slate-800">{sch.week_start} al {sch.week_end}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-2 ${sch.status === 'publicado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {sch.status === 'publicado' ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDelete(sch.id)}
                    className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedSchedule(sch)}
                    className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Nueva Malla Semanal</h2>
            <p className="text-xs text-slate-500 mb-6">La IA tomará las reglas de tu tienda y las aplicará a esta semana.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Inicio de Semana (Lunes)</label>
                <input 
                  type="date" 
                  value={weekStart}
                  onChange={e => setWeekStart(e.target.value)}
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Días Festivos (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Lunes, Jueves..."
                  value={holidays}
                  onChange={e => setHolidays(e.target.value)}
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">Separados por comas si hay más de uno.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-full flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-70"
              >
                {isGenerating ? "Generando..." : "Crear Malla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-right">
          <header className="bg-white px-4 py-4 shadow-sm flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Malla de Horarios</h2>
                <p className="text-[10px] text-slate-500">{selectedSchedule.week_start} al {selectedSchedule.week_end}</p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedSchedule.status === 'publicado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {selectedSchedule.status === 'publicado' ? 'Publicado' : 'Borrador'}
            </span>
          </header>

          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 sticky left-0 bg-slate-50 z-20">Asistente</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Lunes</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Martes</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Miércoles</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Jueves</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Viernes</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Sábado</th>
                      <th className="p-3 font-bold text-slate-600 border-r border-slate-200 text-center min-w-[90px]">Domingo</th>
                      <th className="p-3 font-bold text-slate-600 text-center">Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((Array.isArray(selectedSchedule.schedule_data) ? selectedSchedule.schedule_data : selectedSchedule.schedule_data?.schedule) || []).map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {row.assistant}
                        </td>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                          const shiftData = row[day];
                          if (!shiftData) return <td key={day} className="p-2 border-r border-slate-200"></td>;
                          return (
                            <td key={day} className="p-2 border-r border-slate-200">
                              <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg ${getShiftColor(shiftData.type)}`}>
                                <span className="font-bold text-[10px] uppercase tracking-wider">{shiftData.type}</span>
                                {shiftData.shift !== "Descanso" && (
                                  <span className="font-medium mt-0.5 text-[11px] opacity-90">{shiftData.shift}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-bold text-slate-700 bg-slate-50/50">
                          {row.total_hours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!selectedSchedule.schedule_data || ((Array.isArray(selectedSchedule.schedule_data) ? selectedSchedule.schedule_data : selectedSchedule.schedule_data.schedule) || []).length === 0) && (
                  <div className="p-8 text-center text-slate-500">
                    <p className="text-sm mb-4 text-red-500">El formato devuelto por la IA no fue el esperado. Aquí tienes los datos en crudo para que puedas ver el horario:</p>
                    <div className="bg-slate-800 text-emerald-400 p-4 rounded-xl text-left overflow-x-auto text-[10px] font-mono whitespace-pre-wrap">
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
