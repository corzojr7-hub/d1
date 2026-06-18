"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function submitDailyAudit(formData: FormData) {
  const { profile, supabase } = await requireAuth();

  const auditType = formData.get("auditType") as string;
  const operatorName = formData.get("operator") as string || ""; 
  const operator = operatorName; 
  const answers = JSON.parse(formData.get("answers") as string || "{}");
  const photoKeys = ["bodega", "aforo", "cafetin", "bano"];
  const uploadedPaths: string[] = [];
  const adminClient = getAdminClient();

  for (const key of photoKeys) {
    const photo = formData.get(`photo_${key}`) as File | null;
    if (photo) {
      const MAX_SIZE = 5 * 1024 * 1024;
      if (photo.size > MAX_SIZE) {
        return { error: `La imagen de ${key} supera los 5MB.` };
      }

      const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED_MIME.includes(photo.type)) {
        return { error: `Formato de imagen no permitido para ${key}.` };
      }

      const fileExt = photo.name.split(".").pop();
      const fileName = `${Date.now()}-${key}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${profile.store_code}/${profile.id}/${fileName}`;

      const { error: uploadError } = await adminClient.storage
        .from("handover_photos")
        .upload(filePath, photo);

      if (uploadError) {
        console.error(uploadError);
        return { error: `Error al subir la foto de ${key}.` };
      }

      uploadedPaths.push(filePath);
    }
  }

  const photoPath = uploadedPaths.length > 0 ? uploadedPaths.join(",") : null;

  // Guardar en la tabla audits
  const { error: insertError } = await adminClient.from("audits").insert({
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
