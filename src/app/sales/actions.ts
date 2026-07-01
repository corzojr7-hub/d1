"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSupervisor } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { ProfileRole } from "@/lib/domain/types";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const SALE_CREATE_ROLES: ProfileRole[] = [
  "supervisor",
  "segundo_al_mando",
  "tercero_al_mando",
  "admin",
];

const SALE_EDIT_ROLES: ProfileRole[] = ["supervisor", "admin"];

const setMonthlyBudgetSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (YYYY-MM)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

const setDailySaleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

const setBulkDailySalesSchema = z.array(setDailySaleSchema);

const setWeeklyWasteSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

export async function setMonthlyBudget(monthYear: string, amount: number) {
  try {
    const { profile } = await requireSupervisor();
    if (!(await checkRateLimit(profile.id, 50, 60000))) throw new Error("Rate limit exceeded");

    const validated = setMonthlyBudgetSchema.parse({ monthYear, amount });

    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from("sales_budgets")
      .upsert(
        {
          store_code: profile.store_code,
          month_year: validated.monthYear,
          budget_amount: validated.amount,
        },
        { onConflict: "store_code, month_year" }
      );

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true };
  } catch (error: unknown) {
    console.error("setMonthlyBudget error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar presupuesto",
    };
  }
}

export async function setDailySale(date: string, amount: number) {
  try {
    const { profile, user } = await requireAuth();
    if (!(await checkRateLimit(profile.id, 100, 60000))) throw new Error("Rate limit exceeded");

    if (!SALE_CREATE_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("No tienes permisos para registrar ventas.");
    }

    const validated = setDailySaleSchema.parse({ date, amount });

    const adminClient = getAdminClient();
    const { data: existingSale } = await adminClient
      .from("daily_sales")
      .select("id, created_by")
      .eq("store_code", profile.store_code)
      .eq("date", validated.date)
      .maybeSingle();

    if (existingSale && !SALE_EDIT_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("Esta venta ya fue registrada. Solo el supervisor puede editarla.");
    }

    const { error } = await adminClient
      .from("daily_sales")
      .upsert(
        {
          store_code: profile.store_code,
          date: validated.date,
          amount: validated.amount,
          created_by: existingSale?.created_by || user.id,
        },
        { onConflict: "store_code, date" },
      );

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true, mode: existingSale ? "updated" : "created" };
  } catch (error: unknown) {
    console.error("setDailySale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar venta",
    };
  }
}

export async function setBulkDailySales(sales: { date: string, amount: number }[]) {
  try {
    const { profile, user } = await requireAuth();
    if (!(await checkRateLimit(profile.id, 50, 60000))) throw new Error("Rate limit exceeded");

    if (!SALE_EDIT_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("Solo los supervisores pueden hacer cargas masivas de ventas.");
    }

    const validated = setBulkDailySalesSchema.parse(sales);
    if (validated.length === 0) return { success: true, count: 0 };

    const dates = validated.map((s) => s.date);
    const adminClient = getAdminClient();
    
    // Get existing to preserve created_by
    const { data: existingSales } = await adminClient
      .from("daily_sales")
      .select("date, created_by")
      .eq("store_code", profile.store_code)
      .in("date", dates);
      
    const existingMap = new Map(existingSales?.map((s) => [s.date, s.created_by]));

    const upsertPayload = validated.map((s) => ({
      store_code: profile.store_code,
      date: s.date,
      amount: s.amount,
      created_by: existingMap.get(s.date) || user.id,
    }));

    const { error } = await adminClient
      .from("daily_sales")
      .upsert(upsertPayload, { onConflict: "store_code, date" });

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true, count: validated.length };
  } catch (error: unknown) {
    console.error("setBulkDailySales error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al importar ventas masivas",
    };
  }
}

export async function setWeeklyWaste(weekStart: string, weekEnd: string, amount: number) {
  try {
    const { profile, user } = await requireSupervisor();
    if (!(await checkRateLimit(profile.id, 100, 60000))) throw new Error("Rate limit exceeded");

    const validated = setWeeklyWasteSchema.parse({ weekStart, weekEnd, amount });

    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from("weekly_waste")
      .upsert(
        {
          store_code: profile.store_code,
          week_start: validated.weekStart,
          week_end: validated.weekEnd,
          waste_amount: validated.amount,
          created_by: user.id
        },
        { onConflict: "store_code, week_start" }
      );

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar merma semanal",
    };
  }
}
