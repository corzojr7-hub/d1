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

  const evidence = formData.get("evidence");
  let imageUrl: string | null = null;

  if (evidence instanceof File && evidence.size > 0) {
    const fileExt = "jpg"; // Forzamos jpg post-compresión
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${profile.store_code}/${profile.id}/${fileName}`;
    
    // Convertir a buffer y comprimir
    const arrayBuffer = await evidence.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Usar import() normal en lugar de eval
    const sharp = (await import("sharp")).default;
    const compressedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Máximo 1200px de ancho
      .jpeg({ quality: 70 }) // Comprimir al 70%
      .toBuffer();

    const { error } = await supabase.storage
      .from("waste-evidence")
      .upload(filePath, compressedBuffer, {
        contentType: "image/jpeg",
      });

    if (error) {
      throw new Error(error.message);
    }

    imageUrl = filePath; // Guardamos solo el path porque el bucket ahora es privado
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
    transport_evidence: validatedData.transportEvidence || null,
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
