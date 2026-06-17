"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { requireAuth, requireSupervisor, validateOperatorName } from "@/lib/supabase/require-auth";
import { z } from "zod";

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
  transportEvidence: z.any().optional()
});

export async function submitWaste(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireAuth();

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
    transportEvidence: formData.get("transport_evidence") ? JSON.parse(getString(formData, "transport_evidence")) : undefined
  };

  const validatedData = submitWasteSchema.parse(rawData);
  if (validatedData.depositedBy) {
    validateOperatorName(profile, validatedData.depositedBy);
  }

  const reason = validatedData.reason;
  const productName = getString(formData, "product_name")?.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() || "PRODUCTO";
  const dateStr = new Date().toISOString().split('T')[0];

  let imageUrl: string | null = null;
  let transportEvidenceUrls: { novedad: string; lote: string; proveedor: string; cantidades: string } | null = null;

  async function processAndUploadImage(file: any, label: string): Promise<string | null> {
    if (!file || typeof file === 'string' || !file.arrayBuffer || file.size === 0) return null;
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

    const { error } = await supabase.storage
      .from("waste-evidence")
      .upload(filePath, compressedBuffer, { contentType: "image/jpeg" });

    if (error) throw new Error(`Error subiendo ${label}: ${error.message}`);
    return filePath;
  }

  if (reason === "averia_transporte" || reason === "reporte_calidad") {
    const urls: { novedad: string; lote: string; proveedor: string; cantidades: string } = {
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
    created_by: profile.id, // Se usa profile.id y no user.id
    operator_name: validatedData.depositedBy || "", // Identidad del asistente seleccionado
  };

  const { error } = await supabase.from("waste_records").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/waste");
  redirect("/waste");
}

const wasteStatusSchema = z.enum(["pendiente_revision", "revisado", "anulado", "recuperado"]);

export async function updateWasteStatus(id: string, newStatus: string) {
  const { profile, supabase } = await requireSupervisor();

  const validatedStatus = wasteStatusSchema.parse(newStatus);

  const { error } = await supabase
    .from("waste_records")
    .update({ status: validatedStatus })
    .eq("id", id)
    .eq("store_code", profile.store_code); // Restringido a su tienda

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/");
}

export async function updateWasteRecord(formData: FormData) {
  const { profile, supabase } = await requireSupervisor();
  const id = getString(formData, "id");
  const qty = Number(getString(formData, "qty"));
  const unit = getString(formData, "unit");
  const reason = getString(formData, "reason");

  if (!id) throw new Error("ID de registro faltante.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Cantidad inválida.");

  const { error } = await supabase
    .from("waste_records")
    .update({ qty, unit, reason })
    .eq("id", id)
    .eq("store_code", profile.store_code); // Restringido a su tienda

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/");
}
