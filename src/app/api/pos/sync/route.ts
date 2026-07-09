import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security";

export const dynamic = "force-dynamic";

const rawPosSaleSchema = z
  .object({
    store_code: z.string().optional(),
    storeCode: z.string().optional(),
    date: z.string().optional(),
    sale_date: z.string().optional(),
    saleDate: z.string().optional(),
    amount: z.coerce.number().optional(),
    total_sales: z.coerce.number().optional(),
    totalSales: z.coerce.number().optional(),
  })
  .passthrough()
  .transform((value, ctx) => {
    const storeCode = sanitizeText(value.store_code || value.storeCode || "").toUpperCase();
    const rawDate = sanitizeText(value.date || value.sale_date || value.saleDate || "");
    const amount = value.amount ?? value.total_sales ?? value.totalSales;

    if (!storeCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "store_code es obligatorio.",
      });
    }

    if (storeCode && !/^[A-Z0-9_-]{2,30}$/.test(storeCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "store_code invalido.",
      });
    }

    if (!rawDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "date es obligatorio.",
      });
    }

    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount debe ser un número mayor o igual a 0.",
      });
    }

    const normalizedDate = rawDate.includes("T") ? rawDate.slice(0, 10) : rawDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "date debe venir en formato YYYY-MM-DD.",
      });
    }

    return {
      store_code: storeCode,
      date: normalizedDate,
      amount: Number(amount || 0),
    };
  });

function getRequestSecret(request: Request) {
  return (
    request.headers.get("x-pos-secret") ||
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function normalizePayload(body: unknown) {
  if (Array.isArray(body)) {
    return z.array(rawPosSaleSchema).min(1).parse(body);
  }

  if (body && typeof body === "object" && Array.isArray((body as { sales?: unknown[] }).sales)) {
    return z.object({ sales: z.array(rawPosSaleSchema).min(1) }).parse(body).sales;
  }

  return [rawPosSaleSchema.parse(body)];
}

export async function POST(request: Request) {
  const configuredSecret = process.env.POS_SYNC_SECRET || process.env.CRON_SECRET || "";
  const providedSecret = getRequestSecret(request);

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Array<{ store_code: string; date: string; amount: number }>;

  try {
    payload = normalizePayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError ? error.issues[0]?.message : "Payload inválido.",
      },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("daily_sales").upsert(payload, {
    onConflict: "store_code,date",
  });

  if (error) {
    console.error("POS sync upsert error", error);
    return NextResponse.json({ error: "No se pudo sincronizar la venta." }, { status: 500 });
  }

  revalidatePath("/sales");
  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({
    success: true,
    synced: payload.length,
    dates: [...new Set(payload.map((item) => item.date))],
  });
}
