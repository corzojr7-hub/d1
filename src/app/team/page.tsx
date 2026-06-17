"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { Plus, Save, UsersRound, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { updateTeam } from "./actions";
import { useProfile } from "@/components/ui/ProfileContext";
import CreateEncargadoForm from "@/components/team/CreateEncargadoForm";
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

  function addBasicTask() {
    setProfile((current) => ({
      ...current,
      basic_tasks: [
        ...(current.basic_tasks || []),
        { id: generateId(), name: "", type: "apertura", deadline_time: "08:00" },
      ],
    }));
  }

  function removeBasicTask(indexToRemove: number) {
    setProfile((current) => ({
      ...current,
      basic_tasks: (current.basic_tasks || []).filter((_, idx) => idx !== indexToRemove),
    }));
  }

  function updateBasicTask(index: number, field: keyof BasicTaskConfig, value: string) {
    setProfile((current) => {
      const nextTasks = [...(current.basic_tasks || [])];
      nextTasks[index] = { ...nextTasks[index], [field]: value };
      return { ...current, basic_tasks: nextTasks };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      updateTeam(formData);
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-28">
      {/* Header Estilo 1:1 */}
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight text-white">
                Gestión de Tienda
              </h1>
              <p className="text-[10px] text-white/90">
                Edita la información de la tienda y tu equipo
              </p>
            </div>
          </div>
          {profile.role === "supervisor" && (
            <Link
              href="/team/invites"
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#e51d2e] transition-colors hover:bg-red-50"
            >
              <UsersRound className="h-3 w-3" />
              Crear Acceso
            </Link>
          )}
        </div>
      </header>

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

        {/* Básicos Operativos */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">
              Básicos Operativos
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
              {profile.basic_tasks?.length || 0}
            </span>
          </div>

          <div className="space-y-4">
            {(profile.basic_tasks || []).map((task, index) => (
              <div
                key={task.id}
                className="relative rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                {profile.role === 'supervisor' && (
                  <button
                    type="button"
                    onClick={() => removeBasicTask(index)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                    title="Eliminar básico"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                
                <div className="mb-3 text-[10px] font-bold uppercase text-slate-400">
                  Básico {index + 1}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 pr-8">
                  <div className="sm:col-span-6">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                        Nombre del básico
                      </span>
                      <input
                        name={`task_name_${index}`}
                        value={task.name}
                        onChange={(e) => updateBasicTask(index, "name", e.target.value)}
                        className={fieldClassName}
                        placeholder="Ej. Pisos limpios"
                      />
                    </label>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                        Tipo
                      </span>
                      <select
                        name={`task_type_${index}`}
                        value={task.type}
                        onChange={(e) => updateBasicTask(index, "type", e.target.value as TaskType)}
                        className={fieldClassName}
                      >
                        <option value="apertura">Apertura</option>
                        <option value="cierre">Cierre</option>
                      </select>
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                        Hora Límite
                      </span>
                      <input
                        type="time"
                        name={`task_deadline_${index}`}
                        value={task.deadline_time}
                        onChange={(e) => updateBasicTask(index, "deadline_time", e.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                  </div>
                </div>
                <input type="hidden" name={`task_id_${index}`} value={task.id} />
              </div>
            ))}

            {profile.role === 'supervisor' && (
              <button
                type="button"
                onClick={addBasicTask}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-sm font-bold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Agregar Básico
              </button>
            )}
          </div>
          <input type="hidden" name="basic_task_count" value={profile.basic_tasks?.length || 0} />
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
    </div>
  );
}

const fieldClassName =
  "min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500";
