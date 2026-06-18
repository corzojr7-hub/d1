import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: basics } = await adminClient
    .from("daily_basics")
    .select("*")
    .eq("store_code", profile.store_code)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/audits"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">
              Analíticas de Básicos
            </h1>
            <p className="text-[10px] text-white/90">
              Últimos 30 días
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <AnalyticsClient basics={basics || []} />
      </div>
    </div>
  );
}
