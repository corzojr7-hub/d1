"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileSignature, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { acceptQuadrant, assignQuadrant, updateQuadrantAssignment } from "./actions";

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
  assistants,
  areas,
  canManage,
}: {
  assignments: QuadrantAssignment[];
  assistants: Assistant[];
  areas: string[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const usedAssistants = useMemo(
    () => new Set(assignments.map((assignment) => assignment.assigned_to)),
    [assignments],
  );
  const usedAreas = useMemo(
    () => new Set(assignments.map((assignment) => assignment.quadrant_name)),
    [assignments],
  );
  const availableAssistants = assistants.filter((assistant) => !usedAssistants.has(assistant.name));
  const availableAreas = areas.filter((area) => !usedAreas.has(area));

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
    if (
      !confirm(
        "Al aceptar, asumes la responsabilidad de mantener el cuadrante asignado conforme al estándar de orden, precios, aseo, exhibiciones, fechas y productos aptos para la venta.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await acceptQuadrant(id);
        toast.success("Responsabilidad aceptada con éxito.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al aceptar el cuadrante.");
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateQuadrantAssignment(formData);
        toast.success("Asignación actualizada con éxito.");
        setEditingId(null);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el cuadrante.");
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
            <h1 className="flex items-center gap-2 text-lg font-black leading-tight text-white">
              Control de Cuadrantes
            </h1>
            <p className="text-[10px] text-white/90">
              Asignación y aceptación de responsabilidades
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-4">
        <form
          onSubmit={handleAssign}
          className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserPlus className="h-4 w-4 text-blue-500" />
            Nueva Asignación
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Responsable
              </label>
              <select
                name="assigned_to"
                required
                className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona la persona responsable...</option>
                {availableAssistants.map((ast) => (
                  <option key={ast.name} value={ast.name}>
                    {ast.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Cuadrante / Pasillo
              </label>
              {areas.length > 0 ? (
                <select
                  name="quadrant_name"
                  required
                  className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un cuadrante guardado...</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="quadrant_name"
                  required
                  className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Pasillo 1 - Lácteos"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d1b20] py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              Asignar cuadrante
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-slate-800">
            <FileSignature className="h-4 w-4 text-orange-500" />
            Responsabilidades asignadas
          </h2>

          {assignments && assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">
                    {assignment.quadrant_name}
                  </span>
                  {assignment.status === "aceptado" ? (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> Aceptado
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">
                      Pendiente aceptación
                    </span>
                  )}
                </div>

                {editingId === assignment.id ? (
                  <form onSubmit={handleUpdate} className="mb-3 space-y-3">
                    <input type="hidden" name="id" value={assignment.id} />
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Responsable
                      </span>
                      <select
                        name="assigned_to"
                        defaultValue={assignment.assigned_to}
                        className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {assistants
                          .filter(
                            (assistant) =>
                              assistant.name === assignment.assigned_to ||
                              !assignments.some(
                                (item) =>
                                  item.id !== assignment.id &&
                                  item.assigned_to === assistant.name,
                              ),
                          )
                          .map((assistant) => (
                            <option key={assistant.name} value={assistant.name}>
                              {assistant.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Cuadrante / Pasillo
                      </span>
                      <select
                        name="quadrant_name"
                        defaultValue={assignment.quadrant_name}
                        className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {areas
                          .filter(
                            (area) =>
                              area === assignment.quadrant_name ||
                              !assignments.some(
                                (item) =>
                                  item.id !== assignment.id &&
                                  item.quadrant_name === area,
                              ),
                          )
                          .map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                      >
                        Guardar cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mb-3 space-y-1 text-xs text-slate-500">
                    <p>
                      <strong>Responsable:</strong> {assignment.assigned_to}
                    </p>
                    <p>
                      <strong>Asignado por:</strong> {assignment.assigned_by}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{" "}
                      {new Date(assignment.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                )}

                {canManage && editingId !== assignment.id && (
                  <button
                    type="button"
                    onClick={() => setEditingId(assignment.id)}
                    className="mb-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Editar asignación
                  </button>
                )}

                {assignment.status !== "aceptado" && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-3 text-[10px] italic leading-tight text-slate-500">
                      Aceptar esta responsabilidad confirma el compromiso de mantener
                      el cuadrante conforme al estándar de la tienda.
                    </p>
                    <button
                      onClick={() => handleAccept(assignment.id)}
                      disabled={isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Aceptar responsabilidad
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
