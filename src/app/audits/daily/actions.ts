"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAuth } from "@/lib/supabase/require-auth";

export async function submitDailyAudit(formData: FormData) {
  const { profile, supabase } = await requireAuth();

  const auditType = formData.get("auditType") as string;
  const operatorName = formData.get("operator") as string || ""; 
  const operator = operatorName; 
  const answers = JSON.parse(formData.get("answers") as string || "{}");
  const photo = formData.get("photo") as File | null;

  let photoPath = null;

  if (photo) {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (photo.size > MAX_SIZE) {
      return { error: "La imagen supera los 5MB." };
    }

    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_MIME.includes(photo.type)) {
      return { error: "Formato de imagen no permitido." };
    }

    // Subir la foto
    const fileExt = photo.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${profile.store_code}/${profile.id}/${fileName}`;

    // Using handover_photos bucket because it already exists and is public
    const { error: uploadError } = await supabase.storage
      .from("handover_photos")
      .upload(filePath, photo);

    if (uploadError) {
      console.error(uploadError);
      return { error: "Error al subir la foto de evidencia." };
    }

    photoPath = filePath;
  }

  // Guardar en la tabla audits
  const { error: insertError } = await supabase.from("audits").insert({
    audit_type: auditType,
    operator: operator,
    operator_name: operatorName,
    answers: answers,
    image_url: photoPath,
    created_by: profile.id,
    store_code: profile.store_code
  });

  if (insertError) {
    console.error(insertError);
    return { error: "Error al guardar la auditoría." };
  }

  revalidatePath("/audits");
  return { success: true };
}
