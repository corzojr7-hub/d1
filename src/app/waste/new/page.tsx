"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Camera, Search, PackagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { get, set } from "idb-keyval";
import BarcodeScanner from "@/components/waste/BarcodeScanner";
import AppSelect from "@/components/dashboard/AppSelect";
import { WASTE_REASONS } from "@/lib/domain/catalogs";
import type { Tables } from "@/lib/supabase/database.types";
import { findProductByBarcode, submitWaste } from "@/app/waste/actions";
import { useProfile } from '@/components/ui/ProfileContext';
import { compressImage } from "@/lib/image-compression";

type WasteProduct = Tables<"products">;

type OfflineEvidenceFile = {
  dataUrl: string;
  name: string;
  type: string;
};

type OfflineWasteRecord = {
  barcode_id: string;
  product_id: string;
  product_name: string;
  qty: string;
  unit: string;
  reason: string;
  deposited_by: string;
  area: string;
  observation: string;
  transport_driver: string;
  transport_plate: string;
  transport_comment: string;
  quality_expiration_date: string;
  quality_lot: string;
  quality_supplier: string;
  evidence_files: Record<string, OfflineEvidenceFile>;
  queued_at: string;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

async function registerOfflineWasteSync() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("/sw.js"));
    const syncManager = registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };

    if (syncManager.sync) {
      await syncManager.sync.register("waste-offline-sync");
    }
  } catch (error) {
    console.error("No se pudo registrar el background sync de merma", error);
  }
}

