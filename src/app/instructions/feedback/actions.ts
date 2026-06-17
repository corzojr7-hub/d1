"use server";

import { revalidatePath } from "next/cache";
import { requireSupervisor } from "@/lib/supabase/require-auth";
import type { Database } from "@/lib/supabase/database.types";

type FeedbackInsert = Database["public"]["Tables"]["feedbacks"]["Insert"];

export async function createFeedback(data: Omit<FeedbackInsert, "store_code" | "created_by">) {
  const { profile, supabase } = await requireSupervisor();

  const payload: FeedbackInsert = {
    ...data,
    store_code: profile.store_code,
    created_by: profile.display_name,
    status: "activo",
  };

  const { error } = await supabase.from("feedbacks").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
  revalidatePath("/instructions");
}

export async function resolveFeedback(id: string) {
  const { profile, supabase } = await requireSupervisor();

  const { error } = await supabase
    .from("feedbacks")
    .update({ status: "resuelto" })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
}
