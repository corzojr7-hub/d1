"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
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
  const { profile } = await requireAuth();

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
  const { profile, user } = await requireAuth();
  const adminClient = getAdminClient();

  const { data: fefoRecord } = await adminClient.from("fefo_records").select("*").eq("id", id).single();
  if (!fefoRecord) return { error: "No encontrado" };

  const { error } = await adminClient.from("fefo_records")
    .update({ status })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al actualizar" };
  }

  if (status === "mermado") {
     const rawName = fefoRecord.product_name.split(" ||| ")[0];
     await adminClient.from("waste_records").insert({
        barcode_id: fefoRecord.barcode_id,
        qty: fefoRecord.quantity,
        unit: "Unidad",
        reason: "vencido",
        status: "pendiente_revision",
        observation: `Mermado automáticamente desde Radar FEFO. Producto: ${rawName}`,
        store_code: profile.store_code,
        area: "",
        created_by: user.id,
        operator_name: fefoRecord.operator_name || profile.display_name || "",
        deposited_by: fefoRecord.operator_name || profile.display_name || "",
     });
  }

  revalidatePath("/waste");
  revalidatePath("/waste/fefo");
  revalidatePath("/");
  return { success: true };
}

export async function subtractFefoQty(id: string) {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const { data } = await adminClient
    .from("fefo_records")
    .select("quantity")
    .eq("id", id)
    .eq("store_code", profile.store_code)
    .single();

  if (!data || data.quantity <= 1) {
    return { error: "No se puede restar más" };
  }

  const { error } = await adminClient.from("fefo_records")
    .update({ quantity: data.quantity - 1 })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al restar" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}

export async function deleteFefoRecord(id: string) {
  const { profile } = await requireAuth();
  if (profile.role !== "supervisor" && profile.role !== "admin") {
    return { error: "No tienes permisos para borrar" };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("fefo_records")
    .delete()
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al borrar" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}

export async function editFefoRecord(id: string, updates: { quantity: number; expiration_date: string }) {
  const { profile } = await requireAuth();
  if (profile.role !== "supervisor" && profile.role !== "admin") {
    return { error: "No tienes permisos para editar" };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("fefo_records")
    .update(updates)
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al editar" };
  }

  revalidatePath("/waste/fefo");
  return { success: true };
}
