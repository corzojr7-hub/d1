import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getAiClientConfig } from "@/lib/ai/provider";
import { AI_ACTIONS, estimateGemini35FlashCostUsd } from "@/lib/ai/usage";
import { buildPreventiveFefoAlerts } from "@/lib/fefo-alerts";

export const maxDuration = 60;

const chatInputSchema = z.object({
  question: z.string().min(3, "Escribe una pregunta mas clara."),
});

function getBogotaDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const shifted = new Date(`${dateKey}T12:00:00-05:00`);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return getBogotaDateKey(shifted);
}

function getFutureDateKey(dateKey: string, offsetDays: number) {
  return shiftDateKey(dateKey, offsetDays);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function answerWithoutModel(question: string, snapshot: ReturnType<typeof buildSnapshot>) {
  const normalized = normalizeText(question);

  if (normalized.includes("venta") && normalized.includes("baja") && normalized.includes("ayer")) {
    const lowest = [...snapshot.salesYesterday].sort((a, b) => a.amount - b.amount)[0];
    if (!lowest) return "No tengo ventas registradas para ayer.";
    return `La tienda con la venta mas baja ayer fue ${lowest.storeName} con ${formatCop(lowest.amount)}.`;
  }

  if (normalized.includes("venta") && (normalized.includes("alta") || normalized.includes("mayor")) && normalized.includes("ayer")) {
    const highest = [...snapshot.salesYesterday].sort((a, b) => b.amount - a.amount)[0];
    if (!highest) return "No tengo ventas registradas para ayer.";
    return `La tienda con la venta mas alta ayer fue ${highest.storeName} con ${formatCop(highest.amount)}.`;
  }

  if (normalized.includes("merma")) {
    const topWaste = [...snapshot.highWasteByStore].sort((a, b) => b.qty - a.qty)[0];
    if (!topWaste) return "No hubo mermas criticas en los ultimos 7 dias.";
    return `La merma critica mas fuerte de los ultimos 7 dias fue ${topWaste.storeName} con ${topWaste.qty} unidades acumuladas en eventos altos.`;
  }

  if (normalized.includes("fefo")) {
    const topFefo = [...snapshot.fefoByStore].sort((a, b) => b.in7Days - a.in7Days || b.in15Days - a.in15Days)[0];
    if (!topFefo) return "No hay alertas preventivas FEFO activas.";
    return `La tienda con mas presion FEFO es ${topFefo.storeName}: ${topFefo.in7Days} productos en 7 dias, ${topFefo.in15Days} en 15 dias y ${topFefo.in30Days} en 30 dias.`;
  }

  if (normalized.includes("instruccion") || normalized.includes("pendiente") || normalized.includes("tarea")) {
    const topPending = [...snapshot.pendingInstructionsByStore].sort((a, b) => b.pending - a.pending)[0];
    if (!topPending) return "No hay instrucciones abiertas registradas.";
    return `La tienda con mas instrucciones abiertas es ${topPending.storeName} con ${topPending.pending} pendientes.`;
  }

  return "Puedo ayudarte con ventas de ayer, mermas criticas, FEFO preventivo e instrucciones abiertas. Si quieres una respuesta libre, configura una API de IA para este chat.";
}

function buildSnapshot(input: {
  stores: Array<{ store_code: string; store_name: string }>;
  sales: Array<{ store_code: string; amount: number; date: string }>;
  wasteRows: Array<{ store_code: string; qty: number; reason: string; created_at: string }>;
  instructions: Array<{ store_code: string; status: string }>;
  fefoRecords: Array<{ id: string; store_code: string; product_name: string; expiration_date: string; quantity: number }>;
  yesterdayKey: string;
  todayKey: string;
}) {
  const storeNames = new Map(input.stores.map((store) => [store.store_code, store.store_name]));
  const salesYesterdayMap = new Map<string, number>();
  const sales7DaysMap = new Map<string, number>();

  for (const sale of input.sales) {
    const amount = Number(sale.amount || 0);
    sales7DaysMap.set(sale.store_code, (sales7DaysMap.get(sale.store_code) || 0) + amount);
    if (sale.date === input.yesterdayKey) {
      salesYesterdayMap.set(sale.store_code, (salesYesterdayMap.get(sale.store_code) || 0) + amount);
    }
  }

  const salesYesterday = input.stores.map((store) => ({
    storeCode: store.store_code,
    storeName: store.store_name,
    amount: salesYesterdayMap.get(store.store_code) || 0,
  }));

  const sales7Days = input.stores.map((store) => ({
    storeCode: store.store_code,
    storeName: store.store_name,
    amount: sales7DaysMap.get(store.store_code) || 0,
  }));

  const highWasteByStoreMap = new Map<string, number>();
  for (const waste of input.wasteRows) {
    if (Number(waste.qty || 0) < 100) continue;
    highWasteByStoreMap.set(
      waste.store_code,
      (highWasteByStoreMap.get(waste.store_code) || 0) + Number(waste.qty || 0),
    );
  }

  const highWasteByStore = input.stores
    .map((store) => ({
      storeCode: store.store_code,
      storeName: store.store_name,
      qty: highWasteByStoreMap.get(store.store_code) || 0,
    }))
    .filter((store) => store.qty > 0);

  const pendingInstructionsMap = new Map<string, number>();
  for (const instruction of input.instructions) {
    pendingInstructionsMap.set(
      instruction.store_code,
      (pendingInstructionsMap.get(instruction.store_code) || 0) + 1,
    );
  }

  const pendingInstructionsByStore = input.stores
    .map((store) => ({
      storeCode: store.store_code,
      storeName: store.store_name,
      pending: pendingInstructionsMap.get(store.store_code) || 0,
    }))
    .filter((store) => store.pending > 0);

  const fefoAlerts = buildPreventiveFefoAlerts(input.fefoRecords, new Date(`${input.todayKey}T00:00:00-05:00`));
  const fefoSummaryMap = new Map<
    string,
    { storeCode: string; storeName: string; in7Days: number; in15Days: number; in30Days: number }
  >();

  for (const alert of fefoAlerts) {
    const storeCode = alert.storeCode || "N/A";
    const current =
      fefoSummaryMap.get(storeCode) || {
        storeCode,
        storeName: storeNames.get(storeCode) || storeCode,
        in7Days: 0,
        in15Days: 0,
        in30Days: 0,
      };

    if (alert.windowDays === 7) current.in7Days += 1;
    if (alert.windowDays === 15) current.in15Days += 1;
    if (alert.windowDays === 30) current.in30Days += 1;
    fefoSummaryMap.set(storeCode, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    yesterdayKey: input.yesterdayKey,
    salesYesterday,
    sales7Days,
    highWasteByStore,
    pendingInstructionsByStore,
    fefoByStore: Array.from(fefoSummaryMap.values()),
    topFefoItems: fefoAlerts.slice(0, 12).map((item) => ({
      productName: item.productName,
      storeCode: item.storeCode,
      daysLeft: item.daysLeft,
      quantity: item.quantity,
      primarySuggestion: item.primarySuggestion,
    })),
  };
}

export async function POST(request: Request) {
  const { profile } = await requireAuth();

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Pregunta invalida." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const todayKey = getBogotaDateKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const weekStartKey = shiftDateKey(todayKey, -6);
  const next30Key = getFutureDateKey(todayKey, 30);

  const [{ data: stores }, { data: sales }, { data: wasteRows }, { data: instructions }, { data: fefoRecords }] =
    await Promise.all([
      adminClient
        .from("profiles")
        .select("store_code, store_name")
        .eq("role", "supervisor")
        .eq("status", "activo")
        .neq("store_code", "ADMIN-CENTRAL"),
      adminClient
        .from("daily_sales")
        .select("store_code, amount, date")
        .neq("store_code", "ADMIN-CENTRAL")
        .gte("date", weekStartKey)
        .lte("date", yesterdayKey),
      adminClient
        .from("waste_records")
        .select("store_code, qty, reason, created_at")
        .neq("store_code", "ADMIN-CENTRAL")
        .gte("created_at", `${weekStartKey}T00:00:00-05:00`)
        .lte("created_at", `${todayKey}T23:59:59-05:00`),
      adminClient
        .from("instructions")
        .select("store_code, status")
        .neq("store_code", "ADMIN-CENTRAL")
        .in("status", ["pendiente", "en_proceso", "requiere_seguimiento"]),
      adminClient
        .from("fefo_records")
        .select("id, store_code, product_name, expiration_date, quantity")
        .neq("store_code", "ADMIN-CENTRAL")
        .eq("status", "vigente")
        .lte("expiration_date", next30Key),
    ]);

  const snapshot = buildSnapshot({
    stores: (stores || []).map((store) => ({
      store_code: store.store_code,
      store_name: store.store_name,
    })),
    sales: (sales || []).map((sale) => ({
      store_code: sale.store_code,
      amount: Number(sale.amount || 0),
      date: sale.date,
    })),
    wasteRows: (wasteRows || []).map((row) => ({
      store_code: row.store_code,
      qty: Number(row.qty || 0),
      reason: row.reason || "sin motivo",
      created_at: row.created_at,
    })),
    instructions: (instructions || []).map((item) => ({
      store_code: item.store_code,
      status: item.status,
    })),
    fefoRecords: (fefoRecords || []).map((item) => ({
      id: item.id,
      store_code: item.store_code,
      product_name: item.product_name,
      expiration_date: item.expiration_date,
      quantity: Number(item.quantity || 0),
    })),
    yesterdayKey,
    todayKey,
  });

  const aiConfig = getAiClientConfig();
  if (!aiConfig) {
    return NextResponse.json({
      answer: answerWithoutModel(parsed.data.question, snapshot),
      snapshot,
      mode: "fallback",
    });
  }

  const completion = await aiConfig.client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      {
        role: "system",
        content: `
Eres el asistente operativo de un Jefe de Zona.
Responde solo con la informacion disponible en el snapshot JSON.
Si el dato no esta en el snapshot, dilo claramente y no inventes.
Contesta en espanol, de forma concreta y con tono ejecutivo.

Esquema relevante:
- profiles: tienda, supervisor, rol, store_code.
- daily_sales: ventas por tienda y fecha.
- waste_records: mermas y cantidades por tienda.
- instructions: pendientes operativos por tienda.
- fefo_records: productos por vencer y su criticidad preventiva.
        `.trim(),
      },
      {
        role: "user",
        content: `Pregunta: ${parsed.data.question}\n\nSnapshot:\n${JSON.stringify(snapshot, null, 2)}`,
      },
    ],
  });

  await adminClient.from("admin_audit_logs").insert({
    admin_id: profile.id,
    target_id: profile.id,
    store_code: profile.store_code,
    action_type: AI_ACTIONS.adminChat,
    details: {
      model: aiConfig.model,
      prompt_tokens: Number(completion.usage?.prompt_tokens || 0),
      output_tokens: Number(completion.usage?.completion_tokens || 0),
      total_tokens: Number(completion.usage?.total_tokens || 0),
      estimated_cost_usd: estimateGemini35FlashCostUsd(
        completion.usage
          ? {
              promptTokenCount: completion.usage.prompt_tokens,
              candidatesTokenCount: completion.usage.completion_tokens,
              totalTokenCount: completion.usage.total_tokens,
            }
          : null,
      ),
    },
  });

  return NextResponse.json({
    answer:
      completion.choices[0]?.message?.content?.trim() ||
      answerWithoutModel(parsed.data.question, snapshot),
    snapshot,
    mode: "ai",
  });
}
