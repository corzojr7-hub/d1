"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createTeamMember } from "./actions";
import { useProfile } from '@/components/ui/ProfileContext';
import { toast } from 'sonner';

export default function InvitesPage() {
  const [state, formAction, pending] = useActionState(createTeamMember, undefined);
  const { profile } = useProfile();

  useEffect(() => {
    if (state?.success) {
      toast.success("¡Cuenta creada exitosamente! La encargada ya puede iniciar sesión.");
    }
  }, [state]);

  if (profile?.role !== "supervisor") {
    return (
      <div className="mx-auto mt-20 max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="mt-2 text-slate-500">
          Solo el <b>Supervisor</b> de la tienda puede crear cuentas para las encargadas.
        </p>
        <Link href="/team" className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">
          Volver a mi tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/team"
        className="text-xs text-zinc-400 underline-offset-2 hover:underline"
      >
        Volver a Equipo
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-[#e51d2e]">
          <UserPlus className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">
          Crear Acceso
        </h1>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Crea una cuenta para que el Segundo(a) o Tercero(a) Encargado(a) pueda usar la app y registrar datos a su nombre.
      </p>

      <form action={formAction} className="mt-6 space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {state?.error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
            {state.error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Rol
          </label>
          <select
            name="role"
            required
            className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
          >
            <option value="">Seleccionar rol</option>
            <option value="segundo_al_mando">Segundo(a) Encargado(a)</option>
            <option value="tercero_al_mando">Tercero(a) Encargado(a)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Nombre Completo
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Ej: Ana María Perez"
            className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Correo (Usuario)
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="Ej: ana.perez@tienda.com"
            className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Contraseña Inicial
          </label>
          <input
            type="text"
            name="password"
            required
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
          />
        </div>

        <button
          type="submit"
          disabled={pending || state?.success}
          className="mt-6 w-full rounded-2xl bg-[#e51d2e] py-3.5 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Creando cuenta..." : state?.success ? "Cuenta Creada" : "Crear Cuenta"}
        </button>
      </form>
    </div>
  );
}
