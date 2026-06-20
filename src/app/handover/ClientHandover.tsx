"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitHandover } from "./actions";
import { useRouter } from "next/navigation";

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
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 py-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)]">
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

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">¿Quiénes realizan el cambio?</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Entrega el turno
              </label>
              <select
                name="handed_by"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Selecciona quién entrega</option>
                {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Recibe el turno
              </label>
              <select
                name="received_by"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Selecciona quién recibe</option>
                {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Estado de la Bodega</h2>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors overflow-hidden ${photoPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Camera className="w-8 h-8" />
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Observaciones (Opcional)
            </label>
            <textarea
              name="observations"
              rows={3}
              placeholder="Ej. Falta organizar pasillo 3, basura sin sacar..."
              className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <UploadCloud className="w-5 h-5 animate-pulse" />
              Subiendo registro...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirmar Entrega
            </>
          )}
        </button>
      </form>
    </div>
  );
}
