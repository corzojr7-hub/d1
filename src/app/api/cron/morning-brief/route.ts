import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiClientConfig } from "@/lib/ai/provider";
import { AI_ACTIONS, estimateGemini35FlashCostUsd } from "@/lib/ai/usage";
import { sendPushToAdmins } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRITICAL_WASTE_THRESHOLD = 100;

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

function getBogotaDayRange(dateKey: string) {
  return {
    startIso: `${dateKey}T00:00:00-05:00`,
    endIso: `${dateKey}T23:59:59-05:00`,
  };
}

function buildFallbackSummary(input: {
  dateKey: string;
  totalSales: number;
  salesByStore: Array<{ storeName: string; amount: number }>;
  criticalWasteRows: Array<{ storeName: string; qty: number; reason: string }>;
}) {
  const lowestStore = [...input.salesByStore].sort((a, b) => a.amount - b.amount)[0];
  const highestStore = [...input.salesByStore].sort((a, b) => b.amount - a.amount)[0];
  const wasteText =
    input.criticalWasteRows.length > 0
      ? `${input.criticalWasteRows.length} mermas criticas, lideradas por ${input.criticalWasteRows[0].storeName} con ${input.criticalWasteRows[0].qty} uds`
      : "sin mermas criticas registradas";

  return `Resumen ejecutivo ${input.dateKey}: la region cerró con ${new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(input.totalSales)} en ventas. La tienda con mejor resultado fue ${highestStore?.storeName || "sin datos"} y la mas baja fue ${lowestStore?.storeName || "sin datos"}. En merma critica se reportó ${wasteText}.`;
}

async function buildMorningBriefSummary(input: {
  dateKey: string;
  totalSales: number;
  salesByStore: Array<{ storeName: string; amount: number }>;
  criticalWasteRows: Array<{ storeName: string; qty: number; reason: string }>;
}) {
  const aiConfig = getAiClientConfig();

  if (!aiConfig) {
    return {
      summary: buildFallbackSummary(input),
      model: null,
      usage: null,
    };
  }

  const lowestStore = [...input.salesByStore].sort((a, b) => a.amount - b.amount)[0];
  const highestStore = [...input.salesByStore].sort((a, b) => b.amount - a.amount)[0];
  const prompt = `
Escribe un resumen ejecutivo corto para un jefe de zona retail.

Fecha analizada: ${input.dateKey}
Ventas totales: ${input.totalSales}
Tienda con mejor venta: ${highestStore?.storeName || "Sin dato"} (${highestStore?.amount || 0})
Tienda con venta mas baja: ${lowestStore?.storeName || "Sin dato"} (${lowestStore?.amount || 0})
Mermas criticas: ${JSON.stringify(input.criticalWasteRows)}

Reglas:
- Responde en espanol.
- Un solo parrafo de 3 a 4 frases.
- Menciona ventas, tienda mas fuerte, tienda mas debil y mermas criticas.
- Tono serio, directo y operativo.
- No uses markdown.
`.trim();

  const completion = await aiConfig.client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      { role: "system", content: "Redacta solo el resumen final en espanol." },
      { role: "user", content: prompt },
    ],
  });

  return {
    summary: completion.choices[0]?.message?.content?.trim() || buildFallbackSummary(input),
    model: aiConfig.model,
    usage: completion.usage
      ? {
          promptTokenCount: completion.usage.prompt_tokens,
          candidatesTokenCount: completion.usage.completion_tokens,
          totalTokenCount: completion.usage.total_tokens,
        }
      : null,
  };
}

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET || "";
  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!configuredSecret || headerSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const todayKey = getBogotaDateKey();
  const targetDateKey = shiftDateKey(todayKey, -1);
  const { startIso, endIso } = getBogotaDayRange(targetDateKey);

  const [{ data: stores }, { data: sales }, { data: wasteRows }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo")
      .neq("store_code", "ADMIN-CENTRAL"),
    adminClient
      .from("daily_sales")
      .select("store_code, amount")
      .eq("date", targetDateKey)
      .neq("store_code", "ADMIN-CENTRAL"),
    adminClient
      .from("waste_records")
      .select("store_code, qty, reason, created_at")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
  ]);

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const salesByStoreMap = new Map<string, number>();

  for (const sale of sales || []) {
    salesByStoreMap.set(
      sale.store_code,
      (salesByStoreMap.get(sale.store_code) || 0) + Number(sale.amount || 0),
    );
  }

  const salesByStore = Array.from(storeNames.entries()).map(([storeCode, storeName]) => ({
    storeCode,
    storeName,
    amount: salesByStoreMap.get(storeCode) || 0,
  }));
  const totalSales = salesByStore.reduce((sum, store) => sum + store.amount, 0);
  const criticalWasteRows = (wasteRows || [])
    .filter((row) => Number(row.qty || 0) >= CRITICAL_WASTE_THRESHOLD)
    .map((row) => ({
      storeCode: row.store_code,
      storeName: storeNames.get(row.store_code) || row.store_code,
      qty: Number(row.qty || 0),
      reason: row.reason || "sin motivo",
    }))
    .sort((a, b) => b.qty - a.qty);

  const summaryResult = await buildMorningBriefSummary({
    dateKey: targetDateKey,
    totalSales,
    salesByStore: salesByStore.map(({ storeName, amount }) => ({ storeName, amount })),
    criticalWasteRows: criticalWasteRows.map(({ storeName, qty, reason }) => ({
      storeName,
      qty,
      reason,
    })),
  });

  const sentCount = await sendPushToAdmins({
    title: `Reporte matutino ${targetDateKey}`,
    body: summaryResult.summary,
    url: "/admin/dashboard",
    tag: `morning-brief-${targetDateKey}`,
    data: {
      targetDate: targetDateKey,
      totalSales,
      criticalWasteCount: criticalWasteRows.length,
    },
  });

  if (summaryResult.model && summaryResult.usage) {
    const { data: adminProfile } = await adminClient
      .from("profiles")
      .select("id, store_code")
      .eq("role", "admin")
      .eq("status", "activo")
      .limit(1)
      .maybeSingle();

    if (adminProfile) {
      await adminClient.from("admin_audit_logs").insert({
        admin_id: adminProfile.id,
        target_id: adminProfile.id,
        store_code: adminProfile.store_code,
        action_type: AI_ACTIONS.morningBrief,
        details: {
          model: summaryResult.model,
          prompt_tokens: Number(summaryResult.usage.promptTokenCount || 0),
          output_tokens: Number(summaryResult.usage.candidatesTokenCount || 0),
          total_tokens: Number(summaryResult.usage.totalTokenCount || 0),
          estimated_cost_usd: estimateGemini35FlashCostUsd(summaryResult.usage),
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    date: targetDateKey,
    totalSales,
    salesByStore,
    criticalWasteRows,
    summary: summaryResult.summary,
    pushSent: sentCount,
    emailAdapter: {
      provider: "resend",
      ready: Boolean(process.env.RESEND_API_KEY),
      subject: `Reporte matutino ${targetDateKey}`,
      preview: summaryResult.summary,
    },
  });
}
