import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Store, Users, User, ShieldAlert } from "lucide-react";
import { StoreAssistant } from "@/lib/domain/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const supervisorProfiles = allProfiles?.filter(p => p.role === "supervisor") || [];
  
  return (
    <div className="mx-auto max-w-4xl p-4 pt-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e51d2e]">Equipos por Tienda</h1>
        <p className="text-sm text-slate-500 mt-1">Directorio global de talento, rotación y encargados.</p>
      </div>

      <div className="space-y-6">
        {supervisorProfiles.map(storeProfile => {
          const secondInCharge = storeProfile.second_in_charge || "Sin asignar";
          const thirdInCharge = storeProfile.third_in_charge || "Sin asignar";
          const assistants = (storeProfile.assistants as unknown as StoreAssistant[]) || [];
          
          return (
            <div key={storeProfile.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{storeProfile.store_name}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                    Tienda {storeProfile.store_code}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Estructura de Mando</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <ShieldAlert className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{storeProfile.display_name}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-600">Supervisor(a)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">{secondInCharge}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-500">Segundo(a) Encargado(a)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">{thirdInCharge}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-500">Tercero(a) Encargado(a)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex justify-between items-center">
                    <span>Plantilla de Asistentes</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px]">{assistants.length}</span>
                  </h3>
                  
                  {assistants.length === 0 ? (
                    <div className="text-xs text-slate-400 p-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Sin asistentes registrados en esta tienda
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assistants.map((assistant: StoreAssistant, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                          <Users className="w-4 h-4 text-emerald-500" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{assistant.name}</p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              {assistant.contract_type === 'full_time' ? 'Full Time (44h)' : assistant.contract_type === 'part_time' ? 'Part Time (36h)' : 'Supervisor'}
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
          <div className="text-center py-10 text-slate-500 bg-white rounded-3xl border border-slate-100">
            No hay equipos registrados todavía.
          </div>
        )}
      </div>
    </div>
  );
}