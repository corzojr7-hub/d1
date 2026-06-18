"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, validateOperatorName } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
import { z } from "zod";

const instructionStatusSchema = z.enum(["pendiente", "en_progreso", "completado", "anulada"]);

export async function fetchInstructions() {
  const { profile, supabase } = await requireAuth();
  
  const { data, error } = await supabase
    .from("instructions")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function removeInstruction(id: string) {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from("instructions")
    .delete()
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) throw new Error(error.message);
  revalidatePath("/instructions");
  revalidatePath("/");
}

export async function clearInstructions() {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from("instructions")
    .delete()
    .eq("store_code", profile.store_code)
    .eq("status", "completado"); // Usually clear only removes completed

  if (error) throw new Error(error.message);
  revalidatePath("/instructions");
  revalidatePath("/");
}

export async function createInstruction(_prev: unknown, formData: FormData) {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const responsible = formData.get("responsible") as string;
  const content = formData.get("content") as string;
  const priority = formData.get("priority") as string;

  if (!responsible || !content || !priority) {
    return { error: "Todos los campos son obligatorios" };
  }

  const validPriorities = ["Baja", "Media", "Alta", "Critica"];
  if (!validPriorities.includes(priority)) {
    return { error: "Prioridad invalida" };
  }



  const { error } = await adminClient.from("instructions").insert({
    responsible,
    content,
    priority: priority.toLowerCase(),
    status: "pendiente",
    store_code: profile.store_code,
    created_by: profile.id, // Se usa profile.id en vez de user.id
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/instructions");
}

export async function updateInstructionStatus(id: string, newStatus: string, operatorName: string = "") {
  const { profile, supabase } = await requireAuth();

  validateOperatorName(profile, operatorName);

  const validatedStatus = instructionStatusSchema.parse(newStatus);

  if (validatedStatus === "anulada" && profile.role !== "supervisor") {
    throw new Error("Solo un supervisor puede anular instrucciones.");
  }

  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from("instructions")
    .update({ status: validatedStatus, updated_at: new Date().toISOString(), operator_name: operatorName })
    .eq("id", id)
    .eq("store_code", profile.store_code); // Aislamiento por tienda

  if (error) throw new Error(error.message);

  revalidatePath("/instructions");
  revalidatePath("/");
}
