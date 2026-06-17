"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Trash2, UsersRound, ClipboardCheck, BarChart3 } from "lucide-react";
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
  const isSegundoOrTercero = profile?.role === "segundo" || profile?.role === "tercero";

  let navItems = allNavItems.map(item => {
    if (!isAdmin) return item;
    // Redirigir rutas operativas a dashboards administrativos
    if (item.href === "/") return { ...item, href: "/admin" };
    return { ...item, href: `/admin${item.href}` };
  });

  // Ocultar "Equipo" para segundos y terceros
  if (isSegundoOrTercero) {
    navItems = navItems.filter(item => item.href !== "/team");
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-100 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
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
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div
                className={`flex h-8 px-5 items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-[#e8f1fc] rounded-full"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? "text-[#0a3875]" : "text-slate-600"
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </div>
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors duration-200 ${
                  isActive ? "text-[#1d1b20]" : "text-slate-600"
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
