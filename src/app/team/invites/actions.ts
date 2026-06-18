"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function createTeamMember(_prev: unknown, formData: FormData) {
  let profile;
  try {
    const authData = await requireAuth();
    profile = authData.profile;
    
    if (profile.role !== "supervisor") {
      throw new Error("Acceso denegado. Solo los supervisores pueden crear usuarios de Segundo(a) y Tercero(a).");
    }
  } catch (e: any) {
    return { error: e.message || "No tienes permisos para realizar esta acción" };
  }

  const role = formData.get("role") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!role || !name || !email || !password) {
    return { error: "Todos los campos son requeridos" };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const validRoles = ["segundo_al_mando", "tercero_al_mando"];
  if (!validRoles.includes(role)) {
    return { error: "Solo puedes crear Segundo(a) y Tercero(a) Encargado(a)" };
  }

  try {
    if (!(await checkRateLimit(profile.id, 5, 60000))) {
      return { error: "Has alcanzado el límite de creación de usuarios. Intenta de nuevo en un minuto." };
    }
    
    const adminClient = createAdminClient();
    
    // 1. Crear el usuario en auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        role: role,
        store_code: profile.store_code
      }
    });

    if (authError) throw authError;

    // 2. Crear el perfil en public.profiles
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: authData.user.id,
      role: role,
      display_name: name,
      full_name: name,
      email: email,
      store_code: profile.store_code,
      store_name: profile.store_name,
      assistant_count: 0,
      assistants: [],
      areas: [],
      basic_tasks: [],
      status: "activo",
      requires_password_change: true // Obligatorio cambiar clave
    });

    if (profileError) {
      // Rollback (delete user)
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 3. Registrar auditoria inmutable
    await adminClient.from("admin_audit_logs").insert({
      admin_id: profile.id,
      store_code: profile.store_code,
      action_type: "CREATE_USER",
      target_id: authData.user.id,
      details: { role, email, display_name: name }
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al crear el usuario" };
  }
}
