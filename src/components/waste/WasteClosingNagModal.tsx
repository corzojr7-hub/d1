"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { archiveStoreWaste } from "@/app/waste/actions";

type Props = {
  storeCode: string;
  canArchive: boolean;
  activeCount: number;
  oldestActiveCreatedAt: string | null;
};

function getBogotaParts(now = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = Number(dateParts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(dateParts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(dateParts.find((part) => part.type === "day")?.value ?? "0");
  const hour = Number(dateParts.find((part) => part.type === "hour")?.value ?? "0");
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const weekday = new Date(`${dateKey}T12:00:00-05:00`).getUTCDay();

  return { dateKey, weekday, hour };
}

function getLastFridayThreshold(now = new Date()) {
  const { dateKey, weekday, hour } = getBogotaParts(now);
  const threshold = new Date(`${dateKey}T18:00:00-05:00`);
  const daysSinceFriday = (weekday - 5 + 7) % 7;
  threshold.setUTCDate(threshold.getUTCDate() - daysSinceFriday);

  if (daysSinceFriday === 0 && hour < 18) {
    threshold.setUTCDate(threshold.getUTCDate() - 7);
  }

  return threshold;
}

export default function WasteClosingNagModal({
  storeCode,
  canArchive,
  activeCount,
  oldestActiveCreatedAt,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "question" | "confirm">("closed");
  const [isPending, startTransition] = useTransition();

  const shouldPrompt = useMemo(() => {
    if (!canArchive || activeCount <= 0 || !oldestActiveCreatedAt) {
      return false;
    }

    return new Date(oldestActiveCreatedAt).getTime() < getLastFridayThreshold().getTime();
  }, [activeCount, canArchive, oldestActiveCreatedAt]);

  useEffect(() => {
    if (shouldPrompt) {
      setStep("question");
    }
  }, [shouldPrompt]);

  if (step === "closed") {
    return null;
  }

  function handleArchive() {
    startTransition(async () => {
      try {
        const result = await archiveStoreWaste(storeCode);
        toast.success(
          result.archivedCount > 0
            ? `Se archivaron ${result.archivedCount} registros de merma.`
            : "No había mermas activas por cerrar.",
        );
        setStep("closed");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cerrar el ciclo de merma.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-50 p-3 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-600">
              Cierre de merma
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {step === "question"
                ? "¿El Jefe de Zona ya hizo destrucción de la merma?"
                : "¿Estás seguro de cerrar este ciclo?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {step === "question"
                ? "Si ya se hizo la destrucción, puedes cerrar el ciclo para que la merma actual arranque en cero y los soportes pasen al historial."
                : "La semana actual iniciará en cero y las mermas actuales pasarán al historial de soportes. Esta acción afecta toda la tienda."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {step === "question" ? (
            <>
              <button
                type="button"
                onClick={() => setStep("closed")}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#e51d2e] px-5 text-sm font-bold text-white transition hover:bg-[#c91528]"
              >
                Sí
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("question")}
                disabled={isPending}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isPending}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-sm font-bold text-white transition hover:bg-[#c91528] disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar cierre
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
