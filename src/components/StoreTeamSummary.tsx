"use client";

import Link from "next/link";
import { UsersRound } from "lucide-react";
import { useProfile } from '@/components/ui/ProfileContext';
import type { StoreAssistant } from "@/lib/domain/types";

function getContractLabel(contractType: string): string {
  if (contractType === "part_time") return "PT";
  if (contractType === "supervisor") return "Sup";
  return "FT";
}

export default function StoreTeamSummary() {
  const { profile } = useProfile();

  if (!profile) return null;

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-gradient-to-r from-red-50 to-white px-5 py-4 border-b border-red-100/50 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-600">
            Equipo de tienda
          </p>
          <h2 className="mt-1 text-[17px] font-extrabold leading-tight text-slate-900">
            {profile.store_name}
            {profile.store_code ? <span className="text-slate-400 font-semibold ml-1">#{profile.store_code}</span> : null}
          </h2>
        </div>
        <Link
          href="/team"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm ring-1 ring-red-100 transition-all active:scale-95"
          title="Editar equipo"
        >
          <UsersRound className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-3 text-xs">
          <TeamLine label="Supervisor" value={profile.supervisor_name || profile.display_name} />
          <TeamLine label="Segundo(a) Encargado(a)" value={profile.second_in_charge} />
          <TeamLine label="Tercero(a) Encargado(a)" value={profile.third_in_charge} />
        </div>

        {profile.assistants.length > 0 ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-100"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Asistentes ({profile.assistants.length})
              </p>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="flex flex-col gap-2.5">
              {profile.assistants.map((assistant: StoreAssistant, index: number) => (
                <div
                  key={`${assistant.name}-${index}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-bold text-slate-700">{assistant.name}</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {getContractLabel(assistant.contract_type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TeamLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}
