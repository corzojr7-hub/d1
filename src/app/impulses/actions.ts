"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveImpulseRecord(formData: FormData) {
  const { profile, supabase } = await requireAuth();

  const assistant = formData.get("assistant") as string || "";
  const operatorName = assistant;
  const impulse_type = formData.get("impulse_type") as string;
  const product_name = formData.get("product_name") as string;
  const quantity = Number(formData.get("quantity"));

  if (!assistant || !impulse_type || !product_name || quantity <= 0) {
    return { success: false, error: "Faltan campos obligatorios o la cantidad es inválida." };
  }

  const adminClient = createAdminClient();
  const { error: insertError } = await adminClient.from("impulse_records").insert({
    profile_id: profile.id,
    created_by: profile.id,
    store_code: profile.store_code,
    assistant,
    operator_name: operatorName,
    impulse_type,
    product_name,
    quantity,
  });

  if (insertError) {
    console.error(insertError);
    return { success: false, error: insertError.message || "Error al guardar el impulso." };
  }

  revalidatePath("/impulses");
  return { success: true };
}
