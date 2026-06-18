"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { createLogbookEntry } from "./actions";

export default function ClientLogbook({ entries }: { entries: any[] }) {
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
      } catch (err: any) {
        toast.error(err.message || "Error al registrar la novedad.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#0a3875] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white flex items-center gap-2">
              Bitácora Diaria
            </h1>
            <p className="text-[10px] text-white/90">
              Novedades e incidencias de la tienda
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex gap-2">
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
              <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
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
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/50 px-4 py-16 text-center">
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
