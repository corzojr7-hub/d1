import ClientPreShift from "./ClientPreShift";
import { createClient } from "@/lib/supabase/server";
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

  const { data: storeData } = await adminClient
    .from("stores")
    .select("monthly_budget, accumulated_sales")
    .eq("code", profile.store_code)
    .single();

  const monthlyBudget = storeData?.monthly_budget || 0;
  const accumulatedSales = storeData?.accumulated_sales || 0;
  
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const dailyGoal = Math.max(0, Math.round((monthlyBudget - accumulatedSales) / remainingDays));

  return <ClientPreShift defaultDailyGoal={dailyGoal} />;
}
