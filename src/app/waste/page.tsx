import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import WasteCard from "@/components/waste/WasteCard";
import StartWasteWeekCutButton from "@/components/waste/StartWasteWeekCutButton";
import { WASTE_WEEK_CUT_PREFIX } from "./cutoff";

export const metadata: Metadata = {
  title: "Control e Historial de Merma — Sistema de Control Operativo de Tienda",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatCutDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function WasteIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const evidenceImageKeys = new Set(["novedad", "lote", "proveedor", "cantidades"]);

  async function signEvidencePath(path: string | null) {
    if (!path) return path;
    const { data } = await adminClient.storage
      .from("waste-evidence")
      .createSignedUrl(path, 60 * 10);
    return data?.signedUrl || path;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("store_code, store_name, role, security_pin")
    .eq("user_id", user?.id)
    .single();

  const storeCode = currentUserProfile?.store_code;

  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const selectedCut = typeof params?.cut === "string" ? params.cut : "";
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [
    { data: cutEntries },
    { data: storeProfiles },
  ] = await Promise.all([
    adminClient
      .from("daily_logbook")
      .select("id, author, created_at, content")
      .eq("store_code", storeCode)
      .like("content", `${WASTE_WEEK_CUT_PREFIX}%`)
      .order("created_at", { ascending: false })
      .limit(12),
    adminClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("store_code", storeCode),
  ]);

  const cuts = (cutEntries || []).filter((entry) =>
    entry.content.startsWith(WASTE_WEEK_CUT_PREFIX),
  );
  const activeCut = cuts[0]?.created_at || "";
  const selectedCutIndex = cuts.findIndex((cut) => cut.created_at === selectedCut);
  const selectedCutIsValid = selectedCutIndex >= 0;
  const cycleStart = selectedCutIsValid ? selectedCut : activeCut;
  const cycleEnd =
    selectedCutIsValid && selectedCutIndex > 0 ? cuts[selectedCutIndex - 1]?.created_at : "";

  let recordsQuery = adminClient
    .from("waste_records")
    .select("*, products(name)", { count: "exact" })
    .eq("store_code", storeCode)
    .order("created_at", { ascending: false });

  if (cycleStart) {
    recordsQuery = recordsQuery.gte("created_at", cycleStart);
  }

  if (cycleEnd) {
    recordsQuery = recordsQuery.lt("created_at", cycleEnd);
  }

  const { data: records, count: totalRecords } = await recordsQuery.range(from, to);

  const signedRecords = await Promise.all(
    (records || []).map(async (record) => {
      let transportEvidence = record.transport_evidence;
      if (transportEvidence && typeof transportEvidence === "object") {
        const signedEntries = await Promise.all(
          Object.entries(transportEvidence).map(async ([key, path]) => {
            if (!evidenceImageKeys.has(key)) {
              return [key, path] as const;
            }

            return [key, await signEvidencePath(path as string | null)] as const;
          })
        );
        transportEvidence = Object.fromEntries(signedEntries);
      }

      return {
        ...record,
        image_url: await signEvidencePath(record.image_url),
        transport_evidence: transportEvidence,
      };
    })
  );

  const profileMap = new Map(
    (storeProfiles || []).map((p) => [p.user_id, p.display_name]),
  );
  const canManageWasteCut = currentUserProfile?.role === "supervisor";
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (selectedCutIsValid) {
      query.set("cut", selectedCut);
    }
    return `/waste?${query.toString()}`;
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 py-8 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver
        </Link>
      </div>

      <section className="w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0a4aa8] via-[#0a58ca] to-[#3b82f6] px-5 py-5 text-white shadow-[0_18px_36px_rgba(10,88,202,0.16)]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
          Control de Perdidas
        </p>
        <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
          Control e Historial de Merma
        </h1>
        <p className="mt-2 max-w-[250px] text-[13px] leading-relaxed text-white/82">
          Consulta registros, evidencia y seguimiento operativo de merma.
        </p>
        <div className="mt-4 inline-flex items-center rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          {totalRecords ?? 0} registros totales (Página {page})
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Corte semanal
            </p>
            <h2 className="mt-1 text-sm font-black text-slate-900">
              {selectedCutIsValid ? "Consultando semana cerrada" : "Semana activa de merma"}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {selectedCutIsValid
                ? `Mostrando registros desde ${formatCutDate(selectedCut)}${cycleEnd ? ` hasta ${formatCutDate(cycleEnd)}` : ""}.`
                : activeCut
                  ? `La semana actual iniciÃ³ en ${formatCutDate(activeCut)}.`
                  : "TodavÃ­a no hay un corte manual. EstÃ¡s viendo todos los registros actuales."}
            </p>
          </div>

          {canManageWasteCut && (
            <StartWasteWeekCutButton hasPin={Boolean(currentUserProfile?.security_pin)} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/waste"
            className={`rounded-full px-3 py-2 text-[11px] font-bold ring-1 transition ${
              !selectedCutIsValid
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Semana activa
          </Link>

          {cuts.map((cut) => (
            <Link
              key={cut.id}
              href={`/waste?cut=${encodeURIComponent(cut.created_at)}`}
              className={`rounded-full px-3 py-2 text-[11px] font-bold ring-1 transition ${
                selectedCut === cut.created_at
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {formatCutDate(cut.created_at)}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 space-y-3">
        <Link
          href="/waste/new"
          className="flex w-full items-center justify-between rounded-[24px] border border-emerald-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Registrar Merma</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Crea una nueva merma desde este modulo
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link
          href="/waste/fefo"
          className="flex w-full items-center justify-between rounded-[24px] border border-red-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-2.5 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.25 16.23"/><path d="M12 12h.01"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Radar de Vencimientos (FEFO)</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Controla qué productos están a punto de vencer
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <Link
          href="/waste/evidence"
          className="flex w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Descargar Evidencias (ZIP)</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Descarga todas las fotos de averías y calidad
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
          placeholder="Buscar por producto, observaciones..."
          className="w-full bg-transparent text-[15px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Motivo
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Depositó
          <span className="text-[10px]">▼</span>
        </button>
        <button type="button" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700">
          Revisión
          <span className="text-[10px]">▼</span>
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {signedRecords.length > 0 ? (
          signedRecords.map((rec) => (
            <WasteCard
              key={rec.id}
              record={{
                ...rec,
                author: profileMap.get(rec.created_by),
                store_code: currentUserProfile?.store_code || "",
                store_name: currentUserProfile?.store_name || "",
              }}
              userRole={currentUserProfile?.role}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-14 text-center shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              No hay registros de merma
            </p>
            <Link
              href="/waste/new"
              className="app-cta-primary mt-4 px-6 text-sm font-bold"
            >
              Registrar primera merma
            </Link>
          </div>
        )}
      </div>

      {totalRecords !== null && totalRecords > pageSize && (
        <div className="mt-8 flex items-center justify-between px-2 text-sm font-bold text-slate-600">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              ← Anterior
            </Link>
          ) : (
            <div />
          )}

          <span className="rounded-full bg-white px-3 py-1 text-[12px] text-slate-500 ring-1 ring-slate-200">
            Pág {page}
          </span>

          {to < totalRecords ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
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
