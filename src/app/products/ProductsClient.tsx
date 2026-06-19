"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Barcode, PackageSearch, Search } from "lucide-react";
import { searchProducts } from "./actions";

type ProductCatalogEntry = {
  id: string;
  name: string;
  barcode_id: string;
  material_code?: string | null;
  category: string;
  unit: string;
};

export default function ProductsClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductCatalogEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const visibleResults = results.slice(0, 120);
  const showMore = results.length > visibleResults.length;

  function handleSearch(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchProducts(value);
        setResults(res);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Error al buscar productos",
        );
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function copyToClipboard(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(
        () => setCopiedId((prev) => (prev === id ? null : prev)),
        1500,
      );
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <>
      <section className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-teal-700 px-5 py-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[240px]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/65">
              Catalogo Operativo
            </p>
            <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
              Productos
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              Consulta rapido EAN, SAP e identificadores internos sin salir del
              flujo operativo.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <Barcode className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            Busqueda por EAN, SAP o nombre
          </div>
          <Link
            href="/waste/new"
            className="rounded-full bg-white px-4 py-2 text-[11px] font-bold text-slate-900 transition hover:bg-slate-100"
          >
            Registrar merma
          </Link>
        </div>
      </section>

      <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por EAN, material o nombre..."
            className="w-full bg-transparent text-[15px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            EAN / codigo de barras
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Codigo SAP
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Nombre comercial
          </span>
        </div>
      </div>

      {searching && (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Buscando productos...
          </p>
        </div>
      )}

      {!searching && error && (
        <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-4 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error: {error}</p>
        </div>
      )}

      {!searching && !error && hasQuery && results.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <PackageSearch className="h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No encontramos coincidencias
          </p>
          <p className="mt-1 max-w-[240px] text-[12px] leading-relaxed text-slate-500">
            Prueba con un EAN completo, el codigo SAP o una parte del nombre del
            producto.
          </p>
        </div>
      )}

      {!searching && !error && !hasQuery && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Empieza una busqueda
          </p>
          <p className="mt-1 max-w-[240px] text-[12px] leading-relaxed text-slate-500">
            Escribe un EAN, codigo SAP o nombre para ubicar el producto dentro
            del catalogo.
          </p>
        </div>
      )}

      {!searching && !error && results.length > 0 && (
        <>
          <div className="mt-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Resultados
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {results.length.toLocaleString("es-MX")}{" "}
                {results.length === 1
                  ? "producto encontrado"
                  : "productos encontrados"}
              </p>
            </div>
            {showMore && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                Vista limitada a 120
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-3">
            {visibleResults.map((product) => (
              <li
                key={product.id}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {product.category}
                      </span>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">
                        {product.unit}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
                      {product.name}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-slate-500">
                      EAN:{" "}
                      <span className="font-semibold text-slate-700">
                        {product.barcode_id}
                      </span>
                      {product.material_code && (
                        <>
                          {" "}• SAP:{" "}
                          <span className="font-semibold text-slate-700">
                            {product.material_code}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-3 break-all rounded-2xl bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-400">
                      ID interno: {product.id}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(product.id)}
                    className={`ml-3 shrink-0 self-start rounded-full px-3 py-2 text-[11px] font-bold transition ${
                      copiedId === product.id
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
                    }`}
                    title="Copiar ID interno al portapapeles"
                  >
                    {copiedId === product.id ? "Copiado" : "Copiar ID"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {showMore && (
            <p className="mt-3 text-[11px] text-slate-500">
              Refina la busqueda para ver una lista mas precisa.
            </p>
          )}
        </>
      )}
    </>
  );
}
