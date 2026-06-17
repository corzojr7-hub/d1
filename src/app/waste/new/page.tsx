"use client";

import Link from "next/link";
import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Camera, Search, PackagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { get, set } from "idb-keyval";
import BarcodeScanner from "@/components/waste/BarcodeScanner";
import { WASTE_REASONS } from "@/lib/domain/catalogs";
import type { Tables } from "@/lib/supabase/database.types";
import { findProductByBarcode, submitWaste } from "@/app/waste/actions";
import { useProfile } from '@/components/ui/ProfileContext';
import { useMemo } from "react";

type WasteProduct = Tables<"products">;

export default function NewWastePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const operator = profile?.display_name?.toUpperCase();
  const assistants = profile?.assistants.map((a: any) => a.name?.toUpperCase()) || [];
  const teamMembers = Array.from(new Set(operator ? [operator, ...assistants] : assistants)) as string[];
  const areas = profile?.areas || [];

  const [barcode, setBarcode] = useState("");
  const [reason, setReason] = useState("vencido");
  const [searchedBarcode, setSearchedBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [product, setProduct] = useState<WasteProduct | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [transportComment, setTransportComment] = useState("");
  const [transportEvidence, setTransportEvidence] = useState<{novedad: string, lote: string, proveedor: string, cantidades: string} | null>(null);

  useEffect(() => {
    get("waste_draft").then((draft) => {
      if (draft && draft.barcode) {
        setBarcode(draft.barcode);
        setSearchedBarcode(draft.barcode);
        // Podríamos restaurar más campos si el form fuera controlado,
        // pero solo con restaurar el código evitamos que se pierda lo principal.
      }
    });
  }, []);

  // PDA Scanner Global Listener
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentTime = Date.now();
      
      // If time between keystrokes is too long (> 50ms), it's not a PDA scanner
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }

      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        e.preventDefault();
        searchBarcode(barcodeBuffer);
        barcodeBuffer = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key;
      }

      lastKeyTime = currentTime;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBarcode = searchedBarcode || barcode.trim();

  function searchBarcode(nextBarcode: string) {
    const normalizedBarcode = nextBarcode.trim();
    if (!normalizedBarcode) {
      setError("Ingresa o escanea un codigo de barras para buscar.");
      setHasSearched(false);
      setProduct(null);
      setShowForm(false);
      return;
    }

    setBarcode(normalizedBarcode);
    setSearchedBarcode(normalizedBarcode);
    setError(null);
    setShowForm(false);

    startTransition(async () => {
      try {
        const foundProduct = await findProductByBarcode(normalizedBarcode);
        setProduct(foundProduct);
        setHasSearched(true);
      } catch {
        setProduct(null);
        setHasSearched(false);
        setError("No se pudo buscar el producto. Intenta de nuevo.");
      }
    });
  }

  function handleManualSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    searchBarcode(barcode);
  }

  function handleScan(scannedBarcode: string) {
    setShowScanner(false);
    searchBarcode(scannedBarcode);
  }

  function handleContinue() {
    if (!activeBarcode) {
      setError("Busca o escanea un codigo antes de continuar.");
      return;
    }

    setShowScanner(false);
    setShowForm(true);
    setError(null);
  }

  function handleFileClick(id: string) {
    document.getElementById(id)?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (e.target.files && e.target.files[0]) {
      setFileNames((prev) => ({ ...prev, [id]: e.target.files![0].name }));
    }
  }

  const REQUIRED_PHOTOS_TRANSPORTE = [
    { id: 'evidence_detra', label: 'Foto de DETRA (Llegada)', optional: false },
    { id: 'evidence_rotulo', label: 'Foto de Rótulo (Conductor, Placa, Fecha)', optional: false },
    { id: 'evidence_novedad', label: 'Foto de la Novedad (Daño)', optional: false },
    { id: 'evidence_unidades', label: 'Foto de Unidades afectadas', optional: false }
  ];

  const REQUIRED_PHOTOS_CALIDAD = [
    { id: 'evidence_proveedor', label: 'Foto de Proveedor', optional: false },
    { id: 'evidence_lote', label: 'Foto de Lote y Vencimiento', optional: false },
    { id: 'evidence_novedad', label: 'Foto de la Novedad (Daño)', optional: false },
    { id: 'evidence_unidades', label: 'Foto de Unidades afectadas', optional: false }
  ];

  const photoRequirements = reason === "averia_transporte" 
    ? REQUIRED_PHOTOS_TRANSPORTE 
    : reason === "reporte_calidad" 
    ? REQUIRED_PHOTOS_CALIDAD 
    : [{ id: 'evidence', label: 'Foto de evidencia (Opcional)', optional: true }];

  const inputBase =
    "w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 text-base transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/waste"
        className="text-xs text-zinc-400 underline-offset-2 hover:underline"
      >
        Volver a merma
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-slate-800">
        Registrar Merma
      </h1>

      {!showForm ? (
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-zinc-100">
          <form onSubmit={handleManualSearch} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Codigo de barras
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    placeholder="Ej. 7701234567890"
                    className={`${inputBase} pl-12 text-lg font-semibold`}
                  />
                </div>
              </div>
            </label>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-base font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search aria-hidden="true" className="h-5 w-5" />
                {isPending ? "Buscando..." : "Buscar"}
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
              >
                <Camera aria-hidden="true" className="h-5 w-5" />
                Escanear con Camara
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {hasSearched && product && (
            <section className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-200/50">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Producto encontrado
              </p>
              <h2 className="mt-2 text-lg font-bold text-emerald-950">
                {product.name}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-emerald-600">Categoria</dt>
                  <dd className="font-semibold text-emerald-900">
                    {product.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-emerald-600">Unidad</dt>
                  <dd className="font-semibold text-emerald-900">
                    {product.unit}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {hasSearched && !product && (
            <section className="mt-6 rounded-2xl bg-amber-50 px-5 py-5 ring-1 ring-amber-200/50">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                Producto no encontrado
              </p>
              <p className="mt-2 text-sm text-amber-800 leading-snug">
                El código <strong>{activeBarcode}</strong> no está en la base interna. Puedes continuar la merma sin nombre, o registrarlo en el sistema.
              </p>
              <div className="mt-4">
                <Link
                  href={`/products/new?barcode=${activeBarcode}`}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-200 active:scale-95"
                >
                  <PackagePlus className="h-4 w-4" />
                  Registrar Producto en Sistema
                </Link>
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!activeBarcode}
            className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-base font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            if (!navigator.onLine) {
              toast.error("Se requiere conexión a internet para registrar merma con fotos obligatorias.");
              return;
            }

            // Validar fotos manualmente para evitar el error de hidden input
            for (const req of photoRequirements) {
              if (!req.optional) {
                const file = formData.get(req.id) as File | null;
                if (!file || file.size === 0) {
                  toast.error(`Por favor, sube la ${req.label}.`);
                  return;
                }
              }
            }

            startTransition(async () => {
              try {
                const result = await submitWaste(formData);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Merma registrada exitosamente.");
                await set("waste_draft", null);
                router.push("/waste");
              } catch (err: any) {
                toast.error(err.message);
              }
            });
          }}
          onChange={(e) => {
            const form = e.currentTarget;
            set("waste_draft", {
              barcode: activeBarcode,
              qty: (form.elements.namedItem("qty") as HTMLInputElement)?.value,
            }).catch(console.error);
          }}
          className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-zinc-100"
        >
          <input type="hidden" name="barcode_id" value={activeBarcode} />
          <input type="hidden" name="product_name" value={product?.name || "DESCONOCIDO"} />
          <input type="hidden" name="deposited_by" value={operator || profile?.display_name || "Desconocido"} />
          {transportEvidence && (
            <input type="hidden" name="transport_evidence" value={JSON.stringify(transportEvidence)} />
          )}
          <input type="hidden" name="product_id" value={product?.id ?? ""} />

          <div className="rounded-2xl bg-slate-50 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {product?.material_code ? "Material" : "EAN"}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {product?.material_code || activeBarcode}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {product
                ? product.name
                : "Producto no encontrado en base interna"}
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Cantidad (Unidades)
              </span>
              <input
                name="qty"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                className={inputBase}
              />
              <input type="hidden" name="unit" value="Unidad" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Motivo de merma
              </span>
              <select
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className={`${inputBase} appearance-none`}
              >
                {WASTE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Depositado por
                </span>
                {teamMembers.length > 0 ? (
                  <select
                    name="deposited_by"
                    defaultValue={teamMembers.includes(operator) ? operator : ""}
                    required
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {teamMembers.map((name: string) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="deposited_by"
                    type="text"
                    defaultValue={operator}
                    required
                    className={inputBase}
                    placeholder="Escribe el nombre"
                  />
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Area / Cuadrante
                </span>
                {areas.length > 0 ? (
                  <select
                    name="area"
                    defaultValue=""
                    required
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {areas.map((area: string) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="area"
                    type="text"
                    required
                    className={inputBase}
                    placeholder="Escribe el area"
                  />
                )}
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Observacion
              </span>
              <textarea
                name="observation"
                rows={4}
                className={`${inputBase} resize-none`}
              />
            </label>

            {photoRequirements.map(req => (
              <label key={req.id} className="block mb-4">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {req.label}
                </span>
                <input
                  id={req.id}
                  name={req.id}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, req.id)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => handleFileClick(req.id)}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Camera className="mb-2 h-8 w-8" />
                  {fileNames[req.id] ? (
                    <span className="text-sm font-semibold text-slate-700 break-all px-4 text-center">
                      {fileNames[req.id]}
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold">
                        Toca para tomar foto
                      </span>
                      <span className="mt-1 text-xs text-slate-400">
                        JPG, PNG o captura directa
                      </span>
                    </>
                  )}
                </button>
              </label>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-base font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPending ? "Guardando..." : "Confirmar Merma"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-white px-5 text-base font-bold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
            >
              Volver
            </button>
          </div>
        </form>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
