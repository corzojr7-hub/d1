"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { logout } from "@/app/login/actions";
import { useOperator } from "./OperatorContext";
import { useState } from "react";

export default function TopBar() {
  const { operator, setOperator, profile: contextProfile } = useOperator();
  const [isOpen, setIsOpen] = useState(false);
  // Fallback default profile si no carga
  const profile = contextProfile || { store_code: "", store_name: "Tiendas D1", role: "user", display_name: "" };
  const storeLine = profile.store_code
    ? `${profile.store_name} ${profile.store_code}`
    : profile.store_name;

  return (
    <header className="sticky top-0 z-40 bg-[#e51d2e]">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-base font-extrabold text-[#e51d2e] shadow-sm">
            D1
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[150px] truncate text-base font-bold leading-tight text-white sm:max-w-none">
              {profile.store_name || "Tiendas D1"}
            </span>
            <span className="max-w-[170px] truncate text-[10px] text-white/90 sm:max-w-none">
              Control de Operaciones - {storeLine}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-white/30"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                <UserRound className="h-3 w-3 text-[#e51d2e]" />
              </div>
              <span className="max-w-[120px] truncate text-[10px] font-bold text-white">
                {operator || profile.display_name || "Supervisor"}
              </span>
            </button>
            
            {/* Simple dropdown menu on click */}
            {isOpen && (
              <div className="absolute right-0 mt-1 flex w-48 flex-col rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5">
                <div className="px-3 py-2 text-xs font-bold text-slate-400">Seleccionar Rol</div>
                <button
                  onClick={() => { setOperator(profile.display_name || "Supervisor"); setIsOpen(false); }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {profile.display_name || "Supervisor"}
                </button>
                {profile.second_in_charge && (
                  <button
                    onClick={() => { setOperator(profile.second_in_charge); setIsOpen(false); }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {profile.second_in_charge} (2do)
                  </button>
                )}
                {profile.third_in_charge && (
                  <button
                    onClick={() => { setOperator(profile.third_in_charge); setIsOpen(false); }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {profile.third_in_charge} (3er)
                  </button>
                )}
                {profile.assistants?.map((a: any) => (
                  <button
                    key={a.name}
                    onClick={() => { setOperator(a.name); setIsOpen(false); }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-full bg-yellow-400 px-3 py-1.5 text-[10px] font-bold text-yellow-900 transition-colors hover:bg-yellow-500"
            >
              Admin Central
            </Link>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              title="Cerrar sesion"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {(() => {
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
        const mensaje = `📌 Hoy es ${dias[today]} — Enfoque de pasillo: ${alertas[today]}`;
        
        return (
          <div className="w-full overflow-hidden bg-[#c41525] py-1 border-t border-[#e51d2e]/20 flex items-center shadow-inner relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#c41525] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#c41525] to-transparent z-10" />
            <div className="animate-marquee whitespace-nowrap text-[11px] font-bold tracking-wide text-white/90">
              <span className="mx-8">{mensaje}</span>
              <span className="mx-8 opacity-50">•</span>
              <span className="mx-8">{mensaje}</span>
              <span className="mx-8 opacity-50">•</span>
              <span className="mx-8">{mensaje}</span>
            </div>
          </div>
        );
      })()}
    </header>
  );
}
