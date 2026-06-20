"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, ShieldCheck, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { assignQuadrant, acceptQuadrant } from "./actions";

type QuadrantAssignment = {
  id: string;
  quadrant_name: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  status: string;
};

type Assistant = {
  name: string;
};

export default function ClientQuadrants({ 
  assignments, 
  assistants 
}: { 
  assignments: QuadrantAssignment[], 
  assistants: Assistant[] 
}) {
  const [isPending, startTransition] = useTransition();

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      try {
        await assignQuadrant(formData);
        toast.success("Cuadrante asignado con éxito.");
        form.reset();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al asignar el cuadrante.");
      }
    });
  }

  function handleAccept(id: string) {
    if (!confirm("Al aceptar, te comprometes a mantener el cuadrante asignado conforme al estándar establecido en: LAYOUT, MICROLAYOUT, PRECIOS, ASEO, EXHIBICIONES, FECHAS DE VENCIMIENTO Y PRODUCTOS NO APTOS PARA LA VENTA.")) {
      return;
    }

    startTransition(async () => {
      try {
        await acceptQuadrant(id);
        toast.success("Cuadrante aceptado. Firma registrada.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al aceptar el cuadrante.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 py-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Pasillos
            </p>
            <h1 className="text-lg font-black leading-tight text-white flex items-center gap-2">
              Control de Cuadrantes
            </h1>
            <p className="text-[10px] text-white/90">
              Asignación y actas de responsabilidad
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <form onSubmit={handleAssign} className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            Nueva Asignación
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Asistente Responsable
              </label>
              <select
                name="assigned_to"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Selecciona un asistente...</option>
                {assistants.map((ast, idx: number) => (
                  <option key={idx} value={ast.name}>{ast.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Cuadrante / Pasillo
              </label>
              <input
                type="text"
                name="quadrant_name"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej. Pasillo 1 - Lácteos"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#1d1b20] text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors disabled:opacity-50 mt-2"
            >
              Asignar Cuadrante
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
            <FileSignature className="h-4 w-4 text-orange-500" />
            Actas de Entrega
          </h2>

          {assignments && assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">{assignment.quadrant_name}</span>
                  {assignment.status === 'aceptado' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      <ShieldCheck className="h-3 w-3" /> Aceptado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      Pendiente Firma
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-slate-500 mb-3 space-y-1">
                  <p><strong>Responsable:</strong> {assignment.assigned_to}</p>
                  <p><strong>Asignado por:</strong> {assignment.assigned_by}</p>
                  <p><strong>Fecha:</strong> {new Date(assignment.created_at).toLocaleDateString('es-CO')}</p>
                </div>

                {assignment.status !== 'aceptado' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-3 leading-tight italic">
                      &quot;Me comprometo a mantener el cuadrante asignado conforme al estándar establecido en: LAYOUT, MICROLAYOUT, PRECIOS, ASEO, EXHIBICIONES, FECHAS DE VENCIMIENTO Y PRODUCTOS NO APTOS PARA LA VENTA.&quot;
                    </p>
                    <button
                      onClick={() => handleAccept(assignment.id)}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Aceptar Responsabilidad (Firma Digital)
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-500">
                No hay cuadrantes asignados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
