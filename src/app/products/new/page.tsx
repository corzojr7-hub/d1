"use client";

import Link from "next/link";
import { Suspense, useState, useTransition } from "react";
import { ArrowLeft, PackagePlus, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createProduct } from "../actions";

function ProductForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const barcode = searchParams.get("barcode") ?? "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    startTransition(async () => {
      try {
        await createProduct(formData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al registrar producto",
        );
      }
    });
  }

  const fieldClassName =
    "min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400";

  return (
    <>
      <section className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-teal-700 px-5 py-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[240px]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/65">
              Catalogo Operativo
            </p>
            <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
              Nuevo producto
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              Registra una referencia nueva para que quede disponible en futuros
              escaneos y reportes.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <PackagePlus className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-4 inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          Completa EAN, SAP y nombre comercial
        </div>
      </section>

      <div className="mt-6 rounded-[26px] border border-blue-100 bg-blue-50/80 px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2 text-blue-600 shadow-sm">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-snug text-blue-950">
              Usa este formulario cuando el escaner no encuentre el producto.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-blue-800/80">
              El registro queda disponible para futuros escaneos del equipo.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Formulario
          </p>
          <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
            Datos base del producto
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            Los campos numericos ayudan a identificar el producto dentro del
            catalogo interno.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Codigo de barras (EAN)
            </span>
            <input
              name="barcode_id"
              defaultValue={barcode}
              required
              inputMode="numeric"
              className={`${fieldClassName} font-mono text-base`}
              placeholder="Ej. 770123456789"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Codigo material
            </span>
            <input
              name="material_code"
              required
              inputMode="numeric"
              className={`${fieldClassName} font-mono text-base`}
              placeholder="Ej. 12000000"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Nombre del producto
            </span>
            <input
              name="name"
              required
              className={fieldClassName}
              placeholder="Ej. Leche Entera Larga Vida 1L"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Categoria{" "}
                <span className="font-medium normal-case tracking-normal text-slate-400">
                  (Opcional)
                </span>
              </span>
              <input
                name="category"
                className={fieldClassName}
                placeholder="Ej. Lacteos"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Unidad
              </span>
              <input
                name="unit"
                value="Unidad"
                readOnly
                className={`${fieldClassName} cursor-not-allowed bg-slate-100 text-slate-500`}
                tabIndex={-1}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-[22px] bg-slate-50 px-4 py-3 text-[12px] leading-relaxed text-slate-500">
          Revisa el EAN y el codigo material antes de guardar para evitar
          duplicados en el catalogo.
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[15px] font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:opacity-70"
        >
          {isPending ? (
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <Save className="h-5 w-5" />
          )}
          {isPending ? "Guardando..." : "Guardar producto"}
        </button>
      </form>
    </>
  );
}

export default function NewProductPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-28 pt-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 lg:pt-10 xl:max-w-6xl xl:px-8">
      <div className="mb-4">
        <Link
          href="/waste/new"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            Cargando formulario...
          </div>
        }
      >
        <ProductForm />
      </Suspense>
    </div>
  );
}
