import { NextResponse } from "next/server";
import { requireSupervisor } from "@/lib/supabase/require-auth";

const scheduleDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseUtcDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value: string, days: number) {
  const date = parseUtcDate(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 280) : "";
}

function validateScheduleData(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("scheduleData es obligatorio.");
  }

  const schedule = (value as { schedule?: unknown }).schedule;
  if (!Array.isArray(schedule) || schedule.length === 0) {
    throw new Error("La malla debe tener al menos un asistente.");
  }

  let hasAnyHours = false;

  schedule.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`La fila ${index + 1} no es valida.`);
    }

    const candidate = row as Record<string, unknown>;
    const assistant = typeof candidate.assistant === "string" ? candidate.assistant.trim() : "";
    if (!assistant) {
      throw new Error(`La fila ${index + 1} necesita nombre de asistente.`);
    }

    const totalHours = Number(candidate.total_hours);
    if (!Number.isFinite(totalHours) || totalHours < 0) {
      throw new Error(`El total semanal de ${assistant} no es valido.`);
    }

    for (const day of scheduleDays) {
      const cell = candidate[day];
      if (!cell || typeof cell !== "object") {
        throw new Error(`Falta el turno de ${assistant} en ${day}.`);
      }

      const shiftCell = cell as Record<string, unknown>;
      const hours = Number(shiftCell.hours);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        throw new Error(`Las horas de ${assistant} en ${day} no son validas.`);
      }

      if (hours > 0) hasAnyHours = true;
    }
  });

  if (!hasAnyHours) {
    throw new Error("No se puede guardar una malla sin horas.");
  }
}

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireSupervisor();

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    const weekStart = isDateString(payload?.weekStart) ? payload.weekStart : "";
    const weekEnd = isDateString(payload?.weekEnd) ? payload.weekEnd : "";

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: "Semana invalida." }, { status: 400 });
    }

    const startDate = parseUtcDate(weekStart);
    if (!startDate || startDate.getUTCDay() !== 1) {
      return NextResponse.json({ error: "La semana debe iniciar un lunes." }, { status: 400 });
    }

    if (addDays(weekStart, 6) !== weekEnd) {
      return NextResponse.json({ error: "La semana debe cubrir lunes a domingo." }, { status: 400 });
    }

    try {
      validateScheduleData(payload?.scheduleData);
    } catch (error: unknown) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Malla invalida." },
        { status: 400 },
      );
    }

    const approvalNote = normalizeNote(payload?.approvalNote);
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("weekly_schedules")
      .insert({
        profile_id: profile.id,
        week_start: weekStart,
        week_end: weekEnd,
        schedule_data: payload?.scheduleData,
        status: "approved",
        source: "manual",
        store_code: profile.store_code,
        approved_at: now,
        approved_by_profile_id: profile.id,
        approval_note: approvalNote || null,
        created_by: profile.user_id,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, schedule: inserted });
  } catch (error: unknown) {
    console.error("Manual schedule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error guardando la malla manual." },
      { status: 500 },
    );
  }
}
