import { redirect } from "next/navigation";
import { startOfMonth, format } from "date-fns";
import { AI_ACTIONS } from "@/lib/ai/usage";
import { requireAuth } from "@/lib/supabase/require-auth";
import AdminClientPage from "./AdminClientPage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminPage() {
  const { profile, supabase } = await requireAuth();

  if (profile.role !== "admin") {
    // Si no es admin, no puede entrar aquí, lo devolvemos al panel de tienda
    redirect("/");
  }

  const { data: stores, error: storesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "supervisor")
    .eq("status", "activo")
    .order("store_name", { ascending: true });

  if (storesError) {
    throw new Error(`No se pudieron cargar las tiendas del JDZ: ${storesError.message}`);
  }

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
