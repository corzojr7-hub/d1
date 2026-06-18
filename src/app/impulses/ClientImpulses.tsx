"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, TrendingUp, BarChart3, Search, X } from "lucide-react";
import { toast } from "sonner";
import { saveImpulseRecord } from "./actions";
import { searchProducts } from "@/app/products/actions";

type ProductCatalogEntry = {
  id: string;
  name: string;
  barcode_id: string;
  material_code?: string | null;
  category: string;
  unit: string;
};

export default function ClientImpulses({ assistants }: { assistants: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<ProductCatalogEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogEntry | null>(null);

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
        toast.success("Registro de impulso guardado con éxito.");
        setQuantity(1);
        setSelectedProduct(null);
        setCatalogQuery("");
        setCatalogResults([]);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        toast.error(err.message || "Error al registrar impulso.");
      }
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-[#e51d2e] px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col flex-1">
            <h1 className="text-lg font-bold leading-tight text-white">
              Impulsos
            </h1>
            <p className="text-[10px] text-white/90">
              Registro diario de ventas
            </p>
          </div>
          <Link
            href="/impulses/analytics"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800">Nuevo Registro</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Asistente
              </label>
              <select
                name="assistant"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Selecciona el asistente</option>
                {assistants.map((a: any) => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Tipo de Impulso
              </label>
              <select
                name="impulse_type"
                required
                className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Seleccionar tipo</option>
                <option value="Nacional">Nacional</option>
                <option value="Regional">Regional</option>
                <option value="Fecha Pronta">Fecha Pronta</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Producto
              </label>
              
              {!selectedProduct ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={catalogQuery}
                    onChange={(e) => handleCatalogSearch(e.target.value)}
                    placeholder="Escribe para buscar (ej. wafer)..."
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoComplete="off"
                  />
                  {catalogQuery.trim() && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-60 overflow-auto">
                      {catalogResults.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">No se encontraron productos.</div>
                      ) : (
                        <ul className="py-1">
                          {catalogResults.slice(0, 30).map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(p)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none flex flex-col"
                              >
                                <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                                <span className="text-[10px] text-slate-400">EAN: {p.barcode_id} {p.material_code ? `• Mat: ${p.material_code}` : ''}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 ring-1 ring-blue-200 rounded-xl px-3 py-2.5">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-sm font-bold text-blue-900 truncate">{selectedProduct.name}</span>
                    <span className="text-[10px] text-blue-600">EAN: {selectedProduct.barcode_id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setCatalogQuery("");
                      setCatalogResults([]);
                    }}
                    className="shrink-0 p-1 rounded-full text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Cantidad Vendida
              </label>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-lg hover:bg-slate-200"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-2xl text-slate-800">
                  {quantity}
                </div>
                <button 
                  type="button" 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-lg hover:bg-slate-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? "Guardando..." : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Guardar Impulso
            </>
          )}
        </button>
      </form>
    </div>
  );
}
