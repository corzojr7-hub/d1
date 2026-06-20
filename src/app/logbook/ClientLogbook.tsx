"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { createLogbookEntry } from "./actions";

type LogbookEntry = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

export default function ClientLogbook({ entries }: { entries: LogbookEntry[] }) {
  const [isPending, startTransition] = useTransition();

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
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#0a3875] via-[#0f4c97] to-[#2b6fc0] px-4 py-4 shadow-[0_16px_34px_rgba(10,56,117,0.18)]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Seguimiento diario
            </p>
            <h1 className="flex items-center gap-2 text-lg font-black leading-tight text-white">
              Bitácora Diaria
            </h1>
            <p className="text-[10px] text-white/90">
              Novedades e incidencias de la tienda
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
        >
          <textarea
            name="content"
            required
            rows={2}
            className="flex-1 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            placeholder="Escribe una novedad..."
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a3875] text-white self-end transition hover:bg-[#072a59] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="space-y-4">
          {entries && entries.length > 0 ? (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="relative rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="absolute -left-2 top-6 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-slate-50" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">{entry.author}</span>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString('es-CO', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-16 text-center shadow-sm">
              <BookOpen className="h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-500">
                Aún no hay novedades registradas hoy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
