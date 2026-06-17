import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import WasteCard from "@/components/waste/WasteCard";

export const metadata: Metadata = {
  title: "Control e Historial de Merma — Sistema de Control Operativo de Tienda",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WasteIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("store_code")
    .eq("user_id", user?.id)
    .single();

  const storeCode = currentUserProfile?.store_code;

  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [
    { data: records, count: totalRecords },
    { data: storeProfiles }
  ] = await Promise.all([
    adminClient
      .from("waste_records")
      .select("*, products(name)", { count: "exact" })
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .range(from, to),
    adminClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("store_code", storeCode)
  ]);

  const profileMap = new Map((storeProfiles || []).map((p) => [p.user_id, p.display_name]));

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

      <h1 className="mt-4 text-2xl font-bold text-blue-700">
        Control e Historial de Merma
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {totalRecords ?? 0} registros totales (Página {page})
      </p>

      {/* FEFO Navigation */}
      <div className="mt-6 mb-2">
        <Link 
          href="/waste/fefo" 
          className="w-full flex items-center justify-between bg-gradient-to-r from-red-600 to-red-500 text-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.25 16.23"/><path d="M12 12h.01"/></svg>
            </div>
            <div className="text-left">
              <h2 className="font-bold text-sm">Radar de Vencimientos (FEFO)</h2>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">Controla qué productos están a punto de vencer</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      {/* Buscador */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por producto, observaciones..."
          className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Filtros visuales */}
      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-400">
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Motivo
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Depositó
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 transition hover:text-slate-600">
          Revisión
          <span className="text-[10px]">▼</span>
        </button>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-4">
        {records && records.length > 0 ? (
          records.map((rec) => (
            <WasteCard key={rec.id} record={{...rec, author: profileMap.get(rec.created_by) }} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/50 px-4 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">
              No hay registros de merma
            </p>
            <Link
              href="/waste/new"
              className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
            >
              Registrar primera merma
            </Link>
          </div>
        )}
      </div>

      {/* Paginación Nativa SSR */}
      {totalRecords !== null && totalRecords > pageSize && (
        <div className="mt-8 flex items-center justify-between px-2 text-sm font-bold text-slate-600">
          {page > 1 ? (
            <Link
              href={`/waste?page=${page - 1}`}
              className="rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              ← Anterior
            </Link>
          ) : (
            <div />
          )}

          <span className="text-slate-400">Pág {page}</span>

          {to < totalRecords ? (
            <Link
              href={`/waste?page=${page + 1}`}
              className="rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Siguiente →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
