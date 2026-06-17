"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, ChevronRight, XCircle } from "lucide-react";
import { assignDailyTasks, updateDailyTaskStatus } from "./actions";
import { useProfile } from '@/components/ui/ProfileContext';
import type { DailyBasic, BasicTaskConfig, StoreAssistant, DailyBasicStatus, DailyBasicFault } from "@/lib/domain/types";
import { toast } from "sonner";

export default function ChecklistsClient({
  initialTasks,
  configuredBasics,
  assistants,
  today,
}: {
  initialTasks: DailyBasic[];
  configuredBasics: BasicTaskConfig[];
  assistants: StoreAssistant[];
  today: string;
}) {
  const { profile } = useProfile();
  const operator = profile?.display_name;
  const [activeTab, setActiveTab] = useState<"asignacion" | "verificacion">("verificacion");
  const [isPending, startTransition] = useTransition();

  // State for assignment tab
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Time tracking
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // Check every 30s
    return () => clearInterval(timer);
  }, []);

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    const toAssign = configuredBasics
      .filter((b) => assignments[b.id])
      .map((b) => ({
        task_name: b.name,
        task_type: b.type,
        assigned_to: assignments[b.id],
        date: today,
      }));

    if (toAssign.length === 0) {
      toast.error("Selecciona al menos un asistente para asignar un básico.");
      return;
    }

    startTransition(async () => {
      try {
        await assignDailyTasks(toAssign, operator);
        toast.success("Básicos asignados correctamente.");
        setActiveTab("verificacion");
      } catch (err) {
        toast.error("Error al asignar básicos.");
      }
    });
  }

  function handleStatusUpdate(taskId: string, status: DailyBasicStatus, fault?: DailyBasicFault) {
    startTransition(async () => {
      try {
        await updateDailyTaskStatus(taskId, status, fault, operator);
        toast.success("Estado actualizado.");
      } catch {
        toast.error("Error al actualizar estado.");
      }
    });
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
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">
              Básicos Diarios
            </h1>
            <p className="text-[10px] text-white/90">
              {today}
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-3 bg-white border-b border-zinc-100 flex gap-2">
        <button
          onClick={() => setActiveTab("verificacion")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-colors ${
            activeTab === "verificacion" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
          }`}
        >
          Verificación
        </button>
        <button
          onClick={() => setActiveTab("asignacion")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-colors ${
            activeTab === "asignacion" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
          }`}
        >
          Asignar
        </button>
        <Link
          href="/audits/analytics"
          className="flex items-center justify-center px-3 py-2 text-[13px] font-bold rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          Análisis
        </Link>
      </div>

      <div className="px-4 pt-4 pb-2">
        <Link href="/audits/daily" className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-200 transition-colors">
          <CheckCircle2 className="h-5 w-5" />
          Iniciar Rutina Paso a Paso
        </Link>
      </div>

      <div className="p-4">
        {activeTab === "asignacion" && (
          <form onSubmit={handleAssign} className="space-y-4">
            {configuredBasics.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No hay básicos configurados. Configúralos en Equipo.
              </div>
            ) : (
              configuredBasics.map((basic) => {
                const alreadyAssigned = initialTasks.some((t) => t.task_name === basic.name);
                return (
                  <div key={basic.id} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-sm text-slate-800">{basic.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${basic.type === 'apertura' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {basic.type}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-2">
                      Límite: <span className="text-slate-800">{basic.deadline_time}</span>
                    </div>
                    
                    {alreadyAssigned ? (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                        Ya asignado para hoy
                      </div>
                    ) : (
                      <select
                        value={assignments[basic.id] || ""}
                        onChange={(e) => setAssignments(prev => ({ ...prev, [basic.id]: e.target.value }))}
                        className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Seleccionar Asistente --</option>
                        {operator && (
                          <option value={operator}>{operator} (Tú)</option>
                        )}
                        {assistants.map((a, i) => (
                          <option key={i} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })
            )}

            {configuredBasics.length > 0 && (
              <button
                type="submit"
                disabled={isPending}
                className="mt-6 w-full rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-70 transition-all"
              >
                {isPending ? "Asignando..." : "Asignar Seleccionados"}
              </button>
            )}
          </form>
        )}

        {activeTab === "verificacion" && (
          <div className="space-y-4">
            {initialTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No hay básicos asignados para hoy.
              </div>
            ) : (
              initialTasks.map((task) => {
                // Find deadline from config
                const config = configuredBasics.find(b => b.name === task.task_name);
                const deadlineTimeStr = config?.deadline_time || "23:59";
                
                // Parse deadline into today's Date
                const [hours, minutes] = deadlineTimeStr.split(":").map(Number);
                const deadlineDate = new Date(currentTime);
                deadlineDate.setHours(hours, minutes, 0, 0);

                const isPendingTask = task.status === "en_espera";
                const isOverdue = isPendingTask && currentTime > deadlineDate;
                
                // Calculate minutes left
                const minutesLeft = Math.floor((deadlineDate.getTime() - currentTime.getTime()) / 60000);
                const isWarning = isPendingTask && minutesLeft > 0 && minutesLeft <= 15;

                return (
                  <div key={task.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${isOverdue ? 'border-red-300 ring-1 ring-red-300' : isWarning ? 'border-amber-300 ring-1 ring-amber-300' : 'border-zinc-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{task.task_name}</h3>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Resp: <span className="text-slate-700">{task.assigned_to}</span></p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${task.task_type === 'apertura' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {task.task_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">Límite: {deadlineTimeStr}</span>
                      
                      {isPendingTask && !isOverdue && (
                         <span className={`text-[10px] font-bold ml-auto ${isWarning ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                           {minutesLeft} min restantes
                         </span>
                      )}
                    </div>

                    {isPendingTask && !isOverdue && (
                      <button
                        onClick={() => handleStatusUpdate(task.id, "realizado")}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 py-2.5 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marcar como Realizado
                      </button>
                    )}

                    {isOverdue && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                          Tiempo vencido. Re-evaluar:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleStatusUpdate(task.id, "no_realizado", "asistente")}
                            disabled={isPending}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white py-2 text-[11px] font-bold hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Falla Asistente
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(task.id, "realizado", "supervisor")}
                            disabled={isPending}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-white py-2 text-[11px] font-bold hover:bg-amber-600 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Olvido Supervisor
                          </button>
                        </div>
                      </div>
                    )}

                    {task.status === "realizado" && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg justify-center mt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Completado {task.fault === 'supervisor' ? '(Verificación tardía)' : ''}
                      </div>
                    )}

                    {task.status === "no_realizado" && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg justify-center mt-2">
                        <XCircle className="w-4 h-4" />
                        No Realizado
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
