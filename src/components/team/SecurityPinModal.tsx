"use client";

import { useState } from "react";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { checkSecurityPin, setSecurityPin } from "@/app/actions/security";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isFirstTime?: boolean; // If true, we prompt to CREATE a PIN instead of verifying
}

export default function SecurityPinModal({ isOpen, onClose, onSuccess, isFirstTime = false }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error("El PIN debe tener 4 dígitos");
      return;
    }

    setLoading(true);
    try {
      if (isFirstTime) {
        const res = await setSecurityPin(pin);
        if (res.success) {
          toast.success("PIN de seguridad establecido correctamente");
          onSuccess();
        } else {
          toast.error(res.error || "Error al establecer el PIN");
        }
      } else {
        const res = await checkSecurityPin(pin);
        if (res.success) {
          onSuccess();
        } else {
          toast.error(res.error || "PIN incorrecto");
          setPin(""); // reset on fail
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-[#e51d2e]">
            {isFirstTime ? <ShieldCheck className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>
          
          <h3 className="text-xl font-extrabold text-slate-800">
            {isFirstTime ? "Crea tu PIN de Seguridad" : "Verificación de Seguridad"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {isFirstTime 
              ? "Crea un PIN de 4 dígitos. Se te pedirá al realizar cambios importantes en la tienda."
              : "Ingresa tu PIN de 4 dígitos para autorizar esta acción."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex justify-center">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              className="h-16 w-32 rounded-2xl border-2 border-slate-200 bg-slate-50 text-center text-3xl font-black tracking-[0.5em] focus:border-[#e51d2e] focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-50 transition-all"
              placeholder="••••"
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e51d2e] text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isFirstTime ? "Guardar PIN" : "Verificar y Continuar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
