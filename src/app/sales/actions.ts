"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const setMonthlyBudgetSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (YYYY-MM)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

const setDailySaleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

const setWeeklyWasteSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
  amount: z.number().min(0, "El monto no puede ser negativo")
});

export async function setMonthlyBudget(monthYear: string, amount: number) {
  try {
    const { profile } = await requireAuth();
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
  } catch (error: any) {
    console.error("setMonthlyBudget error:", error);
    return { success: false, error: error.message };
  }
}

export async function setDailySale(date: string, amount: number) {
  try {
    const { profile, user } = await requireAuth();
    if (!(await checkRateLimit(profile.id, 100, 60000))) throw new Error("Rate limit exceeded");

    const validated = setDailySaleSchema.parse({ date, amount });

    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from("daily_sales")
      .upsert(
        {
          store_code: profile.store_code,
          date: validated.date,
          amount: validated.amount,
          created_by: user.id
        },
        { onConflict: "store_code, date" }
      );

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true };
  } catch (error: any) {
    console.error("setDailySale error:", error);
    return { success: false, error: error.message };
  }
}

export async function setWeeklyWaste(weekStart: string, weekEnd: string, amount: number) {
  try {
    const { profile, user } = await requireAuth();
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
