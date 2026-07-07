import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WasteCard from "@/components/waste/WasteCard";
import WasteClosingNagModal from "@/components/waste/WasteClosingNagModal";

export const metadata: Metadata = {
  title: "Prevención y Pérdida — Sistema de Control Operativo de Tienda",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WasteIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const evidenceImageKeys = new Set(["novedad", "lote", "proveedor", "cantidades"]);
  const supabase = await createClient();
  const dataClient = supabase;

  async function signEvidencePath(path: string | null) {
    if (!path) return path;
    const { data } = await dataClient.storage
      .from("waste-evidence")
      .createSignedUrl(path, 60 * 10);
    return data?.signedUrl || path;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("store_code, store_name, role")
    .eq("user_id", user?.id)
    .single();

  const storeCode = currentUserProfile?.store_code || "";
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const view = params?.view === "archived" ? "archived" : "active";
  const isArchivedView = view === "archived";
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [
    { count: activeCount },
    { count: archivedCount },
    { data: oldestActiveRecord },
    { data: storeProfiles },
  ] = await Promise.all([
    dataClient
      .from("waste_records")
      .select("id", { count: "exact", head: true })
      .eq("store_code", storeCode)
      .eq("is_archived", false),
    dataClient
      .from("waste_records")
      .select("id", { count: "exact", head: true })
      .eq("store_code", storeCode)
      .eq("is_archived", true),
    dataClient
      .from("waste_records")
      .select("created_at")
      .eq("store_code", storeCode)
      .eq("is_archived", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    dataClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("store_code", storeCode),
  ]);

  const { data: records, count: totalRecords } = await dataClient
    .from("waste_records")
    .select("*, products(name)", { count: "exact" })
    .eq("store_code", storeCode)
    .eq("is_archived", isArchivedView)
    .order("created_at", { ascending: false })
    .range(from, to);

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
          }),
        );
        transportEvidence = Object.fromEntries(signedEntries);
      }

      return {
        ...record,
        image_url: await signEvidencePath(record.image_url),
        transport_evidence: transportEvidence,
      };
    }),
  );

  const profileMap = new Map((storeProfiles || []).map((p) => [p.user_id, p.display_name]));
  const canArchiveWasteCycle = currentUserProfile?.role === "supervisor";
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (isArchivedView) {
      query.set("view", "archived");
    }
    return `/waste?${query.toString()}`;
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 py-8 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8">
      {!isArchivedView ? (
        <WasteClosingNagModal
          storeCode={storeCode}
          canArchive={canArchiveWasteCycle}
          activeCount={activeCount || 0}
          oldestActiveCreatedAt={oldestActiveRecord?.created_at || null}
        />
      ) : null}

      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] lg:px-6 lg:py-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500">
            Prevención y pérdida
          </p>
          <h1 className="mt-2 text-[26px] font-black tracking-tight text-slate-950 lg:text-[30px]">
            Centro de control de Merma
          </h1>
          <p className="mt-2 max-w-[38rem] text-[13px] leading-relaxed text-slate-600">
            Registra pérdidas, revisa vencimientos y soportes, y cierra el ciclo semanal de cada
            tienda sin mezclar semanas anteriores.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {activeCount ?? 0} mermas activas
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
              {archivedCount ?? 0} en historial
            </div>
            <div className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
              {isArchivedView ? "Historial / Soportes" : "Merma actual"}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm lg:px-6 lg:py-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Acción prioritaria
          </p>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">
            {isArchivedView ? "Consulta soportes cerrados" : "Opera sobre la merma actual"}
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-red-500">
                1. Registrar
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {isArchivedView
                  ? "Revisa lo que ya fue destruido y archivado."
                  : "Abre el flujo principal de merma y registra lo nuevo."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  2. FEFO
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Prevenir pérdida por vencimiento.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  3. Soportes
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Descargar evidencias ya cerradas.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  4. Cierre
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  El cierre deja la merma activa en cero y mueve los soportes al historial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Accesos rápidos
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Lo principal de Merma
            </h2>
          </div>
          <p className="max-w-sm text-right text-[11px] font-medium leading-relaxed text-slate-500">
            La merma actual y el historial quedan separados para que el tablero operativo no mezcle
            ciclos ya destruidos.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/waste/new"
            className="flex min-h-[116px] w-full items-center justify-between rounded-[24px] border border-red-200 bg-[#fff7f8] p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-2.5 text-[#e51d2e] ring-1 ring-red-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold">Registrar Merma</h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                  Abre el flujo principal de pérdida
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m9 18 6-6-6-6" /></svg>
          </Link>

          <Link
            href="/waste/fefo"
            className="flex min-h-[116px] w-full items-center justify-between rounded-[24px] border border-red-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-2.5 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /><path d="M16.24 7.76A6 6 0 1 0 8.25 16.23" /><path d="M12 12h.01" /></svg>
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold">Radar de Vencimientos (FEFO)</h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Previene merma por vencimiento antes de que toque salir
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6" /></svg>
          </Link>

          <Link
            href="/waste/evidence"
            className="flex min-h-[116px] w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm transition-all active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold">Descargar Evidencias (ZIP)</h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Reúne los soportes archivados de transporte y calidad
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Ciclo operativo
            </p>
            <h2 className="mt-1 text-sm font-black text-slate-900">
              {isArchivedView ? "Historial / Soportes" : "Merma actual en seguimiento"}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {isArchivedView
                ? "Aquí quedan los registros ya destruidos y archivados por el Jefe de Zona."
                : "Solo ves las mermas activas. Cuando se cierre el ciclo, esta lista volverá a cero."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/waste"
            className={`rounded-full px-3 py-2 text-[11px] font-bold ring-1 transition ${
              !isArchivedView
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Merma actual ({activeCount ?? 0})
          </Link>
          <Link
            href="/waste?view=archived"
            className={`rounded-full px-3 py-2 text-[11px] font-bold ring-1 transition ${
              isArchivedView
                ? "bg-blue-600 text-white ring-blue-600"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Historial / Soportes ({archivedCount ?? 0})
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Buscar y filtrar
          </p>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            Encuentra un registro sin ruido
          </h2>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto u observaciones..."
              className="w-full bg-transparent text-[15px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

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
              {isArchivedView ? "No hay soportes archivados." : "No hay registros de merma activos."}
            </p>
            {!isArchivedView ? (
              <Link
                href="/waste/new"
                className="app-cta-primary mt-4 px-6 text-sm font-bold"
              >
                Registrar primera merma
              </Link>
            ) : null}
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
