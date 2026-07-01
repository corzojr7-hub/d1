import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EvidenceGalleryClient from "./EvidenceGalleryClient";
import { requireAuth } from "@/lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Soportes de Merma — Sistema de Control Operativo de Tienda",
};

export default async function EvidenceGalleryPage() {
  await requireAuth();

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <div className="mb-6 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:p-6">
        <Link
          href="/waste"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Merma
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Soportes de Merma</h1>
          <p className="mt-1 text-sm text-slate-500">
            Descarga y revisa los soportes de transporte y calidad por fecha sin perder trazabilidad.
          </p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6 lg:items-start">
        <EvidenceGalleryClient />
      </div>
    </div>
  );
}
