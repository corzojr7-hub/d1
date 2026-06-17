"use client";

import { usePathname } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useOperator } from "@/components/ui/OperatorContext";

const PUBLIC_ROUTES = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useOperator();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
