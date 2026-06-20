"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Plus, Save, UsersRound, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { updateTeam } from "./actions";
import { useProfile } from "@/components/ui/ProfileContext";
import SecurityPinModal from "@/components/team/SecurityPinModal";
import type {
  AssistantContractType,
  BasicTaskConfig,
  Profile,
  TaskType,
} from "@/lib/domain/types";

const ASSISTANT_CONTRACT_OPTIONS = [
  { value: "full_time", label: "Full Time (Máx 44h semanales)" },
  { value: "part_time", label: "Part Time (Normal 36h semanales)" },
  { value: "supervisor", label: "Supervisor" },
];

type AseoTask = BasicTaskConfig & {
  type: TaskType;
  schedule?: Record<string, string>;
};

export default function TeamPage() {
  const { profile: contextProfile } = useProfile();
  const initialProfile = contextProfile || {
    store_code: "",
    store_name: "Mi Tienda",
    display_name: "",
    assistants: [],
    areas: [],
    basic_tasks: [],
  };

  const [profile, setProfile] = useState<Profile>(initialProfile as Profile);
  const [localMessage, setLocalMessage] = useState<string | null>(
    "Cargando perfil desde DB...",
  );
  const [isPending, startTransition] = useTransition();

  const [hasPin, setHasPin] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLocalMessage("ERROR: No hay usuario en el cliente");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) {
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
          if (error.code === "PGRST116") {
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
              basic_tasks: [],
            };
            const { data: insertedData, error: insertError } = await supabase
              .from("profiles")
              .insert(newProfile)
              .select()
              .single();
            if (insertError) {
              setLocalMessage(
                "Error de Base de Datos (Insert): " +
                  insertError.message +
                  " | " +
                  insertError.code,
              );
            } else if (insertedData) {
              setProfile(insertedData);
              setLocalMessage("Perfil recuperado exitosamente.");
            }
          } else {
            setLocalMessage(
              "Error de Base de Datos (Select): " +
                error.message +
                " | " +
                error.code,
            );
          }
        }
      } catch (err: unknown) {
        setLocalMessage(
          "ERROR CRÍTICO: " +
            (err instanceof Error ? err.message : "Error desconocido"),
        );
      }
    };
    loadProfile();
  }, []);

  const assistantNames = profile.assistants
    .map((assistant) => assistant.name.trim())
    .filter(Boolean);

  function setStoreData(
    field: "store_name" | "store_code" | "display_name",
    value: string,
  ) {
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
      nextAssistants[index] = {
        ...nextAssistants[index],
        contract_type: contract,
      };
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
      const nextAssistants = current.assistants.filter(
        (_, idx) => idx !== indexToRemove,
      );

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

  function setAseoSchedule(day: string, assignee: string) {
    setProfile((current) => {
      const basicTasks = current.basic_tasks ? [...current.basic_tasks] : [];
      const aseoIndex = basicTasks.findIndex((t) => t.id === "aseo_semanal");

      if (aseoIndex >= 0) {
        const aseoTask = { ...basicTasks[aseoIndex] } as AseoTask;
        aseoTask.schedule = { ...(aseoTask.schedule || {}), [day]: assignee };
        basicTasks[aseoIndex] = aseoTask;
      } else {
        basicTasks.push({
          id: "aseo_semanal",
          name: "Aseo (Baño, Cafetín, Aforo)",
          type: "apertura",
          deadline_time: "10:00",
          schedule: { [day]: assignee },
        } as AseoTask);
      }
      return { ...current, basic_tasks: basicTasks };
    });
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
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 lg:max-w-6xl xl:max-w-7xl">
      <div className="px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </Link>

        <div className="mt-4 rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 px-5 py-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[220px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/65">
                Operación de Tienda
              </p>
              <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
                Gestión de equipo
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/80">
                Ordena los datos base de la tienda y define responsables clave
                sin salir del flujo operativo.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              <UsersRound className="h-6 w-6 text-white" strokeWidth={2.2} />
            </div>
          </div>

          {profile.role === "supervisor" ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                Datos base y jerarquía operativa
              </div>
              <Link
                href="/team/invites"
                className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-slate-900 transition hover:bg-slate-100"
              >
                <UsersRound className="h-3.5 w-3.5" />
                Crear acceso
              </Link>
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              Vista general del equipo
            </div>
          )}
        </div>

        {localMessage && (
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-[12px] font-medium text-slate-500 shadow-sm">
            {localMessage}
          </div>
        )}
      </div>

      <form
        action={updateTeam}
        onSubmit={handleSubmit}
        className="px-4 pt-6 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-6 lg:px-6 lg:pt-8"
      >
        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:mb-0">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Base
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              Datos de la tienda
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Mantiene visible la información principal que usa el equipo en la
              operación diaria.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Nombre de la Tienda
              </span>
              <input
                name="store_name"
                value={profile.store_name}
                onChange={(e) => setStoreData("store_name", e.target.value)}
                className={`${fieldClassName} bg-slate-50 focus:border-blue-300 focus:bg-white focus:ring-blue-100`}
                placeholder="Ej. Kennedy"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Código de Tienda
              </span>
              <input
                name="store_code"
                value={profile.store_code}
                onChange={(e) => setStoreData("store_code", e.target.value)}
                className={`${fieldClassName} bg-slate-50 font-mono focus:border-blue-300 focus:bg-white focus:ring-blue-100`}
                placeholder="Ej. 402"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Nombre del Supervisor
              </span>
              <input
                name="display_name"
                value={profile.display_name}
                onChange={(e) => setStoreData("display_name", e.target.value)}
                className={`${fieldClassName} bg-slate-50 focus:border-blue-300 focus:bg-white focus:ring-blue-100`}
                placeholder="Tu nombre"
              />
            </label>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:mb-0">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Roles
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              Estructura de mando
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Define los relevos principales para que la lectura del equipo sea
              clara y rápida.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Segundo(a) Encargado(a)
              </span>
              <select
                name="second_in_charge"
                value={profile.second_in_charge}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    second_in_charge: e.target.value,
                  }))
                }
                className={`${fieldClassName} bg-white focus:border-blue-300 focus:ring-blue-100`}
              >
                <option value="">Sin asignar</option>
                {assistantNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Tercero(a) Encargado(a)
              </span>
              <select
                name="third_in_charge"
                value={profile.third_in_charge}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    third_in_charge: e.target.value,
                  }))
                }
                className={`${fieldClassName} bg-white focus:border-blue-300 focus:ring-blue-100`}
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

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:mb-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Equipo
              </p>
              <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                Asistentes
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                Organiza nombres y tipo de contrato con una lectura más clara en móvil.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              {profile.assistants.length}
            </span>
          </div>

          <div className="space-y-4">
            {profile.assistants.map((assistant, index) => (
              <div
                key={index}
                className="relative rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
              >
                {profile.role === "supervisor" && (
                  <button
                    type="button"
                    onClick={() => removeAssistant(index)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 ring-1 ring-red-100 transition hover:bg-red-50"
                    title="Eliminar asistente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                    Asistente {index + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Nombre
                    </span>
                    <input
                      name={`assistant_name_${index}`}
                      value={assistant.name}
                      onChange={(event) =>
                        setAssistantName(index, event.target.value)
                      }
                      className="min-h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      placeholder="Nombre del asistente"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
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
                      className="min-h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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

            {profile.role === "supervisor" && (
              <button
                type="button"
                onClick={addAssistant}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[22px] border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" />
                Agregar Asistente
              </button>
            )}
          </div>
          <input
            type="hidden"
            name="assistant_count"
            value={profile.assistants.length}
          />
        </section>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:mb-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Cobertura
              </p>
              <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                Áreas y Pasillos
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                Mantén ordenados los nombres de áreas para cuadrantes y seguimiento.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              {profile.areas?.length || 0}
            </span>
          </div>

          <div className="space-y-4">
            {(profile.areas || []).map((area, index) => (
              <div
                key={index}
                className="relative rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => removeArea(index)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 ring-1 ring-red-100 transition hover:bg-red-50"
                  title="Eliminar área"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                    Área {index + 1}
                  </span>
                </div>

                <label className="block pr-8">
                  <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Nombre del Área o Pasillo
                  </span>
                  <input
                    name={`area_name_${index}`}
                    value={area}
                    onChange={(event) => setAreaName(index, event.target.value)}
                    className="min-h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    placeholder="Ej. Pasillo 1"
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addArea}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[22px] border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
              Agregar Área
            </button>
          </div>
          <input
            type="hidden"
            name="area_count"
            value={profile.areas?.length || 0}
          />
        </section>

        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 shadow-sm ring-1 ring-blue-100 lg:col-span-2 lg:mb-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500">
                Cronograma semanal
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-blue-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Cronograma de Aseo Semanal
            </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              7 días
            </span>
          </div>
          <p className="mb-4 text-xs font-medium text-blue-600/80">
            Asigna la persona encargada del aseo (Baño, Cafetín, Aforo) para
            cada día de la semana.
          </p>

          <div className="space-y-2">
            {[
              "lunes",
              "martes",
              "miercoles",
              "jueves",
              "viernes",
              "sabado",
              "domingo",
            ].map((day) => {
              const aseoTask = (profile.basic_tasks || []).find(
                (t) => t.id === "aseo_semanal",
              ) as AseoTask | undefined;
              const currentAssignee = aseoTask?.schedule?.[day] || "";
              const usedByOtherDays = new Set(
                Object.entries(aseoTask?.schedule || {})
                  .filter(
                    ([scheduleDay, assignee]) =>
                      scheduleDay !== day &&
                      typeof assignee === "string" &&
                      assignee.trim(),
                  )
                  .map(([, assignee]) => assignee as string),
              );
              return (
                <div
                  key={day}
                  className="grid gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:grid-cols-[88px_1fr] sm:items-center"
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    {day}
                  </span>
                  <select
                    value={currentAssignee}
                    onChange={(e) => setAseoSchedule(day, e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {assistantNames
                      .filter((name) => name === currentAssignee || !usedByOtherDays.has(name))
                      .map((name, idx) => (
                      <option key={idx} value={name}>
                        {name}
                      </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
          {(() => {
            const aseoTask = (profile.basic_tasks || []).find(
              (t) => t.id === "aseo_semanal",
            ) as AseoTask | undefined;
            return (
              <input
                type="hidden"
                name="aseo_schedule_json"
                value={JSON.stringify(aseoTask?.schedule || {})}
              />
            );
          })()}
        </section>

        {profile.role === "supervisor" ? (
          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[15px] font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:opacity-70 lg:col-span-2"
          >
            {isPending ? (
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isPending ? "Guardando..." : "Guardar cambios base"}
          </button>
        ) : (
          <div className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[14px] font-bold text-slate-500 shadow-sm lg:col-span-2">
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
  "min-h-12 w-full rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:ring-2";

function ReadOnlyTeamView({ profile }: { profile: Profile }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 lg:max-w-6xl xl:max-w-7xl">
      <div className="mb-2 mt-6 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <div className="mt-4 rounded-[28px] bg-gradient-to-br from-[#d51b2b] via-[#e51d2e] to-[#f04452] px-5 py-5 text-white shadow-[0_18px_36px_rgba(229,29,46,0.16)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
            Centro de Control
          </p>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
            Gestión de Tienda
          </h1>
          <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-white/82">
            Información de la tienda y tu equipo (Solo lectura)
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:px-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-800">
            Datos de la Tienda
          </h2>
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Nombre de la Tienda
              </span>
              <p className="mt-1 text-[15px] font-black text-slate-900">{profile.store_name}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Código de Tienda
              </span>
              <p className="mt-1 text-[15px] font-black text-slate-900">{profile.store_code}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Nombre del Supervisor
              </span>
              <p className="mt-1 text-[15px] font-black text-slate-900">
                {profile.supervisor_name || profile.display_name}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-800">
            Estructura de Mando
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Segundo(a) Encargado(a)
              </span>
              <p className="mt-1 text-[15px] font-black text-slate-900">
                {profile.second_in_charge || "Sin asignar"}
              </p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Tercero(a) Encargado(a)
              </span>
              <p className="mt-1 text-[15px] font-black text-slate-900">
                {profile.third_in_charge || "Sin asignar"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
              Asistentes
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              {profile.assistants?.length || 0}
            </span>
          </div>

          <div className="space-y-2">
            {(profile.assistants || []).map((assistant, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span className="text-[15px] font-bold text-slate-800">
                  {assistant.name || "Sin nombre"}
                </span>
                <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                  {assistant.contract_type === "full_time"
                    ? "Full Time"
                    : assistant.contract_type === "part_time"
                      ? "Part Time"
                      : assistant.contract_type}
                </span>
              </div>
            ))}
            {(profile.assistants || []).length === 0 && (
              <p className="py-2 text-center text-sm italic text-slate-500">
                No hay asistentes registrados
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
              Áreas y Pasillos
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              {profile.areas?.length || 0}
            </span>
          </div>

          <div className="space-y-2">
            {(profile.areas || []).map((area, index) => (
              <div
                key={index}
                className="rounded-2xl bg-slate-50 p-4 text-[15px] font-bold text-slate-800 ring-1 ring-slate-200"
              >
                {area || "Área sin nombre"}
              </div>
            ))}
            {(profile.areas || []).length === 0 && (
              <p className="py-2 text-center text-sm italic text-slate-500">
                No hay áreas registradas
              </p>
            )}
          </div>
        </section>

        <div className="flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl bg-slate-100 px-5 py-4 text-[14px] font-bold text-slate-600 ring-1 ring-slate-200 lg:col-span-2">
          Solo el supervisor puede editar la plantilla
        </div>
      </div>
    </div>
  );
}
