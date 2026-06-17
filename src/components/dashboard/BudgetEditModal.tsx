"use client";

import { useState } from "react";
import { updateStoreBudget } from "@/app/actions/budget";
import { Edit2, Loader2, X } from "lucide-react";

interface Props {
  storeCode: string;
  currentBudget: number;
  currentAccumulated: number;
}

export default function BudgetEditModal({ storeCode, currentBudget, currentAccumulated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [budget, setBudget] = useState(currentBudget.toString());
  const [accumulated, setAccumulated] = useState(currentAccumulated.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const budgetNum = parseFloat(budget) || 0;
      const accumNum = parseFloat(accumulated) || 0;
      await updateStoreBudget(storeCode, budgetNum, accumNum);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium active:scale-95 transition-transform"
      >
        <Edit2 className="w-3 h-3" />
        Actualizar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Actualizar Presupuesto</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Presupuesto del Mes ($)</label>
                <input
                  type="number"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej: 30000000"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Venta Acumulada a la Fecha ($)</label>
                <input
                  type="number"
                  required
                  value={accumulated}
                  onChange={(e) => setAccumulated(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej: 15000000"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
