import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import ChecklistWizardWrapper from "./ChecklistWizardWrapper";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

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
    .select("display_name, store_code")
    .eq("user_id", user.id)
    .single();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: todayAudits } = await adminClient
    .from("audits")
    .select("*")
    .eq("store_code", profile?.store_code)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false });

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <header className="bg-[#0a3875] px-4 py-4 shadow-sm flex items-center gap-3">
        <h1 className="text-lg font-bold leading-tight text-white">
          Checklist Operativo
        </h1>
      </header>
      <ChecklistWizardWrapper operatorName={profile?.display_name || "Desconocido"} />

      {todayAudits && todayAudits.length > 0 && (
        <section className="px-4 py-6 mt-4 border-t border-slate-200">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Rutinas Completadas Hoy</h2>
          <div className="space-y-3">
            {todayAudits.map(audit => (
              <div key={audit.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 capitalize">{audit.audit_type}</h3>
                  <p className="text-[11px] text-slate-500">
                    Realizado por: <span className="font-semibold text-slate-700">{audit.operator_name || audit.operator}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {format(new Date(audit.created_at), "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
