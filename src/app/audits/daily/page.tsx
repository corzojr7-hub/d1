import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ChecklistWizardWrapper from "./ChecklistWizardWrapper";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Checklist Diario — Sistema Operativo",
};

export default async function DailyAuditPage() {
  const { profile } = await requireAuth();

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
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 pb-20 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 lg:pt-10 xl:max-w-6xl xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="mb-2">
        <a
          href="/audits"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </a>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0a3875] via-[#0a4aa8] to-[#2563eb] px-5 py-5 text-white shadow-[0_18px_36px_rgba(10,56,117,0.16)] sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Rutina guiada
            </p>
            <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
              Checklist operativo
            </h1>
            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-white/84">
              Ejecuta apertura o cierre con una vista más clara y sin perder el flujo del turno.
            </p>
          </div>
          <span className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white">
            {todayAudits?.length ?? 0} hoy
          </span>
        </div>
      </section>

      <ChecklistWizardWrapper operatorName={profile?.display_name || "Desconocido"} />

      {todayAudits && todayAudits.length > 0 && (
        <section className="mt-6 border-t border-slate-200 px-1 py-6">
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
