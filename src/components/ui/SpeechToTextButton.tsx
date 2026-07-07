"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

type SpeechTarget = HTMLInputElement | HTMLTextAreaElement;

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [resultIndex: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function appendTranscript(target: SpeechTarget, transcript: string) {
  const cleanedTranscript = transcript.trim();

  if (!cleanedTranscript) {
    return;
  }

  const currentValue = target.value.trim();
  target.value = currentValue ? `${currentValue} ${cleanedTranscript}` : cleanedTranscript;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
}

export default function SpeechToTextButton({
  targetRef,
  label = "Dictar texto",
}: {
  targetRef: RefObject<SpeechTarget | null>;
  label?: string;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const isSupported = Boolean(getRecognitionConstructor());

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function handleClick() {
    const Recognition = getRecognitionConstructor();
    const target = targetRef.current;

    if (!Recognition || !target) {
      toast.error("El dictado por voz no esta disponible en este dispositivo.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, resultIndex) => {
          const result = event.results[resultIndex];
          return Array.from({ length: result.length })
            .map((__, transcriptIndex) => result[transcriptIndex].transcript)
            .join(" ");
        })
        .join(" ");

      appendTranscript(target, transcript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      toast.error(
        event.error === "not-allowed"
          ? "Debes permitir el microfono para usar el dictado."
          : "No se pudo capturar el audio. Intenta de nuevo.",
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isListening}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        isListening
          ? "border-[#e51d2e]/20 bg-[#fff1f2] text-[#c41525]"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {isListening ? "Detener microfono" : label}
    </button>
  );
}
