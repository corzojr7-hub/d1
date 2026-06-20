"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckSquare,
  Copy,
  FileText,
  Loader2,
  MessageSquareWarning,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/components/ui/ProfileContext";
import { createFeedback, rewriteFeedbackWhatsappMessage } from "../actions";
import {
  ACTA_TEMPLATES,
  buildActaReason,
  type ActaTemplateKey,
} from "../actaTemplates";

type FeedbackType = "retroalimentacion" | "llamado_atencion" | "acta_compromiso";
type StoredFeedbackType = "retroalimentacion" | "llamado_atencion";
type AssistantTone = "suave" | "directo" | "formal";
type AssistantDraft = {
  whatsapp_message: string;
  reason: string;
  description: string;
  commitment: string;
};

export default function NewFeedbackPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const assistants =
    profile?.assistants
      ?.map((assistant) => assistant?.name?.toUpperCase())
      .filter((name): name is string => Boolean(name)) || [];
  const recipientOptions = ["TODO EL EQUIPO", ...assistants];

  const [isPending, startTransition] = useTransition();
  const [isAssistantPending, startAssistantTransition] = useTransition();
  const [rawMessage, setRawMessage] = useState("");
  const [assistantTone, setAssistantTone] = useState<AssistantTone>("directo");
  const [assistantDraft, setAssistantDraft] = useState<AssistantDraft | null>(null);
  const [formData, setFormData] = useState({
    directed_to: "",
    type: "retroalimentacion" as FeedbackType,
    acta_template: "" as ActaTemplateKey | "",
    reason: "",
    description: "",
    commitment: "",
  });
  const isActaType = formData.type === "acta_compromiso";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isActaType && !formData.acta_template) {
      toast.error("Selecciona el tipo de acta de compromiso");
      return;
    }

    if (!formData.directed_to || !formData.reason || !formData.description || !formData.commitment) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    startTransition(async () => {
      try {
        const storedType: StoredFeedbackType =
          isActaType ? "llamado_atencion" : (formData.type as StoredFeedbackType);
        const actaReason = isActaType ? buildActaReason(formData.acta_template as ActaTemplateKey) : formData.reason;

        await createFeedback({
          directed_to: formData.directed_to,
          type: storedType,
          reason: actaReason,
          description: formData.description,
          commitment: formData.commitment,
        });
        toast.success("Registro guardado exitosamente");
        router.push("/instructions/feedback");
      } catch {
        toast.error("Ocurrio un error al guardar");
      }
    });
  }

  function handleGenerateMessage() {
    if (!formData.directed_to) {
      toast.error("Selecciona primero para quien es el mensaje");
      return;
    }

    if (rawMessage.trim().length < 8) {
      toast.error("Escribe un poco mas de contexto para mejorar el mensaje");
      return;
    }

    startAssistantTransition(async () => {
      try {
        const result = await rewriteFeedbackWhatsappMessage({
          directedTo: formData.directed_to,
          type: formData.type === "acta_compromiso" ? "llamado_atencion" : formData.type,
          rawMessage,
          tone: assistantTone,
        });
        setAssistantDraft(result);
        toast.success("Mensaje listo para revisar");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo generar el mensaje");
      }
    });
  }

  function handleUseDraft() {
    if (!assistantDraft) return;

    setFormData((current) => ({
      ...current,
      reason: assistantDraft.reason,
      description: assistantDraft.description,
      commitment: assistantDraft.commitment,
    }));
    toast.success("Mensaje aplicado al registro");
  }

  function handleActaTemplateChange(value: string) {
    const nextTemplate = ACTA_TEMPLATES.find((item) => item.key === value);
    setFormData((current) => ({
      ...current,
      acta_template: value as ActaTemplateKey,
      reason: nextTemplate ? buildActaReason(nextTemplate.key) : current.reason,
      description: nextTemplate ? nextTemplate.responsibility : current.description,
      commitment: nextTemplate ? nextTemplate.commitment : current.commitment,
    }));
  }

  async function handleCopyDraft() {
    if (!assistantDraft) return;

    try {
      await navigator.clipboard.writeText(assistantDraft.whatsapp_message);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar el mensaje");
    }
  }

  const inputBase =
    "w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-base ring-1 ring-slate-200 transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const toneOptions: Array<{ value: AssistantTone; label: string }> = [
    { value: "suave", label: "Suave" },
    { value: "directo", label: "Directo" },
    { value: "formal", label: "Formal" },
  ];

  return (
    <div className="mx-auto max-w-md px-4 py-8 lg:max-w-3xl lg:px-6 xl:max-w-4xl">
      <Link
        href="/instructions/feedback"
        className="text-xs text-zinc-400 underline-offset-2 hover:underline"
      >
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-slate-800">Nuevo Registro</h1>
      <p className="mt-1 text-sm text-slate-500">
        Documenta retroalimentaciones, llamados de atencion o actas de compromiso
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm"
      >
        <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                Asistente de WhatsApp
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Convierte una idea en un mensaje claro
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Escribe la situacion como te salga y la IA te devuelve un mensaje humano,
                firme y listo para enviar por WhatsApp.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <MessageSquareWarning className="h-4 w-4 text-slate-400" /> Borrador libre
              </span>
              <textarea
                placeholder="Ej. ayer te vi dejando el pasillo solo, contestando mal y sin cerrar la tarea..."
                rows={5}
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                className={`${inputBase} resize-none bg-white`}
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">Tono del mensaje</p>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map((tone) => {
                  const isActive = assistantTone === tone.value;
                  return (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setAssistantTone(tone.value)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {tone.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateMessage}
              disabled={isAssistantPending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAssistantPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAssistantPending ? "Redactando..." : "Mejorar mensaje con IA"}
            </button>
          </div>

          {assistantDraft && (
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Vista previa
              </p>
              <h3 className="mt-1 text-base font-black text-slate-900">
                Mensaje listo para WhatsApp
              </h3>

              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-[15px] leading-7 text-slate-700">
                {assistantDraft.whatsapp_message}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleUseDraft}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
                >
                  Usar este mensaje
                </button>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Copy className="h-4 w-4" />
                  Copiar mensaje
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <User className="h-4 w-4 text-slate-400" /> Para quien
          </span>
          <select
            value={formData.directed_to}
            onChange={(e) => setFormData((current) => ({ ...current, directed_to: e.target.value }))}
            className={inputBase}
          >
            <option value="">Selecciona al destinatario...</option>
            {recipientOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <MessageSquareWarning className="h-4 w-4 text-slate-400" /> Tipo
          </span>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((current) => ({
                ...current,
                type: e.target.value as FeedbackType,
                acta_template: e.target.value === "acta_compromiso" ? current.acta_template : "",
              }))
            }
            className={`${inputBase} ${
              formData.type === "llamado_atencion" || formData.type === "acta_compromiso"
                ? "bg-red-50 font-bold text-red-700 ring-red-200"
                : "bg-amber-50 font-bold text-amber-700 ring-amber-200"
            }`}
          >
            <option value="retroalimentacion">Retroalimentacion</option>
            <option value="llamado_atencion">Llamado de atencion</option>
            <option value="acta_compromiso">Acta de compromiso</option>
          </select>
        </label>

        {isActaType && (
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <FileText className="h-4 w-4 text-slate-400" /> Tipo de acta
            </span>
            <select
              value={formData.acta_template}
              onChange={(e) => handleActaTemplateChange(e.target.value)}
              className={`${inputBase} bg-white font-semibold text-slate-700`}
            >
              <option value="">Selecciona el formato...</option>
              {ACTA_TEMPLATES.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.subtitle}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" /> Motivo
          </span>
          <input
            type="text"
            placeholder="Ej. Llegadas tarde, error en inventario..."
            value={isActaType ? formData.reason.replace(/^\[ACTA:[^\]]+\]\s*/, "") : formData.reason}
            onChange={(e) => setFormData((current) => ({ ...current, reason: e.target.value }))}
            className={inputBase}
            readOnly={isActaType}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" /> Descripcion detallada
          </span>
          <textarea
            placeholder="Explica que paso exactamente..."
            rows={4}
            value={formData.description}
            onChange={(e) =>
              setFormData((current) => ({ ...current, description: e.target.value }))
            }
            className={`${inputBase} resize-none`}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckSquare className="h-4 w-4 text-slate-400" /> Compromiso
          </span>
          <textarea
            placeholder="Que accion de mejora se espera desde ahora?"
            rows={3}
            value={formData.commitment}
            onChange={(e) =>
              setFormData((current) => ({ ...current, commitment: e.target.value }))
            }
            className={`${inputBase} resize-none`}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-base font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {isPending ? "Guardando..." : "Guardar Registro"}
        </button>
      </form>
    </div>
  );
}
