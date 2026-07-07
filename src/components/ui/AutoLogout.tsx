"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export function AutoLogout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let warningId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      setShowWarning(false);

      warningId = setTimeout(() => {
        setShowWarning(true);
      }, TIMEOUT_MS - 60000); // Mostrar advertencia 1 minuto antes

      timeoutId = setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }, TIMEOUT_MS);
    };

    // Listeners para actividad
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => document.addEventListener(event, resetTimer));

    // Iniciar temporizador
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [router]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 p-4 text-white shadow-xl ring-1 ring-black/10">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">
          <p>⚠️ Tu sesión está a punto de expirar por inactividad.</p>
          <p className="text-xs text-red-200">Toca la pantalla para mantenerla activa.</p>
        </div>
      </div>
    </div>
  );
}
