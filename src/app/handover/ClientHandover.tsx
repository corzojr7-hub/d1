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
      <header className="sticky top-0 z-40 rounded-b-[28px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm lg:rounded-[32px] lg:px-7 lg:py-6">
        <div className="flex items-start gap-3 lg:items-center">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Cierre de turno
            </p>
            <h1 className="text-lg font-black leading-tight text-white">
              Entrega de Turno
            </h1>
            <p className="text-[10px] text-white/90">
              Relevo y pendientes del d?a
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-0 py-4 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6 lg:space-y-0 lg:py-6"
      >
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
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
                buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium shadow-sm"
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
                buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium shadow-sm"
                options={[
                  { value: "", label: "Selecciona quién recibe" },
                  ...supervisors.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-800">Cierre del turno</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${photoPreview ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Camera className="h-8 w-8" />
                <span className="text-xs font-semibold">Tomar foto del cierre</span>
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
              Pendientes del relevo (opcional)
            </label>
            <textarea
              name="observations"
              rows={3}
              placeholder="Ej. Falta organizar pasillo 3, basura sin sacar..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e51d2e] py-3.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-70 lg:mx-auto lg:max-w-md"
          >
            {isPending ? (
              <>
                <UploadCloud className="h-5 w-5 animate-pulse" />
                Cerrando turno...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Cerrar turno
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
