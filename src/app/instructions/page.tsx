import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import InstructionCard from "@/components/instructions/InstructionCard";
import { requireAuth } from "@/lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Operación Diaria - Instrucciones",
};

export default async function InstructionsIndex() {
  const { profile } = await requireAuth();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: instructions } = await adminClient
    .from("instructions")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(50);

  const instructionList = instructions || [];
  const activeCount = instructionList.filter((item) =>
    ["pendiente", "en_proceso", "requiere_seguimiento"].includes(item.status),
  ).length;
  const completedCount = instructionList.filter((item) => item.status === "cumplida").length;
  const urgentCount = instructionList.filter((item) =>
    ["critica", "alta"].includes(item.priority),
  ).length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1600px] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
            Operación diaria
          </p>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950">
            Bandeja ejecutiva de instrucciones
          </h1>
          <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            Comunica lo que se debe hacer, sigue lo pendiente y deja listo lo que luego se va a
            verificar.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {instructionList.length} instrucciones registradas
            </div>
            <div className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
              {activeCount} activas
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
              {urgentCount} urgentes
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Acción prioritaria
          </p>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">
            Lo primero que debe hacer el supervisor
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Cumplidas
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{completedCount}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Tareas que ya cerró el equipo.
              </p>
            </div>
            <Link
              href="/instructions/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-200 bg-[#fff1f2] px-5 py-3 text-sm font-black text-[#b91c1c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffe4e6]"
            >
              <Plus className="h-4 w-4" />
              Crear instrucción
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Flujo diario
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Qué se debe seguir hoy
              </h2>
            </div>
            <p className="max-w-[240px] text-right text-[11px] font-medium leading-snug text-slate-400">
              Entra rápido a verificaciones, básicos y retroalimentación.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/audits"
              className="flex min-h-[112px] w-full items-center justify-between rounded-[24px] border border-blue-200 bg-white p-4 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold">Básicos del turno</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Asignación y seguimiento diario
                  </p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

            <Link
              href="/audits/daily"
              className="flex min-h-[112px] w-full items-center justify-between rounded-[24px] border border-emerald-200 bg-white p-4 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold">Checklist del turno</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Aseo, baño, cafetín y puntos clave
                  </p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

            <Link
              href="/instructions/feedback"
              className="flex min-h-[112px] w-full items-center justify-between rounded-[24px] border border-amber-200 bg-white p-4 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-700">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold">Retroalimentaciones</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Llamados de atención y compromisos
                  </p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Nueva instrucción
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
            Crear nueva instrucción
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Si el equipo necesita una instrucción nueva, entra directo al registro y
            deja la novedad lista desde aquí.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Cumplidas
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{completedCount}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Tareas que ya cerró el equipo.
              </p>
            </div>
            <Link
              href="/instructions/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-200 bg-[#fff1f2] px-5 py-3 text-sm font-black text-[#b91c1c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffe4e6]"
            >
              <Plus className="h-4 w-4" />
              Crear instrucción
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Seguimiento de hoy
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
              Instrucciones activas
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-slate-500">
              Baja directo al historial reciente y revisa primero lo que sigue abierto o con prioridad alta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">
              {instructionList.length} registradas
            </div>
            <div className="rounded-full bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
              {activeCount} activas
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
              {urgentCount} urgentes
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
              {completedCount} cumplidas
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {instructionList.length > 0 ? (
          instructionList.map((inst) => (
            <InstructionCard key={inst.id} instruction={inst} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-14 text-center shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              No hay instrucciones registradas
            </p>
            <Link
              href="/instructions/new"
              className="app-cta-primary mt-4 px-6 text-sm font-bold"
            >
              Crear primera instrucción
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}


