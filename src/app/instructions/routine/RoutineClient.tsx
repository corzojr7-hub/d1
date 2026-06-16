"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, Circle, Clock, Target, PlayCircle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { generateRoutineTasks, updateTaskStatus } from "./actions";
import { useOperator } from "@/components/ui/OperatorContext";

export default function RoutineClient({ initialTasks, assistants, currentUser }: { initialTasks: any[]; assistants: any[]; currentUser: string }) {
  const { operator } = useOperator();
  const [tasks, setTasks] = useState(initialTasks);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingTasks = tasks.filter(t => t.status === "pendiente");
  const inProgressTasks = tasks.filter(t => t.status === "en_progreso");

  const [role, setRole] = useState("");
  const [shift, setShift] = useState("");
  const [responsible, setResponsible] = useState(currentUser);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || (role !== "pasillo" && !shift) || !responsible) {
      toast.error("Llena todos los campos");
      return;
    }

    startTransition(async () => {
      const res = await generateRoutineTasks(role, shift, responsible);
      if (res.success) {
        toast.success("Rutina generada exitosamente");
        setIsGenerating(false);
        // The real update will happen from the server via revalidatePath,
        // but since this is client side, we wait for Next.js to re-render.
      } else {
        toast.error(res.error || "Error al generar la rutina");
      }
    });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateTaskStatus(taskId, newStatus, operator || "");
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (newStatus === "completada") {
          toast.success("¡Tarea Completada!");
        }
      }
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#0a3875] px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/instructions" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold leading-tight text-white flex items-center gap-2">
              <Target className="h-5 w-5" /> Tablero de Rutina
            </h1>
          </div>
          <button 
            onClick={() => setIsGenerating(!isGenerating)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0a3875] shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="p-4">
        {isGenerating && (
          <form onSubmit={handleGenerate} className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100 mb-6">
            <h2 className="font-bold text-slate-800 mb-4">Generador de Rutina Dinámica</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">¿De quién es la rutina?</label>
                <select value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value={currentUser}>Yo ({currentUser})</option>
                  {assistants.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Rol</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Elegir...</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="asistente">Asistente</option>
                    <option value="pasillo">Encargado de Pasillo</option>
                  </select>
                </div>
                {role !== "pasillo" && (
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Turno</label>
                    <select value={shift} onChange={e => setShift(e.target.value)} className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Elegir...</option>
                      <option value="apertura">Apertura</option>
                      <option value="cierre">Cierre</option>
                    </select>
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                disabled={isPending || (!role || (role !== "pasillo" && !shift) || !responsible)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Generando..." : "Cargar Tareas de Rutina"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {/* En Progreso */}
          <div>
            <h3 className="flex items-center gap-2 font-black text-slate-800 mb-3 px-1">
              <PlayCircle className="h-4 w-4 text-amber-500" /> En Progreso ({inProgressTasks.length})
            </h3>
            <div className="space-y-3">
              {inProgressTasks.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-medium text-slate-400">Nadie está ejecutando una tarea</p>
                </div>
              )}
              {inProgressTasks.map(task => (
                <div key={task.id} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl relative shadow-sm">
                  <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-md border border-amber-100">
                    <span className="text-[10px] font-black text-amber-600 uppercase">Haciendo</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1 pr-16">{task.content}</h4>
                  <p className="text-xs text-slate-500 mb-4">A cargo de: <span className="font-bold text-amber-700">{task.responsible}</span></p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusChange(task.id, "completada")}
                      className="flex-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Marcar Lista
                    </button>
                    <button 
                      onClick={() => handleStatusChange(task.id, "pendiente")}
                      className="bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 px-3 py-2 rounded-xl text-xs transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por Hacer */}
          <div>
            <h3 className="flex items-center gap-2 font-black text-slate-800 mb-3 px-1">
              <MoreHorizontal className="h-4 w-4 text-blue-500" /> Por Hacer ({pendingTasks.length})
            </h3>
            <div className="space-y-3">
              {pendingTasks.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-medium text-slate-400">No hay tareas pendientes en la rutina</p>
                </div>
              )}
              {pendingTasks.map(task => (
                <div key={task.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-blue-300 transition-colors">
                  <h4 className="font-bold text-slate-700 text-sm mb-1">{task.content}</h4>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-slate-500">Resp: <span className="font-bold text-slate-700">{task.responsible}</span></span>
                    <button 
                      onClick={() => handleStatusChange(task.id, "en_progreso")}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <PlayCircle className="h-3 w-3" /> Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
