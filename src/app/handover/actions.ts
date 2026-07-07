"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { AI_ACTIONS, logAiUsage } from "@/lib/ai/usage";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getBogotaDateWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    dateKey,
    startIso: `${dateKey}T00:00:00-05:00`,
    endIso: `${dateKey}T23:59:59-05:00`,
  };
}

function getHandoverAiClient() {
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_HANDOVER_MODEL || "gpt-4o-mini",
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }),
      model: "deepseek-v3",
    };
  }

  return null;
}

export async function generateHandoverSummary(input: {
  handedBy?: string;
  receivedBy?: string;
  observations?: string;
}) {
  const { profile, supabase } = await requireAuth();
  const aiConfig = getHandoverAiClient();

  if (!aiConfig) {
    throw new Error("No hay una API de IA configurada para generar el resumen.");
  }

  const { dateKey, startIso, endIso } = getBogotaDateWindow();
  const [wasteResponse, instructionsResponse] = await Promise.all([
    supabase
      .from("waste_records")
      .select("qty, reason, area, created_at, products(name)")
      .eq("store_code", profile.store_code)
      .eq("is_archived", false)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("instructions")
      .select("responsible, content, priority, status, created_at")
      .eq("store_code", profile.store_code)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (wasteResponse.error) {
    throw new Error("No se pudo leer la merma del turno.");
  }

  if (instructionsResponse.error) {
    throw new Error("No se pudieron leer las tareas del turno.");
  }

  const wasteItems = (wasteResponse.data || []).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const productName =
      (product as { name?: string | null } | null)?.name || item.reason || "Merma sin detalle";
    return `${Number(item.qty || 0)} uds de ${productName} en ${item.area || "sin area"} por ${item.reason}`;
  });
  const instructionItems = (instructionsResponse.data || []).map(
    (item) => `${item.status} · ${item.priority} · ${item.responsible}: ${item.content}`,
  );

  const wasteSummary =
    wasteItems.length > 0 ? wasteItems.join("; ") : "No hubo mermas registradas en el turno.";
  const instructionSummary =
    instructionItems.length > 0
      ? instructionItems.join("; ")
      : "No hubo instrucciones ni novedades registradas en el turno.";

  const prompt = `
Redacta un solo parrafo en espanol, claro y operativo, listo para guardar como observacion de entrega de turno.

Contexto:
- Tienda: ${profile.store_name} (${profile.store_code})
- Fecha del turno: ${dateKey}
- Entrega: ${input.handedBy?.trim() || "Sin definir"}
- Recibe: ${input.receivedBy?.trim() || "Sin definir"}
- Observaciones manuales: ${input.observations?.trim() || "Sin observaciones manuales"}

Merma del turno:
${wasteSummary}

Tareas y novedades del turno:
${instructionSummary}

Reglas:
- Devuelve solo el parrafo final.
- Mantener tono profesional, corto y facil de leer.
- Menciona lo que queda pendiente solo si realmente aparece en los datos.
- No uses listas, markdown, comillas ni encabezados.
- Si no hubo novedades, dilo de forma breve.
`.trim();

  const completion = await aiConfig.client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      {
        role: "system",
        content: "Escribe solo un parrafo operativo limpio en espanol, sin markdown.",
      },
      { role: "user", content: prompt },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("La IA no devolvio un resumen valido.");
  }

  await logAiUsage({
    adminId: profile.id,
    storeCode: profile.store_code,
    actionType: AI_ACTIONS.handover,
    model: aiConfig.model,
    usage: completion.usage
      ? {
          promptTokenCount: completion.usage.prompt_tokens,
          candidatesTokenCount: completion.usage.completion_tokens,
          totalTokenCount: completion.usage.total_tokens,
        }
      : null,
  });

  return summary;
}

export async function submitHandover(formData: FormData) {
  const { profile } = await requireAuth();

  const handed_by = formData.get("handed_by") as string;
  const received_by = formData.get("received_by") as string;
  const observations = formData.get("observations") as string;
  const photo = formData.get("photo") as File;

  if (!handed_by || !received_by || !photo) {
    throw new Error("Faltan campos obligatorios.");
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (photo.size > MAX_SIZE) {
    throw new Error("La imagen supera los 5MB.");
  }

  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_MIME.includes(photo.type)) {
    throw new Error("Formato de imagen no permitido.");
  }

  // Subir la foto
  const fileExt = photo.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${profile.store_code}/${profile.id}/${fileName}`;

  const adminClient = getAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("handover_photos")
    .upload(filePath, photo);

  if (uploadError) {
    console.error(uploadError);
    throw new Error("Error al subir la foto de la bodega.");
  }

  // Guardar en base de datos
  const { error: insertError } = await adminClient.from("shift_handovers").insert({
    profile_id: profile.id,
    store_code: profile.store_code,
    handed_by,
    received_by,
    photo_url: filePath, // guardamos solo el path
    observations,
  });

  if (insertError) {
    console.error(insertError);
    throw new Error("Error al guardar la entrega de turno.");
  }

  revalidatePath("/");
  return { success: true };
}
