"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppSelect from "@/components/dashboard/AppSelect";
import { createTeamMember } from "./actions";
import { useProfile } from "@/components/ui/ProfileContext";

export default function InvitesPage() {
  const [state, formAction, pending] = useActionState(
    createTeamMember,
    undefined,
  );
  const { profile } = useProfile();

  useEffect(() => {
    if (state?.success) {
      toast.success(
        "¡Cuenta creada exitosamente! La encargada ya puede iniciar sesión.",
      );
    }
  }, [state]);

  if (profile?.role !== "supervisor") {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-20 sm:px-6 xl:px-8 2xl:max-w-5xl 2xl:px-10">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200/80 bg-white p-6 text-center shadow-sm lg:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Acceso restringido</h2>
          <p className="mt-2 text-slate-500">
            Solo el <b>Supervisor</b> de la tienda puede crear cuentas para las encargadas.
          </p>
          <Link
            href="/team"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
          >
            Volver a mi tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm lg:p-6">
        <Link
          href="/team"
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Volver a Equipo
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
              Accesos operativos
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-[#e51d2e]">
                <UserPlus className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 lg:text-[2rem]">
                Crear acceso
              </h1>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Crea la cuenta para que el Segundo(a) o Tercero(a) Encargado(a)
              pueda usar la app y dejar sus registros con nombre propio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">
                Permiso
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                Supervisor
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Alcance
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                Cuenta nueva
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:space-y-0">
        <form
          action={formAction}
          className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:p-7"
        >
          {state?.error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Rol
              </label>
              <AppSelect
                name="role"
                required
                options={[
                  { value: "", label: "Seleccionar rol" },
                  { value: "segundo_al_mando", label: "Segundo(a) Encargado(a)" },
                  { value: "tercero_al_mando", label: "Tercero(a) Encargado(a)" },
                ]}
                buttonClassName="rounded-xl py-3 text-sm ring-red-100 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Nombre completo
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej: Nombre Apellido"
                className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Correo (usuario)
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="Ej: usuario@tienda.com"
                className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Contraseña inicial
              </label>
              <input
                type="text"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || state?.success}
            className="mt-6 w-full rounded-2xl bg-[#e51d2e] py-3.5 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {pending
              ? "Creando cuenta..."
              : state?.success
                ? "Cuenta creada"
                : "Crear cuenta"}
          </button>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm lg:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Qué se crea aquí
            </p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>1. El rol operativo de la persona.</p>
              <p>2. Su nombre para identificar registros en tienda.</p>
              <p>3. El acceso inicial con correo y contraseña.</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-red-200/80 bg-red-50/70 p-4 shadow-sm lg:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-600">
              Recomendación
            </p>
            <p className="mt-2 text-sm text-red-900">
              Usa un correo claro y una contraseña temporal fácil de entregar,
              para que luego la persona pueda actualizarla al entrar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
