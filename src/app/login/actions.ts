"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  AssistantContractType,
  StoreAssistant,
} from "@/lib/domain/types";

type AuthState = { error?: string };

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseAssistants(formData: FormData): StoreAssistant[] {
  const assistantCount = Number(getString(formData, "assistant_count"));
  const safeCount = Number.isFinite(assistantCount)
    ? Math.max(0, Math.min(assistantCount, 50))
    : 0;

  return Array.from({ length: safeCount }, (_, index): StoreAssistant => {
    const contract = getString(
      formData,
      `assistant_contract_${index}`,
    ) as AssistantContractType;
    const contractType: AssistantContractType =
      contract === "part_time" || contract === "supervisor"
        ? contract
        : "full_time";

    return {
      name: getString(formData, `assistant_name_${index}`),
      contract_type: contractType,
    };
  }).filter((assistant) => assistant.name.length > 0);
}

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
    const cleanUser = emailOrUser.toLowerCase().replace(/[^a-z0-9]/g, "");
    emailOrUser = `${cleanUser}@tiendad1.com`;
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
