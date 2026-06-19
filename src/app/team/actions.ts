"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSupervisor } from "@/lib/supabase/require-auth";
import type {
  BasicTaskConfig,
  AssistantContractType,
  StoreAssistant,
} from "@/lib/domain/types";

type AseoTask = BasicTaskConfig & {
  schedule?: Record<string, string>;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseAssistants(formData: FormData): StoreAssistant[] {
  const assistantCount = Number(getString(formData, "assistant_count"));
  const safeCount = Number.isFinite(assistantCount)
    ? Math.max(0, Math.min(assistantCount, 50))
    : 0;

  return Array.from({ length: safeCount }, (_, index): StoreAssistant => {
    const contract = getString(
      formData,
      `assistant_contract_${index}`,
    ) as AssistantContractType;
    const contractType: AssistantContractType =
      contract === "part_time" || contract === "supervisor"
        ? contract
        : "full_time";

    return {
      name: getString(formData, `assistant_name_${index}`),
      contract_type: contractType
    };
  }).filter((assistant) => assistant.name.length > 0);
}

function parseAreas(formData: FormData): string[] {
  const areaCount = Number(getString(formData, "area_count"));
  const safeCount = Number.isFinite(areaCount)
    ? Math.max(0, Math.min(areaCount, 100))
    : 0;

  return Array.from({ length: safeCount }, (_, index) => {
    return getString(formData, `area_name_${index}`);
  }).filter((area) => area.length > 0);
}

function parseBasicTasks(formData: FormData) {
  const taskCount = Number(getString(formData, "basic_task_count"));
  const safeCount = Number.isFinite(taskCount)
    ? Math.max(0, Math.min(taskCount, 100))
    : 0;

  return Array.from({ length: safeCount }, (_, index) => {
    const typeVal = getString(formData, `task_type_${index}`);
    return {
      id: getString(formData, `task_id_${index}`),
      name: getString(formData, `task_name_${index}`),
      type: (typeVal === "cierre" ? "cierre" : "apertura") as "apertura" | "cierre",
      deadline_time: getString(formData, `task_deadline_${index}`),
    };
  }).filter((task) => task.name.length > 0 && task.deadline_time.length > 0);
}

export async function updateTeam(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireSupervisor();

  const assistants = parseAssistants(formData);
  const areas = parseAreas(formData);

  const assistantNames = new Set(assistants.map((assistant) => assistant.name));
  const secondInCharge = getString(formData, "second_in_charge");
  const thirdInCharge = getString(formData, "third_in_charge");
  const displayName = getString(formData, "display_name");
  
  const aseoScheduleRaw = getString(formData, "aseo_schedule_json");
  const newBasicTasks = [...(profile.basic_tasks || [])] as AseoTask[];
  if (aseoScheduleRaw) {
    try {
      const schedule = JSON.parse(aseoScheduleRaw);
      const aseoIndex = newBasicTasks.findIndex((t) => t.id === "aseo_semanal");
      if (aseoIndex >= 0) {
        newBasicTasks[aseoIndex].schedule = schedule;
      } else {
        newBasicTasks.push({
          id: "aseo_semanal",
          name: "Aseo (Baño, Cafetín, Aforo)",
          type: "apertura",
          deadline_time: "10:00",
          schedule
        });
      }
    } catch (e: unknown) {
      console.error("Failed to parse aseo schedule", e);
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || profile.display_name,
      full_name: displayName || profile.full_name,
      second_in_charge: assistantNames.has(secondInCharge) ? secondInCharge : "",
      third_in_charge: assistantNames.has(thirdInCharge) ? thirdInCharge : "",
      assistant_count: assistants.map(a => ({ name: a.name, contract_type: a.contract_type })).length,
      assistants: assistants.map(a => ({ name: a.name, contract_type: a.contract_type })),
      areas,
      basic_tasks: newBasicTasks,
    })
    .eq("id", profile.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/team");
  redirect("/team?success=1");
}

import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const createEncargadoSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio"),
  role: z.enum(["segundo_al_mando", "tercero_al_mando"])
});

export async function createEncargado(formData: FormData) {
  const { profile } = await requireSupervisor();
  
  if (!(await checkRateLimit(profile.id, 10, 60000))) return { error: "Rate limit exceeded" };

  const parsed = createEncargadoSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
    role: formData.get("role") as string,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Error de validacion" };
  }

  const { email, password, name, role } = parsed.data;
  const adminSupabase = await createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return { error: authError.message };
  }

  const newUserId = authData.user.id;

  const { error: profileError } = await adminSupabase.from("profiles").insert({
    user_id: newUserId,
    role: role,
    display_name: name,
    store_code: profile.store_code,
    store_name: profile.store_name,
    force_password_change: true,
    status: 'activo'
  });

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUserId);
    return { error: profileError.message };
  }

  revalidatePath("/team");
  return { success: true };
}
