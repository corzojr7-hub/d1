import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EvidenceGalleryClient from "./EvidenceGalleryClient";
import { requireAuth } from "@/lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Galería de Evidencias — Sistema de Control Operativo de Tienda",
};

export default async function EvidenceGalleryPage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/waste"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Merma
        </Link>
      </div>

      <EvidenceGalleryClient />
    </div>
  );
}
