import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import InstructionCard from "@/components/instructions/InstructionCard";

export const metadata: Metadata = {
  title: "Bitácora de Instrucciones — Sistema de Control Operativo de Tienda",
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

  return (
    <div className="mx-auto max-w-md bg-slate-50 px-4 py-8">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver
        </Link>
      </div>

      <section className="rounded-[28px] bg-gradient-to-br from-[#d51b2b] via-[#e51d2e] to-[#f04452] px-5 py-5 text-white shadow-[0_18px_36px_rgba(229,29,46,0.16)]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
          Centro de Control
        </p>
        <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
          Bitácora de Instrucciones
        </h1>
        <p className="mt-2 max-w-[250px] text-[13px] leading-relaxed text-white/82">
          Revisa tareas activas, seguimiento operativo y novedades del turno.
        </p>
        <div className="mt-4 inline-flex items-center rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          {instructions?.length ?? 0} instrucciones registradas
        </div>
      </section>

      <div className="mt-6 space-y-3">
        <Link
          href="/audits"
          className="flex w-full items-center justify-between rounded-[24px] border border-blue-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Tablero de Básicos</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Asignación y Verificación Diaria
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link
          href="/audits/daily"
          className="flex w-full items-center justify-between rounded-[24px] border border-emerald-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Checklist Operativo</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Aseo, baño, cafetín y puntos clave
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link
          href="/instructions/feedback"
          className="flex w-full items-center justify-between rounded-[24px] border border-amber-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Retroalimentaciones</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Llamados de atención y compromisos
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar instrucción, notas..."
          className="w-full bg-transparent text-[15px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Asignado
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Prioridad
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Estado
          <span className="text-[10px]">▼</span>
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {instructions && instructions.length > 0 ? (
          instructions.map((inst) => (
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
