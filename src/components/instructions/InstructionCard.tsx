"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { updateInstructionStatus } from "@/app/instructions/actions";
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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(async () => {
      try {
        await updateInstructionStatus(instruction.id, newStatus, operator || "");
        toast.success("Estado actualizado");
      } catch {
        toast.error("Error al actualizar");
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

        <select
          value={instruction.status}
          onChange={handleChange}
          disabled={pending}
          className={`rounded-full border-0 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold outline-none ring-1 ring-slate-200 transition hover:ring-slate-300 disabled:opacity-50 ${
            statusSelectColors[instruction.status] ?? "text-zinc-600"
          }`}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <p className="line-clamp-2 text-[17px] font-black leading-snug tracking-tight text-slate-900">
        {instruction.content}
      </p>

      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-600">{instruction.responsible}</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-slate-400">
          {new Date(instruction.created_at).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
