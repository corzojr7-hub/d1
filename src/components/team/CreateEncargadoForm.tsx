"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppSelect from "@/components/dashboard/AppSelect";
import { createEncargado } from "@/app/team/actions";
import SecurityPinModal from "./SecurityPinModal";

export default function CreateEncargadoForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const res = await createEncargado(formData);
      if (res.error) {
        toast.error(res.error);
        return { error: res.error };
      }
      toast.success("Encargado creado correctamente");
      return { success: true };
    },
    null,
  );

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (state?.success) {
      const form = document.getElementById("create-encargado-form") as HTMLFormElement | null;
      form?.reset();
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
    <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-slate-50 px-4 py-3">
        <UserPlus className="h-5 w-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800">Crear Acceso para Encargado</h3>
      </div>
      <div className="p-4">
        <p className="mb-4 text-sm text-slate-600">
          Crea un usuario (correo y contraseña) para que el Segundo(a) o Tercero(a) pueda iniciar sesión en su turno.
          Se le pedirá que cambie la contraseña al entrar por primera vez.
        </p>

        <form id="create-encargado-form" onSubmit={handleInitialSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Rol</label>
              <AppSelect
                name="role"
                required
                options={[
                  { value: "segundo_al_mando", label: "Segundo(a) Encargado(a)" },
                  { value: "tercero_al_mando", label: "Tercero(a) Encargado(a)" },
                ]}
                buttonClassName="h-10 rounded-lg py-2 text-sm shadow-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Nombre Completo</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Karen Palacios"
                className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                required
                placeholder="Ej. karen@tienda.com"
                className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Contraseña Inicial</label>
              <input
                type="text"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
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
        isFirstTime={false}
      />
    </div>
  );
}
