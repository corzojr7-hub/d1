"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { useProfile } from "./ProfileContext";

const DAILY_MESSAGES: Record<string, string> = {
  domingo: "Revisión de productos abandonados, reintegros y validación general de precios",
  lunes: "Restaurar la tienda después de la venta del fin de semana, recuperando orden, limpieza e imagen comercial",
  martes: "Limpieza de polvo y revisión de fechas para fortalecer el control FEFO",
  miércoles: "Limpieza de porta precios y cambio de piezas dañadas o en mal estado",
  jueves: "Limpieza de góndolas y rotación de mercancía para mejorar orden y frescura",
  viernes: "Restregado de piso y retiro de chicles para cuidar la imagen de la tienda",
  sábado: "Organización de exhibiciones adicionales para reforzar la presentación comercial",
};

export default function TopBar() {
  const { profile: contextProfile } = useProfile();
  const [todayMessage, setTodayMessage] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    const weekdayFormatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      weekday: "long",
    });

    const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    function updateBogotaClock() {
      const now = new Date();
      const weekday = weekdayFormatter.format(now).toLowerCase();
      const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const priority = DAILY_MESSAGES[weekday] || "";

      setTodayMessage(`Hoy es ${label} | Prioridad del día: ${priority}`);
      setCurrentDateTime(dateTimeFormatter.format(now));
    }

    updateBogotaClock();
    const timer = window.setInterval(updateBogotaClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const profile = contextProfile || {
    store_code: "",
    store_name: "Tiendas D1",
    role: "user",
    display_name: "",
  };
  const storeLine = profile.store_code
    ? `${profile.store_name} ${profile.store_code}`
    : profile.store_name;

  return (
    <header className="relative z-40 border-b border-black/5 bg-[#e51d2e] shadow-[0_8px_24px_rgba(136,19,29,0.18)]">
      <div className="mx-auto flex items-center justify-between px-4 py-3.5 lg:max-w-7xl lg:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-extrabold text-[#e51d2e] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 active:scale-95"
          >
            D1
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[150px] truncate text-[15px] font-extrabold leading-tight tracking-tight text-white sm:max-w-none">
              {profile.store_name || "Tiendas D1"}
            </span>
            <span className="max-w-[170px] truncate text-[11px] font-medium text-white/88 sm:max-w-none">
              Control de Operaciones - {storeLine}
            </span>
            <span className="max-w-[220px] text-[10px] font-medium leading-tight text-white/72 sm:max-w-none">
              {currentDateTime}
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
        <div className="relative flex items-center overflow-hidden border-t border-white/10 bg-[#c41525] py-1.5 shadow-inner lg:mx-auto lg:max-w-7xl lg:px-6 xl:px-8">
          <div className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-[#c41525] to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[#c41525] to-transparent" />
          <div className="animate-marquee whitespace-nowrap text-[11px] font-semibold tracking-[0.02em] text-white/92 lg:text-[12px]">
            <span className="mx-8">{todayMessage}</span>
            <span className="mx-8 opacity-50">|</span>
            <span className="mx-8">{todayMessage}</span>
            <span className="mx-8 opacity-50">|</span>
            <span className="mx-8">{todayMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
}
