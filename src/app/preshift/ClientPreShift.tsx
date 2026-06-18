"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Target, TrendingUp, AlertTriangle } from "lucide-react";
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
      } catch (err: any) {
        toast.error(err.message || "Error al registrar el pre-turno.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">
              Pre-Turno
            </h1>
            <p className="text-[10px] text-white/90">
              Objetivos diarios
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
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

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
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

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#0a3875] text-white py-3.5 rounded-full font-bold text-sm hover:bg-[#072a59] transition-colors disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Registrar Pre-Turno"}
        </button>
      </form>
    </div>
  );
}
