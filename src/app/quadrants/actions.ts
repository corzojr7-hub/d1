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
  const { data: existingAssignments } = await adminClient
    .from("quadrant_assignments")
    .select("assigned_to, quadrant_name")
    .eq("store_code", profile.store_code);

  if ((existingAssignments || []).some((item) => item.assigned_to === assigned_to)) {
    throw new Error("Esa persona ya tiene un cuadrante asignado.");
  }

  if ((existingAssignments || []).some((item) => item.quadrant_name === quadrant_name)) {
    throw new Error("Ese cuadrante ya está asignado.");
  }

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

export async function updateQuadrantAssignment(formData: FormData) {
  const { profile } = await requireAuth();

  if (profile.role !== "supervisor") {
    throw new Error("No tienes permiso para editar cuadrantes.");
  }

  const id = formData.get("id");
  const assigned_to = formData.get("assigned_to");
  const quadrant_name = formData.get("quadrant_name");

  if (
    typeof id !== "string" ||
    typeof assigned_to !== "string" ||
    typeof quadrant_name !== "string" ||
    !id.trim() ||
    !assigned_to.trim() ||
    !quadrant_name.trim()
  ) {
    throw new Error("Datos incompletos para actualizar el cuadrante.");
  }

  const adminClient = getAdminClient();
  const { data: assignment } = await adminClient
    .from("quadrant_assignments")
    .select("store_code")
    .eq("id", id)
    .single();

  if (assignment?.store_code !== profile.store_code) {
    throw new Error("No tienes permiso.");
  }

  const { data: existingAssignments } = await adminClient
    .from("quadrant_assignments")
    .select("id, assigned_to, quadrant_name")
    .eq("store_code", profile.store_code);

  if (
    (existingAssignments || []).some(
      (item) => item.id !== id && item.assigned_to === assigned_to.trim(),
    )
  ) {
    throw new Error("Esa persona ya tiene un cuadrante asignado.");
  }

  if (
    (existingAssignments || []).some(
      (item) => item.id !== id && item.quadrant_name === quadrant_name.trim(),
    )
  ) {
    throw new Error("Ese cuadrante ya está asignado.");
  }

  const { error } = await adminClient
    .from("quadrant_assignments")
    .update({
      assigned_to: assigned_to.trim(),
      quadrant_name: quadrant_name.trim(),
      assigned_by: profile.display_name,
    })
    .eq("id", id);

  if (error) {
    console.error("Error actualizando cuadrante", error);
    throw new Error("Error al actualizar el cuadrante.");
  }

  revalidatePath("/quadrants");
}
