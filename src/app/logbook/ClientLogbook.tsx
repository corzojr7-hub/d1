"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { createLogbookEntry } from "./actions";
import SpeechToTextButton from "@/components/ui/SpeechToTextButton";

type LogbookEntry = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

export default function ClientLogbook({ entries }: { entries: LogbookEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      try {
        await createLogbookEntry(formData);
        toast.success("Novedad registrada con éxito.");
        form.reset();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al registrar la novedad.");
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
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
              Operación diaria
            </p>
            <h1 className="flex items-center gap-2 text-lg font-black leading-tight text-slate-900">
              Registro del día
            </h1>
            <p className="text-[10px] text-slate-500">
              Lo que ocurrió durante el turno queda aquí
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 px-0 py-4 lg:grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-6 lg:py-6">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-28 lg:flex-col lg:gap-4 lg:self-start lg:p-6"
        >
          <div className="flex justify-end">
            <SpeechToTextButton targetRef={contentRef} label="Microfono" />
          </div>
          <textarea
            ref={contentRef}
            name="content"
            required
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 lg:min-h-[180px] lg:px-4 lg:py-3"
            placeholder="Escribe una novedad..."
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 w-full shrink-0 items-center justify-center gap-2 self-end rounded-full bg-[#e51d2e] px-5 text-white transition hover:bg-[#c91528] disabled:opacity-50 lg:min-w-[180px]"
            >
              <Send className="h-4 w-4" />
              <span className="text-sm font-semibold">Registrar novedad</span>
            </button>
          </div>
        </form>

        <div className="grid gap-4 xl:grid-cols-2">
          {entries && entries.length > 0 ? (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="relative rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm lg:p-5"
              >
                <div className="absolute -left-2 top-6 h-2 w-2 rounded-full bg-rose-500 ring-4 ring-slate-50" />
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-xs font-bold text-slate-800">{entry.author}</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString("es-CO", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.content}</p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-16 text-center shadow-sm">
              <BookOpen className="mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-500">
                Aún no hay registro de lo ocurrido hoy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
