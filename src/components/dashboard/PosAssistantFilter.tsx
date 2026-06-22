"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = {
  assistantOptions: string[];
  selectedAssistant: string;
  posDate: string;
};

export default function PosAssistantFilter({
  assistantOptions,
  selectedAssistant,
  posDate,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (nextAssistant: string, nextDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("posAssistant", nextAssistant);
    params.set("posDate", nextDate);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Ver colaborador
        </span>
        <select
          value={selectedAssistant}
          onChange={(event) => updateFilters(event.target.value, posDate)}
          disabled={isPending}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white disabled:cursor-wait disabled:opacity-70"
        >
          <option value="__team__">Equipo general</option>
          {assistantOptions.map((assistant) => (
            <option key={assistant} value={assistant}>
              {assistant}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Fecha de consulta
        </span>
        <input
          type="date"
          value={posDate}
          onChange={(event) => updateFilters(selectedAssistant, event.target.value)}
          disabled={isPending}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white disabled:cursor-wait disabled:opacity-70"
        />
      </label>
    </div>
  );
}
