"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Trash2,
  UsersRound,
  ChartColumnBig,
} from "lucide-react";
import { useProfile } from "./ProfileContext";

const allNavItems = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard", label: "Indicadores", icon: ChartColumnBig },
  { href: "/instructions", label: "Tareas", icon: ClipboardList },
  { href: "/waste", label: "Merma", icon: Trash2 },
  { href: "/team", label: "Equipo", icon: UsersRound },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { profile } = useProfile();
  
  const isAdmin = profile?.role === "admin";
  const isSegundoOrTercero =
    profile?.role === "segundo_al_mando" || profile?.role === "tercero_al_mando";

  let navItems = allNavItems.map(item => {
    if (!isAdmin) return item;
    // Redirigir rutas operativas a dashboards administrativos
    if (item.href === "/") return { ...item, href: "/admin" };
    return { ...item, href: `/admin${item.href}` };
  });

  // Ocultar "Equipo" para encargadas
  if (isSegundoOrTercero) {
    navItems = navItems.filter(item => item.href !== "/team");
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgba(15,23,42,0.06)] backdrop-blur-sm lg:bottom-4 lg:border-0 lg:bg-transparent lg:px-6 lg:pb-0 lg:shadow-none">
      <div className="flex items-center justify-around gap-1 px-2 pt-2 pb-2 lg:mx-auto lg:max-w-4xl lg:justify-between lg:rounded-full lg:border lg:border-slate-200/80 lg:bg-white/95 lg:px-3.5 lg:py-2.5 lg:shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:backdrop-blur-sm">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex min-w-[60px] flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-0.5 lg:min-w-[80px] lg:flex-none"
            >
              <div
                className={`flex h-[34px] min-w-[44px] items-center justify-center px-3.5 transition-all duration-200 lg:min-w-[50px] lg:px-4 ${
                  isActive
                    ? "rounded-full bg-[#fdecef] shadow-[inset_0_0_0_1px_rgba(229,29,46,0.1)]"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors duration-200 ${
                    isActive ? "text-[#e51d2e]" : "text-slate-500"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </div>
              <span
                className={`mt-0.5 text-center text-[10px] font-bold leading-tight transition-colors duration-200 lg:text-[10px] ${
                  isActive ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
