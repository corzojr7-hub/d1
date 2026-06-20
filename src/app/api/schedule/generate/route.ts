import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { requireSupervisor } from "@/lib/supabase/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { AI_ACTIONS, logAiUsage } from "@/lib/ai/usage";
import { z } from "zod";
import fs from "fs";
import path from "path";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

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
};

type ScheduleResponse = {
  schedule?: ScheduleRow[];
};

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireSupervisor();

    if (!(await checkRateLimit(profile.id, 5, 60000))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const payload = await request.json();
    
    // Zod Validation
    const schema = z.object({
      weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
      weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
      holidays: z.array(z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s-]+$/))
    });

    const { weekStart, weekEnd, holidays } = schema.parse(payload);

    if (!apiKey) {
      return NextResponse.json({ error: "API Key de Gemini no configurada." }, { status: 500 });
    }

    // Build the payload team
    const realNames: Record<string, string> = {};
    const team: TeamMemberPayload[] = [];
    
    let operatorIndex = 1;
    const addMember = (realName: string, role: string, contract: string) => {
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

    // Read the master prompt
    const promptPath = path.join(process.cwd(), "src", "lib", "prompts", "ai_scheduler_prompt.md");
    let masterPrompt = "";
    try {
      masterPrompt = fs.readFileSync(promptPath, "utf8");
    } catch {
      // Fallback if the path is wrong
      masterPrompt = `
      Eres un experto Planner de recursos humanos.
      Reglas:
      1. Apertura 06:00, Cierre 22:00.
      2. Descansos obligatorios según festivos.
      3. Genera un JSON con el horario para cada asistente de Lunes a Domingo.
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

    Genera el JSON AHORA. No incluyas markdown, solo el JSON raw.
    `;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        reasoning: { type: SchemaType.STRING, description: "Cálculo matemático paso a paso antes de llenar el schedule." },
        schedule: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              assistant: { type: SchemaType.STRING },
              monday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              tuesday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              wednesday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              thursday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              friday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              saturday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              sunday: { type: SchemaType.OBJECT, properties: { shift: { type: SchemaType.STRING }, hours: { type: SchemaType.NUMBER }, type: { type: SchemaType.STRING } } },
              total_hours: { type: SchemaType.NUMBER }
            },
            required: ["assistant", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "total_hours"]
          }
        }
      },
      required: ["schedule"]
    };

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as never,
      },
    });
    const result = await model.generateContent(finalPrompt);
    const responseText = result.response.text();

    await logAiUsage({
      adminId: profile.id,
      storeCode: profile.store_code,
      actionType: AI_ACTIONS.schedule,
      model: "gemini-3.5-flash",
      usage: result.response.usageMetadata,
    });

    // Parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("El modelo no devolvió un JSON válido.");
    }

    const scheduleData = JSON.parse(jsonMatch[0]) as ScheduleResponse;

    // Remapear nombres reales
    if (scheduleData.schedule) {
      scheduleData.schedule.forEach((row) => {
        if (realNames[row.assistant]) {
          row.assistant = realNames[row.assistant];
        }
      });
    }

    // Save to DB
    const { data: inserted, error: insertError } = await supabase.from("weekly_schedules").insert({
      profile_id: profile.id,
      week_start: weekStart,
      week_end: weekEnd,
      schedule_data: scheduleData,
      status: "borrador",
      created_by: profile.user_id
    }).select().single();

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
