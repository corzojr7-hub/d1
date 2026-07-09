"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { strongPasswordSchema } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

type UpdateState = { error?: string };

export async function updatePassword(
  _prev: UpdateState | undefined,
  formData: FormData,
): Promise<UpdateState | never> {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const parsedPassword = strongPasswordSchema.safeParse(password);

  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message || "La contrasena no cumple la politica de seguridad." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contrasenas no coinciden." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsedPassword.data,
  });

  if (updateError) {
    return { error: "Hubo un error al actualizar la contrasena." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ requires_password_change: false })
    .eq("user_id", user.id);

  if (profileError) {
    return {
      error: `Contrasena actualizada en Auth, pero error al actualizar perfil (RLS o DB): ${profileError.message}`,
    };
  }

  revalidatePath("/");
  redirect("/");
}