export default function NewWastePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const operator = profile?.display_name?.toUpperCase() || "";
  const assistants = profile?.assistants.map((a) => a.name.toUpperCase()) || [];
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
  useEffect(() => {
    get("waste_draft").then((draft) => {
      if (draft && draft.barcode) {
        setBarcode(draft.barcode);
        setSearchedBarcode(draft.barcode);
        // PodrÃ­amos restaurar mÃ¡s campos si el form fuera controlado,
        // pero solo con restaurar el cÃ³digo evitamos que se pierda lo principal.
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

  const isTransportReason = reason === "averia_transporte";
  const isQualityReason =
    reason === "reporte_calidad" ||
    reason === "calidad_nacional" ||
    reason === "fecha_corta_cedi";

  const REQUIRED_PHOTOS_TRANSPORTE = [
    { id: 'evidence_detra', label: 'Foto de DETRA (Llegada)', optional: false },
    { id: 'evidence_rotulo', label: 'Foto de RÃ³tulo (Conductor, Placa, Fecha)', optional: false },
    { id: 'evidence_novedad', label: 'Foto de la Novedad (DaÃ±o)', optional: false },
    { id: 'evidence_unidades', label: 'Foto de Unidades afectadas', optional: false }
  ];

  const REQUIRED_PHOTOS_CALIDAD = [
    { id: 'evidence_proveedor', label: 'Foto de Proveedor', optional: false },
    { id: 'evidence_lote', label: 'Foto de Lote y Vencimiento', optional: false },
    { id: 'evidence_novedad', label: 'Foto de la Novedad (DaÃ±o)', optional: false },
    { id: 'evidence_unidades', label: 'Foto de Unidades afectadas', optional: false }
  ];

  const photoRequirements = isTransportReason
    ? REQUIRED_PHOTOS_TRANSPORTE 
    : isQualityReason
    ? REQUIRED_PHOTOS_CALIDAD 
    : [{ id: 'evidence', label: 'Foto de evidencia (Opcional)', optional: true }];

  const inputBase =
    "w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 text-base transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:p-6">
        <Link
          href="/waste"
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Volver a merma
        </Link>

        <h1 className="mt-4 text-2xl font-extrabold text-slate-800 lg:text-[2rem]">
          Registrar Merma
        </h1>
      </section>

      {!showForm ? (
        <div className="mt-6 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm lg:p-7">
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-base font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
              >
                <Search aria-hidden="true" className="h-5 w-5" />
                {isPending ? "Buscando..." : "Buscar"}
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95 sm:flex-1"
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
                El cÃ³digo <strong>{activeBarcode}</strong> no estÃ¡ en la base interna. Puedes continuar la merma sin nombre, o registrarlo en el sistema.
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

            if (isTransportReason) {
              const driver = formData.get("transport_driver");
              const plate = formData.get("transport_plate");
              if (typeof driver !== "string" || !driver.trim()) {
                toast.error("Ingresa el nombre del conductor.");
                return;
              }
              if (typeof plate !== "string" || !plate.trim()) {
                toast.error("Ingresa la placa del conductor.");
                return;
              }
            }

            if (isQualityReason) {
              const expirationDate = formData.get("quality_expiration_date");
              const lot = formData.get("quality_lot");
              const supplier = formData.get("quality_supplier");
              const comment = formData.get("transport_comment");

              if (typeof expirationDate !== "string" || !expirationDate.trim()) {
                toast.error("Ingresa la fecha de vencimiento.");
                return;
              }
              if (typeof lot !== "string" || !lot.trim()) {
                toast.error("Ingresa el lote.");
                return;
              }
              if (typeof supplier !== "string" || !supplier.trim()) {
                toast.error("Ingresa el proveedor.");
                return;
              }
              if (typeof comment !== "string" || !comment.trim()) {
                toast.error("Describe la novedad.");
                return;
              }
            }

            startTransition(async () => {
              try {
                                const payload = new FormData();
                const evidenceFiles: Record<string, OfflineEvidenceFile> = {};

                for (const [key, value] of formData.entries()) {
                  if (value instanceof File && value.size > 0 && value.type.startsWith("image/")) {
                    const compressedFile = await compressImage(value);
                    payload.append(key, compressedFile);

                    if (!navigator.onLine) {
                      evidenceFiles[key] = {
                        dataUrl: await fileToDataUrl(compressedFile),
                        name: compressedFile.name || `${key}.jpg`,
                        type: compressedFile.type || "image/jpeg",
                      };
                    }
                    continue;
                  }

                  payload.append(key, value);
                }

                if (!navigator.onLine) {
                  const offlineQueue = ((await get("wasteOfflineQueue")) as OfflineWasteRecord[] | null) || [];

                  offlineQueue.push({
                    barcode_id: String(formData.get("barcode_id") || ""),
                    product_id: String(formData.get("product_id") || ""),
                    product_name: String(formData.get("product_name") || ""),
                    qty: String(formData.get("qty") || ""),
                    unit: String(formData.get("unit") || ""),
                    reason: String(formData.get("reason") || ""),
                    deposited_by: String(formData.get("deposited_by") || ""),
                    area: String(formData.get("area") || ""),
                    observation: String(formData.get("observation") || ""),
                    transport_driver: String(formData.get("transport_driver") || ""),
                    transport_plate: String(formData.get("transport_plate") || ""),
                    transport_comment: String(formData.get("transport_comment") || ""),
                    quality_expiration_date: String(formData.get("quality_expiration_date") || ""),
                    quality_lot: String(formData.get("quality_lot") || ""),
                    quality_supplier: String(formData.get("quality_supplier") || ""),
                    evidence_files: evidenceFiles,
                    queued_at: new Date().toISOString(),
                  });

                  await set("wasteOfflineQueue", offlineQueue);
                  await set("waste_draft", null);
                  await registerOfflineWasteSync();
                  toast.success("Guardado offline. Se sincronizará al volver la conexión.");
                  router.push("/waste");
                  return;
                }

                const result = await submitWaste(payload);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Merma registrada exitosamente.");
                await set("waste_draft", null);
                router.push("/waste");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error al registrar merma.");
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
          className="mt-6 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm lg:p-7"
        >
          <input type="hidden" name="barcode_id" value={activeBarcode} />
          <input type="hidden" name="product_name" value={product?.name || "DESCONOCIDO"} />
          <input type="hidden" name="deposited_by" value={operator || profile?.display_name || "Desconocido"} />
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

          <div className="mt-6 space-y-5 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6 lg:space-y-0">
            <div className="space-y-5">
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
              <AppSelect
                label="Motivo de merma"
                name="reason"
                value={reason}
                onChange={setReason}
                required
                buttonClassName="rounded-2xl px-4 py-3.5 text-base shadow-none"
                options={WASTE_REASONS.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
              />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Depositado por
                </span>
                {teamMembers.length > 0 ? (
                  <AppSelect
                    label="Depositado por"
                    name="deposited_by"
                    defaultValue={teamMembers.includes(operator) ? operator : ""}
                    required
                    buttonClassName="rounded-2xl px-4 py-3.5 text-base shadow-none"
                    options={[
                      { value: "", label: "Seleccionar..." },
                      ...teamMembers.map((name: string) => ({
                        value: name,
                        label: name,
                      })),
                    ]}
                  />
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
                  <AppSelect
                    label="Area / Cuadrante"
                    name="area"
                    defaultValue=""
                    required
                    buttonClassName="rounded-2xl px-4 py-3.5 text-base shadow-none"
                    options={[
                      { value: "", label: "Seleccionar..." },
                      ...areas.map((area: string) => ({
                        value: area,
                        label: area,
                      })),
                    ]}
                  />
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

              {isTransportReason && (
                <div className="space-y-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                  Datos del transporte
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Nombre del conductor
                    </span>
                    <input
                      name="transport_driver"
                      type="text"
                      required
                      className={inputBase}
                      placeholder="Ej. Nombre Apellido"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Placa del conductor
                    </span>
                    <input
                      name="transport_plate"
                      type="text"
                      required
                      className={inputBase}
                      placeholder="Ej. XYZ 123"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Novedad del transporte
                  </span>
                  <textarea
                    name="transport_comment"
                    rows={3}
                    className={`${inputBase} resize-none`}
                    placeholder="Describe brevemente el dano o la novedad detectada."
                  />
                </label>
                </div>
              )}

              {isQualityReason && (
                <div className="space-y-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                  Datos obligatorios de calidad
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Fecha de vencimiento
                    </span>
                    <input
                      name="quality_expiration_date"
                      type="text"
                      required
                      className={inputBase}
                      placeholder="Ej. 30/06/2026"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Lote
                    </span>
                    <input
                      name="quality_lot"
                      type="text"
                      required
                      className={inputBase}
                      placeholder="Ej. LT-001"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Proveedor
                  </span>
                  <input
                    name="quality_supplier"
                    type="text"
                    required
                    className={inputBase}
                    placeholder="Ej. Proveedor Nacional SAS"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Descripcion de la novedad
                  </span>
                  <textarea
                    name="transport_comment"
                    rows={3}
                    required
                    className={`${inputBase} resize-none`}
                    placeholder="Describe brevemente la novedad detectada."
                  />
                </label>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Evidencia requerida
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Toma primero la evidencia del caso y luego confirma la merma. En escritorio esta columna queda separada para revisar mÃ¡s fÃ¡cil quÃ© foto falta.
                </p>
              </div>

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

