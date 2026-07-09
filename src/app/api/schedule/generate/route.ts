import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireSupervisor } from "@/lib/supabase/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { AI_ACTIONS, logAiUsage } from "@/lib/ai/usage";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { sanitizedTextSchema } from "@/lib/security";

export const maxDuration = 60;

type TeamMemberPayload = {
  nombre: string;
  rol: string;
  contrato: string;
};

type AssistantProfile = {
  name?: string;
  role?: string;
};

type ScheduleRow = {
  assistant: string;
  total_hours?: number;
  monday?: unknown;
  tuesday?: unknown;
  wednesday?: unknown;
  thursday?: unknown;
  friday?: unknown;
  saturday?: unknown;
  sunday?: unknown;
};

type ScheduleResponse = {
  schedule?: ScheduleRow[];
};

type KeyRoleAliases = {
  supervisor: string;
  second?: string;
  third?: string;
};

type ProviderUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

type ShiftCell = {
  shift: string;
  hours: number;
  type: string;
};

const scheduleDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const canonicalShifts: ShiftCell[] = [
  { shift: "06:00-14:30", hours: 8, type: "Apertura" },
  { shift: "06:00-13:30", hours: 7, type: "Apertura" },
  { shift: "06:00-11:00", hours: 5, type: "Apertura" },
  { shift: "06:00-10:00", hours: 4, type: "Apertura" },
  { shift: "08:00-16:30", hours: 8, type: "Apertura" },
  { shift: "08:00-15:30", hours: 7, type: "Apertura" },
  { shift: "08:00-14:30", hours: 6, type: "Apertura" },
  { shift: "08:00-13:00", hours: 5, type: "Apertura" },
  { shift: "08:00-12:00", hours: 4, type: "Apertura" },
  { shift: "09:00-17:30", hours: 8, type: "Apertura" },
  { shift: "09:00-16:30", hours: 7, type: "Apertura" },
  { shift: "09:00-15:30", hours: 6, type: "Apertura" },
  { shift: "09:00-14:00", hours: 5, type: "Apertura" },
  { shift: "09:00-13:00", hours: 4, type: "Apertura" },
  { shift: "13:30-22:00", hours: 8, type: "Cierre" },
  { shift: "14:30-22:00", hours: 7, type: "Cierre" },
  { shift: "15:30-22:00", hours: 6, type: "Cierre" },
  { shift: "17:00-22:00", hours: 5, type: "Cierre" },
  { shift: "18:00-22:00", hours: 4, type: "Cierre" },
  { shift: "10:00-18:30", hours: 8, type: "Intermedio" },
  { shift: "11:00-16:00", hours: 5, type: "Intermedio" },
  { shift: "06:00-10:00 / 18:00-22:00", hours: 8, type: "Partido" },
  { shift: "Descanso", hours: 0, type: "Descanso" },
];

function extractFirstJsonObject(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return trimmed.slice(firstBrace, lastBrace + 1);
}

function selfCheckExtractFirstJsonObject() {
  console.assert(extractFirstJsonObject('{"ok":true}') === '{"ok":true}');
  console.assert(extractFirstJsonObject('```json\n{"ok":true}\n```') === '{"ok":true}');
}

