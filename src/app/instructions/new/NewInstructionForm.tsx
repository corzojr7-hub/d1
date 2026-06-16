"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createInstruction } from "../actions";

export default function NewInstructionForm({ profiles }: { profiles: any[] }) {
  const [state, formAction, pending] = useActionState(createInstruction, undefined);

  return (
    <form action={formAction} className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-zinc-100">
      <div className="space-y-5">
        {/* Responsable */}
        <div>
          <label
            htmlFor="responsible"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Responsable
          </label>
          <select
            id="responsible"
            name="responsible"
            required
            className="w-full appearance-none rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-base ring-1 ring-slate-200 transition-shadow focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="">Selecciona un responsable</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.display_name}>
                {p.display_name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* Instrucción */}
        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Instrucción
          </label>
          <textarea
            id="content"
            name="content"
            rows={5}
            required
            className="w-full resize-none rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-base ring-1 ring-slate-200 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:outline-none"
            placeholder="Describe la instrucción operativa"
          />
        </div>

        {/* Prioridad */}
        <div>
          <label
            htmlFor="priority"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Prioridad
          </label>
          <select
            id="priority"
            name="priority"
            required
            className="w-full appearance-none rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-base ring-1 ring-slate-200 transition-shadow focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="">Seleccionar prioridad</option>
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Critica">Crítica</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {state?.error && (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      {/* Botones */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-red-600 py-4 text-lg font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Crear Instrucción"}
        </button>
        <Link
          href="/instructions"
          className="w-full rounded-full bg-white py-4 text-center text-lg font-bold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
