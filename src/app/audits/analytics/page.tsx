import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnalyticsClient from "./AnalyticsClient";

export default async function AuditsAnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, store_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil de la tienda.
      </div>
    );
  }

  // Fetch last 30 days of basics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: basics } = await supabase
    .from("daily_basics")
    .select("*")
    .eq("store_code", profile.store_code)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 pb-28 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 lg:pt-10 xl:max-w-6xl xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="mb-2">
        <Link
          href="/audits"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-5 py-5 text-white shadow-[0_18px_36px_rgba(229,29,46,0.18)] sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Lectura operativa
            </p>
            <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
              Analíticas de básicos
            </h1>
            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-white/84">
              Revisa el comportamiento de los últimos 30 días sin salir del módulo diario.
            </p>
          </div>
          <span className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white">
            Últimos 30 días
          </span>
        </div>
      </section>

      <div className="pt-6">
        <AnalyticsClient basics={basics || []} />
      </div>
    </div>
  );
}
