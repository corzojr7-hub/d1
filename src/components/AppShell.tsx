"use client";

import { usePathname } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useProfile } from '@/components/ui/ProfileContext';

const PUBLIC_ROUTES = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useProfile();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  const isAdmin = profile?.role === "admin";
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      {isHome && <TopBar />}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
