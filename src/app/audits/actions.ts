"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSupervisor, validateOperatorName } from "@/lib/supabase/require-auth";
import type { DailyBasicStatus, DailyBasicFault, TaskType } from "@/lib/domain/types";
import { z } from "zod";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const taskStatusSchema = z.enum(["en_espera", "completado", "fallado", "no_aplica", "realizado"]);

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function assignDailyTasks(
  assignments: {
    task_name: string;
    task_type: TaskType;
    assigned_to: string;
    date: string;
  }[],
  operatorName: string = ""
) {
  const { profile } = await requireSupervisor();
  const adminClient = getAdminClient();

  const insertData = assignments.map((a) => ({
    profile_id: profile.id,
    created_by: profile.id,
    store_code: profile.store_code,
    task_name: a.task_name,
    task_type: a.task_type,
    assigned_to: a.assigned_to,
    date: a.date,
    status: "en_espera",
  }));

  const { error } = await adminClient.from("daily_basics").insert(insertData);

  if (error) {
    console.error(error);
    throw new Error("Error al asignar tareas.");
  }

  revalidatePath("/audits");
  revalidatePath("/audits/daily");
}

export async function updateDailyTaskStatus(
  taskId: string,
  status: DailyBasicStatus,
  fault: DailyBasicFault = null,
  operatorName: string = ""
) {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  // Validate operator unless they are supervisor doing verification
  if (status !== 'realizado') {
     validateOperatorName(profile, operatorName);
  }

  const validatedStatus = taskStatusSchema.parse(status) as DailyBasicStatus;

  const { error } = await adminClient
    .from("daily_basics")
    .update({ status: validatedStatus, fault, operator_name: operatorName })
    .eq("id", taskId)
    .eq("store_code", profile.store_code);

  if (error) {
    console.error(error);
    throw new Error("Error al actualizar tarea.");
  }

  revalidatePath("/audits");
  revalidatePath("/audits/daily");
}

export async function saveBasicTasksConfig(basic_tasks: any[]) {
  const { profile, supabase } = await requireSupervisor();

  const { error } = await supabase
    .from("profiles")
    .update({ basic_tasks })
    .eq("id", profile.id);

  if (error) {
    console.error("Error al guardar configuración de básicos:", error);
    throw new Error("Error al guardar configuración.");
  }

  revalidatePath("/audits");
  revalidatePath("/instructions");
}
