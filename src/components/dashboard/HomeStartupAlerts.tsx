"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Sparkles, X } from "lucide-react";

type DispatchAlert = {
  id: string;
  title: string;
  createdAt: string;
  message: string;
  detail: string;
};

type FefoAlert = {
  id: string;
  productName: string;
  quantity: number;
  expirationDate: string;
  actionLabel: string;
};

type Props = {
  todayKey: string;
  sessionKey: string;
  storeCode: string;
  aseoPerson: string;
  dispatchAlerts: DispatchAlert[];
  fefoAlerts: FefoAlert[];
};

function readIds(key: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify(ids));
}

function formatBogotaDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default function HomeStartupAlerts({
  todayKey,
  sessionKey,
  storeCode,
  aseoPerson,
  dispatchAlerts,
  fefoAlerts,
}: Props) {
  const closeKey = `home-alerts:${storeCode}:${sessionKey}:closed`;
  const dispatchKey = `home-alerts:${storeCode}:${todayKey}:dispatch`;
  const fefoKey = `home-alerts:${storeCode}:${todayKey}:fefo`;

  const [isClosed, setIsClosed] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem(closeKey) === "1",
  );
  const [checkedDispatchIds, setCheckedDispatchIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readIds(dispatchKey),
  );
  const [checkedFefoIds, setCheckedFefoIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readIds(fefoKey),
  );

  const visibleDispatches = useMemo(
    () => dispatchAlerts.filter((item) => !checkedDispatchIds.includes(item.id)),
    [checkedDispatchIds, dispatchAlerts],
  );

  const visibleFefo = useMemo(
    () => fefoAlerts.filter((item) => !checkedFefoIds.includes(item.id)),
    [checkedFefoIds, fefoAlerts],
  );

  const hasContent =
    Boolean(aseoPerson && aseoPerson !== "Sin asignar") ||
    visibleDispatches.length > 0 ||
    visibleFefo.length > 0;

  if (isClosed || !hasContent) {
    return null;
  }

  function closeForToday() {
    window.localStorage.setItem(closeKey, "1");
    setIsClosed(true);
  }

  function markDispatchChecked(id: string) {
    const nextIds = [...new Set([...checkedDispatchIds, id])];
    saveIds(dispatchKey, nextIds);
    setCheckedDispatchIds(nextIds);
  }

  function markFefoChecked(id: string) {
    const nextIds = [...new Set([...checkedFefoIds, id])];
    saveIds(fefoKey, nextIds);
    setCheckedFefoIds(nextIds);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]">
      <div className="mx-auto mt-[10vh] w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Antes de arrancar
            </p>
            <h2 className="mt-1 text-[22px] font-black tracking-tight text-slate-950">
              Revisa lo pendiente del turno
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-slate-500">
              Cierra esta alerta cuando ya tengas claro qué vas a revisar hoy.
            </p>
          </div>

          <button
            type="button"
            onClick={closeForToday}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Cerrar notificación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {aseoPerson && aseoPerson !== "Sin asignar" ? (
            <section className="rounded-[24px] border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-blue-600 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                    Aseo del día
                  </p>
                  <p className="mt-1 text-[16px] font-black text-slate-900">{aseoPerson}</p>
                  <p className="mt-1 text-[12px] leading-snug text-slate-600">
                    Tenlo presente desde el arranque para que no se te cruce con el resto del turno.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {visibleDispatches.length > 0 ? (
            <section className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-amber-600 shadow-sm">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
                    Diferencias por verificar
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-slate-700">
                    Comprueba el corte documental y valida si ya dieron respuesta a la diferencia.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {visibleDispatches.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-200/80 bg-white px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {item.detail}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          Reportada el {formatBogotaDate(item.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markDispatchChecked(item.id)}
                        className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-200"
                      >
                        Ya comprobé hoy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {visibleFefo.length > 0 ? (
            <section className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-rose-600 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-700">
                    Radar de vencimiento
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-slate-700">
                    Revisa lo que ya debe salir o lo que tienes que preparar desde esta noche.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {visibleFefo.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-rose-200/80 bg-white px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-900">{item.productName}</p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {item.quantity} unidad{item.quantity === 1 ? "" : "es"} · vence el{" "}
                          {formatBogotaDate(item.expirationDate)}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-rose-700">
                          {item.actionLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markFefoChecked(item.id)}
                        className="shrink-0 rounded-full bg-rose-100 px-3 py-1.5 text-[11px] font-bold text-rose-800 transition hover:bg-rose-200"
                      >
                        Ya revisé hoy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
