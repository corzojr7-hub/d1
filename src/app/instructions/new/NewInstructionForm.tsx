"use client";

import { useActionState } from "react";
import Link from "next/link";
import AppSelect from "@/components/dashboard/AppSelect";
import { createInstruction } from "../actions";

type InstructionProfile = {
  id: string;
  display_name: string;
  role: string;
};

export default function NewInstructionForm({ profiles }: { profiles: InstructionProfile[] }) {
  const [state, formAction, pending] = useActionState(createInstruction, undefined);

  return (
    <form action={formAction} className="mt-6 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm lg:mt-0 lg:p-7">
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <div>
            <label htmlFor="responsible" className="mb-2 block text-sm font-semibold text-slate-700">
              Responsable
            </label>
            <AppSelect
              name="responsible"
              required
              options={[
                { value: "", label: "Selecciona un responsable" },
                ...profiles.map((profile) => ({
                  value: profile.display_name,
                  label: `${profile.display_name} (${profile.role})`,
                })),
              ]}
              buttonClassName="py-3.5 text-base ring-red-100 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="priority" className="mb-2 block text-sm font-semibold text-slate-700">
              Prioridad
            </label>
            <AppSelect
              name="priority"
              required
              options={[
                { value: "", label: "Seleccionar prioridad" },
                { value: "Baja", label: "Baja" },
                { value: "Media", label: "Media" },
                { value: "Alta", label: "Alta" },
                { value: "Critica", label: "CrÃ­tica" },
              ]}
              buttonClassName="py-3.5 text-base ring-red-100 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-semibold text-slate-700">
            InstrucciÃ³n
          </label>
          <textarea
            id="content"
            name="content"
            rows={5}
            required
            className="w-full resize-none rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-base ring-1 ring-slate-200 transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 lg:min-h-[220px]"
            placeholder="Describe la instrucciÃ³n operativa"
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 lg:mx-auto lg:max-w-md lg:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-red-600 py-4 text-lg font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Crear InstrucciÃ³n"}
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
