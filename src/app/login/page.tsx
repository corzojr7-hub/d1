"use client";

import { useActionState, useMemo, useState } from "react";
import { Building2, Plus, UserRound } from "lucide-react";
import { login, registerUser } from "./actions";
type Mode = "login" | "register";

export default function LoginPage() {
  const [localError, setLocalError] = useState<string | null>(null);
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    undefined,
  );
  
  const activeError = loginState?.error || localError;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-lg font-extrabold text-white shadow-lg shadow-red-600/20">
            D1
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950">
            Control Operativo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acceso a plataforma de tienda
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
            {activeError ? <ErrorMessage message={activeError} /> : null}
            <button
              type="submit"
              disabled={loginPending}
              className="min-h-14 w-full rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 disabled:opacity-60"
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
  "min-h-12 w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-sm text-slate-950 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500";

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

function SelectField({ label, index }: { label: string; index: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        name={`assistant_contract_${index}`}
        className="flex min-h-12 w-32 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
        defaultValue="full_time"
      >
        <option value="full_time">TC (240h)</option>
        <option value="part_time">MT (120h)</option>
      </select>
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
