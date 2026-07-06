"use client";

import { useState } from "react";
import ChecklistWizard from "./ChecklistWizard";
import { Sun, Moon } from "lucide-react";

export default function ChecklistWizardWrapper({ operatorName }: { operatorName: string }) {
  const [auditType, setAuditType] = useState<"apertura" | "cierre" | null>(null);

  if (auditType) {
    return <ChecklistWizard auditType={auditType} operator={operatorName} />;
  }

  return (
    <div className="mx-auto w-full max-w-md px-0 py-6 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="mb-4 h-1.5 w-20 rounded-full bg-[#0a4aa8]" />
      <h2 className="mb-2 text-xl font-black text-slate-950">Selecciona la rutina</h2>
      <p className="mb-8 text-sm font-medium text-slate-500">
        ¿Qué checklist vas a diligenciar en este momento?
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <button
          onClick={() => setAuditType("apertura")}
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:border-[#0a4aa8]/40 hover:ring-2 hover:ring-[#0a4aa8]/20"
        >
          <div className="bg-amber-100 p-4 rounded-full text-amber-600">
            <Sun className="h-8 w-8" />
          </div>
          <span className="font-bold text-slate-800">Apertura</span>
        </button>

        <button
          onClick={() => setAuditType("cierre")}
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:border-[#0a4aa8]/40 hover:ring-2 hover:ring-[#0a4aa8]/20"
        >
          <div className="bg-indigo-100 p-4 rounded-full text-indigo-600">
            <Moon className="h-8 w-8" />
          </div>
          <span className="font-bold text-slate-800">Cierre</span>
        </button>
      </div>
    </div>
  );
}
