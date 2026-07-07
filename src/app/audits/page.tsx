import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ChecklistsClient from "./ChecklistsClient";

export const metadata: Metadata = {
  title: "Operación Diaria - Verificación",
};

export default async function AuditsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, basic_tasks, assistants, store_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 lg:pt-8 xl:max-w-6xl xl:px-8 2xl:max-w-7xl 2xl:px-10">
        <div className="rounded-[28px] border border-red-100 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-400">
            Error de carga
          </p>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Error en la base de datos
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-4 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 lg:pt-8 xl:max-w-6xl xl:px-8 2xl:max-w-7xl 2xl:px-10">
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Sin perfil
          </p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            No se encontró el perfil de la tienda.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            Verifica la configuración del equipo o contacta a soporte.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: dailyBasics } = await supabase
    .from("daily_basics")
    .select("*")
    .eq("store_code", profile.store_code)
    .eq("date", today);

  return (
    <>
      <section className="mx-auto mb-4 w-full max-w-[1600px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
        <div className="mb-3 h-1.5 w-24 rounded-full bg-[#0a4aa8]" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0a4aa8]">
          Operación diaria
        </p>
        <h1 className="mt-1 text-lg font-black tracking-tight text-slate-950">
          Verificación del turno
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Aquí se revisa lo que quedó instruido y lo que todavía falta por cumplir.
        </p>
      </section>

      <ChecklistsClient
        initialTasks={dailyBasics || []}
        configuredBasics={profile.basic_tasks || []}
        assistants={profile.assistants || []}
        today={today}
        isSupervisor={profile.role === "supervisor" || profile.role === "admin"}
      />
    </>
  );
}
