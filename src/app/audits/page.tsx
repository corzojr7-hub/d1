import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ChecklistsClient from "./ChecklistsClient";

export default async function AuditsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get current store profile to get the id
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, basic_tasks, assistants, store_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return <div className="p-4 text-red-500">Error en la base de datos: {error.message}</div>;
  }

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil de la tienda en la base de datos. Por favor, asegúrate de haber actualizado la configuración de tu equipo o contacta a soporte.
      </div>
    );
  }

  // Fetch today's tasks
  const today = new Date().toISOString().split("T")[0];

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dailyBasics } = await adminClient
    .from("daily_basics")
    .select("*")
    .eq("store_code", profile.store_code)
    .eq("date", today);

  return (
    <ChecklistsClient
      initialTasks={dailyBasics || []}
      configuredBasics={profile.basic_tasks || []}
      assistants={profile.assistants || []}
      today={today}
      isSupervisor={profile.role === 'supervisor' || profile.role === 'admin'}
    />
  );
}
