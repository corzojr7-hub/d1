"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import { ProfileProvider } from "@/components/ui/ProfileContext";
import type { Profile } from "@/lib/domain/types";

const SyncManager = dynamic(() => import("@/components/ui/SyncManager"), { ssr: false });
const PushManager = dynamic(() => import("@/components/ui/PushManager"), { ssr: false });
const AutoLogout = dynamic(
  () => import("@/components/ui/AutoLogout").then((mod) => mod.AutoLogout),
  { ssr: false },
);

const PUBLIC_ROUTES = ["/login", "/update-password"];

export default function ClientLayout({
  children,
  fontClassName,
  initialProfile,
}: {
  children: React.ReactNode;
  fontClassName: string;
  initialProfile: Profile | null;
}) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);



  return (
    <body
      className={`${fontClassName} min-h-dvh bg-slate-50 text-zinc-900 antialiased`}
      suppressHydrationWarning={true}
    >
      <ProfileProvider initialProfile={initialProfile}>
        {!isPublic && (
          <>
            <SyncManager />
            <PushManager />
            <AutoLogout />
          </>
        )}
        <AppShell>{children}</AppShell>
      </ProfileProvider>

      <Toaster position="top-center" richColors />
    </body>
  );
}
