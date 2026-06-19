"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, ChevronRight, XCircle } from "lucide-react";
import { assignDailyTasks, updateDailyTaskStatus, saveBasicTasksConfig } from "./actions";
import { Trash2, Plus, Save } from "lucide-react";
import { useProfile } from '@/components/ui/ProfileContext';
import type { DailyBasic, BasicTaskConfig, StoreAssistant, DailyBasicStatus, DailyBasicFault } from "@/lib/domain/types";
import { toast } from "sonner";

export default function ChecklistsClient({
  initialTasks,
  configuredBasics,
  assistants,
  today,
  isSupervisor = false,
}: {
  initialTasks: DailyBasic[];
  configuredBasics: BasicTaskConfig[];
  assistants: StoreAssistant[];
  today: string;
  isSupervisor?: boolean;
}) {
  const { profile } = useProfile();
  const operator = profile?.display_name;
  const [activeTab, setActiveTab] = useState<"asignacion" | "verificacion" | "configuracion">("verificacion");
  const [isPending, startTransition] = useTransition();

  // State for configuration tab
  const [localBasics, setLocalBasics] = useState<BasicTaskConfig[]>(configuredBasics);

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
      } catch {
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

  function generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  function addBasicTask() {
    setLocalBasics([
      ...localBasics,
      { id: generateId(), name: "", type: "apertura", deadline_time: "08:00" },
    ]);
  }

  function removeBasicTask(indexToRemove: number) {
    setLocalBasics(localBasics.filter((_, idx) => idx !== indexToRemove));
  }

  function updateBasicTask(index: number, field: keyof BasicTaskConfig, value: string) {
    const nextTasks = [...localBasics];
    nextTasks[index] = { ...nextTasks[index], [field]: value };
    setLocalBasics(nextTasks);
  }

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    const validTasks = localBasics.filter((task) => task.name.trim().length > 0 && task.deadline_time.length > 0);
    startTransition(async () => {
      try {
        await saveBasicTasksConfig(validTasks);
        toast.success("Configuración de básicos guardada.");
      } catch {
        toast.error("Error al guardar configuración.");
      }
    });
  }

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
              Operación diaria
            </p>
            <h1 className="mt-1 text-lg font-black leading-tight text-white">
              Básicos Diarios
            </h1>
            <p className="mt-1 text-[12px] text-white/88">
              {today}
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
            {initialTasks.length} hoy
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-1.5 rounded-[22px] bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        <button
          onClick={() => setActiveTab("verificacion")}
          className={`rounded-[18px] py-2.5 text-[13px] font-bold transition-all ${
            activeTab === "verificacion" ? "bg-[#e51d2e] text-white shadow-[0_10px_22px_rgba(229,29,46,0.18)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          Verificación
        </button>
        <button
          onClick={() => setActiveTab("asignacion")}
          className={`rounded-[18px] py-2.5 text-[13px] font-bold transition-all ${
            activeTab === "asignacion" ? "bg-[#e51d2e] text-white shadow-[0_10px_22px_rgba(229,29,46,0.18)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          Asignar
        </button>
        {isSupervisor && (
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`rounded-[18px] py-2.5 text-[13px] font-bold transition-all ${
              activeTab === "configuracion" ? "bg-[#e51d2e] text-white shadow-[0_10px_22px_rgba(229,29,46,0.18)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            Configurar
          </button>
        )}
        <Link
          href="/audits/analytics"
          className="flex items-center justify-center rounded-[18px] px-3 py-2.5 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          Análisis
        </Link>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <Link
          href="/audits/daily"
          className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-4 text-white shadow-[0_18px_36px_rgba(16,185,129,0.18)] transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
                Rutina guiada
              </p>
              <p className="mt-1 text-sm font-black">
                Iniciar rutina paso a paso
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/80" />
        </Link>
      </div>

      <div className="space-y-4 px-4 pt-2">
        {activeTab === "asignacion" && (
          <form onSubmit={handleAssign} className="space-y-4">
            {configuredBasics.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Sin básicos
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  No hay básicos configurados.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  Configúralos en Equipo para poder asignarlos aquí.
                </p>
              </div>
            ) : (
              configuredBasics.map((basic) => {
                const alreadyAssigned = initialTasks.some((t) => t.task_name === basic.name);
                return (
                  <div key={basic.id} className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-sm font-black leading-tight text-slate-900">{basic.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${basic.type === 'apertura' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-100' : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-100'}`}>
                        {basic.type}
                      </span>
                    </div>
                    <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
                      Límite: <span className="text-slate-800">{basic.deadline_time}</span>
                    </div>
                    
                    {alreadyAssigned ? (
                      <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Ya asignado para hoy
                      </div>
                    ) : (
                      <select
                        value={assignments[basic.id] || ""}
                        onChange={(e) => setAssignments(prev => ({ ...prev, [basic.id]: e.target.value }))}
                        className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
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
                className="mt-6 w-full rounded-full bg-[#e51d2e] py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(229,29,46,0.18)] active:scale-95 disabled:opacity-70 transition-all"
              >
                {isPending ? "Asignando..." : "Asignar Seleccionados"}
              </button>
            )}
          </form>
        )}

        {activeTab === "verificacion" && (
          <div className="space-y-4">
            {initialTasks.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Sin tareas
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  No hay básicos asignados para hoy.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  Pasa a Asignar para distribuir los básicos del día.
                </p>
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
                  <div key={task.id} className={`rounded-[28px] bg-white p-4 shadow-sm border ${isOverdue ? 'border-red-300 ring-1 ring-red-300' : isWarning ? 'border-amber-300 ring-1 ring-amber-300' : 'border-slate-100 ring-1 ring-slate-100'}`}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black leading-tight text-slate-900">{task.task_name}</h3>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Resp: <span className="text-slate-700">{task.assigned_to}</span></p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${task.task_type === 'apertura' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-100' : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-100'}`}>
                        {task.task_type}
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-100">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-medium">Límite: {deadlineTimeStr}</span>
                      
                      {isPendingTask && !isOverdue && (
                         <span className={`ml-auto text-[10px] font-bold ${isWarning ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                           {minutesLeft} min restantes
                         </span>
                      )}
                    </div>

                    {isPendingTask && !isOverdue && (
                      <button
                        onClick={() => handleStatusUpdate(task.id, "realizado")}
                        disabled={isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 transition-colors hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marcar como Realizado
                      </button>
                    )}

                    {isOverdue && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-600 ring-1 ring-red-100">
                          <AlertTriangle className="w-4 h-4" />
                          Tiempo vencido. Re-evaluar:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleStatusUpdate(task.id, "no_realizado", "asistente")}
                            disabled={isPending}
                            className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-600 px-3 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-red-700"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Falla Asistente
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(task.id, "realizado", "supervisor")}
                            disabled={isPending}
                            className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-amber-600"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Olvido Supervisor
                          </button>
                        </div>
                      </div>
                    )}

                    {task.status === "realizado" && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                        Completado {task.fault === 'supervisor' ? '(Verificación tardía)' : ''}
                      </div>
                    )}

                    {task.status === "no_realizado" && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl bg-red-50 p-2.5 text-xs font-bold text-red-700 ring-1 ring-red-100">
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

        {activeTab === "configuracion" && isSupervisor && (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase mb-4">
                Configuración de Básicos
              </h2>
              
              <div className="space-y-4">
                {localBasics.map((task, index) => (
                  <div key={task.id} className="relative rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => removeBasicTask(index)}
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                      title="Eliminar básico"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    
                    <div className="mb-3 text-[10px] font-bold uppercase text-slate-400">
                      Básico {index + 1}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 pr-8">
                      <div className="sm:col-span-6">
                        <label className="block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Nombre del básico</span>
                          <input
                            value={task.name}
                            onChange={(e) => updateBasicTask(index, "name", e.target.value)}
                            className="min-h-10 w-full rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej. Pisos limpios"
                          />
                        </label>
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label className="block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Tipo</span>
                          <select
                            value={task.type}
                            onChange={(e) => updateBasicTask(index, "type", e.target.value as "apertura" | "cierre")}
                            className="min-h-10 w-full rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="apertura">Apertura</option>
                            <option value="cierre">Cierre</option>
                          </select>
                        </label>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Hora Límite</span>
                          <input
                            type="time"
                            value={task.deadline_time}
                            onChange={(e) => updateBasicTask(index, "deadline_time", e.target.value)}
                            className="min-h-10 w-full rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBasicTask}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-sm font-bold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Plus className="h-4 w-4" /> Agregar Básico
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-[#e51d2e] py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-70 transition-all"
            >
              <Save className="h-5 w-5" />
              {isPending ? "Guardando..." : "Guardar Configuración"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
