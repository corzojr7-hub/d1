import { createClient } from "./server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function getHydratedProfile(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "activo")
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Si es 2da o 3ra encargada, heredar la plantilla del supervisor de la misma tienda
  if (profile.role === "segundo_al_mando" || profile.role === "tercero_al_mando") {
    const { data: supervisorProfile } = await supabase
      .from("profiles")
      .select("display_name, second_in_charge, third_in_charge, assistants, areas, basic_tasks, assistant_count")
      .eq("store_code", profile.store_code)
      .eq("role", "supervisor")
      .eq("status", "activo")
      .limit(1)
      .maybeSingle();

    if (supervisorProfile) {
      profile.supervisor_name = supervisorProfile.display_name;
      profile.second_in_charge = supervisorProfile.second_in_charge;
      profile.third_in_charge = supervisorProfile.third_in_charge;
      profile.assistants = supervisorProfile.assistants;
      profile.areas = supervisorProfile.areas;
      profile.basic_tasks = supervisorProfile.basic_tasks;
      profile.assistant_count = supervisorProfile.assistant_count;
    }
  } else if (profile.role === "supervisor") {
    profile.supervisor_name = profile.display_name;
  }

  return profile;
}

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const profile = await getHydratedProfile(supabase, user.id);

  if (!profile) {
    redirect("/login");
  }

  // Go-Live Requirement: Forzar actualizacion de contrasena obligatoria
  // Esto protege todos los endpoints y Server Actions que llamen a requireAuth()
  if (profile.requires_password_change) {
    redirect("/update-password");
  }

  return { user, profile, supabase };
}

export async function requireSupervisor() {
  const authContext = await requireAuth();
  
  if (authContext.profile.role !== "supervisor") {
    throw new Error("Acceso denegado: Se requiere rol de supervisor");
  }
  
  return authContext;
}

export function validateOperatorName(profile: any, operatorName: string) {
  return;
}
