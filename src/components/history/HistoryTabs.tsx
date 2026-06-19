"use client";

import { useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { key: "instructions", label: "Instrucciones" },
  { key: "waste", label: "Merma" },
];

export default function HistoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") || "instructions";

  function handleClick(key: string) {
    router.push(`/history?tab=${key}`);
  }

  return (
    <div className="grid w-full grid-cols-2 rounded-[22px] bg-white p-1.5 shadow-sm ring-1 ring-slate-200 lg:mx-auto lg:max-w-2xl">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleClick(tab.key)}
          className={`rounded-[18px] py-2.5 text-center text-sm font-bold transition-all ${
            active === tab.key
              ? "bg-[#e51d2e] text-white shadow-[0_10px_22px_rgba(229,29,46,0.18)]"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