selfCheckExtractFirstJsonObject();

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferShiftType(text: string) {
  if (text.includes("descanso") || text.includes("compen")) return "Descanso";
  if (text.includes("partido")) return "Partido";
  if (text.includes("intermedio")) return "Intermedio";
  if (text.includes("cierre") || text.includes("pm")) return "Cierre";
  if (text.includes("apertura") || text.includes("am")) return "Apertura";
  return "";
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function inferHoursFromTimes(times: string[]) {
  if (times.length === 2) {
    const elapsed = parseTimeToMinutes(times[1]) - parseTimeToMinutes(times[0]);
    if (elapsed <= 0) return NaN;
    const hours = elapsed / 60;
    return hours > 5 ? hours - 0.5 : hours;
  }

  if (times.length === 4) {
    const firstBlock = parseTimeToMinutes(times[1]) - parseTimeToMinutes(times[0]);
    const secondBlock = parseTimeToMinutes(times[3]) - parseTimeToMinutes(times[2]);
    if (firstBlock <= 0 || secondBlock <= 0) return NaN;
    return (firstBlock + secondBlock) / 60;
  }

  return NaN;
}

function extractShiftFromText(rawShift: string, combinedText: string) {
  if (combinedText.includes("descanso") || combinedText.includes("compen")) {
    return "Descanso";
  }

  const times = combinedText.match(/\b\d{2}:\d{2}\b/g) ?? [];
  if (times.length === 2) {
    return `${times[0]}-${times[1]}`;
  }

  if (times.length === 4) {
    return `${times[0]}-${times[1]} / ${times[2]}-${times[3]}`;
  }

  return rawShift;
}

function inferHours(cell: Record<string, unknown> | null, combinedText: string) {
  const directHours = Number(cell?.hours);
  if (Number.isFinite(directHours)) return directHours;

  const hourMatch = combinedText.match(/(?:^|[^0-9])(4|5|6|7|8|9)(?:\s*h|\s*horas?)(?:[^a-z]|$)/);
  if (hourMatch) return Number(hourMatch[1]);

  const times = combinedText.match(/\b\d{2}:\d{2}\b/g) ?? [];
  const timeHours = inferHoursFromTimes(times);
  if (Number.isFinite(timeHours)) return timeHours;

  const compactHourMatch = combinedText.match(/(?:^|[^0-9])(4|5|6|7|8|9)(?:[^0-9]|$)/);
  if (compactHourMatch && combinedText.includes("hora")) {
    return Number(compactHourMatch[1]);
  }

  return hourMatch ? Number(hourMatch[1]) : NaN;
}

function normalizeShiftCell(value: unknown) {
  const cell = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const rawValue = typeof value === "string" ? value.trim() : "";
  const rawShift = String(cell?.shift ?? cell?.label ?? cell?.value ?? rawValue).trim();
  const rawType = String(cell?.type ?? "").trim();
  const combinedText = normalizeText(`${rawType} ${rawShift}`);

  if (!combinedText) return null;

  const inferredType = inferShiftType(combinedText);
  const inferredHours = inferHours(cell, combinedText);
  const extractedShift = extractShiftFromText(rawShift, combinedText);

  if (combinedText.includes("descanso")) {
    return { shift: "Descanso", hours: 0, type: "Descanso" } satisfies ShiftCell;
  }

  const directMatch = canonicalShifts.find(
    (option) => option.shift === extractedShift && option.type === inferredType,
  );
  if (directMatch) return directMatch;

  const normalizedByTypeAndHours = canonicalShifts.find(
    (option) =>
      option.type === inferredType &&
      option.hours === inferredHours &&
      option.shift !== "Descanso",
  );
  if (normalizedByTypeAndHours) return normalizedByTypeAndHours;

  const normalizedByShift = canonicalShifts.find((option) => option.shift === extractedShift);
  if (normalizedByShift) return normalizedByShift;

  if (extractedShift && inferredType && Number.isFinite(inferredHours)) {
    return {
      shift: extractedShift,
      hours: inferredHours,
      type: inferredType,
    } satisfies ShiftCell;
  }

  return null;
}

function normalizeScheduleData(scheduleData: ScheduleResponse) {
  const schedule = scheduleData.schedule;
  if (!Array.isArray(schedule) || schedule.length === 0) {
    throw new Error("La IA no devolvio una malla valida.");
  }

  const normalizedSchedule = schedule.map((row) => {
    const normalizedRow: ScheduleRow = {
      assistant: String(row.assistant ?? "").trim(),
      total_hours: Number(row.total_hours ?? 0),
    };

    if (!normalizedRow.assistant) {
      throw new Error("La IA devolvio un colaborador sin nombre.");
    }

    for (const day of scheduleDays) {
      const normalizedCell = normalizeShiftCell(row[day]);
      if (!normalizedCell) {
        throw new Error(`La IA devolvio un turno invalido para ${normalizedRow.assistant} en ${day}.`);
      }
      normalizedRow[day] = normalizedCell;
    }

    if (!Number.isFinite(Number(normalizedRow.total_hours))) {
      normalizedRow.total_hours = scheduleDays.reduce((sum, day) => {
        const cell = normalizedRow[day] as ShiftCell;
        return sum + Number(cell.hours || 0);
      }, 0);
    }

    return normalizedRow;
  });

  return {
    ...scheduleData,
    schedule: normalizedSchedule,
  } satisfies ScheduleResponse;
}

function enforceKeyRoleRules(scheduleData: ScheduleResponse) {
  const schedule = scheduleData.schedule ?? [];
  for (const row of schedule) {
    row.total_hours = scheduleDays.reduce(
      (sum, day) => sum + Number((row[day] as ShiftCell).hours || 0),
      0,
    );
  }
}

function validateKeyRoleRules(scheduleData: ScheduleResponse, keyRoles: KeyRoleAliases) {
  const schedule = scheduleData.schedule ?? [];
  const normalizedNames = schedule.map((row) => normalizeText(row.assistant));
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error("La IA repitio personas en la malla.");
  }

  const rowByAssistant = new Map(
    schedule.map((row) => [normalizeText(row.assistant), row] as const),
  );

  const supervisorRow = rowByAssistant.get(normalizeText(keyRoles.supervisor));
  if (!supervisorRow) {
    throw new Error("La IA no incluyo al supervisor en la malla.");
  }
}

