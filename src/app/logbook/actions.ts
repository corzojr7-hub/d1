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

export async function createLogbookEntry(formData: FormData) {
  const { profile } = await requireAuth();

  const content = formData.get("content") as string;

  if (!content) {
    throw new Error("El contenido de la novedad no puede estar vacío.");
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("daily_logbook").insert({
    store_code: profile.store_code,
    author: profile.display_name,
    content,
  });

  if (error) {
    console.error("Error creating logbook entry", error);
    throw new Error("Error al guardar la novedad.");
  }

  revalidatePath("/logbook");
}
