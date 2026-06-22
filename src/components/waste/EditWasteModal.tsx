"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import AppSelect from "@/components/dashboard/AppSelect";
import { updateWasteRecord } from "@/app/waste/actions";
import { WASTE_REASONS } from "@/lib/domain/catalogs";

type EditableWasteRecord = {
  id: string;
  qty: number;
  unit: string;
  reason: string;
  barcode_id?: string | null;
  products?: {
    name?: string | null;
  } | null;
};

export default function EditWasteModal({
  record,
  onClose,
}: {
  record: EditableWasteRecord;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    startTransition(async () => {
      try {
        await updateWasteRecord(formData);
        toast.success("Registro actualizado");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  const inputBase =
    "w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm font-medium ring-1 ring-slate-200 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Editar Merma</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-5 border-b border-slate-100 pb-3 text-xs font-semibold text-slate-500">
          {record.products?.name ?? record.barcode_id}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={record.id} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Cantidad
              </span>
              <input
                name="qty"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={record.qty}
                required
                className={inputBase}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Unidad
              </span>
              <input
                name="unit"
                type="text"
                defaultValue={record.unit}
                required
                className={inputBase}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Motivo
            </span>
            <AppSelect
              name="reason"
              defaultValue={record.reason}
              required
              options={WASTE_REASONS.map((reason) => ({
                value: reason.value,
                label: reason.label,
              }))}
              buttonClassName="rounded-xl py-3 text-sm font-medium shadow-none"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-70"
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
