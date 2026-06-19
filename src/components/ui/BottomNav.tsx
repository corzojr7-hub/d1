"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Trash2, UsersRound, BarChart3 } from "lucide-react";
import { useProfile } from "./ProfileContext";

const allNavItems = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/sales", label: "Ventas", icon: BarChart3 },
  { href: "/dashboard", label: "KPIs", icon: BarChart3 },
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
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:bottom-4 lg:border-0 lg:bg-transparent lg:px-6 lg:pb-0 lg:shadow-none">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 lg:mx-auto lg:max-w-4xl lg:justify-between lg:rounded-full lg:border lg:border-slate-200/90 lg:bg-white/95 lg:px-4 lg:py-3 lg:shadow-[0_16px_36px_rgba(15,23,42,0.12)] lg:backdrop-blur-sm">
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
              className="flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-1 py-0.5"
            >
              <div
                className={`flex h-9 px-5 items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "rounded-full bg-[#fdecef] shadow-[inset_0_0_0_1px_rgba(229,29,46,0.1)]"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? "text-[#e51d2e]" : "text-slate-500"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </div>
              <span
                className={`mt-0.5 text-[11px] font-bold transition-colors duration-200 ${
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
