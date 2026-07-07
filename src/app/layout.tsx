import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getHydratedProfile } from "@/lib/supabase/require-auth";
import ClientLayout from "./ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Control Operativo de Tienda",
  description:
    "Plataforma interna para registro y consulta de instrucciones operativas y eventos de merma.",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontClassName = "h-full antialiased";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile = null;
  
  if (user) {
    profile = await getHydratedProfile(supabase, user.id);
  }
  return (
    <html lang="es">
      <ClientLayout fontClassName={fontClassName} initialProfile={profile}>
        {children}
      </ClientLayout>
    </html>
  );
}
