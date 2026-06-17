"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFeedback } from "../actions";
import { useProfile } from "@/components/ui/ProfileContext";
import { Save, Loader2, User, FileText, CheckSquare, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";

export default function NewFeedbackPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const assistants = profile?.assistants?.map((a: any) => a.name?.toUpperCase()) || [];
  
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    directed_to: "",
    type: "retroalimentacion" as "retroalimentacion" | "llamado_atencion",
    reason: "",
    description: "",
    commitment: ""
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.directed_to || !formData.reason || !formData.description || !formData.commitment) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    startTransition(async () => {
      try {
        await createFeedback(formData);
        toast.success("Registro guardado exitosamente");
        router.push("/instructions/feedback");
      } catch (error) {
        toast.error("Ocurrió un error al guardar");
      }
    });
  }

  const inputBase = "w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 text-base transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/instructions/feedback" className="text-xs text-zinc-400 underline-offset-2 hover:underline">
        Volver
      </Link>
      
      <h1 className="mt-4 text-2xl font-extrabold text-slate-800">Nuevo Registro</h1>
      <p className="mt-1 text-sm text-slate-500">Documenta retroalimentaciones o llamados de atención</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-3xl bg-white p-6 shadow-sm border border-zinc-100">
        
        {/* Dirigido a */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <User className="h-4 w-4 text-slate-400" /> Para quién
          </span>
          <select 
            value={formData.directed_to}
            onChange={e => setFormData(f => ({ ...f, directed_to: e.target.value }))}
            className={inputBase}
          >
            <option value="">Selecciona al asistente...</option>
            {assistants.map((name: string) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        {/* Tipo */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <MessageSquareWarning className="h-4 w-4 text-slate-400" /> Tipo
          </span>
          <select 
            value={formData.type}
            onChange={e => setFormData(f => ({ ...f, type: e.target.value as any }))}
            className={`${inputBase} ${formData.type === "llamado_atencion" ? "text-red-700 bg-red-50 ring-red-200 font-bold" : "text-amber-700 bg-amber-50 ring-amber-200 font-bold"}`}
          >
            <option value="retroalimentacion">Retroalimentación</option>
            <option value="llamado_atencion">Llamado de atención</option>
          </select>
        </label>

        {/* Motivo */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" /> Motivo
          </span>
          <input 
            type="text"
            placeholder="Ej. Llegadas tarde, Error en inventario..."
            value={formData.reason}
            onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
            className={inputBase}
          />
        </label>

        {/* Descripción */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" /> Descripción detallada
          </span>
          <textarea 
            placeholder="Explica qué pasó exactamente..."
            rows={4}
            value={formData.description}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
            className={`${inputBase} resize-none`}
          />
        </label>

        {/* Compromiso */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckSquare className="h-4 w-4 text-slate-400" /> Compromiso
          </span>
          <textarea 
            placeholder="¿A qué se comprometió el asistente para mejorar?"
            rows={3}
            value={formData.commitment}
            onChange={e => setFormData(f => ({ ...f, commitment: e.target.value }))}
            className={`${inputBase} resize-none`}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-base font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {isPending ? "Guardando..." : "Guardar Registro"}
        </button>

      </form>
    </div>
  );
}
