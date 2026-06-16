"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { requireAuth } from "@/lib/supabase/require-auth";

export async function searchProducts(query: string) {
  await requireAuth();
  const supabase = await createClient();
  const safeQuery = query.trim().split(" ").join(" | "); // Formato para textSearch
  const { data, error } = await supabase
    .from("products")
    .select("id, name, barcode_id, material_code, category, unit")
    .textSearch("name", safeQuery)
    .limit(10);
  
  if (error) {
    console.error("searchProducts error:", error);
    return [];
  }
  return data || [];
}

export async function getProducts() {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, barcode_id, material_code, category, unit")
    .order("name")
    .limit(50);
  
  if (error) {
    console.error("getProducts error:", error);
    return [];
  }
  return data || [];
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Debes iniciar sesión para registrar un producto.");
  }

  const barcode_id = formData.get("barcode_id")?.toString().trim();
  const material_code = formData.get("material_code")?.toString().trim() || null;
  const name = formData.get("name")?.toString().trim();
  const category = formData.get("category")?.toString().trim() || "Sin Categoría";
  const unit = "Unidad"; // Forzado a Unidad según requerimiento

  if (!barcode_id || !name) {
    throw new Error("El código de barras y el nombre son obligatorios.");
  }

  const payload: TablesInsert<"products"> = {
    barcode_id,
    material_code,
    name,
    category,
    unit,
  };

  const { error } = await supabase.from("products").insert(payload);

  if (error) {
    if (error.code === "23505") { // Unique violation
      throw new Error("Ya existe un producto con este código de barras.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/products");
  revalidatePath("/waste/new");
  redirect(`/waste/new`);
}
