import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoutineClient from "./RoutineClient";

export const metadata: Metadata = {
  title: "Rutina del Día — Sistema Operativo",
};

export default async function RoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current pending and in_progress tasks
  const { data: instructions } = await supabase
    .from("instructions")
    .select("*")
    .in("status", ["pendiente", "en_progreso"])
    .order("created_at", { ascending: false });

  // Get store assistants
  const { data: profile } = await supabase
    .from("profiles")
    .select("store_code, display_name")
    .eq("user_id", user.id)
    .single();

  const storeCode = profile?.store_code;
  let assistants: any[] = [];
  
  if (storeCode) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("display_name, user_id")
      .eq("store_code", storeCode);
      
    assistants = profiles?.map(p => ({
      name: p.display_name,
      id: p.user_id
    })) || [];
  }

  return <RoutineClient initialTasks={instructions || []} assistants={assistants} currentUser={profile?.display_name || ""} />;
}
