"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const createDispatchSchema = z.object({
  driver_name: z.string().min(1, "Nombre de conductor es requerido"),
  truck_plate: z.string().min(1, "Placa es requerida"),
  dispatch_date: z.string().min(1, "Fecha es requerida"),
  category: z.string().min(1, "Categoria es requerida"),
  description: z.string().min(1, "Descripcion es requerida"),
  initial_evidence_url: z.string().optional(),
  transfer_number: z.string().optional(),
  material_code: z.string().optional(),
  material_description: z.string().optional(),
  difference_type: z.string().optional(),
  total_units: z.string().optional(),
  received_total_value: z.string().optional(),
  observations: z.string().optional(),
  report_text: z.string().optional(),
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
      transfer_number: formData.get("transfer_number") || undefined,
      material_code: formData.get("material_code") || undefined,
      material_description: formData.get("material_description") || undefined,
      difference_type: formData.get("difference_type") || undefined,
      total_units: formData.get("total_units") || undefined,
      received_total_value: formData.get("received_total_value") || undefined,
      observations: formData.get("observations") || undefined,
      report_text: formData.get("report_text") || undefined,
    });

    const adminClient = getAdminClient();
    const descriptionLines = [
      parsed.description.trim(),
      parsed.transfer_number ? `Numero de detra: ${parsed.transfer_number}` : "",
      parsed.material_code ? `EAN: ${parsed.material_code}` : "",
      parsed.material_description ? `Producto: ${parsed.material_description}` : "",
      parsed.difference_type ? `Diferencia: ${parsed.difference_type}` : "",
      parsed.total_units ? `Total unidades: ${parsed.total_units}` : "",
      parsed.received_total_value ? `Total valor: ${parsed.received_total_value}` : "",
      parsed.observations ? `Observaciones: ${parsed.observations}` : "",
      parsed.report_text ? `\n--- REPORTE PARA GRUPOS ---\n${parsed.report_text}` : "",
    ].filter(Boolean);

    const { data, error } = await adminClient
      .from("dispatch_differences")
      .insert({
        store_code: profile.store_code,
        created_by: profile.id,
        driver_name: parsed.driver_name,
        truck_plate: parsed.truck_plate,
        dispatch_date: parsed.dispatch_date,
        category: parsed.category,
        description: descriptionLines.join("\n"),
        initial_evidence_url: parsed.initial_evidence_url || null,
        status: "pendiente",
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return { error: "Error al crear la diferencia de despacho." };
    }

    revalidatePath("/dispatches");
    revalidatePath("/");
    return { success: true, id: data.id };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function addDispatchEvidence(
  differenceId: string,
  evidenceUrl: string,
  notes: string = "",
) {
  try {
    const { profile } = await requireAuth();
    const adminClient = getAdminClient();

    const { error } = await adminClient.from("dispatch_evidences").insert({
      difference_id: differenceId,
      evidence_url: evidenceUrl,
      notes,
      created_by: profile.id,
    });

    if (error) {
      console.error(error);
      return { error: "Error al subir evidencia" };
    }

    revalidatePath(`/dispatches/${differenceId}`);
    revalidatePath("/dispatches");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function closeDispatchDifference(
  differenceId: string,
  finalStatus: "aplicado" | "rechazado" | "anulado",
) {
  try {
    const { profile } = await requireAuth();
    const adminClient = getAdminClient();

    const { error } = await adminClient
      .from("dispatch_differences")
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
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
