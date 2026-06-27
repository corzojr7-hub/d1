"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitHandover } from "./actions";
import { useRouter } from "next/navigation";
import AppSelect from "@/components/dashboard/AppSelect";

export default function ClientHandover({ supervisors }: { supervisors: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photo) {
      toast.error("Debes tomar una foto de la bodega.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("photo", photo);

    startTransition(async () => {
      try {
        await submitHandover(formData);
        toast.success("Entrega de turno registrada con éxito.");
        router.push("/");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al registrar la entrega.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 py-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)] lg:rounded-[36px] lg:px-7 lg:py-7">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Relevo operativo
            </p>
            <h1 className="text-lg font-black leading-tight text-white">
              Entrega de Turno
            </h1>
            <p className="text-[10px] text-white/90">
              Registro fotográfico de bodega
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-0 py-4 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6 lg:space-y-0 lg:py-6"
      >
        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-800">¿Quiénes realizan el cambio?</h2>

          <div className="space-y-4 lg:space-y-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Entrega el turno
              </label>
              <AppSelect
                label="Entrega el turno"
                name="handed_by"
                required
                buttonClassName="rounded-xl px-3 py-2.5 text-sm font-medium shadow-none"
                options={[
                  { value: "", label: "Selecciona quién entrega" },
                  ...supervisors.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Recibe el turno
              </label>
              <AppSelect
                label="Recibe el turno"
                name="received_by"
                required
                buttonClassName="rounded-xl px-3 py-2.5 text-sm font-medium shadow-none"
                options={[
                  { value: "", label: "Selecciona quién recibe" },
                  ...supervisors.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-800">Estado de la Bodega</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${photoPreview ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"}`}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Camera className="h-8 w-8" />
                <span className="text-xs font-semibold">Tomar foto de la bodega</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoChange}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Observaciones (Opcional)
            </label>
            <textarea
              name="observations"
              rows={3}
              placeholder="Ej. Falta organizar pasillo 3, basura sin sacar..."
              className="w-full resize-none rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70 lg:mx-auto lg:max-w-md"
          >
            {isPending ? (
              <>
                <UploadCloud className="h-5 w-5 animate-pulse" />
                Subiendo registro...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Confirmar Entrega
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
