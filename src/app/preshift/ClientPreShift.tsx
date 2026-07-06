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
      <header className="sticky top-0 z-40 rounded-b-[28px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm lg:rounded-[32px] lg:px-7 lg:py-6">
        <div className="flex items-start gap-3 lg:items-center">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Inicio de turno
            </p>
            <h1 className="text-lg font-black leading-tight text-white">
              Arranque del d?a
            </h1>
            <p className="text-[10px] text-white/90">
              Foco, metas y preparaci?n
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-0 py-4 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:space-y-0 lg:py-6"
      >
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Target className="h-4 w-4 text-amber-500" />
            Meta del d?a
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Meta del d?a ($)
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

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Pendientes del turno
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Foco del turno
              </label>
              <textarea
                name="impulse_focus"
                required
                rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ej. Impulsar panadería y promociones del día"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Prioridad de tareas
              </label>
              <textarea
                name="priority"
                required
                rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ej. Limpieza profunda de neveras y rotación de lácteos"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c91528] disabled:opacity-50 lg:mx-auto lg:max-w-md"
          >
            {isPending ? "Guardando..." : "Registrar inicio de turno"}
          </button>
        </div>
      </form>
    </div>
  );
}