async function requestScheduleCompletion(openai: OpenAI, model: string, prompt: string) {
  let lastText = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            attempt === 0
              ? "Devuelve solo un objeto JSON valido, sin markdown ni texto extra."
              : "Tu respuesta anterior no fue JSON valido. Devuelve solo un objeto JSON valido con la clave schedule.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0].message.content;
    lastText = typeof content === "string" ? content : JSON.stringify(content ?? "");

    if (extractFirstJsonObject(lastText)) {
      return { completion, responseText: lastText };
    }
  }

  throw new Error(
    `La IA no devolvio JSON valido. Respuesta recibida: ${lastText.slice(0, 180) || "vacia"}`,
  );
}

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireSupervisor();

    if (!(await checkRateLimit(profile.id, 5, 60000))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const payload = await request.json();

    const schema = z.object({
      weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato invalido (YYYY-MM-DD)"),
      weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato invalido (YYYY-MM-DD)"),
      holidays: z.array(sanitizedTextSchema(0, 80, "Festivo invalido").pipe(z.string().regex(/^[a-zA-Z0-9\s\-_,]*$/))),
    });

    const { weekStart, weekEnd, holidays } = schema.parse(payload);

    const scheduleModel = process.env.DEEPSEEK_SCHEDULE_MODEL || process.env.DEEPSEEK_DEFAULT_MODEL;
    if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL || !scheduleModel) {
      return NextResponse.json({ error: "DeepSeek no esta configurado." }, { status: 500 });
    }
    const openai = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    const realNames: Record<string, string> = {};
    const team: TeamMemberPayload[] = [];
    const seenMembers = new Set<string>();
    const keyRoles: KeyRoleAliases = {
      supervisor: profile.display_name,
      second: profile.second_in_charge || undefined,
      third: profile.third_in_charge || undefined,
    };

    let operatorIndex = 1;
    const addMember = (realName: string, role: string, contract: string) => {
      const normalizedName = normalizeText(realName);
      if (!normalizedName || seenMembers.has(normalizedName)) return;
      seenMembers.add(normalizedName);
      const alias = `Operador ${operatorIndex++}`;
      realNames[alias] = realName;
      team.push({ nombre: alias, rol: role, contrato: contract });
    };

    addMember(profile.display_name, "Supervisor", "Full-Time");
    if (profile.second_in_charge) addMember(profile.second_in_charge, "Segunda", "Full-Time");
    if (profile.third_in_charge) addMember(profile.third_in_charge, "Tercero", "Full-Time");

    (profile.assistants as AssistantProfile[] | null | undefined || []).forEach((assistant) => {
      addMember(
        assistant.name || "Sin nombre",
        "Asistente",
        assistant.role === "Part-Time" ? "Part-Time" : "Full-Time",
      );
    });

    const promptPath = path.join(process.cwd(), "src", "lib", "prompts", "ai_scheduler_prompt.md");
    let masterPrompt = "";
    try {
      masterPrompt = fs.readFileSync(promptPath, "utf8");
    } catch {
      masterPrompt = `
      Eres un experto planner de recursos humanos.
      Reglas:
      1. Apertura 06:00, Cierre 22:00.
      2. Descansos obligatorios segun festivos.
      3. Genera un JSON con el horario para cada asistente de lunes a domingo.
      `;
    }

    const finalPrompt = `
    ${masterPrompt}

    ESTA SEMANA:
    Inicio: ${weekStart}
    Fin: ${weekEnd}
    Festivos: ${holidays.length > 0 ? holidays.join(", ") : "Ninguno"}

    EQUIPO:
    ${JSON.stringify(team, null, 2)}

    REGLAS EXTRA OBLIGATORIAS PARA ESTA RESPUESTA:
    - Debes usar exactamente ${team.length} filas en schedule, una por cada persona del EQUIPO.
    - No repitas personas.
    - No conviertas a Segunda o Tercera en asistentes duplicados.
    - Supervisor y Segunda deben mantener la misma franja toda la semana: o Apertura o Cierre. No pueden abrir un dia y cerrar otro, salvo cuando uno cubra un descanso en turno Partido.
    - El Supervisor nunca puede quedar en Intermedio.
    - La Segunda nunca puede quedar en Intermedio.
    - Si descansa el Supervisor, la Segunda debe quedar en turno Partido y la Tercera en Intermedio ese mismo dia.
    - Si descansa la Segunda, el Supervisor debe quedar en turno Partido y la Tercera en Intermedio ese mismo dia.
    - En esos dias, el Partido debe ser exactamente 06:00-10:00 / 18:00-22:00.
    - En esos dias, la Tercera debe cubrir exactamente 10:00-18:30 para no dejar la tienda sin encargado mientras regresa el Partido.
    - Devuelve exclusivamente un objeto JSON valido. No escribas introducciones, disculpas, advertencias ni texto fuera del JSON.

    REGLAS DE COBERTURA ESTRICTA PARA ESTA TIENDA:
    1. LA TIENDA NUNCA PUEDE QUEDAR SOLA: Si pones Aperturas que salen a las 11:00, DEBE haber un Intermedio o Cierre que entre ANTES de las 11:00. Nunca puede quedar 1 sola persona en la tienda, minimo 2 fisicamente en cualquier hora.
    2. MINIMO 3 CIERRES DIARIOS: Todos los dias (Lunes a Domingo), DEBE haber como minimo 3 personas cuyo turno termine a las 22:00. No importa si es Partido o Cierre normal, a las 22:00 debe haber minimo 3 personas en la tienda.
    3. MINIMO 2 APERTURAS A LAS 06:00: Todos los dias DEBE haber minimo 2 personas entrando a las 06:00.

    REGLA MATEMATICA DE 42 HORAS:
    - Nadie puede superar las 42 horas semanales en total.
    - Si la suma da mas de 42, corrige antes de responder.

    ESTRUCTURA EXACTA DEL JSON ESPERADO:
    {
      "schedule": [
        {
          "assistant": "Nombre",
          "monday": { "shift": "06:00-14:30", "hours": 8, "type": "Apertura" },
          "tuesday": { "shift": "13:30-22:00", "hours": 8, "type": "Cierre" },
          "wednesday": { "shift": "06:00-10:00 / 18:00-22:00", "hours": 8, "type": "Partido" },
          "thursday": { "shift": "Descanso", "hours": 0, "type": "Descanso" },
          "friday": { "shift": "10:00-18:30", "hours": 8, "type": "Intermedio" },
          "saturday": { "shift": "06:00-11:00", "hours": 5, "type": "Apertura" },
          "sunday": { "shift": "17:00-22:00", "hours": 5, "type": "Cierre" },
          "total_hours": 42
        }
      ]
    }
    `;

    const { completion, responseText } = await requestScheduleCompletion(openai, scheduleModel, finalPrompt);

    const usage = (completion.usage ?? null) as ProviderUsage | null;

    await logAiUsage({
      adminId: profile.id,
      storeCode: profile.store_code,
      actionType: AI_ACTIONS.schedule,
      model: scheduleModel,
      usage: usage
        ? {
            promptTokenCount: usage.prompt_tokens ?? 0,
            candidatesTokenCount: usage.completion_tokens ?? 0,
            totalTokenCount: usage.total_tokens ?? 0,
          }
        : null,
    });

    const jsonText = extractFirstJsonObject(responseText);
    if (!jsonText) {
      throw new Error("La IA no devolvio un JSON valido.");
    }

    const scheduleData = normalizeScheduleData(JSON.parse(jsonText) as ScheduleResponse);

    if (scheduleData.schedule) {
      scheduleData.schedule.forEach((row) => {
        if (realNames[row.assistant]) {
          row.assistant = realNames[row.assistant];
        }
      });
    }

    enforceKeyRoleRules(scheduleData);
    validateKeyRoleRules(scheduleData, keyRoles);

    const { data: inserted, error: insertError } = await supabase
      .from("weekly_schedules")
      .insert({
        profile_id: profile.id,
        week_start: weekStart,
        week_end: weekEnd,
        schedule_data: scheduleData,
        status: "borrador",
        created_by: profile.user_id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Error guardando el horario en la base de datos.");
    }

    return NextResponse.json({ success: true, schedule: inserted });
  } catch (error: unknown) {
    console.error("Schedule Generate Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generando el horario." },
      { status: 500 },
    );
  }
}
