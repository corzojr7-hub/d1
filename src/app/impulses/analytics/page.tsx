import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientImpulseAnalytics from "./ClientImpulseAnalytics";

export default async function ImpulsesAnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil de la tienda.
      </div>
    );
  }

  // Fetch last 7 days of impulses
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: records } = await supabase
    .from("impulse_records")
    .select("*")
    .eq("profile_id", profile.id)
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/impulses"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">
              Análisis de Impulso
            </h1>
            <p className="text-[10px] text-white/90">
              Últimos 7 días
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <ClientImpulseAnalytics records={records || []} />
      </div>
    </div>
  );
}
