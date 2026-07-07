"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

type AuthState = { error?: string };

export async function login(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState | never> {
  const supabase = await createClient();

  let emailOrUser = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!emailOrUser) return { error: "Ingresa tu usuario." };
  
  if (!(await checkRateLimit(emailOrUser, 5, 300000))) {
    return { error: "Demasiados intentos. Intenta más tarde." };
  }

  emailOrUser = emailOrUser.trim();
  // Convert username to fake email if it doesn't have @
  if (!emailOrUser.includes("@")) {
    const cleanUser = emailOrUser.toLowerCase().trim();
    emailOrUser = `${cleanUser}@mi2.com`;
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: emailOrUser,
    password,
  });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  // Verificar si necesita cambiar contraseña
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("requires_password_change")
      .eq("user_id", authData.user.id)
      .single();

    if (profile?.requires_password_change) {
      redirect("/update-password");
    }
  }

  revalidatePath("/");
  redirect("/");
}

export async function registerUser(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState | never> {
  void _prev;
  void formData;

  // BLOQUEO DE SEGURIDAD: El registro público de supervisores está deshabilitado
  // por motivos de auditoría (CRÍTICO-003). Los usuarios deben ser creados
  // exclusivamente desde el módulo de "Equipo" por un administrador/supervisor existente.
  return { error: "El registro público está deshabilitado. Solicita a tu supervisor que te envíe una invitación para acceder al sistema." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}
