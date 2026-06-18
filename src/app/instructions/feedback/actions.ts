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
import type { Database } from "@/lib/supabase/database.types";

type FeedbackInsert = Database["public"]["Tables"]["feedbacks"]["Insert"];

export async function createFeedback(data: Omit<FeedbackInsert, "store_code" | "created_by">) {
  const { profile } = await requireAuth();

  const payload: FeedbackInsert = {
    ...data,
    store_code: profile.store_code,
    created_by: profile.display_name,
    status: "activo",
  };

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("feedbacks").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
  revalidatePath("/instructions");
}

export async function resolveFeedback(id: string) {
  const { profile } = await requireAuth();

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("feedbacks")
    .update({ status: "resuelto" })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (error) throw new Error(error.message);

  revalidatePath("/instructions/feedback");
}
