import ClientPreShift from "./ClientPreShift";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Pre-Turno — SCO",
};

export default async function PreShiftPage() {
  const { profile } = await requireAuth();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  const currentMonthYear = today.toISOString().slice(0, 7);
  const monthStart = `${currentMonthYear}-01`;
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(
    nextMonthDate.getMonth() + 1,
  ).padStart(2, "0")}-01`;

  const [{ data: currentBudgetRow }, { data: monthlySales }] = await Promise.all([
    adminClient
      .from("sales_budgets")
      .select("budget_amount")
      .eq("store_code", profile.store_code)
      .eq("month_year", currentMonthYear)
      .single(),
    adminClient
      .from("daily_sales")
      .select("amount")
      .eq("store_code", profile.store_code)
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
  ]);

  const monthlyBudget = currentBudgetRow?.budget_amount || 0;
  const accumulatedSales =
    monthlySales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const dailyGoal = Math.max(0, Math.round((monthlyBudget - accumulatedSales) / remainingDays));

  return <ClientPreShift defaultDailyGoal={dailyGoal} />;
}
