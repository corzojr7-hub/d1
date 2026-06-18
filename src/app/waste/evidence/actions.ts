"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function fetchEvidenceByDate(startDateISO: string, endDateISO: string) {
  try {
    const { profile } = await requireAuth();

    // Use service role client to bypass RLS and fetch the store's records
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: records, error } = await adminClient
      .from("waste_records")
      .select("id, reason, transport_evidence, image_url, created_at, products(name)")
      .eq("store_code", profile.store_code)
      .in("reason", ["averia_transporte", "reporte_calidad"])
      .gte("created_at", startDateISO)
      .lte("created_at", endDateISO);

    if (error) {
      console.error("Error fetching evidence:", error);
      throw new Error(error.message);
    }

    return { records };
  } catch (err: any) {
    return { error: err.message };
  }
}
