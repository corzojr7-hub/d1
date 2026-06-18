"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    undefined,
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff1f2_0%,_#f8fafc_42%,_#eef2f7_100%)] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-red-600 text-xl font-black text-white shadow-[0_18px_36px_rgba(229,29,46,0.22)]">
            D1
          </div>
          <h1 className="text-[30px] font-black tracking-tight text-slate-950">
            Control Operativo
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Acceso a plataforma de tienda
          </p>
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90">
          <form action={loginAction} className="space-y-4">
            <TextField
              label="Usuario"
              name="email"
              type="text"
              placeholder="Ej. mi.tienda o mi.tienda@mid1.com"
              autoComplete="username"
              required
            />
            <TextField
              label="Contrasena"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {loginState?.error ? <ErrorMessage message={loginState.error} /> : null}
            <button
              type="submit"
              disabled={loginPending}
              className="app-cta-primary w-full px-5 text-sm font-bold"
            >
              {loginPending ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const fieldClassName =
  "min-h-12 w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-[15px] font-medium text-slate-950 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-red-500";

function TextField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input {...props} className={fieldClassName} />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
      {message}
    </p>
  );
}
