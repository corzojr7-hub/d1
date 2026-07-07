import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, format } from "date-fns";
import { AI_ACTIONS } from "@/lib/ai/usage";
import AdminClientPage from "./AdminClientPage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar si el usuario es Admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    // Si no es admin, no puede entrar aquí, lo devolvemos al panel de tienda
    redirect("/");
  }

  // Si es admin, traemos TODAS las tiendas (profiles)
  const { data: stores } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  // Datos para el dashboard (Mes actual)
  const currentDate = new Date();
  const startMonthStr = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthYearStr = format(currentDate, "yyyy-MM");

  const [
    { data: globalSales },
    { data: globalBudgets },
    { data: globalWaste },
    { data: aiUsageLogsRaw },
  ] = await Promise.all([
    supabase.from("daily_sales").select("*").gte("date", startMonthStr),
    supabase.from("sales_budgets").select("*").eq("month_year", monthYearStr),
    supabase.from("weekly_waste").select("*").gte("week_start", startMonthStr), // Aproximado para este mes
    supabase
      .from("admin_audit_logs")
      .select("id, action_type, store_code, created_at, details")
      .gte("created_at", `${startMonthStr}T00:00:00`)
      .in("action_type", [AI_ACTIONS.schedule, AI_ACTIONS.feedback]),
  ]);

  const aiUsageLogs = (aiUsageLogsRaw || []).map((log) => ({
    id: String(log.id),
    action_type: String(log.action_type),
    store_code: String(log.store_code || ""),
    created_at: String(log.created_at || ""),
    details: (log.details || {}) as {
      model?: string;
      prompt_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
      estimated_cost_usd?: number;
    },
  }));

  return (
    <AdminClientPage 
      stores={stores || []} 
      globalSales={globalSales || []}
      globalBudgets={globalBudgets || []}
      globalWaste={globalWaste || []}
      aiUsageLogs={aiUsageLogs}
    />
  );
}
