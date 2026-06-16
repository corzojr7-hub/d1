"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          Catalogo de Productos
        </h1>
        <Link
          href="/waste/new"
          className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Registrar merma
        </Link>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs text-zinc-500">
          Busca por EAN, codigo de material o nombre.
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por EAN, material o nombre..."
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
        />
      </div>

      {searching && (
        <p className="mb-4 text-sm text-zinc-400">Buscando...</p>
      )}

      {!searching && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      )}

      {!searching && !error && trimmedQuery && results.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-400">
            No se encontraron productos con ese criterio de busqueda.
          </p>
        </div>
      )}

      {!searching && !error && !trimmedQuery && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-400">
            Escribe para buscar un producto en el catalogo.
          </p>
        </div>
      )}

      {!searching && !error && results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            {results.length.toLocaleString("es-MX")}{" "}
            {results.length === 1
              ? "producto encontrado"
              : "productos encontrados"}
          </p>

          <ul className="space-y-2">
            {visibleResults.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.barcode_id}
                      {product.material_code && ` • SAP: ${product.material_code}`}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-zinc-300">
                      ID interno: {product.id}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(product.id)}
                    className={`ml-3 shrink-0 self-start rounded border px-2 py-0.5 text-xs hover:bg-zinc-50 ${
                      copiedId === product.id
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-zinc-300 text-zinc-600"
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
            <p className="mt-3 text-xs text-zinc-400">
              Se muestran solo los primeros 120 resultados.
            </p>
          )}
        </>
      )}
    </>
  );
}
