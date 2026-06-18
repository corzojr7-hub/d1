"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSupervisor } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function addFefoRecord(data: {
  barcode_id: string;
  product_name: string;
  quantity: number;
  expiration_date: string;
  operator_name?: string;
}) {
  const { profile, supabase } = await requireAuth();

  const adminClient = getAdminClient();

  const { error } = await adminClient.from("fefo_records").insert({
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
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const { error } = await adminClient.from("fefo_records")
    .update({ status })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al actualizar" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}
