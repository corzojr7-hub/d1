"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import { OperatorProvider } from "@/components/ui/OperatorContext";
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
      <OperatorProvider initialProfile={initialProfile} initialOperator={initialOperator}>
        <SyncManager />
        <PushManager />
        {!isPublic && <AutoLogout />}
        <AppShell>{children}</AppShell>
      </OperatorProvider>

      <Toaster position="top-center" richColors />
    </body>
  );
}
