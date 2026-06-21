"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const createDispatchSchema = z.object({
  driver_name: z.string().min(1, "Nombre de conductor es requerido"),
  truck_plate: z.string().min(1, "Placa es requerida"),
  dispatch_date: z.string().min(1, "Fecha es requerida"),
  category: z.string().min(1, "Categoría es requerida"),
  description: z.string().min(1, "Descripción es requerida"),
  initial_evidence_url: z.string().optional(),
});

export async function createDispatchDifference(formData: FormData) {
  try {
    const { profile } = await requireAuth();
    
    const parsed = createDispatchSchema.parse({
      driver_name: formData.get("driver_name"),
      truck_plate: formData.get("truck_plate"),
      dispatch_date: formData.get("dispatch_date"),
      category: formData.get("category"),
      description: formData.get("description"),
      initial_evidence_url: formData.get("initial_evidence_url") || undefined,
    });

    const adminClient = getAdminClient();
    
    const { data, error } = await adminClient.from("dispatch_differences").insert({
      store_code: profile.store_code,
      created_by: profile.id,
      driver_name: parsed.driver_name,
      truck_plate: parsed.truck_plate,
      dispatch_date: parsed.dispatch_date,
      category: parsed.category,
      description: parsed.description,
      initial_evidence_url: parsed.initial_evidence_url || null,
      status: "pendiente"
    }).select().single();

    if (error) {
      console.error(error);
      return { error: "Error al crear la diferencia de despacho." };
    }

    revalidatePath("/dispatches");
    revalidatePath("/");
    return { success: true, id: data.id };
  } catch (error: any) {
    return { error: error.message || "Error desconocido" };
  }
}

export async function addDispatchEvidence(differenceId: string, evidenceUrl: string, notes: string = "") {
  try {
    const { profile } = await requireAuth();
    const adminClient = getAdminClient();

    const { error } = await adminClient.from("dispatch_evidences").insert({
      difference_id: differenceId,
      evidence_url: evidenceUrl,
      notes: notes,
      created_by: profile.id
    });

    if (error) {
      console.error(error);
      return { error: "Error al subir evidencia" };
    }

    revalidatePath(`/dispatches/${differenceId}`);
    revalidatePath("/dispatches");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function closeDispatchDifference(differenceId: string, finalStatus: "aplicado" | "rechazado" | "anulado") {
  try {
    const { profile } = await requireAuth();
    const adminClient = getAdminClient();

    const { error } = await adminClient.from("dispatch_differences")
      .update({ status: finalStatus })
      .eq("id", differenceId)
      .eq("store_code", profile.store_code);

    if (error) {
      console.error(error);
      return { error: "Error al actualizar estado" };
    }

    revalidatePath(`/dispatches/${differenceId}`);
    revalidatePath("/dispatches");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
