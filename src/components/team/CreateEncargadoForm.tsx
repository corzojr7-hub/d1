"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { createEncargado } from "@/app/team/actions";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SecurityPinModal from "./SecurityPinModal";

export default function CreateEncargadoForm() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const res = await createEncargado(formData);
    if (res.error) {
      toast.error(res.error);
      return { error: res.error };
    }
    toast.success("Encargado creado correctamente");
    return { success: true };
  }, null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (state?.success) {
      const form = document.getElementById("create-encargado-form") as HTMLFormElement;
      if (form) form.reset();
    }
  }, [state]);

  const handleInitialSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPendingFormData(new FormData(e.currentTarget));
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    if (pendingFormData) {
      startTransition(() => {
        formAction(pendingFormData);
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-zinc-200 px-4 py-3 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800">Crear Acceso para Encargado</h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-slate-600 mb-4">
          Crea un usuario (correo y contrasea) para que la Segunda o Tercera pueda iniciar sesion en su turno.
          Se le pedira que cambie la contrasea al entrar por primera vez.
        </p>

        <form id="create-encargado-form" onSubmit={handleInitialSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Rol</label>
              <select name="role" required className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm bg-white">
                <option value="segundo">Segunda(o) Encargada(o)</option>
                <option value="tercero">Tercera(o) Encargada(o)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
              <input type="text" name="name" required placeholder="Ej. Karen Palacios" className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Correo Electronico</label>
              <input type="email" name="email" required placeholder="Ej. karen@tienda.com" className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Contrasea Inicial</label>
              <input type="text" name="password" required placeholder="Mnimo 6 caracteres" minLength={6} className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            {isPending ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      </div>

      <SecurityPinModal 
        isOpen={showPinModal} 
        onClose={() => setShowPinModal(false)} 
        onSuccess={handlePinSuccess} 
        isFirstTime={false} // Assume PIN is already created by TeamPage
      />
    </div>
  );
}
