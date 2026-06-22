"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { requireAuth, validateOperatorName } from "@/lib/supabase/require-auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { WASTE_WEEK_CUT_PREFIX } from "./cutoff";

export async function findProductByBarcode(
  barcode: string,
): Promise<{
  id: string;
  barcode_id: string;
  material_code: string | null;
  name: string;
  category: string;
  unit: string;
  created_at: string;
} | null> {
  const normalizedBarcode = barcode.trim();

  if (!normalizedBarcode) {
    return null;
  }

  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, barcode_id, material_code, name, category, unit, created_at")
    .eq("barcode_id", normalizedBarcode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseTransportEvidence(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function getTransportEvidenceMeta(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function hasUploadedFile(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value instanceof File && value.size > 0;
}

const submitWasteSchema = z.object({
  barcodeId: z.string().min(1, "El código de barras es obligatorio."),
  productId: z.string().optional(),
  qty: z.number().positive("La cantidad debe ser mayor a cero."),
  unit: z.string().min(1, "La unidad es obligatoria."),
  reason: z.string().min(1, "El motivo es obligatorio."),
  depositedBy: z.string().optional(),
  area: z.string().optional(),
  observation: z.string().optional(),
  transportDriver: z.string().optional(),
  transportPlate: z.string().optional(),
  transportComment: z.string().optional(),
  qualityExpirationDate: z.string().optional(),
  qualityLot: z.string().optional(),
  qualitySupplier: z.string().optional(),
  transportEvidence: z.any().optional()
});

export async function submitWaste(formData: FormData): Promise<{ error?: string }> {
  const { profile } = await requireAuth();
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const rawData = {
    barcodeId: getString(formData, "barcode_id"),
    productId: getString(formData, "product_id") || undefined,
    qty: Number(getString(formData, "qty")),
    unit: getString(formData, "unit"),
    reason: getString(formData, "reason"),
    depositedBy: getString(formData, "deposited_by") || undefined,
    area: getString(formData, "area") || undefined,
    observation: getString(formData, "observation") || undefined,
    transportDriver: getString(formData, "transport_driver") || undefined,
    transportPlate: getString(formData, "transport_plate") || undefined,
    transportComment: getString(formData, "transport_comment") || undefined,
    qualityExpirationDate: getString(formData, "quality_expiration_date") || undefined,
    qualityLot: getString(formData, "quality_lot") || undefined,
    qualitySupplier: getString(formData, "quality_supplier") || undefined,
    transportEvidence: parseTransportEvidence(formData.get("transport_evidence")),
  };

  let validatedData;
  try {
    validatedData = submitWasteSchema.parse(rawData);
  } catch (err: unknown) {
    return {
      error:
        err instanceof z.ZodError
          ? err.issues[0]?.message ?? "Datos de merma inválidos."
          : err instanceof Error
            ? err.message
            : "Error inesperado al validar la merma.",
    };
  }

  if (validatedData.depositedBy) {
    validateOperatorName(profile, validatedData.depositedBy);
  }

  const reason = validatedData.reason;
  const productName = getString(formData, "product_name")?.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() || "PRODUCTO";
  const dateStr = new Date().toISOString().split('T')[0];

  if (reason === "averia_transporte") {
    if (!validatedData.transportDriver) {
      return { error: "El nombre del conductor es obligatorio para averia de transporte." };
    }
    if (!validatedData.transportPlate) {
      return { error: "La placa del conductor es obligatoria para averia de transporte." };
    }
    if (!hasUploadedFile(formData, "evidence_detra")) {
      return { error: "La foto de DETRA es obligatoria para averia de transporte." };
    }
    if (!hasUploadedFile(formData, "evidence_rotulo")) {
      return { error: "La foto de rotulo es obligatoria para averia de transporte." };
    }
    if (!hasUploadedFile(formData, "evidence_novedad")) {
      return { error: "La foto de la novedad es obligatoria para averia de transporte." };
    }
    if (!hasUploadedFile(formData, "evidence_unidades")) {
      return { error: "La foto de unidades afectadas es obligatoria para averia de transporte." };
    }
  }

  const requiresQualityMetadata =
    reason === "reporte_calidad" ||
    reason === "calidad_nacional" ||
    reason === "fecha_corta_cedi";

  if (requiresQualityMetadata) {
    if (!validatedData.qualityExpirationDate) {
      return { error: "La fecha de vencimiento es obligatoria para esta merma." };
    }
    if (!validatedData.qualityLot) {
      return { error: "El lote es obligatorio para esta merma." };
    }
    if (!validatedData.qualitySupplier) {
      return { error: "El proveedor es obligatorio para esta merma." };
    }
    if (!validatedData.transportComment) {
      return { error: "La descripcion de la novedad es obligatoria para esta merma." };
    }
    if (!hasUploadedFile(formData, "evidence_proveedor")) {
      return { error: "La foto del proveedor es obligatoria para esta merma." };
    }
    if (!hasUploadedFile(formData, "evidence_lote")) {
      return { error: "La foto de lote y vencimiento es obligatoria para esta merma." };
    }
    if (!hasUploadedFile(formData, "evidence_novedad")) {
      return { error: "La foto de la novedad es obligatoria para esta merma." };
    }
    if (!hasUploadedFile(formData, "evidence_unidades")) {
      return { error: "La foto de unidades afectadas es obligatoria para esta merma." };
    }
  }

  let imageUrl: string | null = null;
  let transportEvidenceUrls: {
    novedad: string;
    lote: string;
    proveedor: string;
    cantidades: string;
    fecha_vencimiento?: string;
    lote_texto?: string;
    proveedor_texto?: string;
    novedad_texto?: string;
  } | null = null;

  async function processAndUploadImage(file: FormDataEntryValue | null, label: string): Promise<string | null> {
    if (!(file instanceof File) || file.size === 0) return null;
    const fileExt = "jpg";
    const fileName = `${label}_${dateStr}_${productName}.${fileExt}`;
    const filePath = `${profile.store_code}/${profile.id}/${Date.now()}_${fileName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sharp = (await import("sharp")).default;
    const compressedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const { error } = await adminClient.storage
      .from("waste-evidence")
      .upload(filePath, compressedBuffer, { contentType: "image/jpeg" });

    if (error) {
      console.error(`Waste upload error [${label}]`, error);
      throw new Error(`Error subiendo ${label}: ${error.message}`);
    }
    return filePath;
  }

  try {

  if (
    reason === "averia_transporte" ||
    reason === "reporte_calidad" ||
    reason === "calidad_nacional" ||
    reason === "fecha_corta_cedi"
  ) {
    const urls: {
      novedad: string;
      lote: string;
      proveedor: string;
      cantidades: string;
      fecha_vencimiento?: string;
      lote_texto?: string;
      proveedor_texto?: string;
      novedad_texto?: string;
    } = {
      novedad: "", lote: "", proveedor: "", cantidades: ""
    };

    if (reason === "averia_transporte") {
      urls.proveedor = await processAndUploadImage(formData.get("evidence_detra"), "DETRA") || "";
      urls.lote = await processAndUploadImage(formData.get("evidence_rotulo"), "ROTULO") || "";
      urls.novedad = await processAndUploadImage(formData.get("evidence_novedad"), "NOVEDAD") || "";
      urls.cantidades = await processAndUploadImage(formData.get("evidence_unidades"), "UNIDADES") || "";
    } else {
      urls.proveedor = await processAndUploadImage(formData.get("evidence_proveedor"), "PROVEEDOR") || "";
      urls.lote = await processAndUploadImage(formData.get("evidence_lote"), "LOTE_VENCIMIENTO") || "";
      urls.novedad = await processAndUploadImage(formData.get("evidence_novedad"), "NOVEDAD") || "";
      urls.cantidades = await processAndUploadImage(formData.get("evidence_unidades"), "UNIDADES") || "";
      urls.fecha_vencimiento = validatedData.qualityExpirationDate || "";
      urls.lote_texto = validatedData.qualityLot || "";
      urls.proveedor_texto = validatedData.qualitySupplier || "";
      urls.novedad_texto = validatedData.transportComment || "";
    }
    
    // We check if at least one photo was uploaded successfully before storing JSON
    if (Object.values(urls).some(Boolean)) {
      transportEvidenceUrls = urls;
    }
  } else {
    // Normal single evidence upload
    imageUrl = await processAndUploadImage(formData.get("evidence"), "EVIDENCIA");
  }

  const payload: TablesInsert<"waste_records"> = {
    barcode_id: validatedData.barcodeId,
    product_id: validatedData.productId || null,
    qty: validatedData.qty,
    unit: validatedData.unit,
    reason: validatedData.reason,
    deposited_by: validatedData.depositedBy || "",
    area: validatedData.area || "",
    status: "pendiente_revision",
    observation: validatedData.observation || "",
    image_url: imageUrl,
    transport_driver: validatedData.transportDriver || null,
    transport_plate: validatedData.transportPlate || null,
    transport_comment: validatedData.transportComment || null,
    transport_evidence: transportEvidenceUrls,
    store_code: profile.store_code,
    created_by: profile.id,
    operator_name: validatedData.depositedBy || "", // Identidad del asistente seleccionado
  };

    // Usamos el cliente nativo con la Service Role Key para saltarnos RLS completamente y evitar problemas de políticas desincronizadas
    const { error } = await adminClient.from("waste_records").insert(payload);

    if (error) {
      console.error("Waste insert error", error, payload);
      return { error: error.message };
    }
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Error inesperado al registrar la merma.",
    };
  }

  revalidatePath("/");
  revalidatePath("/waste");
  return {};
}

const wasteStatusSchema = z.enum(["pendiente_revision", "revisado", "anulado", "recuperado"]);

export async function updateWasteStatus(id: string, newStatus: string) {
  const { profile } = await requireAuth();

  const validatedStatus = wasteStatusSchema.parse(newStatus);

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("waste_records")
    .update({ status: validatedStatus })
    .eq("id", id)
    .eq("store_code", profile.store_code); // Restringido a su tienda

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/");
}

export async function markWasteReportSent(id: string) {
  const { profile } = await requireAuth();
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("waste_records")
    .select("id, transport_evidence")
    .eq("id", id)
    .eq("store_code", profile.store_code)
    .single();

  if (error || !data) {
    throw new Error("No se encontró la merma.");
  }

  const currentEvidence = getTransportEvidenceMeta(data.transport_evidence);
  const updatedEvidence = {
    ...currentEvidence,
    whatsapp_sent_at: new Date().toISOString(),
    whatsapp_sent_by: profile.display_name,
  };

  const { error: updateError } = await adminClient
    .from("waste_records")
    .update({ transport_evidence: updatedEvidence })
    .eq("id", id)
    .eq("store_code", profile.store_code);

  if (updateError) {
    throw new Error("No se pudo marcar la merma como enviada.");
  }

  revalidatePath("/waste");
  revalidatePath("/history");
  revalidatePath("/");
}

export async function updateWasteRecord(formData: FormData) {
  const { profile } = await requireAuth();
  const id = getString(formData, "id");
  const qty = Number(getString(formData, "qty"));
  const unit = getString(formData, "unit");
  const reason = getString(formData, "reason");

  if (!id) throw new Error("ID de registro faltante.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Cantidad inválida.");

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("waste_records")
    .update({ qty, unit, reason })
    .eq("id", id)
    .eq("store_code", profile.store_code); // Restringido a su tienda

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/");
}

export async function deleteWasteRecord(id: string) {
  const { profile } = await requireAuth();

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("waste_records")
    .delete()
    .eq("id", id)
    .eq("store_code", profile.store_code); // Solo puede borrar de su tienda

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/");
}

export async function startWasteWeekCut() {
  const { profile } = await requireAuth();

  if (profile.role !== "supervisor" && profile.role !== "admin") {
    throw new Error("Solo supervisor o admin pueden iniciar un nuevo corte de merma.");
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient.from("daily_logbook").insert({
    store_code: profile.store_code,
    author: profile.display_name,
    content: `${WASTE_WEEK_CUT_PREFIX}${new Date().toISOString()}`,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
}
