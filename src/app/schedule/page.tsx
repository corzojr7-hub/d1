import { createClient } from "@/lib/supabase/server";
import ClientSchedule from "./ClientSchedule";

export default async function SchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil de la tienda.
      </div>
    );
  }

  // Fetch recent schedules
  const { data: schedules } = await supabase
    .from("weekly_schedules")
    .select("*")
    .eq("profile_id", profile.id)
    .order("week_start", { ascending: false })
    .limit(5);

  return (
    <ClientSchedule initialSchedules={schedules || []} />
  );
}
