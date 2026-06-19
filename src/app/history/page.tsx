import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import InstructionCard from "@/components/instructions/InstructionCard";
import WasteCard from "@/components/waste/WasteCard";
import HistoryTabs from "@/components/history/HistoryTabs";

export const metadata: Metadata = {
  title: "Historial Operativo — Sistema de Control Operativo de Tienda",
};

export default async function HistoryPage(props: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "instructions";
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 50;

  const supabase = await createClient();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-28 pt-6 lg:max-w-6xl lg:px-6 xl:max-w-7xl xl:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-slate-700"
      >
        Volver al inicio
      </Link>

      <div className="mt-4 rounded-[28px] bg-gradient-to-br from-[#e51d2e] via-[#f22435] to-[#ff5b6b] px-5 py-5 text-white shadow-[0_18px_36px_rgba(229,29,46,0.18)]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
          Archivo operativo
        </p>
        <h1 className="mt-2 text-[28px] font-black tracking-tight">
          Historial Operativo
        </h1>
        <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-white/85">
          Consulta instrucciones y registros de merma anteriores.
        </p>
      </div>

      <div className="mt-4">
        <Suspense fallback={<div className="h-10" />}>
          <HistoryTabs />
        </Suspense>
      </div>

      <div className="mt-5 space-y-4">
        {tab === "instructions" && <InstructionsList supabase={supabase} page={page} pageSize={pageSize} />}
        {tab === "waste" && <WasteList supabase={supabase} page={page} pageSize={pageSize} />}
      </div>
    </div>
  );
}

async function InstructionsList({
  supabase,
  page,
  pageSize,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  page: number;
  pageSize: number;
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: instructions } = await supabase
    .from("instructions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!instructions || instructions.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-slate-500 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Sin instrucciones
        </p>
        <p className="mt-2 text-sm font-bold text-slate-700">
          No hay instrucciones registradas.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
          Cuando existan, aparecerán aquí ordenadas por fecha.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {instructions.map((inst) => (
        <InstructionCard key={inst.id} instruction={inst} />
      ))}
      <PaginationControls tab="instructions" page={page} hasNext={instructions.length === pageSize} />
    </div>
  );
}

async function WasteList({
  supabase,
  page,
  pageSize,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  page: number;
  pageSize: number;
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: records } = await supabase
    .from("waste_records")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!records || records.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-slate-500 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Sin merma
        </p>
        <p className="mt-2 text-sm font-bold text-slate-700">
          No hay registros de merma.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
          Los movimientos registrados aparecerán en esta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {records.map((rec) => (
        <WasteCard key={rec.id} record={rec} />
      ))}
      <PaginationControls tab="waste" page={page} hasNext={records.length === pageSize} />
    </div>
  );
}

function PaginationControls({ tab, page, hasNext }: { tab: string, page: number, hasNext: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
      {page > 1 ? (
        <Link
          href={`/history?tab=${tab}&page=${page - 1}`}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          &larr; Anterior
        </Link>
      ) : <div className="h-7" />}
      
      {hasNext && (
        <Link
          href={`/history?tab=${tab}&page=${page + 1}`}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Siguiente &rarr;
        </Link>
      )}
    </div>
  );
}
