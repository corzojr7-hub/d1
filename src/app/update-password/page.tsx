"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { updatePassword } from "./actions";

export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff1f2_0%,_#f8fafc_42%,_#eef2f7_100%)] px-4 py-8">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-red-50 text-red-600 shadow-[inset_0_0_0_1px_rgba(229,29,46,0.08)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-[28px] font-black tracking-tight text-slate-950">
            Cambio de Contraseña Obligatorio
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
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
              className="min-h-12 w-full rounded-2xl bg-slate-50 px-4 text-[15px] font-medium text-slate-950 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-red-500"
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
              className="min-h-12 w-full rounded-2xl bg-slate-50 px-4 text-[15px] font-medium text-slate-950 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-red-500"
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
            className="app-cta-primary mt-2 w-full px-5 text-sm font-bold"
          >
            {isPending ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
