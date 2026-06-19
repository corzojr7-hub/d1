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
    <div className="mx-auto w-full max-w-md p-6 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <h2 className="text-xl font-black text-slate-800 mb-2">Selecciona la Rutina</h2>
      <p className="text-sm font-medium text-slate-500 mb-8">
        ¿Qué checklist vas a diligenciar en este momento?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setAuditType("apertura")}
          className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all"
        >
          <div className="bg-amber-100 p-4 rounded-full text-amber-600">
            <Sun className="h-8 w-8" />
          </div>
          <span className="font-bold text-slate-800">Apertura</span>
        </button>

        <button
          onClick={() => setAuditType("cierre")}
          className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all"
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
