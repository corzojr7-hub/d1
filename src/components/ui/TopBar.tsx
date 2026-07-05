"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { useProfile } from "./ProfileContext";

const DAILY_MESSAGES: Record<string, string> = {
  domingo: "Puesta a punto de la tienda",
  lunes: "Recuperacion de la tienda tras el fin de semana",
  martes: "Limpieza de polvo y revision FEFO",
  miercoles: "Ajuste de porta precios y piezas",
  jueves: "Limpieza de gondolas y rotacion de mercancia",
  viernes: "Restregado de piso y retiro de chicles",
  sabado: "Organizacion de exhibiciones adicionales",
};

function normalizeDayKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function TopBar() {
  const { profile: contextProfile } = useProfile();
  const [todayMessage, setTodayMessage] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState("");

  const profile = contextProfile || {
    store_code: "",
    store_name: "Tiendas D1",
    role: "user",
    display_name: "",
    basic_tasks: [],
  };

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
      const priority = DAILY_MESSAGES[normalizeDayKey(weekday)] || "";
      const normalizedDay = normalizeDayKey(weekday);
      const aseoTask = Array.isArray(profile.basic_tasks)
        ? profile.basic_tasks.find(
            (task) =>
              typeof task === "object" &&
              task !== null &&
              "id" in task &&
              task.id === "aseo_semanal",
          )
        : null;
      const aseoToday =
        aseoTask &&
        typeof aseoTask === "object" &&
        "schedule" in aseoTask &&
        aseoTask.schedule &&
        typeof aseoTask.schedule === "object" &&
        normalizedDay in aseoTask.schedule &&
        typeof aseoTask.schedule[normalizedDay as keyof typeof aseoTask.schedule] === "string"
          ? aseoTask.schedule[normalizedDay as keyof typeof aseoTask.schedule]
          : "Sin asignar";

      setTodayMessage(`Hoy es ${label} · ${priority} · Aseo: ${aseoToday}`);
      setCurrentDateTime(dateTimeFormatter.format(now));
    }

    updateBogotaClock();
    const timer = window.setInterval(updateBogotaClock, 1000);

    return () => window.clearInterval(timer);
  }, [profile.basic_tasks]);

  const storeLine = profile.store_code
    ? `${profile.store_name} ${profile.store_code}`
    : profile.store_name;

  return (
    <header className="relative z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-[#e51d2e] via-[#ef4444] to-[#f59e0b]" />
      <div className="mx-auto flex items-center justify-between px-4 py-2.5 lg:max-w-7xl lg:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e51d2e]/10 bg-[#fff1f2] text-base font-extrabold text-[#e51d2e] shadow-none transition-transform hover:scale-105 active:scale-95"
          >
            D1
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[150px] truncate text-[15px] font-extrabold leading-tight tracking-tight text-slate-900 sm:max-w-none">
              {profile.store_name || "Tiendas D1"}
            </span>
            <span className="max-w-[170px] truncate text-[11px] font-medium text-slate-500 sm:max-w-none">
              Control de Operaciones - {storeLine}
            </span>
            <span className="max-w-[220px] text-[10px] font-medium leading-tight text-slate-400 sm:max-w-none">
              {currentDateTime}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] backdrop-blur-md">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <UserRound className="h-3.5 w-3.5 text-[#e51d2e]" />
              </div>
              <span className="max-w-[120px] truncate text-[11px] font-bold text-slate-700">
                {profile.display_name || "Supervisor"}
              </span>
            </div>
          </div>

          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Admin Central
            </Link>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-none transition-colors hover:bg-slate-200 hover:text-slate-700"
              title="Cerrar sesion"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {todayMessage && (
        <div className="border-t border-slate-200/80 bg-slate-50/95 px-4 py-1.5 lg:px-6 xl:px-8">
          <div className="mx-auto lg:max-w-7xl">
            <p className="truncate text-[11px] font-semibold tracking-[0.02em] text-slate-600 lg:text-[12px]">
              {todayMessage}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
