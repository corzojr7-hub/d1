"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ProfileRole } from "@/lib/domain/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/require-auth";

const POS_CREATE_ROLES: ProfileRole[] = [
  "supervisor",
  "segundo_al_mando",
  "tercero_al_mando",
  "admin",
];

const POS_EDIT_ROLES: ProfileRole[] = ["supervisor", "admin"];

const savePosMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es valida."),
  productivity: z.number().min(0, "Articulos por minuto no puede ser negativo."),
  scan: z.number().min(0, "Escaneo no puede ser negativo."),
});

function parseMetric(rawValue: FormDataEntryValue | null) {
  const normalized = String(rawValue ?? "")
    .trim()
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

function redirectWithStatus(status: "success" | "error", date: string, message: string) {
  const params = new URLSearchParams({
    posStatus: status,
    posDate: date,
    posMessage: message,
  });
  redirect(`/dashboard?${params.toString()}`);
}

export async function savePosMetric(formData: FormData) {
  const date = String(formData.get("date") ?? "");

  try {
    const { profile, user } = await requireAuth();

    if (!(await checkRateLimit(profile.id, 50, 60_000))) {
      throw new Error("Demasiados intentos. Espera un momento.");
    }

    if (!POS_CREATE_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("No tienes permisos para registrar productividad POS.");
    }

    const validated = savePosMetricSchema.parse({
      date,
      productivity: parseMetric(formData.get("productivity")),
      scan: parseMetric(formData.get("scan")),
    });

    const adminClient = createAdminClient();
    const { data: existingRows, error: existingError } = await adminClient
      .from("pos_metrics")
      .select("id, created_by, assistant, voids")
      .eq("store_code", profile.store_code)
      .eq("date", validated.date)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingRow = existingRows?.[0];

    if (existingRow && !POS_EDIT_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("Este dia ya fue cargado. Solo el supervisor puede editarlo.");
    }

    const assistantName =
      existingRow?.assistant ||
      profile.display_name ||
      profile.full_name ||
      profile.email ||
      "Equipo tienda";

    if (existingRow) {
      const { error } = await adminClient
        .from("pos_metrics")
        .update({
          assistant: assistantName,
          productivity: validated.productivity,
          cancellations: validated.scan,
          voids: existingRow.voids || 0,
        })
        .eq("id", existingRow.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await adminClient.from("pos_metrics").insert({
        profile_id: profile.id,
        created_by: user.id,
        store_code: profile.store_code,
        date: validated.date,
        assistant: assistantName,
        productivity: validated.productivity,
        cancellations: validated.scan,
        voids: 0,
      });

      if (error) {
        throw error;
      }
    }

    revalidatePath("/dashboard");
    redirectWithStatus("success", validated.date, "Productividad POS guardada.");
  } catch (error: unknown) {
    console.error("savePosMetric error:", error);
    redirectWithStatus(
      "error",
      date || new Date().toISOString().slice(0, 10),
      error instanceof Error ? error.message : "No se pudo guardar la productividad POS.",
    );
  }
}
