"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { submitDailyAudit } from "./actions";
import { get, set } from "idb-keyval";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { compressImage } from "@/lib/image-compression";

type Step = {
  id: string;
  title: string;
  question: string;
  requiresPhoto?: boolean;
};

type OfflineAuditPayload = {
  idempotency_key: string;
  auditType: "apertura" | "cierre";
  operator: string;
  answers: string;
  photo_base64: string | null;
  timestamp: number;
};

const STEPS: Step[] = [
  { id: "exterior", title: "Exterior y Vidrios", question: "¿Los vidrios están limpios y no hay basura o reguero en la entrada?" },
  { id: "neveras", title: "Neveras y Congeladores", question: "¿Las temperaturas están en rango y el surtido es óptimo?" },
  { id: "fruver", title: "Saneo de Fruver", question: "¿Se retiró el producto dañado (saneo) y la exhibición está llena?" },
  { id: "puntas", title: "Punteras de Extraordinario", question: "¿Están las punteras frenteadas y con los precios correctos?" },
  { id: "bodega", title: "Estado de la Bodega", question: "¿La bodega está limpia y ordenada?", requiresPhoto: true },
  { id: "aforo", title: "Cuarto de Aforo (Averías)", question: "¿El cuarto de aforo está limpio y los productos dentro de las canastas?" },
  { id: "cafetin", title: "Cafetín", question: "¿El cafetín está limpio y organizado?" },
  { id: "bano", title: "Baño", question: "¿El baño está limpio y aseado?" },
];

export default function ChecklistWizard({ auditType, operator }: { auditType: "apertura" | "cierre"; operator: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleAnswer = (val: boolean) => {
    setAnswers({ ...answers, [step.id]: val });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressImage(file);
        setPhotos({ ...photos, [step.id]: compressed });
      } catch {
        setPhotos({ ...photos, [step.id]: file });
      }
    }
  };

  const handleNext = () => {
    if (answers[step.id] === undefined) {
      toast.error("Debes responder la pregunta para continuar.");
      return;
    }
    if (step.requiresPhoto && !photos[step.id]) {
      toast.error("Esta tarea crítica requiere una foto de evidencia.");
      return;
    }
    if (isLastStep) {
      submitChecklist();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const submitChecklist = async () => {
    if (!navigator.onLine) {
      let photoBase64 = null;
      if (Object.keys(photos).length > 0) {
        photoBase64 = "Múltiples fotos no soportadas offline temporalmente";
      }

      const payload = {
        idempotency_key: crypto.randomUUID(),
        auditType,
        operator,
        answers: JSON.stringify(answers),
        photo_base64: photoBase64,
        timestamp: Date.now()
      };

      const queue =
        ((await get("auditsOfflineQueue")) as OfflineAuditPayload[] | undefined) || [];
      queue.push(payload);
      await set("auditsOfflineQueue", queue);

      toast.success("Sin conexión: Checklist guardado localmente.");
      router.push("/audits");
      return;
    }

    const formData = new FormData();
    formData.append("auditType", auditType);
    formData.append("operator", operator);
    formData.append("answers", JSON.stringify(answers));
    Object.entries(photos).forEach(([key, file]) => {
      formData.append(`photo_${key}`, file);
    });

    startTransition(async () => {
      try {
        const res = await submitDailyAudit(formData);
        if (res.success) {
          toast.success("Checklist guardado correctamente");
          router.push("/audits");
        } else {
          toast.error(res.error || "Error al guardar");
        }
      } catch (err: unknown) {
        if (isRedirectError(err)) {
          throw err;
        }
        toast.error("Ocurrió un error inesperado al enviar");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-0 py-4 lg:py-6">
      {/* Progress Bar */}
      <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm lg:px-5">
        <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
          <span>Paso {currentStep + 1} de {STEPS.length}</span>
          <span className="uppercase text-[#0a3875]">{auditType}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-[#0a4aa8] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-7">
        <h2 className="mb-2 text-xl font-black text-slate-950">{step.title}</h2>
        <p className="mb-6 text-pretty font-medium text-slate-600">{step.question}</p>

        {/* Binary Answer */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => handleAnswer(true)}
            className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 transition-all ${
              answers[step.id] === true 
                ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <CheckCircle2 className="h-8 w-8" />
            <span className="font-bold">Sí, cumple</span>
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 transition-all ${
              answers[step.id] === false 
                ? "border-red-500 bg-red-50 text-red-700" 
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <XCircle className="h-8 w-8" />
            <span className="font-bold">No cumple</span>
          </button>
        </div>

        {/* Photo Evidence (if required) */}
        {step.requiresPhoto && (
          <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-800">Evidencia Fotográfica obligatoria</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 ${
                photos[step.id] ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-600"
              }`}
            >
              <Camera className="h-6 w-6" />
              <span className="font-bold text-sm">{photos[step.id] ? "Foto capturada (Tocar para cambiar)" : "Tomar Foto"}</span>
            </button>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handlePhotoCapture} 
            />
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0a4aa8] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#083a85] disabled:opacity-50"
        >
          {isPending ? "Guardando..." : isLastStep ? "Finalizar Checklist" : "Siguiente"}
          {!isLastStep && !isPending && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
