"use client";

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

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("posAssistant", value);
    params.set("posDate", posDate);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="block flex-1">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Ver colaborador
      </span>
      <select
        value={selectedAssistant}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0a3875] focus:bg-white"
      >
        <option value="__team__">Equipo general</option>
        {assistantOptions.map((assistant) => (
          <option key={assistant} value={assistant}>
            {assistant}
          </option>
        ))}
      </select>
    </label>
  );
}
