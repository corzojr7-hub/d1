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
    return (
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pt-6">
        <div className="rounded-[28px] border border-red-100 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-400">
            Error de carga
          </p>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Error en la base de datos
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pt-6">
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Sin perfil
          </p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            No se encontró el perfil de la tienda.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            Verifica la configuración del equipo o contacta a soporte.
          </p>
        </div>
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
      isSupervisor={profile.role === "supervisor" || profile.role === "admin"}
    />
  );
}
