import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getHydratedProfile } from "@/lib/supabase/require-auth";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const initialOperator = cookieStore.get("op_session")?.value || null;

  return (
    <html lang="es">
      <ClientLayout fontClassName={fontClassName} initialProfile={profile} initialOperator={initialOperator}>
        {children}
      </ClientLayout>
    </html>
  );
}
