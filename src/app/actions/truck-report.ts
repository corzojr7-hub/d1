"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  parseTruckReportContent,
  serializeTruckReport,
  type TruckReportPayload,
} from "@/lib/truck-report";

const truckReportSchema = z.object({
  reportText: z.string().min(1),
  reportedAt: z.string().min(1),
  storeName: z.string().min(1),
  arrivalAreas: z.array(z.string().min(1)).min(1),
  pallets: z.string().min(1),
  driver: z.string().min(1),
  plate: z.string().min(1),
  temperature: z.string().optional(),
  novelty: z.string().min(1),
});

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function saveTruckReport(input: TruckReportPayload) {
  const { profile } = await requireAuth();
  const payload = truckReportSchema.parse(input);
  const adminClient = getAdminClient();

  const { error } = await adminClient.from("daily_logbook").insert({
    store_code: profile.store_code,
    author: profile.display_name,
    content: serializeTruckReport(payload),
  });

  if (error) {
    throw new Error("No se pudo guardar el reporte del camión.");
  }

  revalidatePath("/");
}

export async function markTruckReportSent(entryId: string) {
  const { profile } = await requireAuth();
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from("daily_logbook")
    .select("id, content")
    .eq("id", entryId)
    .eq("store_code", profile.store_code)
    .single();

  if (error || !data) {
    throw new Error("No se encontró el reporte del camión.");
  }

  const parsed = parseTruckReportContent(data.content);
  if (!parsed) {
    throw new Error("El reporte del camión no es válido.");
  }

  const updatedPayload: TruckReportPayload = {
    ...parsed,
    sentAt: new Date().toISOString(),
    sentBy: profile.display_name,
  };

  const { error: updateError } = await adminClient
    .from("daily_logbook")
    .update({ content: serializeTruckReport(updatedPayload) })
    .eq("id", entryId)
    .eq("store_code", profile.store_code);

  if (updateError) {
    throw new Error("No se pudo marcar el reporte como enviado.");
  }

  revalidatePath("/");
}

