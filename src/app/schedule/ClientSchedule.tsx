"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type ShiftData = {
  type?: string;
  shift?: string;
  hours?: number;
  start?: string | null;
  "break"?: string | null;
  end?: string | null;
};

type ScheduleRow = {
  assistant: string;
  total_hours: string | number;
  [key: string]: string | number | ShiftData | undefined;
};

type ScheduleData = ScheduleRow[] | { schedule?: ScheduleRow[] } | null | undefined;

type ScheduleItem = {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  source?: string | null;
  approved_at?: string | null;
  approved_by_profile_id?: string | null;
  approval_note?: string | null;
  schedule_data?: ScheduleData;
};

const scheduleDayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type ScheduleDayKey = (typeof scheduleDayKeys)[number];

const scheduleDayLabels: Record<ScheduleDayKey, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

type ManualDay = {
  start: string;
  break: string;
  end: string;
  hours: string;
};

type ManualScheduleRow = {
  id: string;
  assistant: string;
  days: Record<ScheduleDayKey, ManualDay>;
};

function createManualDay(): ManualDay {
  return {
    start: "",
    break: "0:30",
    end: "",
    hours: "",
  };
}

function createManualDays() {
  return scheduleDayKeys.reduce((days, day) => {
    days[day] = createManualDay();
    return days;
  }, {} as Record<ScheduleDayKey, ManualDay>);
}

function createManualRow(): ManualScheduleRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    assistant: "",
    days: createManualDays(),
  };
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function parseBreakHours(value: string) {
  const normalized = value.trim().replace(",", ".");
  const timeMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    return Number(timeMatch[1]) + Number(timeMatch[2]) / 60;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function formatHourNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function calculateManualHours(start: string, end: string, breakValue: string) {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return "";

  let elapsed = endMinutes - startMinutes;
  if (elapsed < 0) elapsed += 24 * 60;

  const hours = Math.max(0, elapsed / 60 - parseBreakHours(breakValue));
  return formatHourNumber(hours);
}

function addDaysToInputDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isMondayInputDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCDay() === 1;
}

function getManualDayHours(day: ManualDay) {
  const hours = Number(day.hours.replace(",", "."));
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function getManualWeeklyTotal(row: ManualScheduleRow) {
  return scheduleDayKeys.reduce((sum, day) => sum + getManualDayHours(row.days[day]), 0);
}

function manualDayHasValue(day: ManualDay) {
  return Boolean(day.start || day.end || day.hours);
}

function manualRowHasValue(row: ManualScheduleRow) {
  return Boolean(row.assistant.trim() || scheduleDayKeys.some((day) => manualDayHasValue(row.days[day])));
}

function inferManualShiftType(day: ManualDay) {
  const hours = getManualDayHours(day);
  if (hours <= 0) return "Descanso";
  const startMinutes = parseTimeToMinutes(day.start);
  const endMinutes = parseTimeToMinutes(day.end);
  if (startMinutes !== null && startMinutes <= 8 * 60) return "Apertura";
  if (endMinutes !== null && endMinutes >= 20 * 60) return "Cierre";
  return "Intermedio";
}

function buildManualShiftCell(day: ManualDay) {
  const hours = getManualDayHours(day);
  const shift =
    hours <= 0
      ? "Descanso"
      : day.start && day.end
        ? `${day.start}-${day.end}`
        : "Manual";

  return {
    shift,
    hours,
    type: inferManualShiftType(day),
    start: day.start || null,
    break: day.break || "0:30",
    end: day.end || null,
  };
}

function buildManualScheduleData(rows: ManualScheduleRow[]) {
  return {
    source: "manual",
    created_from: "manual_builder",
    schedule: rows.map((row) => {
      const scheduleRow: ScheduleRow = {
        assistant: row.assistant.trim(),
        total_hours: formatHourNumber(getManualWeeklyTotal(row)),
      };

      scheduleDayKeys.forEach((day) => {
        scheduleRow[day] = buildManualShiftCell(row.days[day]);
      });

      return scheduleRow;
    }),
  };
}

type GenerationSnapshot = {
  status: "idle" | "running" | "done" | "error";
  requestKey: string | null;
  weekStart?: string;
  schedule?: ScheduleItem;
  error?: string;
};

const idleGenerationSnapshot: GenerationSnapshot = {
  status: "idle",
  requestKey: null,
};

function normalizeScheduleStatus(value: string) {
  const status = value.trim().toLowerCase();
  if (["approved", "publicado", "published", "aprobado"].includes(status)) return "approved";
  if (["historical", "historico", "histórico"].includes(status)) return "historical";
  if (["draft", "borrador", "generated", "generado", ""].includes(status)) return "draft";
  return status;
}

function getScheduleStateMeta(status: string) {
  const normalized = normalizeScheduleStatus(status);

  if (normalized === "approved") {
    return {
      tone: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-100",
      label: "Aprobado",
      helper: "Memoria operativa",
    };
  }

  if (normalized === "historical") {
    return {
      tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-100",
      label: "Histórico",
      helper: "Referencia guardada",
    };
  }

  return {
    tone: "bg-amber-100 text-amber-700 ring-1 ring-amber-100",
    label: "Borrador",
    helper: "Generado o pendiente",
  };
}

function formatApprovalDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

let generationSnapshot: GenerationSnapshot = idleGenerationSnapshot;
let generationPromise: Promise<void> | null = null;
const generationListeners = new Set<(snapshot: GenerationSnapshot) => void>();

function publishGenerationSnapshot(snapshot: GenerationSnapshot) {
  generationSnapshot = snapshot;
  generationListeners.forEach((listener) => listener(snapshot));
}

function subscribeGenerationSnapshot(listener: (snapshot: GenerationSnapshot) => void) {
  generationListeners.add(listener);
  listener(generationSnapshot);
  return () => generationListeners.delete(listener);
}

function notifyGenerationResult(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "granted") {
    new window.Notification(title, { body });
  }
}

function requestGenerationNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "default") {
    void window.Notification.requestPermission();
  }
}

function startScheduleGenerationTask(input: {
  weekStart: string;
  weekEnd: string;
  holidays: string[];
}) {
  if (generationPromise) return false;

  const requestKey = `${input.weekStart}:${input.holidays.join(",")}`;
  publishGenerationSnapshot({
    status: "running",
    requestKey,
    weekStart: input.weekStart,
  });

  // ponytail: browser-singleton is enough while navigating inside the app; add real jobs only if this must survive tab closes.
  generationPromise = (async () => {
    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        keepalive: true,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar malla.");

      publishGenerationSnapshot({
        status: "done",
        requestKey,
        weekStart: input.weekStart,
        schedule: data.schedule,
      });
      notifyGenerationResult("Malla lista", `La semana ${input.weekStart} ya quedo generada.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al generar malla.";
      publishGenerationSnapshot({
        status: "error",
        requestKey,
        weekStart: input.weekStart,
        error: message,
      });
      notifyGenerationResult("Error al generar malla", message);
    } finally {
      generationPromise = null;
    }
  })();

  return true;
}

export default function ClientSchedule({ initialSchedules }: { initialSchedules: ScheduleItem[] }) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [showModal, setShowModal] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [holidays, setHolidays] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [taskSnapshot, setTaskSnapshot] = useState<GenerationSnapshot>(generationSnapshot);
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [manualWeekStart, setManualWeekStart] = useState("");
  const [manualRows, setManualRows] = useState<ManualScheduleRow[]>(() => [createManualRow()]);
  const [manualApprovalNote, setManualApprovalNote] = useState("");
  const [manualError, setManualError] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const isGenerating = taskSnapshot.status === "running";
  const manualWeekEnd = manualWeekStart ? addDaysToInputDate(manualWeekStart, 6) : "";

  const getShiftColor = (type: string) => {
    if (!type) return "bg-slate-100 text-slate-600";
    const t = type.toLowerCase();
    if (t.includes("apertura")) return "bg-blue-100 text-blue-700";
    if (t.includes("cierre")) return "bg-indigo-100 text-indigo-700";
    if (t.includes("intermedio")) return "bg-amber-100 text-amber-700";
    if (t.includes("descanso")) return "bg-emerald-100 text-emerald-700";
    if (t.includes("partido")) return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

  async function handleGenerate() {
    if (!weekStart) {
      setGenerationError("Selecciona la fecha de inicio de semana.");
      toast.error("Selecciona la fecha de inicio de semana.");
      return;
    }

    setGenerationError("");
    const dateStart = new Date(weekStart);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 6);

    const holidaysArr = holidays.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      requestGenerationNotifications();
      const started = startScheduleGenerationTask({
        weekStart: dateStart.toISOString().split("T")[0],
        weekEnd: dateEnd.toISOString().split("T")[0],
        holidays: holidaysArr,
      });

      if (!started) {
        throw new Error("Ya hay una malla generandose en segundo plano.");
      }

      setShowModal(false);
      toast.success("La malla sigue generandose en segundo plano.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al generar malla.";
      setGenerationError(message);
      toast.error(message);
    }
  }

  function updateManualAssistant(rowId: string, value: string) {
    setManualRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, assistant: value } : row)),
    );
  }

  function updateManualDay(
    rowId: string,
    day: ScheduleDayKey,
    field: keyof ManualDay,
    value: string,
  ) {
    setManualRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        const nextDay = {
          ...row.days[day],
          [field]: value,
        };

        if (field !== "hours") {
          nextDay.hours = calculateManualHours(nextDay.start, nextDay.end, nextDay.break);
        }

        return {
          ...row,
          days: {
            ...row.days,
            [day]: nextDay,
          },
        };
      }),
    );
  }

  function addManualAssistant() {
    setManualRows((current) => [...current, createManualRow()]);
  }

  function removeManualAssistant(rowId: string) {
    setManualRows((current) => {
      const remaining = current.filter((row) => row.id !== rowId);
      return remaining.length > 0 ? remaining : [createManualRow()];
    });
  }

  function resetManualBuilder() {
    setManualWeekStart("");
    setManualRows([createManualRow()]);
    setManualApprovalNote("");
    setManualError("");
  }

  async function handleSaveManualSchedule() {
    if (!manualWeekStart || !manualWeekEnd) {
      setManualError("Selecciona el lunes de inicio de semana.");
      return;
    }

    if (!isMondayInputDate(manualWeekStart)) {
      setManualError("La semana debe iniciar un lunes.");
      return;
    }

    const activeRows = manualRows.filter(manualRowHasValue);
    if (activeRows.length === 0 || !activeRows.some((row) => getManualWeeklyTotal(row) > 0)) {
      setManualError("Ingresa al menos un asistente con horas en la semana.");
      return;
    }

    const missingNameRow = activeRows.find(
      (row) => !row.assistant.trim() && scheduleDayKeys.some((day) => manualDayHasValue(row.days[day])),
    );
    if (missingNameRow) {
      setManualError("Toda fila con turnos necesita nombre de asistente.");
      return;
    }

    const zeroHourNames = activeRows
      .filter((row) => row.assistant.trim() && getManualWeeklyTotal(row) === 0)
      .map((row) => row.assistant.trim());

    if (
      zeroHourNames.length > 0 &&
      !confirm(`Estos asistentes quedan con 0 horas: ${zeroHourNames.join(", ")}. ¿Guardar de todas formas?`)
    ) {
      return;
    }

    try {
      setIsSavingManual(true);
      setManualError("");

      const scheduleData = buildManualScheduleData(activeRows);
      const res = await fetch("/api/schedule/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: manualWeekStart,
          weekEnd: manualWeekEnd,
          scheduleData,
          approvalNote: manualApprovalNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error guardando la malla manual.");
      }

      const createdSchedule = data.schedule as ScheduleItem;
      setSchedules((current) => [
        createdSchedule,
        ...current.filter((schedule) => schedule.id !== createdSchedule.id),
      ]);
      setSelectedSchedule(createdSchedule);
      setShowManualBuilder(false);
      resetManualBuilder();
      toast.success("Horario manual guardado como aprobado.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error guardando la malla manual.";
      setManualError(message);
      toast.error(message);
    } finally {
      setIsSavingManual(false);
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeGenerationSnapshot(setTaskSnapshot);
    return () => {
      unsubscribe();
    };
  }, []);

  async function handleApprove(schedule: ScheduleItem) {
    if (normalizeScheduleStatus(schedule.status) === "approved") {
      toast.info("Esta malla ya está aprobada.");
      return;
    }

    const confirmed = confirm(
      `¿Marcar como aprobada la semana ${schedule.week_start} al ${schedule.week_end}?`,
    );
    if (!confirmed) return;

    const approvalNote = window.prompt(
      "Nota opcional de aprobación (puedes dejarla vacía):",
      schedule.approval_note ?? "",
    );
    if (approvalNote === null) return;

    try {
      setApprovalLoadingId(schedule.id);
      const res = await fetch("/api/schedule/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          approvalNote: approvalNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al aprobar la malla.");
      }

      const updatedSchedule: ScheduleItem = data.schedule ?? {
        ...schedule,
        status: "approved",
        approved_at: new Date().toISOString(),
        approval_note: approvalNote.trim() || null,
      };

      setSchedules((current) =>
        current.map((item) => (item.id === updatedSchedule.id ? updatedSchedule : item)),
      );

      if (selectedSchedule?.id === updatedSchedule.id) {
        setSelectedSchedule(updatedSchedule);
      }

      toast.success("Malla aprobada y guardada como memoria operativa.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al aprobar la malla.");
    } finally {
      setApprovalLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta malla?")) return;
    try {
      const res = await fetch("/api/schedule/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      setSchedules(schedules.filter((s) => s.id !== id));
      toast.success("Malla eliminada");
      if (selectedSchedule?.id === id) setSelectedSchedule(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const selectedScheduleRows: ScheduleRow[] = selectedSchedule
    ? Array.isArray(selectedSchedule.schedule_data)
      ? selectedSchedule.schedule_data
      : selectedSchedule.schedule_data?.schedule ?? []
    : [];

  const visibleSchedules =
    taskSnapshot.status === "done" &&
    taskSnapshot.schedule &&
    !schedules.some((item) => item.id === taskSnapshot.schedule?.id)
      ? [taskSnapshot.schedule, ...schedules]
      : schedules;

  const approvedSchedules = visibleSchedules
    .filter((schedule) => normalizeScheduleStatus(schedule.status) === "approved")
    .slice(0, 3);

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="sticky top-0 z-40 rounded-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 pb-5 pt-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)] md:px-6 lg:px-8 lg:rounded-[36px]">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 text-white transition-colors hover:bg-white/28"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Estructura de tienda
            </p>
            <h1 className="mt-1 text-lg font-black leading-tight text-white">
              Programación de turnos
            </h1>
            <p className="mt-1 text-[12px] leading-tight text-white/88">
              Vista semanal de turnos
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
            {visibleSchedules.length} programaciones
          </span>
        </div>
      </header>

      <div className="space-y-4 px-0 pt-4 lg:pt-6">
        {taskSnapshot.status === "running" && (
          <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-4 text-blue-800 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-blue-600 ring-1 ring-blue-100">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500">
                  Generación en segundo plano
                </p>
                <p className="mt-1 text-sm font-bold">
                  La programación de la semana {taskSnapshot.weekStart} sigue corriendo aunque cambies de panel.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-blue-700/90">
                  Cuando termine te avisamos y quedara listada aqui.
                </p>
              </div>
            </div>
          </div>
        )}

        {taskSnapshot.status === "error" && taskSnapshot.error && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
              Último error de generación
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{taskSnapshot.error}</p>
          </div>
        )}

        <button
          onClick={() => {
            setGenerationError("");
            setShowModal(true);
          }}
          className="group relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e51d2e] via-[#f22435] to-[#ff5b6b] p-5 text-left text-white shadow-[0_18px_36px_rgba(229,29,46,0.24)] transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-6 -top-6 text-white/10">
            <Sparkles className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/15">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/72">
                Planificación asistida
              </p>
              <h2 className="mt-1 text-[18px] font-black leading-tight">
                Generar turnos con IA
              </h2>
              <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-white/84">
                Arma autom?ticamente los turnos de la semana sin pelearte con la planilla.
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/92 ring-1 ring-white/12">
            Abrir generador
          </div>
        </button>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => {
              setManualError("");
              setShowManualBuilder((current) => !current);
            }}
            className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Malla editable
              </p>
              <h2 className="mt-1 text-[18px] font-black text-slate-950">
                Crear horario manual
              </h2>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500">
                Arma una semana de lunes a domingo, ajusta horas por persona y guarda el resultado como aprobado.
              </p>
            </div>
            <span className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              {showManualBuilder ? "Cerrar malla" : "Abrir malla"}
            </span>
          </button>

          {showManualBuilder && (
            <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Lunes de inicio
                  </label>
                  <input
                    type="date"
                    value={manualWeekStart}
                    onChange={(event) => setManualWeekStart(event.target.value)}
                    className="w-full rounded-2xl border-0 bg-white px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Domingo de cierre
                  </label>
                  <input
                    type="date"
                    value={manualWeekEnd}
                    readOnly
                    className="w-full rounded-2xl border-0 bg-slate-100 px-3 py-3 text-sm font-medium text-slate-500 ring-1 ring-slate-200 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addManualAssistant}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 lg:w-auto"
                  >
                    Agregar asistente
                  </button>
                </div>
              </div>

              {manualError && (
                <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {manualError}
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80">
                        <th className="sticky left-0 z-20 min-w-[190px] border-r border-slate-200 bg-slate-100/95 px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Asistente
                        </th>
                        {scheduleDayKeys.map((day) => (
                          <th
                            key={day}
                            className="min-w-[140px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
                          >
                            {scheduleDayLabels[day]}
                          </th>
                        ))}
                        <th className="min-w-[90px] px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 align-top">
                          <td className="sticky left-0 z-10 border-r border-slate-200 bg-white p-3 shadow-[8px_0_16px_-14px_rgba(15,23,42,0.45)]">
                            <input
                              type="text"
                              value={row.assistant}
                              onChange={(event) => updateManualAssistant(row.id, event.target.value)}
                              placeholder="Nombre Apellido"
                              className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                            />
                            <button
                              type="button"
                              onClick={() => removeManualAssistant(row.id)}
                              className="mt-2 text-[11px] font-bold text-rose-500 transition-colors hover:text-rose-700"
                            >
                              Quitar fila
                            </button>
                            {manualRowHasValue(row) && getManualWeeklyTotal(row) === 0 && (
                              <p className="mt-2 text-[10px] font-bold text-amber-600">
                                Advertencia: 0 horas
                              </p>
                            )}
                          </td>
                          {scheduleDayKeys.map((day) => (
                            <td key={day} className="border-r border-slate-100 bg-white p-2">
                              <div className="grid gap-1.5">
                                <input
                                  type="time"
                                  value={row.days[day].start}
                                  onChange={(event) => updateManualDay(row.id, day, "start", event.target.value)}
                                  className="rounded-xl border-0 bg-slate-50 px-2 py-2 text-[11px] font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-[#e51d2e]/25"
                                  aria-label={`${scheduleDayLabels[day]} ingreso`}
                                />
                                <input
                                  type="text"
                                  value={row.days[day].break}
                                  onChange={(event) => updateManualDay(row.id, day, "break", event.target.value)}
                                  className="rounded-xl border-0 bg-slate-50 px-2 py-2 text-[11px] font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-[#e51d2e]/25"
                                  aria-label={`${scheduleDayLabels[day]} descanso`}
                                  placeholder="0:30"
                                />
                                <input
                                  type="time"
                                  value={row.days[day].end}
                                  onChange={(event) => updateManualDay(row.id, day, "end", event.target.value)}
                                  className="rounded-xl border-0 bg-slate-50 px-2 py-2 text-[11px] font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-[#e51d2e]/25"
                                  aria-label={`${scheduleDayLabels[day]} salida`}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  value={row.days[day].hours}
                                  onChange={(event) => updateManualDay(row.id, day, "hours", event.target.value)}
                                  className="rounded-xl border-0 bg-white px-2 py-2 text-[11px] font-black text-slate-900 ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-[#e51d2e]/25"
                                  aria-label={`${scheduleDayLabels[day]} horas`}
                                  placeholder="0"
                                />
                              </div>
                            </td>
                          ))}
                          <td className="bg-slate-50 p-3 text-center text-base font-black text-slate-900">
                            {formatHourNumber(getManualWeeklyTotal(row))}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Nota opcional de aprobación
                  </label>
                  <input
                    type="text"
                    value={manualApprovalNote}
                    onChange={(event) => setManualApprovalNote(event.target.value)}
                    placeholder="Ej. horario construido manualmente por operación"
                    className="w-full rounded-2xl border-0 bg-white px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveManualSchedule}
                    disabled={isSavingManual}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 lg:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSavingManual ? "Guardando..." : "Guardar como aprobado"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-500">
                Memoria operativa
              </p>
              <h3 className="mt-1 text-sm font-black text-emerald-950">
                Horarios aprobados
              </h3>
              <p className="mt-1 max-w-[34rem] text-[12px] leading-relaxed text-emerald-800/90">
                Un horario aprobado queda como referencia futura. Todavía no alimenta la IA
                automáticamente en esta fase.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-100">
              {approvedSchedules.length} guardados
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {approvedSchedules.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-emerald-200 bg-white/75 p-4 text-sm text-emerald-900">
                <p className="font-bold">Aún no hay horarios aprobados.</p>
                <p className="mt-1 text-[12px] leading-relaxed text-emerald-700">
                  Aprueba una malla revisada para empezar a construir memoria operativa.
                </p>
              </div>
            ) : (
              approvedSchedules.map((schedule) => {
                const meta = getScheduleStateMeta(schedule.status);
                return (
                  <div
                    key={`approved-${schedule.id}`}
                    className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-emerald-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                          Semana
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-900">
                          {schedule.week_start} al {schedule.week_end}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-[12px] text-slate-600 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Aprobado
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {formatApprovalDate(schedule.approved_at) || "Sin fecha"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Origen
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {schedule.source || "generated"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Nota
                        </p>
                        <p className="mt-0.5 line-clamp-2 font-medium text-slate-700">
                          {schedule.approval_note?.trim() || "Sin nota"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">
            Programaciones recientes
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
            {visibleSchedules.length} recientes
          </span>
        </div>

        {visibleSchedules.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <CalendarIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              Aún no has generado ninguna programación.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Crea la primera semana desde la malla manual o desde el planificador IA.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-1">
            {visibleSchedules.map((sch) => (
              <div key={sch.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Semana
                    </p>
                    <p className="mt-1 text-[15px] font-black text-slate-900">
                      {sch.week_start} al {sch.week_end}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {getScheduleStateMeta(sch.status).helper}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getScheduleStateMeta(
                      sch.status,
                    ).tone}`}
                  >
                    {getScheduleStateMeta(sch.status).label}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-[12px] font-medium text-slate-500">
                    Toca el chevron para ver la programación completa.
                  </p>
                  <div className="flex items-center gap-2">
                    {normalizeScheduleStatus(sch.status) !== "approved" && (
                      <button
                        onClick={() => handleApprove(sch)}
                        disabled={approvalLoadingId === sch.id}
                        className="flex h-11 items-center gap-2 rounded-full bg-emerald-50 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {approvalLoadingId === sch.id ? "Aprobando..." : "Aprobar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(sch.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedSchedule(sch)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:max-w-xl lg:max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Configuración
            </p>
            <h2 className="mt-1 text-[18px] font-black text-slate-900">
              Nueva programación semanal
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              La IA tomará las reglas de tu tienda y las aplicará a esta semana.
            </p>

            {generationError && (
              <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 shadow-sm" role="alert">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-500">
                  Error de generación
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{generationError}</p>
                <p className="mt-2 text-[11px] text-rose-500">
                  Este error queda visible hasta cerrar el modal o generar una programación válida.
                </p>
              </div>
            )}

            <div className="mb-6 space-y-4 pt-5">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Inicio de semana
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Días festivos (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. lunes, jueves..."
                  value={holidays}
                  onChange={(e) => setHolidays(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-[#e51d2e]/30"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Separados por comas si hay más de uno.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGenerationError("");
                  setShowModal(false);
                }}
                disabled={isGenerating}
                className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#e51d2e] py-3 text-sm font-bold text-white transition-colors hover:bg-[#c71a29] disabled:opacity-70"
              >
                {isGenerating ? "Generando..." : "Crear programación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-right">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Programación abierta
                </p>
                <h2 className="mt-0.5 text-sm font-black text-slate-900">
                  Programación de turnos
                </h2>
                <p className="text-[10px] text-slate-500">
                  {selectedSchedule.week_start} al {selectedSchedule.week_end}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getScheduleStateMeta(
                selectedSchedule.status,
              ).tone}`}
            >
              {getScheduleStateMeta(selectedSchedule.status).label}
            </span>
          </header>

          <div className="flex-1 overflow-auto px-4 pb-4 pt-4 md:px-6 lg:px-8">
            {normalizeScheduleStatus(selectedSchedule.status) !== "approved" && (
              <div className="mb-4 rounded-[24px] border border-emerald-100 bg-emerald-50/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-500">
                      Cierre del supervisor
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-950">
                      Aprobá esta malla para guardarla como memoria operativa.
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-emerald-800/90">
                      La aprobación valida este horario como referencia futura. En esta fase todavía no cambia la generación IA.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApprove(selectedSchedule)}
                    disabled={approvalLoadingId === selectedSchedule.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approvalLoadingId === selectedSchedule.id ? "Aprobando..." : "Marcar como aprobado"}
                  </button>
                </div>
              </div>
            )}

            {normalizeScheduleStatus(selectedSchedule.status) === "approved" && (
              <div className="mb-4 rounded-[24px] border border-emerald-100 bg-emerald-50/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-500">
                      Memoria operativa
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-950">
                      Esta malla ya quedó aprobada por el supervisor.
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-emerald-800/90">
                      Queda guardada como referencia futura para la operación. Todavía no alimenta la IA automáticamente en esta fase.
                    </p>
                  </div>
                  <div className="grid gap-2 text-[12px] text-emerald-900 sm:min-w-56">
                    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-500">
                        Aprobado
                      </p>
                      <p className="mt-0.5 font-medium">
                        {formatApprovalDate(selectedSchedule.approved_at) || "Sin fecha"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-500">
                        Nota
                      </p>
                      <p className="mt-0.5 font-medium">
                        {selectedSchedule.approval_note?.trim() || "Sin nota"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap text-xs text-left">
                  <thead>
                    <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                      <th className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50/95 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-[6px_0_14px_-10px_rgba(15,23,42,0.35)]">
                        Asistente
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Lunes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Martes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Miercoles
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Jueves
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Viernes
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Sabado
                      </th>
                      <th className="min-w-[90px] border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Domingo
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Total Hrs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedScheduleRows.map((row: ScheduleRow, i: number) => (
                      <tr key={i} className="border-b border-slate-100/80 odd:bg-white even:bg-slate-50/20 hover:bg-slate-50">
                        <td className="sticky left-0 z-20 border-r border-slate-200/80 bg-white px-4 py-3 font-bold text-slate-900 shadow-[8px_0_16px_-12px_rgba(15,23,42,0.35)]">
                          {row.assistant}
                        </td>
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                          const shiftData = row[day] as ShiftData | undefined;
                          if (!shiftData) {
                            return <td key={day} className="border-r border-slate-200/80 bg-slate-50/40 p-2"></td>;
                          }
                          return (
                            <td key={day} className="border-r border-slate-200/80 bg-white p-2">
                              <div className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center ring-1 shadow-sm ${getShiftColor(shiftData.type ?? "")}`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.14em]">{shiftData.type}</span>
                                {shiftData.shift !== "Descanso" && (
                                  <span className="mt-0.5 text-[11px] font-medium opacity-90">{shiftData.shift}</span>
                                )}
                                {shiftData.shift !== "Descanso" && shiftData.hours && (
                                  <span className="mt-0.5 text-[10px] font-bold opacity-75">{shiftData.hours}h</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="bg-slate-50/80 px-4 py-3 text-center text-[14px] font-black text-slate-900 ring-1 ring-inset ring-slate-100">
                          {row.total_hours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-100/80">
                      <td className="sticky left-0 z-20 border-r border-slate-200/80 bg-slate-100/90 px-4 py-3 font-black text-slate-700 shadow-[8px_0_16px_-12px_rgba(15,23,42,0.35)]">
                        TOTAL HRS / DIA
                      </td>
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                        const totalDayHours = selectedScheduleRows.reduce((sum, row) => {
                          const shiftData = row[day] as ShiftData | undefined;
                          return sum + (Number(shiftData?.hours) || 0);
                        }, 0);
                        return (
                          <td key={day} className="border-r border-slate-200/80 px-4 py-3 text-center text-[13px] font-black text-slate-800">
                            {totalDayHours}h
                          </td>
                        );
                      })}
                      <td className="bg-slate-200/60 px-4 py-3 text-center text-[13px] font-black text-slate-800">
                        {selectedScheduleRows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0)}h
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {selectedScheduleRows.length === 0 && (
                  <div className="border-t border-slate-200/80 bg-slate-50/80 p-6 text-center text-slate-500">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Estado tecnico
                    </p>
                    <p className="mb-4 text-sm text-rose-500">
                      El formato devuelto por la IA no fue el esperado. Aqu? tienes los datos en crudo para que puedas ver el horario:
                    </p>
                    <div className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-left text-[10px] font-mono whitespace-pre-wrap text-emerald-400 ring-1 ring-slate-800/60">
                      {JSON.stringify(selectedSchedule.schedule_data, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
