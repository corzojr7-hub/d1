import type { Metadata } from "next";
import Link from "next/link";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "Catalogo de Productos — Sistema de Control Operativo de Tienda",
};

export default function ProductsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          Volver al inicio
        </Link>
      </div>

      <ProductsClient />
    </div>
  );
}
