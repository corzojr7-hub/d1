"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { AI_ACTIONS, logAiUsage } from "@/lib/ai/usage";
import { requireAuth } from "@/lib/supabase/require-auth";
import type { Database } from "@/lib/supabase/database.types";

type FeedbackInsert = Database["public"]["Tables"]["feedbacks"]["Insert"];

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const whatsappRewriteSchema = z.object({
  directedTo: z.string().min(1, "Selecciona para quien es el mensaje."),
  type: z.enum(["retroalimentacion", "llamado_atencion"]),
  rawMessage: z.string().min(8, "Escribe mas contexto para mejorar el mensaje."),
  tone: z.enum(["suave", "directo", "formal"]),
});

const whatsappRewriteResponseSchema = z.object({
  whatsapp_message: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().min(1),
  commitment: z.string().min(1),
});

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getBogotaGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export async function createFeedback(data: Omit<FeedbackInsert, "store_code" | "created_by">) {
  const { profile } = await requireAuth();

  const payload: FeedbackInsert = {
    ...data,
    store_code: profile.store_code,
    created_by: profile.display_name,
    status: "activo",
  };

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("feedbacks").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
  revalidatePath("/instructions");
}

export async function rewriteFeedbackWhatsappMessage(input: {
  directedTo: string;
  type: "retroalimentacion" | "llamado_atencion";
  rawMessage: string;
  tone: "suave" | "directo" | "formal";
}) {
  const { profile } = await requireAuth();

  if (!apiKey) {
    throw new Error("La IA no esta configurada en este momento.");
  }

  const validated = whatsappRewriteSchema.parse(input);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
  const greeting = getBogotaGreeting();
  const isWholeTeam = validated.directedTo.trim().toUpperCase() === "TODO EL EQUIPO";

  const toneGuide = {
    suave: "cercano, respetuoso y calmado",
    directo: "claro, firme y humano",
    formal: "profesional, sobrio y respetuoso",
  }[validated.tone];

  const kindGuide =
    validated.type === "llamado_atencion"
      ? "un llamado de atencion firme pero respetuoso"
      : "una retroalimentacion constructiva y profesional";

  const prompt = `
Convierte el siguiente mensaje informal en un mensaje listo para enviar por WhatsApp.

Contexto:
- Lo escribe un supervisor de tienda.
- Va dirigido a: ${validated.directedTo}.
- Tipo de mensaje: ${kindGuide}.
- Tono deseado: ${toneGuide}.
- Saludo obligatorio de apertura: ${greeting}.

Reglas obligatorias:
- El mensaje final debe sonar humano, claro, profesional y realista.
- Debe servir para operacion retail diaria.
- No uses groserias.
- No inventes hechos que no esten en el mensaje original.
- No uses emojis.
- Debe comenzar exactamente con "${greeting}".
- No uses tuteo. No escribas "tu", "tus", "te", "contigo" ni formas equivalentes.
- Usa redaccion profesional en segunda persona plural o impersonal.
- ${isWholeTeam ? 'El mensaje va para todo el equipo, asi que hablales al grupo completo y no a una sola persona.' : "El mensaje va para una sola persona, pero siempre sin tutear."}
- No uses titulos como "Motivo", "Descripcion" o "Compromiso" dentro del mensaje.
- El mensaje debe quedar listo para copiar y enviar por WhatsApp.
- Puede tener uno o dos parrafos cortos, pero no listas.
- Cierra con una expectativa clara o una invitacion a corregir.

Ademas del mensaje final, genera tres campos internos para guardar el registro:
- reason: resumen corto del tema principal.
- description: explicacion clara de lo ocurrido.
- commitment: accion esperada o acuerdo de mejora.

Mensaje original:
"""${validated.rawMessage}"""

Devuelve solo JSON valido con esta forma:
{
  "whatsapp_message": "string",
  "reason": "string",
  "description": "string",
  "commitment": "string"
}
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  await logAiUsage({
    adminId: profile.id,
    storeCode: profile.store_code,
    actionType: AI_ACTIONS.feedback,
    model: "gemini-3.5-flash",
    usage: result.response.usageMetadata,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("La IA no devolvio un formato valido.");
  }

  return whatsappRewriteResponseSchema.parse(JSON.parse(jsonMatch[0]));
}

export async function resolveFeedback(id: string) {
  const { profile } = await requireAuth();

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("feedbacks")
    .update({ status: "resuelto" })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
}
