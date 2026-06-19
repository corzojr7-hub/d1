"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { useProfile } from "./ProfileContext";

export default function TopBar() {
  const { profile: contextProfile } = useProfile();
  const [todayMessage, setTodayMessage] = useState("");

  useEffect(() => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const alertas = [
      "Atención al cliente y revisión de abandonados",
      "Día de limpieza de polvo y fechas (FEFO)",
      "Día de actualizar precios y limpiar acrílicos",
      "Día de limpieza de parales y rotación interna",
      "Día de raspar piso, chicles y revisar exhibiciones",
      "Día de facing milimétrico y remover basuras ocultas",
      "Mantenimiento visual ligero de fin de semana"
    ];

    const today = new Date().getDay();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayMessage(`✨ Hoy es ${dias[today]} ✨ Enfoque de pasillo: ${alertas[today]}`);
  }, []);

  // Fallback default profile si no carga
  const profile = contextProfile || { store_code: "", store_name: "Tiendas D1", role: "user", display_name: "" };
  const storeLine = profile.store_code
    ? `${profile.store_name} ${profile.store_code}`
    : profile.store_name;

  return (
    <header className="relative z-40 border-b border-black/5 bg-[#e51d2e] shadow-[0_8px_24px_rgba(136,19,29,0.18)]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-extrabold text-[#e51d2e] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 active:scale-95">
            D1
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[150px] truncate text-[15px] font-extrabold leading-tight tracking-tight text-white sm:max-w-none">
              {profile.store_name || "Tiendas D1"}
            </span>
            <span className="max-w-[170px] truncate text-[11px] font-medium text-white/88 sm:max-w-none">
              Control de Operaciones - {storeLine}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] backdrop-blur-md">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <UserRound className="h-3.5 w-3.5 text-[#e51d2e]" />
              </div>
              <span className="max-w-[120px] truncate text-[11px] font-bold text-white">
                {profile.display_name || "Supervisor"}
              </span>
            </div>
          </div>

          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-full bg-amber-300 px-3 py-1.5 text-[11px] font-extrabold text-amber-950 transition-colors hover:bg-amber-200"
            >
              Admin Central
            </Link>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition-colors hover:bg-white/20 hover:text-white"
              title="Cerrar sesion"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {todayMessage && (
        <div className="relative flex items-center overflow-hidden border-t border-white/10 bg-[#c41525] py-1.5 shadow-inner">
          <div className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-[#c41525] to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[#c41525] to-transparent" />
          <div className="animate-marquee whitespace-nowrap text-[11px] font-semibold tracking-[0.02em] text-white/92">
            <span className="mx-8">{todayMessage}</span>
            <span className="mx-8 opacity-50">•</span>
            <span className="mx-8">{todayMessage}</span>
            <span className="mx-8 opacity-50">•</span>
            <span className="mx-8">{todayMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
}
