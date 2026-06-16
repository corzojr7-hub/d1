"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSupervisor } from "@/lib/supabase/require-auth";

export async function addFefoRecord(data: {
  barcode_id: string;
  product_name: string;
  quantity: number;
  expiration_date: string;
  operator_name?: string;
}) {
  const { profile, supabase } = await requireAuth();

  const { error } = await supabase.from("fefo_records").insert({
    ...data,
    profile_id: profile.id, // Ignoramos el que venía del cliente (si es que venía) y usamos el real
    store_code: profile.store_code,
    created_by: profile.id,
    operator_name: data.operator_name || ""
  });

  if (error) {
    console.error("FEFO Insert Error:", error);
    return { error: "Error al guardar en base de datos" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}

export async function updateFefoStatus(id: string, status: string) {
  const { profile, supabase } = await requireSupervisor();

  const { error } = await supabase.from("fefo_records")
    .update({ status })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al actualizar" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}
