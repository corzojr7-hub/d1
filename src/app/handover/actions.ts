"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";

export async function submitHandover(formData: FormData) {
  const { profile, supabase } = await requireAuth();

  const handed_by = formData.get("handed_by") as string;
  const received_by = formData.get("received_by") as string;
  const observations = formData.get("observations") as string;
  const photo = formData.get("photo") as File;

  if (!handed_by || !received_by || !photo) {
    throw new Error("Faltan campos obligatorios.");
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (photo.size > MAX_SIZE) {
    throw new Error("La imagen supera los 5MB.");
  }

  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_MIME.includes(photo.type)) {
    throw new Error("Formato de imagen no permitido.");
  }

  // Subir la foto
  const fileExt = photo.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${profile.store_code}/${profile.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("handover_photos")
    .upload(filePath, photo);

  if (uploadError) {
    console.error(uploadError);
    throw new Error("Error al subir la foto de la bodega.");
  }

  // Guardar en base de datos
  const { error: insertError } = await supabase.from("shift_handovers").insert({
    profile_id: profile.id,
    store_code: profile.store_code,
    handed_by,
    received_by,
    photo_url: filePath, // guardamos solo el path
    observations,
  });

  if (insertError) {
    console.error(insertError);
    throw new Error("Error al guardar la entrega de turno.");
  }

  revalidatePath("/");
  return { success: true };
}
