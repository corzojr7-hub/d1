"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type UpdateState = { error?: string };

export async function updatePassword(
  _prev: UpdateState | undefined,
  formData: FormData
): Promise<UpdateState | never> {
  const supabase = await createClient();
  
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Actualizar la contraseña en Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: password
  });

  if (updateError) {
    return { error: "Hubo un error al actualizar la contraseña." };
  }

  // Quitar la bandera de requires_password_change usando el cliente normal
  // (Asume que el RLS permite al usuario actualizar su propio perfil)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ requires_password_change: false })
    .eq("user_id", user.id);

  if (profileError) {
    return { error: "Contraseña actualizada en Auth, pero error al actualizar perfil (RLS o DB): " + profileError.message };
  }

  revalidatePath("/");
  redirect("/");
}
