"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { createPreShift } from "./actions";
import { useRouter } from "next/navigation";

export default function ClientPreShift({ defaultDailyGoal }: { defaultDailyGoal: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createPreShift(formData);
        toast.success("Pre-turno registrado con éxito.");
        router.push("/");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al registrar el pre-turno.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 py-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)] lg:rounded-[36px] lg:px-7 lg:py-7">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Apertura
            </p>
            <h1 className="text-lg font-black leading-tight text-white">
              Pre-Turno
            </h1>
            <p className="text-[10px] text-white/90">
              Objetivos diarios
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-0 py-4 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:space-y-0 lg:py-6"
      >
        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-sm lg:p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" />
            Metas de Venta
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Meta de Venta Diaria ($)
              </label>
              <input
                type="number"
                name="daily_sales_goal"
                required
                defaultValue={defaultDailyGoal > 0 ? defaultDailyGoal : undefined}
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej. 15000000"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/30 p-5 shadow-sm lg:p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Foco Operativo
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Foco de Impulso
              </label>
              <textarea
                name="impulse_focus"
                required
                rows={2}
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej. Impulsar panadería y promociones del día"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Prioridad de Tareas
              </label>
              <textarea
                name="priority"
                required
                rows={2}
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej. Limpieza profunda de neveras y rotación de lácteos"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0a3875] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#072a59] disabled:opacity-50 lg:mx-auto lg:max-w-md"
          >
            {isPending ? "Guardando..." : "Registrar Pre-Turno"}
          </button>
        </div>
      </form>
    </div>
  );
}
