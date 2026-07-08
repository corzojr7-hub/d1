"use client";

import { useActionState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#07111f_0%,_#0a3875_42%,_#f8fafc_42%,_#f8fafc_100%)] lg:bg-[linear-gradient(135deg,_#07111f_0%,_#0f172a_45%,_#f8fafc_45%,_#f8fafc_100%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[1.05fr_minmax(420px,0.95fr)]">
        <section className="relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(229,29,46,0.26),_transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,_rgba(7,17,31,0.96)_0%,_rgba(10,56,117,0.94)_56%,_rgba(14,23,37,0.88)_100%)]" />
          <div className="absolute left-10 top-10 h-24 w-24 rounded-full border border-white/10 bg-white/5 blur-2xl" />
          <div className="absolute bottom-16 right-12 h-36 w-36 rounded-full bg-[#e51d2e]/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/80 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-[#ffb3bb]" />
              Control Operativo de Tienda
            </div>

            <h1 className="mt-8 max-w-xl text-5xl font-black leading-[0.95] tracking-tight text-white xl:text-[4.5rem]">
              Un acceso que se siente tan serio como la operación.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 xl:text-lg">
              Entra al tablero con una interfaz pensada para tienda real: rápida, clara y con la
              jerarquía visual necesaria para operar sin ruido.
            </p>
          </div>

          <div className="relative z-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            <FeaturePill
              title="Acceso rápido"
              text="Un login limpio para entrar al trabajo sin distracciones."
            />
            <FeaturePill
              title="Lectura clara"
              text="Contraste fuerte, tipografía firme y superficies blancas."
            />
            <FeaturePill
              title="Hecho para PC"
              text="Aprovecha el ancho grande con un split layout premium."
            />
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-[480px]">
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-[#e51d2e] text-white shadow-[0_16px_32px_rgba(229,29,46,0.24)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
                  Control Operativo
                </p>
                <h1 className="text-2xl font-black tracking-tight text-slate-950">Ingreso al sistema</h1>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] ring-1 ring-white/60">
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-5 sm:px-8 sm:py-6">
                <div className="hidden items-center gap-3 lg:flex">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-[#e51d2e] text-white shadow-[0_16px_32px_rgba(229,29,46,0.24)]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">
                      Bienvenido
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">
                      Acceso a plataforma de tienda
                    </h1>
                  </div>
                </div>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  Ingresa con tu usuario habitual para continuar con ventas, merma, FEFO y
                  operación diaria.
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
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
                    className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(229,29,46,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c91528] hover:shadow-[0_22px_50px_rgba(229,29,46,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loginPending ? "Entrando..." : "Entrar"}
                    {!loginPending ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Acceso seguro
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Protección y control operativo en una sola entrada.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white">
                    Login
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
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
    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
      {message}
    </p>
  );
}

function FeaturePill({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/80">{text}</p>
    </div>
  );
}
