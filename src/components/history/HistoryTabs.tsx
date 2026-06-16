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
    <div className="flex w-full rounded-full bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleClick(tab.key)}
          className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-all ${
            active === tab.key
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
