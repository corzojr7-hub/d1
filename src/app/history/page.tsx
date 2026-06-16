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
    <div className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/"
        className="text-xs text-zinc-400 underline-offset-2 hover:underline"
      >
        Volver al inicio
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">
        Historial Operativo
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Consulta instrucciones y registros de merma anteriores
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="h-10" />}>
          <HistoryTabs />
        </Suspense>
      </div>

      <div className="mt-6">
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
      <div className="rounded-3xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-400">
        No hay instrucciones registradas.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
      <div className="rounded-3xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-400">
        No hay registros de merma.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {records.map((rec) => (
        <WasteCard key={rec.id} record={rec} />
      ))}
      <PaginationControls tab="waste" page={page} hasNext={records.length === pageSize} />
    </div>
  );
}

function PaginationControls({ tab, page, hasNext }: { tab: string, page: number, hasNext: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={`/history?tab=${tab}&page=${page - 1}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          &larr; Anterior
        </Link>
      ) : <div />}
      
      {hasNext && (
        <Link
          href={`/history?tab=${tab}&page=${page + 1}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Siguiente &rarr;
        </Link>
      )}
    </div>
  );
}
