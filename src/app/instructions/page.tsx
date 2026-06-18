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
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: instructions } = await adminClient
    .from("instructions")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Header */}
      <div className="mb-1">
        <Link
          href="/"
          className="text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          Volver al inicio
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-red-700">
        Bitácora de Instrucciones
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {instructions?.length ?? 0} instrucciones registradas
      </p>

      {/* Accesos Directos */}
      <div className="mt-6 mb-2 flex flex-col gap-3">
        <Link 
          href="/audits" 
          className="w-full flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-500 text-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="text-left">
              <h2 className="font-bold text-sm">Tablero de Básicos</h2>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">Asignación y Verificación Diaria</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link 
          href="/audits/daily" 
          className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div className="text-left">
              <h2 className="font-bold text-sm">Checklist Operativo</h2>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">Aseo, baño, cafetín y puntos clave</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link 
          href="/instructions/feedback" 
          className="w-full flex items-center justify-between bg-gradient-to-r from-amber-600 to-amber-500 text-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="text-left">
              <h2 className="font-bold text-sm">Retroalimentaciones</h2>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">Llamados de atención y compromisos</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      {/* Buscador */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar instrucción, notas..."
          className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Filtros visuales */}
      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-400">
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Asignado
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Prioridad
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Estado
          <span className="text-[10px]">▼</span>
        </button>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-4">
        {instructions && instructions.length > 0 ? (
          instructions.map((inst) => (
            <InstructionCard key={inst.id} instruction={inst} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/50 px-4 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">
              No hay instrucciones registradas
            </p>
            <Link
              href="/instructions/new"
              className="mt-4 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
            >
              Crear primera instrucción
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
