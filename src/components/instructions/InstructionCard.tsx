"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ClipboardList, Trash2 } from "lucide-react";
import { removeInstruction, updateInstructionStatus } from "@/app/instructions/actions";
import AppSelect from "@/components/dashboard/AppSelect";
import { useProfile } from "@/components/ui/ProfileContext";

type Instruction = {
  id: string;
  responsible: string;
  content: string;
  priority: string;
  status: string;
  created_at: string;
};

const statuses = [
  "pendiente",
  "en_proceso",
  "cumplida",
  "no_cumplida",
  "requiere_seguimiento",
  "anulada",
];

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  cumplida: "Cumplida",
  no_cumplida: "No cumplida",
  requiere_seguimiento: "Requiere seg.",
  anulada: "Anulada",
};

const priorityStyles: Record<string, string> = {
  critica: "bg-red-50 text-red-700 ring-1 ring-red-100 font-bold",
  alta: "bg-red-50 text-red-700 ring-1 ring-red-100 font-bold",
  media: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 font-semibold",
  baja: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 font-medium",
};

const statusSelectColors: Record<string, string> = {
  pendiente: "text-amber-700",
  en_proceso: "text-blue-700",
  cumplida: "text-emerald-700",
  no_cumplida: "text-red-700",
  requiere_seguimiento: "text-purple-700",
  anulada: "text-zinc-500",
};

export default function InstructionCard({
  instruction,
}: {
  instruction: Instruction;
}) {
  const [pending, startTransition] = useTransition();
  const { profile } = useProfile();
  const operator = profile?.display_name;
  const canDelete = profile?.role === "supervisor" || profile?.role === "admin";
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(instruction.created_at));

  function handleChange(newStatus: string) {
    startTransition(async () => {
      try {
        await updateInstructionStatus(instruction.id, newStatus, operator || "");
        toast.success("Estado actualizado");
      } catch {
        toast.error("Error al actualizar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Seguro que deseas borrar esta instrucción?")) return;
    startTransition(async () => {
      try {
        await removeInstruction(instruction.id);
        toast.success("Instrucción eliminada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al borrar");
      }
    });
  }

  return (
    <div
      className={`rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition ${
        pending ? "opacity-50" : "hover:shadow-md"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
            priorityStyles[instruction.priority] ??
            "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 font-medium"
          }`}
        >
          {instruction.priority}
        </span>

        <div className="flex items-center gap-2">
          <AppSelect
            label="Estado"
            hideLabel
            value={instruction.status}
            onChange={handleChange}
            disabled={pending}
            containerClassName="min-w-[148px]"
            buttonClassName={`rounded-full border-0 px-3 py-1.5 text-[11px] font-semibold ring-1 ring-slate-200 shadow-none ${statusSelectColors[instruction.status] ?? "text-zinc-600"}`}
            panelClassName="right-0 left-auto w-56"
            options={statuses.map((status) => ({
              value: status,
              label: statusLabels[status] ?? status,
            }))}
          />
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
              title="Borrar instrucción"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 text-[17px] font-black leading-snug tracking-tight text-slate-900">
        {instruction.content}
      </p>

      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-600">{instruction.responsible}</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-slate-400">{formattedDate}</span>
      </div>
    </div>
  );
}
