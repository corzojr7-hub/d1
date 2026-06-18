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

export async function assignQuadrant(formData: FormData) {
  const { profile } = await requireAuth();

  const assigned_to = formData.get("assigned_to") as string;
  const quadrant_name = formData.get("quadrant_name") as string;
  const notes = formData.get("notes") as string;

  if (!assigned_to || !quadrant_name) {
    throw new Error("Debe seleccionar un asistente y un cuadrante.");
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("quadrant_assignments").insert({
    store_code: profile.store_code,
    assigned_by: profile.display_name,
    assigned_to,
    quadrant_name,
    notes,
    status: "asignado"
  });

  if (error) {
    console.error("Error asignando cuadrante", error);
    throw new Error("Error al asignar el cuadrante.");
  }

  revalidatePath("/quadrants");
}

export async function acceptQuadrant(assignmentId: string) {
  const { profile } = await requireAuth();

  const adminClient = getAdminClient();
  
  // Verify assignment belongs to this store
  const { data: assignment } = await adminClient
    .from("quadrant_assignments")
    .select("store_code")
    .eq("id", assignmentId)
    .single();

  if (assignment?.store_code !== profile.store_code) {
    throw new Error("No tienes permiso.");
  }

  const { error } = await adminClient
    .from("quadrant_assignments")
    .update({
      status: "aceptado",
      accepted_at: new Date().toISOString()
    })
    .eq("id", assignmentId);

  if (error) {
    console.error("Error aceptando cuadrante", error);
    throw new Error("Error al aceptar el cuadrante.");
  }

  revalidatePath("/quadrants");
}
