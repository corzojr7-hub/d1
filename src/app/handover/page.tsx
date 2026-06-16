import { createClient } from "@/lib/supabase/server";
import ClientHandover from "./ClientHandover";

export default async function HandoverPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, assistants, display_name, second_in_charge, third_in_charge")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil. Actualiza tu configuración de Equipo.
      </div>
    );
  }

  const supervisors = [profile.display_name, profile.second_in_charge, profile.third_in_charge].filter(Boolean);

  return (
    <ClientHandover
      supervisors={supervisors}
    />
  );
}
