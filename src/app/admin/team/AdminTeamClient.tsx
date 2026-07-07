"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Edit3, ShieldAlert, Store, Trash2, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { Profile, StoreAssistant } from "@/lib/domain/types";
import { deleteStoreProfile, updateStoreInfo } from "../actions";

export default function AdminTeamClient({ stores }: { stores: Profile[] }) {
  const [selectedStore, setSelectedStore] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(store: Profile) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tienda y toda su información?")) {
      return;
    }

    const formData = new FormData();
    formData.set("profile_id", store.id);

    startTransition(async () => {
      const result = await deleteStoreProfile(formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tienda desactivada.");
    });
  }

  return (
    <>
      <div className="mt-6 space-y-6">
        {stores.map((storeProfile) => {
          const secondInCharge = storeProfile.second_in_charge || "Sin asignar";
          const thirdInCharge = storeProfile.third_in_charge || "Sin asignar";
          const assistants = (storeProfile.assistants as StoreAssistant[]) || [];

          return (
            <div
              key={storeProfile.id}
              className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6"
            >
              <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#fff1f2] p-3 text-[#e51d2e]">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {storeProfile.store_name}
                    </h2>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Tienda {storeProfile.store_code}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStore(storeProfile)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    title="Editar tienda"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(storeProfile)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    title="Eliminar tienda"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Mando operativo
                  </h3>
                  <div className="space-y-2">
                    <PersonRow
                      icon={<ShieldAlert className="h-5 w-5 text-[#e51d2e]" />}
                      name={storeProfile.display_name}
                      role="Supervisor"
                      accent
                    />
                    <PersonRow
                      icon={<User className="h-5 w-5 text-slate-400" />}
                      name={secondInCharge}
                      role="Segundo(a) Encargado(a)"
                    />
                    <PersonRow
                      icon={<User className="h-5 w-5 text-slate-400" />}
                      name={thirdInCharge}
                      role="Tercero(a) Encargado(a)"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Equipo de tienda</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {assistants.length}
                    </span>
                  </h3>

                  {assistants.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                      Aún no hay asistentes en esta tienda
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assistants.map((assistant, idx) => (
                        <PersonRow
                          key={`${assistant.name}-${idx}`}
                          icon={<Users className="h-4 w-4 text-emerald-500" />}
                          name={assistant.name}
                          role={
                            assistant.contract_type === "full_time"
                              ? "Full Time"
                              : assistant.contract_type === "part_time"
                                ? "Part Time"
                                : "Supervisor"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {stores.length === 0 && (
          <div className="rounded-[30px] border border-slate-100 bg-white py-12 text-center text-slate-500">
            No hay equipos registrados todavía.
          </div>
        )}
      </div>

      {selectedStore ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e51d2e]">
                  Editar tienda
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {selectedStore.store_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                const result = await updateStoreInfo(formData);
                if ("error" in result && result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Tienda actualizada.");
                setSelectedStore(null);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="profile_id" value={selectedStore.id} />
              <Field label="Nombre de tienda" name="store_name" defaultValue={selectedStore.store_name} />
              <Field label="Codigo de tienda" name="store_code" defaultValue={selectedStore.store_code} />
              <Field label="Supervisor" name="display_name" defaultValue={selectedStore.display_name} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-11 flex-1 rounded-full bg-[#e51d2e] px-4 text-sm font-bold text-white"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PersonRow({
  icon,
  name,
  role,
  accent,
}: {
  icon: ReactNode;
  name: string;
  role: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 ${
        accent ? "border-[#e51d2e]/15 bg-[#fff1f2]" : "border-slate-200 bg-slate-50/80"
      }`}
    >
      {icon}
      <div>
        <p className="text-sm font-bold text-slate-950">{name}</p>
        <p className={`text-[10px] font-bold uppercase ${accent ? "text-[#b91c1c]" : "text-slate-500"}`}>
          {role}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#e51d2e] focus:bg-white"
      />
    </label>
  );
}
