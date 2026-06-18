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

export async function createPreShift(formData: FormData) {
  const { profile } = await requireAuth();

  const daily_sales_goal = Number(formData.get("daily_sales_goal"));
  const impulse_focus = formData.get("impulse_focus") as string;
  const priority = formData.get("priority") as string;
  const average_ticket_goal = Number(formData.get("average_ticket_goal"));

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("pre_shifts").insert({
    store_code: profile.store_code,
    created_by: profile.display_name,
    daily_sales_goal,
    impulse_focus,
    priority,
    average_ticket_goal,
  });

  if (error) {
    console.error("Error creating preshift", error);
    throw new Error("Error al guardar el pre-turno.");
  }

  revalidatePath("/");
  revalidatePath("/preshift");
}
