import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Profile, StoreAssistant } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import AdminTeamClient from "./AdminTeamClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "supervisor")
    .eq("status", "activo")
    .neq("store_code", "ADMIN-CENTRAL")
    .order("store_name", { ascending: true });

  const supervisorProfiles = (allProfiles || []) as Profile[];
  const totalAssistants = supervisorProfiles.reduce((sum, storeProfile) => {
    const assistants = (storeProfile.assistants as StoreAssistant[]) || [];
    return sum + assistants.length;
  }, 0);

  return (
    <div className="mx-auto min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 pb-24 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="rounded-[34px] border border-slate-200/80 bg-white p-5 text-slate-900 shadow-sm lg:p-7">
        <div className="mb-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-[#e51d2e] via-[#ef4444] to-[#f59e0b]" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al panel
            </Link>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.32em] text-[#e51d2e]">
              Directorio maestro
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 lg:text-[2.2rem]">
              Equipos por tienda
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Directorio global de talento, rotacion y estructura operativa por tienda.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Tiendas
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {supervisorProfiles.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#e51d2e]/15 bg-[#fff1f2] px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#b91c1c]">
                Asistentes
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">{totalAssistants}</p>
            </div>
          </div>
        </div>
      </div>

      <AdminTeamClient stores={supervisorProfiles} />
    </div>
  );
}
