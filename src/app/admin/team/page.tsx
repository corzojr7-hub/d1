import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert, Store, User, Users } from "lucide-react";
import { StoreAssistant } from "@/lib/domain/types";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

  const adminSupabase = await createAdminClient();

  const { data: allProfiles } = await adminSupabase
    .from("profiles")
    .select("*")
    .order("store_name", { ascending: true });

  const supervisorProfiles =
    allProfiles?.filter((item) => item.role === "supervisor") || [];

  const totalAssistants = supervisorProfiles.reduce((sum, storeProfile) => {
    const assistants =
      (storeProfile.assistants as unknown as StoreAssistant[]) || [];

    return sum + assistants.length;
  }, 0);

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="rounded-[34px] bg-gradient-to-br from-[#e51d2e] via-[#d91d2f] to-[#f35b66] p-5 text-white shadow-[0_28px_80px_-40px_rgba(229,29,46,0.65)] lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a admin
            </Link>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.32em] text-white/70">
              Directorio maestro
            </p>
            <h1 className="mt-2 text-2xl font-black lg:text-[2.2rem]">
              Equipos por Tienda
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Directorio global de talento, rotación y estructura operativa por
              tienda.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
            <div className="rounded-[24px] bg-white/14 px-4 py-3 ring-1 ring-white/14 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                Tiendas
              </p>
              <p className="mt-1 text-2xl font-black">
                {supervisorProfiles.length}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/14 px-4 py-3 ring-1 ring-white/14 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                Asistentes
              </p>
              <p className="mt-1 text-2xl font-black">{totalAssistants}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {supervisorProfiles.map((storeProfile) => {
          const secondInCharge =
            storeProfile.second_in_charge || "Sin asignar";
          const thirdInCharge =
            storeProfile.third_in_charge || "Sin asignar";
          const assistants =
            (storeProfile.assistants as unknown as StoreAssistant[]) || [];

          return (
            <div
              key={storeProfile.id}
              className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm lg:p-7"
            >
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {storeProfile.store_name}
                  </h2>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    Tienda {storeProfile.store_code}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Estructura de Mando
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <ShieldAlert className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {storeProfile.display_name}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-blue-600">
                          Supervisor(a)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                      <User className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          {secondInCharge}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Segundo(a) Encargado(a)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                      <User className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          {thirdInCharge}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Tercero(a) Encargado(a)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Plantilla de Asistentes</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {assistants.length}
                    </span>
                  </h3>

                  {assistants.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                      Sin asistentes registrados en esta tienda
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assistants.map((assistant: StoreAssistant, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                        >
                          <Users className="h-4 w-4 text-emerald-500" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">
                              {assistant.name}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              {assistant.contract_type === "full_time"
                                ? "Full Time"
                                : assistant.contract_type === "part_time"
                                  ? "Part Time"
                                  : "Supervisor"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {supervisorProfiles.length === 0 && (
          <div className="rounded-[30px] border border-slate-100 bg-white py-12 text-center text-slate-500">
            No hay equipos registrados todavía.
          </div>
        )}
      </div>
    </div>
  );
}
