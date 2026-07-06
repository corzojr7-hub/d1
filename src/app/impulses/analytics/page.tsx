import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, TrendingUp, BarChart3 } from "lucide-react";
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
      <div className="mt-10 p-4 text-center text-slate-500">
        No se encontró el perfil de la tienda.
      </div>
    );
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: records } = await supabase
    .from("impulse_records")
    .select("*")
    .eq("profile_id", profile.id)
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="sticky top-0 z-40 rounded-b-[32px] border border-rose-200/70 bg-white/95 px-4 py-4 shadow-sm backdrop-blur lg:rounded-[36px] lg:px-7 lg:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/impulses"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-1 flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
              Impulso comercial
            </p>
            <h1 className="text-lg font-black leading-tight text-slate-900">
              Analítica semanal
            </h1>
            <p className="text-[10px] text-white/90">
              Lectura rápida del comportamiento de los últimos 7 días.
            </p>
          </div>
          <div className="hidden rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 sm:inline-flex">
            7 días
          </div>
        </div>
      </header>

      <div className="space-y-6 px-0 py-4 lg:py-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                Resumen comercial
              </p>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-rose-500" />
                <h2 className="text-lg font-black text-slate-900">
                  Seguimiento de impulso
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Aquí queda concentrada la foto general de impulso por persona y
                por tipo de campaña, sin tener que entrar al registro uno por uno.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-600">
                  Periodo
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  Últimos 7 días
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Agrupación
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  Equipo y tipo
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Panel analítico
            </h3>
          </div>
          <ClientImpulseAnalytics records={records || []} />
        </div>
      </div>
    </div>
  );
}
