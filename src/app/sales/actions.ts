"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireSupervisor, requireAuth } from "@/lib/supabase/require-auth";
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
    const { supabase, profile } = await requireSupervisor();
    if (!(await checkRateLimit(profile.id, 50, 60000))) throw new Error("Rate limit exceeded");

    const validated = setMonthlyBudgetSchema.parse({ monthYear, amount });

    const { error } = await supabase
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
    return { success: false, error: error.message };
  }
}

export async function setDailySale(date: string, amount: number) {
  try {
    const { supabase, profile } = await requireSupervisor();
    if (!(await checkRateLimit(profile.id, 100, 60000))) throw new Error("Rate limit exceeded");

    const validated = setDailySaleSchema.parse({ date, amount });

    const { error } = await supabase
      .from("daily_sales")
      .upsert(
        {
          store_code: profile.store_code,
          date: validated.date,
          amount: validated.amount,
          created_by: profile.id
        },
        { onConflict: "store_code, date" }
      );

    if (error) throw error;

    revalidatePath("/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setWeeklyWaste(weekStart: string, weekEnd: string, amount: number) {
  try {
    const { supabase, profile } = await requireSupervisor();
    if (!(await checkRateLimit(profile.id, 100, 60000))) throw new Error("Rate limit exceeded");

    const validated = setWeeklyWasteSchema.parse({ weekStart, weekEnd, amount });

    const { error } = await supabase
      .from("weekly_waste")
      .upsert(
        {
          store_code: profile.store_code,
          week_start: validated.weekStart,
          week_end: validated.weekEnd,
          waste_amount: validated.amount,
          created_by: profile.id
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
