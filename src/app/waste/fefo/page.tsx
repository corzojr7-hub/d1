import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FefoClient from "./FefoClient";

export const metadata: Metadata = {
  title: "Radar FEFO — Sistema Operativo",
};

export default async function FefoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, store_code")
    .eq("user_id", user.id)
    .single();

  if (!profile) return <div>Cargando...</div>;

  // Fetch FEFO records
  const { data: fefoRecords } = await supabase
    .from("fefo_records")
    .select("*")
    .eq("store_code", profile.store_code)
    .eq("status", "vigente")
    .order("expiration_date", { ascending: true });

  return <FefoClient records={fefoRecords || []} profileId={profile.id} />;
}
