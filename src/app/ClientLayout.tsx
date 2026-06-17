"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import { ProfileProvider } from "@/components/ui/ProfileContext";
import SyncManager from "@/components/ui/SyncManager";
import PushManager from "@/components/ui/PushManager";
import { AutoLogout } from "@/components/ui/AutoLogout";

const PUBLIC_ROUTES = ["/login", "/update-password"];

export default function ClientLayout({
  children,
  fontClassName,
  initialProfile,
  initialOperator,
}: {
  children: React.ReactNode;
  fontClassName: string;
  initialProfile: any;
  initialOperator: string | null;
}) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);



  return (
    <body
      className={`${fontClassName} min-h-dvh bg-slate-50 text-zinc-900 antialiased`}
      suppressHydrationWarning={true}
    >
      <ProfileProvider initialProfile={initialProfile}>
        <SyncManager />
        <PushManager />
        {!isPublic && <AutoLogout />}
        <AppShell>{children}</AppShell>
      </ProfileProvider>

      <Toaster position="top-center" richColors />
    </body>
  );
}
