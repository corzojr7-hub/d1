"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { saveImpulseRecord } from "./actions";
import { searchProducts } from "@/app/products/actions";
import AppSelect from "@/components/dashboard/AppSelect";

type ProductCatalogEntry = {
  id: string;
  name: string;
  barcode_id: string;
  material_code?: string | null;
  category: string;
  unit: string;
};

type Assistant = {
  name: string;
};

export default function ClientImpulses({
  assistants,
}: {
  assistants: Assistant[];
}) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<ProductCatalogEntry[]>(
    [],
  );
  const [selectedProduct, setSelectedProduct] =
    useState<ProductCatalogEntry | null>(null);

  async function handleCatalogSearch(query: string) {
    setCatalogQuery(query);
    const results = query.trim() ? await searchProducts(query) : [];
    setCatalogResults(results);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Por favor, selecciona un producto del catálogo.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("quantity", quantity.toString());
    formData.append("product_name", selectedProduct.name);

    startTransition(async () => {
      try {
        const res = await saveImpulseRecord(formData);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Registro comercial guardado con éxito.");
        setQuantity(1);
        setSelectedProduct(null);
        setCatalogQuery("");
        setCatalogResults([]);
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al registrar impulso.",
        );
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="sticky top-0 z-40 rounded-b-[32px] border border-rose-200/70 bg-white/95 px-4 py-4 shadow-sm backdrop-blur lg:rounded-[36px] lg:px-7 lg:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-1 flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
              Impulso comercial
            </p>
            <h1 className="text-lg font-black leading-tight text-slate-900">
              Registro comercial
            </h1>
            <p className="text-[10px] text-slate-500">
              Guarda el producto, la persona y las unidades del impulso del día.
            </p>
          </div>
          <Link
            href="/impulses/analytics"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 px-0 py-4 lg:py-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                Carga comercial
              </p>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-black text-slate-900">
                  Nuevo registro
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Registra el impulso de forma rápida y deja listo el dato para
                seguimiento y análisis semanal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                  Modalidad
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  Registro rápido
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Seguimiento
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  Analítica semanal
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:space-y-0">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Asistente
                </label>
                <AppSelect
                  label="Asistente"
                  name="assistant"
                  required
                  buttonClassName="rounded-xl px-3 py-2.5 text-sm font-medium shadow-none"
                  options={[
                    { value: "", label: "Selecciona el asistente" },
                    ...assistants.map((a) => ({ value: a.name, label: a.name })),
                  ]}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Tipo de impulso
                </label>
                <AppSelect
                  label="Tipo de Impulso"
                  name="impulse_type"
                  required
                  buttonClassName="rounded-xl px-3 py-2.5 text-sm font-medium shadow-none"
                  options={[
                    { value: "", label: "Seleccionar tipo" },
                    { value: "Nacional", label: "Nacional" },
                    { value: "Regional", label: "Regional" },
                    { value: "Fecha Pronta", label: "Fecha Pronta" },
                  ]}
                />
              </div>

              <div className="relative">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Producto
                </label>

                {!selectedProduct ? (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={catalogQuery}
                      onChange={(e) => handleCatalogSearch(e.target.value)}
                      placeholder="Escribe para buscar (ej. wafer)..."
                      className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      autoComplete="off"
                    />
                    {catalogQuery.trim() && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-black/5">
                        {catalogResults.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            No se encontraron productos.
                          </div>
                        ) : (
                          <ul className="py-1">
                            {catalogResults.slice(0, 30).map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProduct(p)}
                                  className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                                >
                                  <span className="text-sm font-semibold text-slate-800">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    EAN: {p.barcode_id}
                                    {p.material_code
                                      ? ` · Mat: ${p.material_code}`
                                      : ""}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0 pr-2">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {selectedProduct.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        EAN: {selectedProduct.barcode_id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setCatalogQuery("");
                        setCatalogResults([]);
                      }}
                      className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {selectedProduct && (
                  <input
                    type="hidden"
                    name="product_id"
                    value={selectedProduct.id}
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Cantidad impulsada
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="h-12 flex-1 rounded-2xl border-0 bg-slate-50 px-4 text-center text-lg font-black text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm lg:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                Ruta sugerida
              </p>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <p>1. Elige a la persona que hizo el impulso.</p>
                <p>2. Busca el producto desde el catálogo.</p>
                <p>3. Marca las unidades exactas antes de guardar.</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-rose-200/70 bg-rose-50/60 p-4 shadow-sm lg:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-600">
                Enlace útil
              </p>
              <p className="mt-2 text-sm text-emerald-900">
                Cuando termines, entra a analítica para ver rápidamente quién
                empujó más unidades esta semana.
              </p>
              <Link
                href="/impulses/analytics"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rose-700 hover:text-rose-800"
              >
                <BarChart3 className="h-4 w-4" />
                Ver analítica
              </Link>
            </div>
          </aside>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70"
        >
          {isPending ? (
            <>
              <CheckCircle2 className="h-5 w-5 animate-pulse" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Guardar impulso
            </>
          )}
        </button>
      </form>
    </div>
  );
}
