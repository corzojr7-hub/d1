import { createClient } from "@/lib/supabase/server";
import ClientImpulses from "./ClientImpulses";

export default async function ImpulsesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, assistants")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil o hubo un error.
      </div>
    );
  }

  return (
    <ClientImpulses assistants={profile.assistants || []} />
  );
}
