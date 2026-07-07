"use server";

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

const deleteStoreSchema = z.object({
  profileId: z.string().min(1, "El ID de perfil es obligatorio"),
});

export async function updateStoreInfo(formData: FormData) {
  const { profile } = await requireAuth();

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
  const normalizedStoreCode = storeCode.trim().toUpperCase();

  if (normalizedStoreCode === "ADMIN-CENTRAL") {
    return { error: "Ese codigo esta reservado para la cuenta admin" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabaseAdmin = createAdminClient();

  const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, store_code")
    .eq("id", profileId)
    .eq("role", "supervisor")
    .single();

  if (currentProfileError || !currentProfile) {
    return { error: "No se encontro la tienda a editar" };
  }

  if (currentProfile.store_code === "ADMIN-CENTRAL") {
    return { error: "No se puede editar la cuenta admin desde tiendas" };
  }

  const { data: duplicatedStore } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("store_code", normalizedStoreCode)
    .eq("role", "supervisor")
    .neq("id", profileId)
    .neq("status", "inactivo")
    .maybeSingle();

  if (duplicatedStore) {
    return { error: "Ya existe otra tienda activa con ese codigo" };
  }

  const { error: storeError } = await supabaseAdmin.from("stores").upsert(
    {
      code: normalizedStoreCode,
      name: storeName.trim(),
    },
    { onConflict: "code" },
  );

  if (storeError) {
    console.error("Admin Store Upsert Error:", storeError);
    return { error: "Error al actualizar el registro maestro de tienda" };
  }

  const { error: teamError } = await supabaseAdmin
    .from("profiles")
    .update({
      store_name: storeName.trim(),
      store_code: normalizedStoreCode,
    })
    .eq("store_code", currentProfile.store_code);

  if (teamError) {
    console.error("Admin team store update error:", teamError);
    return { error: "Error al actualizar la tienda del equipo" };
  }

  const { error: supervisorError } = await supabaseAdmin
    .from("profiles")
    .update({
      store_name: storeName.trim(),
      store_code: normalizedStoreCode,
      display_name: supervisorName.trim(),
      full_name: supervisorName.trim(),
    })
    .eq("id", profileId);

  if (supervisorError) {
    console.error("Admin Update Error:", supervisorError);
    return { error: "Error al actualizar los datos de la tienda" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/team");
  return { success: true };
}

export async function deleteStoreProfile(formData: FormData) {
  const { profile } = await requireAuth();

  if (profile.role !== "admin") {
    return { error: "No tienes permisos de administrador" };
  }

  if (!(await checkRateLimit(profile.id, 10, 60000))) return { error: "Rate limit exceeded" };

  const parsed = deleteStoreSchema.safeParse({
    profileId: formData.get("profile_id") as string,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Error de validacion" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabaseAdmin = createAdminClient();

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id, store_code")
    .eq("id", parsed.data.profileId)
    .eq("role", "supervisor")
    .single();

  if (targetError || !targetProfile) {
    return { error: "No se encontro la tienda a eliminar" };
  }

  if (targetProfile.store_code === "ADMIN-CENTRAL") {
    return { error: "No se puede eliminar la cuenta admin" };
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status: "inactivo" })
    .eq("store_code", targetProfile.store_code);

  if (error) {
    console.error("Admin Store Soft Delete Error:", error);
    return { error: "Error al desactivar la tienda" };
  }

  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: profile.id,
    store_code: profile.store_code,
    action_type: "DELETE_STORE_SOFT",
    target_id: targetProfile.id,
    details: { store_code: targetProfile.store_code, mode: "soft_delete" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/team");
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
    email: username.trim().toLowerCase().includes('@') ? username.trim().toLowerCase() : `${username.trim().toLowerCase()}@mi2.com`,
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
      email: authData.user?.email || (username.trim().toLowerCase().includes('@') ? username.trim().toLowerCase() : `${username.trim().toLowerCase()}@mi2.com`),
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
