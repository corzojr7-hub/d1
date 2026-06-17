"use server";

import { createClient } from "@/lib/supabase/server";

export async function checkSecurityPin(pin: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No user" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("security_pin")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found" };

  if (profile.security_pin === pin) {
    return { success: true };
  } else {
    return { success: false, error: "PIN incorrecto" };
  }
}

export async function setSecurityPin(pin: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No user" };

  const { error } = await supabase
    .from("profiles")
    .update({ security_pin: pin })
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
