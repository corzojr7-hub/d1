"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStoreBudget(storeCode: string, monthlyBudget: number, accumulatedSales: number) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("stores")
    .update({ 
      monthly_budget: monthlyBudget, 
      accumulated_sales: accumulatedSales 
    })
    .eq("code", storeCode);

  if (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
