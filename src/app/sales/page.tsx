import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import SalesClient from "./SalesClient";

export const metadata: Metadata = {
  title: "Ventas y Presupuesto — Sistema Operativo",
};

export default async function SalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("store_code")
    .eq("user_id", user.id)
    .single();

  if (!profile) return <div>Cargando Perfil...</div>;

  const storeCode = profile.store_code;

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // En la vida real, podríamos limitar por fecha para no saturar.
  const [
    { data: budgets },
    { data: dailySales },
    { data: weeklyWaste }
  ] = await Promise.all([
    adminClient.from("sales_budgets").select("*").eq("store_code", storeCode),
    adminClient.from("daily_sales").select("*").eq("store_code", storeCode).order("date", { ascending: false }),
    adminClient.from("weekly_waste").select("*").eq("store_code", storeCode).order("week_start", { ascending: false })
  ]);

  return (
    <SalesClient 
      initialBudgets={budgets || []} 
      initialSales={dailySales || []} 
      initialWaste={weeklyWaste || []} 
    />
  );
}
