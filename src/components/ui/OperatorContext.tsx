"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const OperatorContext = createContext<{
  operator: string;
  setOperator: (op: string) => void;
  profile: any | null;
}>({ operator: "", setOperator: () => {}, profile: null });

export function OperatorProvider({ children, initialProfile, initialOperator }: { children: React.ReactNode, initialProfile?: any, initialOperator?: string | null }) {
  const [operator, setOperatorState] = useState(initialOperator || initialProfile?.display_name || "");
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!initialOperator && initialProfile?.display_name && typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("active_operator");
      if (saved) {
        setOperatorState(saved);
      } else {
        sessionStorage.setItem("active_operator", initialProfile.display_name);
        setOperatorState(initialProfile.display_name);
      }
    }
  }, [initialProfile, initialOperator]);

  const handleSetOperator = (op: string) => {
    // Si es el supervisor, segundo o tercero (no tienen PIN en este esquema simplificado),
    // o si el perfil no requiere PIN.
    const isSupervisor = op === initialProfile?.display_name || op === initialProfile?.second_in_charge || op === initialProfile?.third_in_charge;
    const requiredPin = initialProfile?.operator_pins?.[op];

    if (!isSupervisor && requiredPin) {
      setPendingOperator(op);
      setPinError("");
      return;
    }

    setOperatorState(op);
    sessionStorage.setItem("active_operator", op);
  };

  const submitPin = (pin: string) => {
    if (pendingOperator && initialProfile?.operator_pins?.[pendingOperator] === pin) {
      setOperatorState(pendingOperator);
      sessionStorage.setItem("active_operator", pendingOperator);
      setPendingOperator(null);
    } else {
      setPinError("PIN incorrecto");
    }
  };

  return (
    <OperatorContext.Provider value={{ operator, setOperator: handleSetOperator, profile: initialProfile || null }}>
      {children}
      {pendingOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800">Verificar Identidad</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ingresa el PIN para operar como <strong className="text-slate-800">{pendingOperator}</strong>
            </p>
            <div className="mt-6">
              <input 
                type="password" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                maxLength={4}
                className="w-full text-center text-3xl font-bold tracking-[0.5em] h-16 rounded-2xl bg-slate-50 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e51d2e]"
                autoFocus
                onChange={(e) => {
                  if(e.target.value.length === 4) {
                    submitPin(e.target.value);
                  }
                }}
              />
              {pinError && <p className="mt-2 text-center text-sm font-bold text-red-500">{pinError}</p>}
            </div>
            <button 
              onClick={() => setPendingOperator(null)}
              className="mt-6 w-full rounded-full py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </OperatorContext.Provider>
  );
}

export const useOperator = () => useContext(OperatorContext);
