"use server";

import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function fetchEvidenceByDate(startDateISO: string, endDateISO: string) {
  try {
    const { profile } = await requireAuth();
    const evidenceImageKeys = new Set(["novedad", "lote", "proveedor", "cantidades"]);

    // Use service role client to bypass RLS and fetch the store's records
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: records, error } = await adminClient
      .from("waste_records")
      .select("id, reason, transport_evidence, image_url, created_at, qty, unit, area, observation, transport_driver, transport_plate, transport_comment, deposited_by, store_code, products(name)")
      .eq("store_code", profile.store_code)
      .in("reason", ["averia_transporte", "reporte_calidad", "calidad_nacional", "fecha_corta_cedi"])
      .gte("created_at", startDateISO)
      .lte("created_at", endDateISO);

    if (error) {
      console.error("Error fetching evidence:", error);
      throw new Error(error.message);
    }

    const signedRecords = await Promise.all(
      (records || []).map(async (record) => {
        let imageUrl = record.image_url;
        if (imageUrl) {
          const { data } = await adminClient.storage
            .from("waste-evidence")
            .createSignedUrl(imageUrl, 60 * 10);
          imageUrl = data?.signedUrl || imageUrl;
        }

        let transportEvidence = record.transport_evidence;
        if (transportEvidence && typeof transportEvidence === "object") {
          const signedEntries = await Promise.all(
            Object.entries(transportEvidence).map(async ([key, path]) => {
              if (!evidenceImageKeys.has(key) || typeof path !== "string" || path.length === 0) {
                return [key, path] as const;
              }
              const { data } = await adminClient.storage
                .from("waste-evidence")
                .createSignedUrl(path, 60 * 10);
              return [key, data?.signedUrl || path] as const;
            })
          );
          transportEvidence = Object.fromEntries(signedEntries);
        }

        return {
          ...record,
          image_url: imageUrl,
          transport_evidence: transportEvidence,
        };
      })
    );

    return { records: signedRecords };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al consultar evidencias." };
  }
}
