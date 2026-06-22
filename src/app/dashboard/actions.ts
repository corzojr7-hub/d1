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
  assistant: z.string().min(1, "Debes seleccionar un colaborador."),
  productivity: z.number().min(0, "Articulos por minuto no puede ser negativo."),
  scan: z.number().min(0, "Escaneo no puede ser negativo."),
  cancellations: z.number().min(0, "Cancelaciones no puede ser negativo."),
  voids: z.number().min(0, "Anulaciones no puede ser negativo."),
});

const setBulkPosMetricsSchema = z.array(
  savePosMetricSchema.pick({
    date: true,
    assistant: true,
    productivity: true,
    scan: true,
  }),
);

function parseMetric(rawValue: FormDataEntryValue | null) {
  const normalized = String(rawValue ?? "")
    .trim()
    .replace(",", ".");
  if (!normalized) return 0;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

function redirectWithStatus(
  status: "success" | "error",
  date: string,
  assistant: string,
  message: string,
) {
  const params = new URLSearchParams({
    posStatus: status,
    posDate: date,
    posAssistant: assistant,
    posMessage: message,
  });
  redirect(`/dashboard?${params.toString()}`);
}

export async function savePosMetric(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const assistant = String(formData.get("assistant") ?? "");

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
      assistant,
      productivity: parseMetric(formData.get("productivity")),
      scan: parseMetric(formData.get("scan")),
      cancellations: parseMetric(formData.get("cancellations")),
      voids: parseMetric(formData.get("voids")),
    });

    const adminClient = createAdminClient();
    const { data: existingRows, error: existingError } = await adminClient
      .from("pos_metrics")
      .select("id, created_by, assistant")
      .eq("store_code", profile.store_code)
      .eq("date", validated.date)
      .eq("assistant", validated.assistant)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingRow = existingRows?.[0];

    if (existingRow && !POS_EDIT_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("Este dia ya fue cargado. Solo el supervisor puede editarlo.");
    }

    if (existingRow) {
      const { error } = await adminClient
        .from("pos_metrics")
        .update({
          assistant: validated.assistant,
          productivity: validated.productivity,
          scan: validated.scan,
          cancellations: validated.cancellations,
          voids: validated.voids,
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
        assistant: validated.assistant,
        productivity: validated.productivity,
        scan: validated.scan,
        cancellations: validated.cancellations,
        voids: validated.voids,
      });

      if (error) {
        throw error;
      }
    }

    revalidatePath("/dashboard");
    redirectWithStatus("success", validated.date, validated.assistant, "Productividad POS guardada.");
  } catch (error: unknown) {
    console.error("savePosMetric error:", error);
    redirectWithStatus(
      "error",
      date || new Date().toISOString().slice(0, 10),
      assistant,
      error instanceof Error ? error.message : "No se pudo guardar la productividad POS.",
    );
  }
}

export async function setBulkPosMetrics(
  metrics: Array<{
    date: string;
    assistant: string;
    productivity: number;
    scan: number;
  }>,
) {
  try {
    const { profile, user } = await requireAuth();

    if (!(await checkRateLimit(profile.id, 25, 60_000))) {
      throw new Error("Demasiados intentos. Espera un momento.");
    }

    if (!POS_EDIT_ROLES.includes(profile.role as ProfileRole)) {
      throw new Error("Solo el supervisor puede importar productividad POS.");
    }

    const validated = setBulkPosMetricsSchema.parse(metrics);
    if (validated.length === 0) return { success: true, count: 0 };

    const adminClient = createAdminClient();
    const dates = Array.from(new Set(validated.map((item) => item.date)));
    const assistants = Array.from(new Set(validated.map((item) => item.assistant)));

    const { data: existingRows, error: existingError } = await adminClient
      .from("pos_metrics")
      .select("id, date, assistant, created_by, cancellations, voids")
      .eq("store_code", profile.store_code)
      .in("date", dates)
      .in("assistant", assistants);

    if (existingError) {
      throw existingError;
    }

    const existingMap = new Map(
      (existingRows || []).map((row) => [`${row.date}__${row.assistant}`, row]),
    );

    for (const item of validated) {
      const key = `${item.date}__${item.assistant}`;
      const existing = existingMap.get(key);

      if (existing) {
        const { error } = await adminClient
          .from("pos_metrics")
          .update({
            productivity: item.productivity,
            scan: item.scan,
            cancellations: Number(existing.cancellations || 0),
            voids: Number(existing.voids || 0),
          })
          .eq("id", existing.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await adminClient.from("pos_metrics").insert({
          profile_id: profile.id,
          created_by: user.id,
          store_code: profile.store_code,
          date: item.date,
          assistant: item.assistant,
          productivity: item.productivity,
          scan: item.scan,
          cancellations: 0,
          voids: 0,
        });

        if (error) {
          throw error;
        }
      }
    }

    revalidatePath("/dashboard");
    return { success: true, count: validated.length };
  } catch (error: unknown) {
    console.error("setBulkPosMetrics error:", error);
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : JSON.stringify(error);
    return {
      success: false,
      error: message || "No se pudo importar la productividad POS.",
    };
  }
}
