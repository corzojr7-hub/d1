"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { Plus, Save, UsersRound, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { updateTeam } from "./actions";
import { useProfile } from "@/components/ui/ProfileContext";
import CreateEncargadoForm from "@/components/team/CreateEncargadoForm";
import SecurityPinModal from "@/components/team/SecurityPinModal";
import type { AssistantContractType, Profile, BasicTaskConfig, TaskType } from "@/lib/domain/types";

const ASSISTANT_CONTRACT_OPTIONS = [
  { value: "full_time", label: "Full Time (Máx 44h semanales)" },
  { value: "part_time", label: "Part Time (Normal 36h semanales)" },
  { value: "supervisor", label: "Supervisor" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function TeamPage() {
  const { profile: contextProfile } = useProfile();
  const initialProfile = contextProfile || {
    store_code: "",
    store_name: "Mi Tienda",
    display_name: "",
    assistants: [],
    areas: [],
    basic_tasks: []
  };
  
  const [profile, setProfile] = useState<Profile>(initialProfile as Profile);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [hasPin, setHasPin] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    setLocalMessage("Cargando perfil desde DB...");
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLocalMessage("ERROR: No hay usuario en el cliente");
          return;
        }
        
        const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        if (data) {
          // Asegurar que properties de arreglos no vengan nulas
          const profileData = {
            ...data,
            assistants: data.assistants || [],
            areas: data.areas || [],
            basic_tasks: data.basic_tasks || [],
          };
          setProfile(profileData as Profile);
          setLocalMessage("ÉXITO: " + data.store_name);
          if (!data.security_pin) {
            setHasPin(false);
            setShowPinModal(true);
          }
        } else if (error) {
          if (error.code === 'PGRST116') {
            // PGRST116 significa que no encontro filas. Lo reparamos creando el perfil ahora.
            const newProfile = {
              user_id: user.id,
              role: "supervisor",
              full_name: user.user_metadata?.display_name || "Supervisor",
              display_name: user.user_metadata?.display_name || "Supervisor",
              email: user.email || "",
              status: "activo",
              store_name: user.user_metadata?.store_name || "Mi tienda",
              store_code: user.user_metadata?.store_code || "",
              second_in_charge: "",
              third_in_charge: "",
              assistant_count: 0,
              assistants: [],
              areas: [],
              basic_tasks: []
            };
            const { data: insertedData, error: insertError } = await supabase.from('profiles').insert(newProfile).select().single();
            if (insertError) {
              setLocalMessage("Error de Base de Datos (Insert): " + insertError.message + " | " + insertError.code);
            } else if (insertedData) {
              setProfile(insertedData);
              setLocalMessage("Perfil recuperado exitosamente.");
            }
          } else {
            setLocalMessage("Error de Base de Datos (Select): " + error.message + " | " + error.code);
          }
        }
      } catch (err: any) {
        setLocalMessage("ERROR CRÍTICO: " + err.message);
      }
    };
    loadProfile();
  }, []);

  const assistantNames = profile.assistants
    .map((assistant) => assistant.name.trim())
    .filter(Boolean);

  function setStoreData(field: "store_name" | "store_code" | "display_name", value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function setAssistantName(index: number, name: string) {
    setProfile((current) => {
      const nextAssistants = [...current.assistants];
      nextAssistants[index] = { ...nextAssistants[index], name };
      return { ...current, assistants: nextAssistants };
    });
  }

  function setAssistantContract(index: number, contract: AssistantContractType) {
    setProfile((current) => {
      const nextAssistants = [...current.assistants];
      nextAssistants[index] = { ...nextAssistants[index], contract_type: contract };
      return { ...current, assistants: nextAssistants };
    });
  }

  function addAssistant() {
    setProfile((current) => ({
      ...current,
      assistant_count: current.assistant_count + 1,
      assistants: [
        ...current.assistants,
        { name: "", contract_type: "full_time" as AssistantContractType },
      ],
    }));
  }

  function removeAssistant(indexToRemove: number) {
    setProfile((current) => {
      const nextAssistants = current.assistants.filter((_, idx) => idx !== indexToRemove);
      
      // Check if the removed assistant was second or third in charge
      let nextSecond = current.second_in_charge;
      let nextThird = current.third_in_charge;
      const removedName = current.assistants[indexToRemove].name.trim();
      
      if (removedName && nextSecond === removedName) nextSecond = "";
      if (removedName && nextThird === removedName) nextThird = "";

      return {
        ...current,
        assistant_count: nextAssistants.length,
        assistants: nextAssistants,
        second_in_charge: nextSecond,
        third_in_charge: nextThird,
      };
    });
  }

  function setAreaName(index: number, name: string) {
    setProfile((current) => {
      const nextAreas = [...current.areas];
      nextAreas[index] = name;
      return { ...current, areas: nextAreas };
    });
  }

  function addArea() {
    setProfile((current) => ({
      ...current,
      areas: [...current.areas, ""],
    }));
  }

  function removeArea(indexToRemove: number) {
    setProfile((current) => ({
      ...current,
      areas: current.areas.filter((_, idx) => idx !== indexToRemove),
    }));
  }



  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingFormData(new FormData(event.currentTarget));
    setShowPinModal(true);
  }

  function handlePinSuccess() {
    setShowPinModal(false);
    if (!hasPin) setHasPin(true);
    if (pendingFormData) {
      startTransition(() => {
        updateTeam(pendingFormData);
      });
    }
  }
  if (contextProfile && contextProfile.role !== "supervisor") {
    return <ReadOnlyTeamView profile={contextProfile as Profile} />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-28">
      <div className="mb-2 mt-6 px-4">
        <Link
          href="/"
          className="text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          Volver al inicio
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-blue-700">
              Gestión de Tienda
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Edita la información de la tienda y tu equipo
            </p>
          </div>
          {profile.role === "supervisor" && (
            <Link
              href="/team/invites"
              className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <UsersRound className="h-3 w-3" />
              Crear Acceso
            </Link>
          )}
        </div>
      </div>

      <div className="p-4">
        {contextProfile?.role === "supervisor" && <CreateEncargadoForm />}
      </div>

      <form
        action={updateTeam}
        onSubmit={handleSubmit}
        className="p-4 pt-0"
      >
        {/* Datos de Tienda */}
        <section className="mb-6 rounded-3xl bg-slate-50/50 p-5 shadow-sm ring-1 ring-slate-200/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Datos de la Tienda
            </h2>
          </div>
          <div className="space-y-4 opacity-80">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Nombre de la Tienda
              </span>
              <input
                name="store_name"
                value={profile.store_name}
                onChange={(e) => setStoreData("store_name", e.target.value)}
                className={fieldClassName}
                placeholder="Ej. Kennedy"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Código de Tienda
              </span>
              <input
                name="store_code"
                value={profile.store_code}
                onChange={(e) => setStoreData("store_code", e.target.value)}
                className={fieldClassName}
                placeholder="Ej. 402"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Nombre del Supervisor
              </span>
              <input
                name="display_name"
                value={profile.display_name}
                onChange={(e) => setStoreData("display_name", e.target.value)}
                className={fieldClassName}
                placeholder="Tu nombre"
              />
            </label>
          </div>
        </section>

        {/* Encargadas */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-sm font-extrabold tracking-wide text-slate-800 uppercase">
            Estructura de Mando
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Segunda encargada
              </span>
              <select
                name="second_in_charge"
                value={profile.second_in_charge}
                onChange={(e) => setProfile(p => ({ ...p, second_in_charge: e.target.value }))}
                className={fieldClassName}
              >
                <option value="">Sin asignar</option>
                {assistantNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Tercero encargado
              </span>
              <select
                name="third_in_charge"
                value={profile.third_in_charge}
                onChange={(e) => setProfile(p => ({ ...p, third_in_charge: e.target.value }))}
                className={fieldClassName}
              >
                <option value="">Sin asignar</option>
                {assistantNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Asistentes */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Asistentes
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
              {profile.assistants.length}
            </span>
          </div>

          <div className="space-y-4">
            {profile.assistants.map((assistant, index) => (
              <div
                key={index}
                className="relative rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                {profile.role === 'supervisor' && (
                  <button
                    type="button"
                    onClick={() => removeAssistant(index)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                    title="Eliminar asistente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                
                <div className="mb-3 text-[10px] font-bold uppercase text-slate-400">
                  Asistente {index + 1}
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                      Nombre
                    </span>
                    <input
                      name={`assistant_name_${index}`}
                      value={assistant.name}
                      onChange={(event) =>
                        setAssistantName(index, event.target.value)
                      }
                      className={fieldClassName}
                      placeholder="Nombre del asistente"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                      Contrato
                    </span>
                    <select
                      name={`assistant_contract_${index}`}
                      value={assistant.contract_type}
                      onChange={(event) =>
                        setAssistantContract(
                          index,
                          event.target.value as AssistantContractType,
                        )
                      }
                      className={fieldClassName}
                    >
                      {ASSISTANT_CONTRACT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            {profile.role === 'supervisor' && (
              <button
                type="button"
                onClick={addAssistant}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-sm font-bold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Agregar Asistente
              </button>
            )}
          </div>
          <input type="hidden" name="assistant_count" value={profile.assistants.length} />
        </section>

        {/* Áreas y Cuadrantes */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Áreas y Pasillos
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
              {profile.areas?.length || 0}
            </span>
          </div>

          <div className="space-y-4">
            {(profile.areas || []).map((area, index) => (
              <div
                key={index}
                className="relative rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  onClick={() => removeArea(index)}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                  title="Eliminar área"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                
                <label className="block pr-8">
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Nombre del Área o Pasillo
                  </span>
                  <input
                    name={`area_name_${index}`}
                    value={area}
                    onChange={(event) =>
                      setAreaName(index, event.target.value)
                    }
                    className={fieldClassName}
                    placeholder="Ej. Pasillo 1"
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addArea}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-sm font-bold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
              Agregar Área
            </button>
          </div>
          <input type="hidden" name="area_count" value={profile.areas?.length || 0} />
        </section>



        {profile.role === 'supervisor' ? (
          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-[15px] font-bold text-white shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-70 transition-all"
          >
            {isPending ? (
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </button>
        ) : (
          <div className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-[14px] font-bold text-slate-500">
            Solo el supervisor puede editar la plantilla
          </div>
        )}
      </form>
      <SecurityPinModal 
        isOpen={showPinModal} 
        onClose={() => {
          if (!hasPin) {
            alert("Debes crear un PIN por seguridad para continuar.");
            return;
          }
          setShowPinModal(false);
        }} 
        onSuccess={handlePinSuccess} 
        isFirstTime={!hasPin}
      />
    </div>
  );
}

const fieldClassName =
  "min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500";

function ReadOnlyTeamView({ profile }: { profile: Profile }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-28">
      <div className="mb-2 mt-6 px-4">
        <Link
          href="/"
          className="text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          Volver al inicio
        </Link>
        <div className="mt-4 flex flex-col">
          <h1 className="text-2xl font-bold text-blue-700">
            Gestión de Tienda
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Información de la tienda y tu equipo (Solo lectura)
          </p>
        </div>
      </div>

      <div className="p-4">
        {/* Datos de Tienda */}
        <section className="mb-6 rounded-3xl bg-slate-50/50 p-5 shadow-sm ring-1 ring-slate-200/60">
          <h2 className="mb-4 text-sm font-extrabold tracking-wide text-slate-800 uppercase">
            Datos de la Tienda
          </h2>
          <div className="space-y-4">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nombre de la Tienda</span>
              <p className="mt-1 font-bold text-slate-800">{profile.store_name}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Código de Tienda</span>
              <p className="mt-1 font-bold text-slate-800">{profile.store_code}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nombre del Supervisor</span>
              <p className="mt-1 font-bold text-slate-800">{profile.supervisor_name || profile.display_name}</p>
            </div>
          </div>
        </section>

        {/* Encargadas */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-sm font-extrabold tracking-wide text-slate-800 uppercase">
            Estructura de Mando
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Segunda encargada</span>
              <p className="mt-1 font-bold text-slate-800">{profile.second_in_charge || "Sin asignar"}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tercero encargado</span>
              <p className="mt-1 font-bold text-slate-800">{profile.third_in_charge || "Sin asignar"}</p>
            </div>
          </div>
        </section>

        {/* Asistentes */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Asistentes
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
              {profile.assistants?.length || 0}
            </span>
          </div>

          <div className="space-y-2">
            {(profile.assistants || []).map((assistant, index) => (
              <div key={index} className="flex justify-between items-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <span className="font-bold text-slate-700">{assistant.name || "Sin nombre"}</span>
                <span className="rounded-lg bg-slate-200/60 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  {assistant.contract_type === "full_time" ? "Full Time" : assistant.contract_type === "part_time" ? "Part Time" : assistant.contract_type}
                </span>
              </div>
            ))}
            {(profile.assistants || []).length === 0 && (
              <p className="text-sm text-slate-500 italic text-center py-2">No hay asistentes registrados</p>
            )}
          </div>
        </section>

        {/* Áreas y Cuadrantes */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Áreas y Pasillos
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
              {profile.areas?.length || 0}
            </span>
          </div>

          <div className="space-y-2">
            {(profile.areas || []).map((area, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <span className="font-bold text-slate-700">{area || "Área sin nombre"}</span>
              </div>
            ))}
            {(profile.areas || []).length === 0 && (
              <p className="text-sm text-slate-500 italic text-center py-2">No hay áreas registradas</p>
            )}
          </div>
        </section>

        <div className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-[14px] font-bold text-slate-500">
          Solo el supervisor puede editar la plantilla
        </div>
      </div>
    </div>
  );
}
