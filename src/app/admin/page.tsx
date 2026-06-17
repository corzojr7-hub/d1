import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { startOfMonth, format } from "date-fns";
import AdminClientPage from "./AdminClientPage";

export const dynamic = "force-dynamic";
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

  const adminSupabase = await createAdminClient();

  // Si es admin, traemos TODAS las tiendas (profiles)
  const { data: stores } = await adminSupabase
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
    { data: globalWaste }
  ] = await Promise.all([
    adminSupabase.from("daily_sales").select("*").gte("date", startMonthStr),
    adminSupabase.from("sales_budgets").select("*").eq("month_year", monthYearStr),
    adminSupabase.from("weekly_waste").select("*").gte("week_start", startMonthStr) // Aproximado para este mes
  ]);

  return (
    <AdminClientPage 
      stores={stores || []} 
      globalSales={globalSales || []}
      globalBudgets={globalBudgets || []}
      globalWaste={globalWaste || []}
    />
  );
}
