"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const updateStoreSchema = z.object({
  profileId: z.string().min(1, "El ID de perfil es obligatorio"),
  storeName: z.string().min(1, "El nombre de tienda es obligatorio"),
  storeCode: z.string().regex(/^[A-Z0-9_-]{2,20}$/, "El store_code debe tener 2-20 caracteres alfanuméricos"),
  supervisorName: z.string().min(1, "El nombre del supervisor es obligatorio")
});

const createSupervisorSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  supervisorName: z.string().min(1, "El nombre es obligatorio"),
  storeCode: z.string().regex(/^[A-Z0-9_-]{2,20}$/, "El store_code debe tener 2-20 caracteres alfanuméricos"),
  storeName: z.string().min(1, "El nombre de la tienda es obligatorio")
});

export async function updateStoreInfo(formData: FormData) {
  const { profile, supabase } = await requireAuth();

  if (profile.role !== "admin") {
    return { error: "No tienes permisos de administrador" };
  }

  if (!(await checkRateLimit(profile.id, 20, 60000))) return { error: "Rate limit exceeded" };

  const parsed = updateStoreSchema.safeParse({
    profileId: formData.get("profile_id") as string,
    storeName: formData.get("store_name") as string,
    storeCode: formData.get("store_code") as string,
    supervisorName: formData.get("display_name") as string
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Error de validación" };
  }

  const { profileId, storeName, storeCode, supervisorName } = parsed.data;

  // Asegurar que la tienda exista en stores para evitar error de foreign key
  await supabase.from("stores").upsert({
    code: storeCode.trim(),
    name: storeName.trim(),
  }, { onConflict: "code" });

  const { error } = await supabase
    .from("profiles")
    .update({
      store_name: storeName.trim(),
      store_code: storeCode.trim(),
      display_name: supervisorName.trim(),
      full_name: supervisorName.trim(), // mantenemos sincronizados display/full_name para evitar confusiones
    })
    .eq("id", profileId);

  if (error) {
    console.error("Admin Update Error:", error);
    return { error: "Error al actualizar los datos de la tienda" };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function createSupervisor(formData: FormData) {
  const { profile } = await requireAuth();

  if (profile.role !== "admin") {
    return { error: "No tienes permisos de administrador" };
  }

  if (!(await checkRateLimit(profile.id, 10, 60000))) return { error: "Rate limit exceeded" };

  const parsed = createSupervisorSchema.safeParse({
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    supervisorName: formData.get("supervisor_name") as string,
    storeCode: formData.get("store_code") as string,
    storeName: formData.get("store_name") as string,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Error de validación" };
  }

  const { username, password, supervisorName, storeCode, storeName } = parsed.data;

  // Usamos el cliente admin que creamos, con permisos para saltar RLS y crear usuarios
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabaseAdmin = createAdminClient();

  // 1. Crear el usuario en Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: username.trim().toLowerCase().includes('@') ? username.trim().toLowerCase() : `${username.trim().toLowerCase()}@mid1.com`,
    password: password,
    email_confirm: true,
    user_metadata: {
      store_code: storeCode.trim(),
      role: "supervisor",
    }
  });

  if (authError) {
    console.error("Auth creation error:", authError);
    return { error: "Error al crear las credenciales: " + authError.message };
  }

  const newUserId = authData.user.id;

  // 1.5. Asegurar que la tienda exista en la tabla stores para evitar error de llave foránea
  await supabaseAdmin.from("stores").upsert({
    code: storeCode.trim(),
    name: storeName.trim(),
  }, { onConflict: "code" });

  // 2. Crear el perfil de la tienda en la tabla profiles
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: crypto.randomUUID(), // si el id es uuid
      user_id: newUserId,
      role: "supervisor",
      store_code: storeCode.trim(),
      store_name: storeName.trim(),
      display_name: supervisorName.trim(),
      full_name: supervisorName.trim(),
      assistant_count: 0,
      requires_password_change: true // obligar a cambiar clave temporal
    });

  if (profileError) {
    console.error("Profile Create Error:", profileError);
    // Intentar revertir la creación de auth si falla el perfil (no bloqueante para la UI pero buena práctica)
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return { error: `Error al crear el perfil del supervisor: ${profileError.message}` };
  }

  // 3. Registrar auditoria inmutable
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: profile.id,
    store_code: profile.store_code, // el admin original tiene un store_code "ADMIN" o global
    action_type: "CREATE_SUPERVISOR",
    target_id: newUserId,
    details: { role: "supervisor", email: authData.user?.email || username.trim(), store_code: storeCode.trim() }
  });

  revalidatePath("/admin");
  return { success: true };
}
