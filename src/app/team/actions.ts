"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSupervisor } from "@/lib/supabase/require-auth";
import type {
  AssistantContractType,
  StoreAssistant,
} from "@/lib/domain/types";

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
  const basic_tasks = parseBasicTasks(formData);
  const assistantNames = new Set(assistants.map((assistant) => assistant.name));
  const secondInCharge = getString(formData, "second_in_charge");
  const thirdInCharge = getString(formData, "third_in_charge");
  const displayName = getString(formData, "display_name");
  
  // Extraer PINs
  const operatorPins: Record<string, string> = {};
  const assistantCount = Number(getString(formData, "assistant_count"));
  for (let i = 0; i < assistantCount; i++) {
    const name = getString(formData, `assistant_name_${i}`);
    const pin = getString(formData, `assistant_pin_${i}`);
    if (name && pin) {
      operatorPins[name] = pin;
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
      basic_tasks,
      operator_pins: operatorPins,
    })
    .eq("id", profile.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}
