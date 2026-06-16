import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChecklistWizardWrapper from "./ChecklistWizardWrapper";

export const metadata: Metadata = {
  title: "Checklist Diario — Sistema Operativo",
};

export default async function DailyAuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-[#0a3875] px-4 py-4 shadow-sm flex items-center gap-3">
        <h1 className="text-lg font-bold leading-tight text-white">
          Checklist Operativo
        </h1>
      </header>
      <ChecklistWizardWrapper operatorName={profile?.display_name || "Desconocido"} />
    </div>
  );
}
