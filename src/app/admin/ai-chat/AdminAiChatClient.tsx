"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Que tienda tuvo la venta mas baja ayer?",
  "Cual tienda trae mas alertas FEFO en 7 dias?",
  "Donde hubo mas merma critica esta semana?",
  "Que tiendas tienen mas instrucciones abiertas?",
] as const;

export default function AdminAiChatClient({ storeCount }: { storeCount: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Puedo leer ventas, mermas criticas, FEFO preventivo e instrucciones abiertas para responder como apoyo del JDZ.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();

  function sendQuestion(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmedQuestion }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudo consultar el asistente.");
        }

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.answer || "No encontre una respuesta util para esa pregunta.",
          },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo consultar el asistente.");
      }
    });
  }

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Asistente JDZ
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Preguntale a tus tiendas</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Consulta ventas, merma, FEFO e instrucciones de {storeCount} tiendas activas sin salir del backoffice.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al admin
          </Link>
        </div>
      </header>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Preguntas utiles
          </p>
          <div className="mt-4 space-y-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => sendQuestion(item)}
                className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                <MessageSquare className="h-4 w-4 text-[#e51d2e]" />
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-[24px] px-4 py-3 ${
                  message.role === "assistant"
                    ? "border border-slate-200 bg-slate-50"
                    : "bg-[#fff1f2] text-slate-900"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : null}
                  {message.role === "assistant" ? "Asistente" : "JDZ"}
                </div>
                <p className="text-sm leading-6 text-slate-700">{message.content}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendQuestion(question);
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              placeholder="Ej. Que tienda tuvo la venta mas baja ayer?"
              className="min-h-[88px] flex-1 resize-none rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#e51d2e]/20"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e51d2e] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#c41525] disabled:opacity-60 sm:self-end"
            >
              <Send className="h-4 w-4" />
              {isPending ? "Consultando..." : "Enviar"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
