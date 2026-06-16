"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { updatePassword } from "./actions";

export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, undefined);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-950">
            Cambio de Contraseña Obligatorio
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Por seguridad, debes establecer una nueva contraseña para tu cuenta antes de continuar.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Nueva contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="min-h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600"
              placeholder="Minimo 6 caracteres"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Confirmar nueva contraseña
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="min-h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600"
              placeholder="Confirmar contraseña"
            />
          </div>

          {state?.error && (
            <div className="rounded-2xl bg-red-50 p-3 text-center text-xs font-bold text-red-600">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 min-h-14 w-full rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60 transition-transform active:scale-95"
          >
            {isPending ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
