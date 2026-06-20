import ClientPreShift from "./ClientPreShift";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Pre-Turno â€” SCO",
};

function getBogotaCalendar(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
}

export default async function PreShiftPage() {
  const { profile } = await requireAuth();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { year, month, day } = getBogotaCalendar();
  const currentMonthYear = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${currentMonthYear}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;

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

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - day);
  const dailyGoal = Math.max(0, Math.round((monthlyBudget - accumulatedSales) / remainingDays));

  return <ClientPreShift defaultDailyGoal={dailyGoal} />;
}
