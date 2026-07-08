"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e51d2e] text-white shadow-[0_16px_40px_rgba(229,29,46,0.24)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
          <div className="border-b border-slate-100 px-6 pt-8 sm:px-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
              Control Operativo
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Iniciar sesión
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
              Accede con tu usuario habitual para continuar con la operación.
            </p>
          </div>

          <div className="px-6 py-7 sm:px-10 sm:py-10">
            <form action={loginAction} className="space-y-4">
              <TextField
                label="Usuario"
                name="email"
                type="text"
                placeholder="Ej. mi.tienda o mi.tienda@mi2.com"
                autoComplete="username"
                required
              />
              <TextField
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />

              {loginState?.error ? <ErrorMessage message={loginState.error} /> : null}

              <button
                type="submit"
                disabled={loginPending}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#e51d2e] px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(229,29,46,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c91528] hover:shadow-[0_22px_50px_rgba(229,29,46,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginPending ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

const fieldClassName =
  "min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-medium text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10";

function TextField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input {...props} className={fieldClassName} />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
