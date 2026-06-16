"use client";

import Link from "next/link";
import { useTransition, useState, useEffect, Suspense } from "react";
import { PackagePlus, Save, ArrowLeft } from "lucide-react";
import { createProduct } from "../actions";
import { useSearchParams } from "next/navigation";

function ProductForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    const urlBarcode = searchParams.get("barcode");
    if (urlBarcode) {
      setBarcode(urlBarcode);
    }
  }, [searchParams]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    setError(null);
    startTransition(async () => {
      try {
        await createProduct(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar producto");
      }
    });
  }

  const fieldClassName =
    "min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400";

  return (
    <>
      <div className="mb-6 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <div className="flex items-start gap-3">
          <PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm font-medium text-blue-900 leading-snug">
            Si el escáner no encontró el producto, regístralo aquí. Quedará guardado para futuros escaneos.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Código de Barras (EAN)
            </span>
            <input
              name="barcode_id"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
              inputMode="numeric"
              className={`${fieldClassName} font-mono text-lg`}
              placeholder="Ej. 770123456789"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Código Material
            </span>
            <input
              name="material_code"
              required
              inputMode="numeric"
              className={`${fieldClassName} font-mono text-lg`}
              placeholder="Ej. 12000000"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Nombre del Producto
            </span>
            <input
              name="name"
              required
              className={fieldClassName}
              placeholder="Ej. Leche Entera Larga Vida 1L"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Categoría <span className="font-normal normal-case text-slate-400">(Opcional)</span>
              </span>
              <input
                name="category"
                className={fieldClassName}
                placeholder="Ej. Lácteos"
              />
            </label>

            <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Unidad
                </span>
                <input
                  name="unit"
                  value="Unidad"
                  readOnly
                  className={`${fieldClassName} bg-slate-100 text-slate-500 cursor-not-allowed`}
                  tabIndex={-1}
                />
              </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-[15px] font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-70 transition-all"
        >
          {isPending ? (
            <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Save className="h-5 w-5" />
          )}
          {isPending ? "Guardando..." : "Guardar Producto"}
        </button>
      </form>
    </>
  );
}

export default function NewProductPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-28">
      {/* Header Estilo 1:1 */}
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/waste/new"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">
              Nuevo Producto
            </h1>
            <p className="text-[10px] text-white/90">
              Agrega un producto al catálogo interno
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Suspense fallback={<div className="p-4 text-center text-sm text-slate-500">Cargando formulario...</div>}>
          <ProductForm />
        </Suspense>
      </div>
    </div>
  );
}
