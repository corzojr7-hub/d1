"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  Truck,
  Calendar,
  FileText,
  CheckCircle2,
  Hash,
  Package,
  ClipboardList,
  Camera,
  Search,
  Barcode,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import AppSelect from "@/components/dashboard/AppSelect";
import BarcodeScanner from "@/components/waste/BarcodeScanner";
import { useProfile } from "@/components/ui/ProfileContext";
import { findProductByBarcode } from "@/app/waste/actions";
import { createDispatchDifference } from "../actions";

function money(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO").format(Number(digits));
}

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}

export default function NewDispatchDifferencePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [isPending, startTransition] = useTransition();
  const [isSearchingProduct, startProductSearch] = useTransition();

  const [driverName, setDriverName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [category, setCategory] = useState("OTC");
  const [description, setDescription] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [ean, setEan] = useState("");
  const [productName, setProductName] = useState("");
  const [differenceType, setDifferenceType] = useState("Faltante");
  const [totalUnits, setTotalUnits] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [observations, setObservations] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const storeName = profile?.store_name || "TIENDA";
  const storeCode = profile?.store_code || "";

  const reportText = useMemo(() => {
    const lines = [
      "*REPORTE DE DIFERENCIA DE DESPACHO*",
      `Tienda: *${storeName.toUpperCase()}*`,
      storeCode ? `Codigo tienda: _${storeCode}_` : "",
      dispatchDate ? `Fecha de despacho: ${dispatchDate}` : "",
      driverName ? `Conductor: ${driverName}` : "",
      truckPlate ? `Placa: ${truckPlate.toUpperCase()}` : "",
      category ? `Categoria: ${category}` : "",
      transferNumber ? `Numero de DETRA: ${transferNumber}` : "",
      ean ? `EAN: ${ean}` : "",
      productName ? `Producto: ${productName}` : "",
      differenceType ? `Diferencia: ${differenceType}` : "",
      totalUnits ? `Total unidades: ${totalUnits}` : "",
      totalValue ? `Total valor: ${money(totalValue)}` : "",
      description ? `Novedad: ${description}` : "",
      observations ? `Observaciones: ${observations}` : "",
    ];

    return lines.filter(Boolean).join("\n");
  }, [
    category,
    description,
    differenceType,
    dispatchDate,
    driverName,
    ean,
    observations,
    productName,
    storeCode,
    storeName,
    totalUnits,
    totalValue,
    transferNumber,
    truckPlate,
  ]);

  const lookupProduct = (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized) {
      toast.error("Ingresa o escanea un EAN.");
      return;
    }

    setEan(normalized);
    startProductSearch(async () => {
      try {
        const product = await findProductByBarcode(normalized);
        if (product) {
          setProductName(product.name);
          toast.success("Producto encontrado.");
          return;
        }

        setProductName("");
        toast.error("No encontré ese EAN en productos.");
      } catch {
        toast.error("No se pudo consultar el EAN.");
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !driverName ||
      !truckPlate ||
      !dispatchDate ||
      !description ||
      !productName ||
      !totalUnits ||
      !totalValue
    ) {
      toast.error("Completa los campos obligatorios.");
      return;
    }

    const formData = new FormData();
    formData.append("driver_name", driverName);
    formData.append("truck_plate", truckPlate);
    formData.append("dispatch_date", dispatchDate);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("transfer_number", transferNumber);
    formData.append("material_code", ean);
    formData.append("material_description", productName);
    formData.append("difference_type", differenceType);
    formData.append("total_units", totalUnits);
    formData.append("received_total_value", totalValue.replace(/[^\d]/g, ""));
    formData.append("observations", observations);
    formData.append("report_text", reportText);
    if (evidenceUrl) formData.append("initial_evidence_url", evidenceUrl);

    startTransition(async () => {
      const res = await createDispatchDifference(formData);
      if (res.success) {
        toast.success("Diferencia de despacho creada.");
        router.push("/dispatches");
      } else {
        toast.error(res.error || "Error al crear la diferencia.");
      }
    });
  };

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-6xl 2xl:px-10">
      <div className="mb-6 mt-6 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:mt-0 lg:p-6">
        <Link
          href="/dispatches"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Trazabilidad
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nueva Diferencia</h1>
        <p className="text-sm text-slate-500">
          Registra la diferencia del despacho y deja el reporte listo para copiar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:space-y-7 lg:p-7"
      >
        <div className="grid grid-cols-1 gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 md:grid-cols-2 lg:p-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Conductor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Truck className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Ej: Pepito Perez"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Placa del vehículo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={truckPlate}
              onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
              placeholder="Ej: ABC 123"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Fecha de despacho <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                required
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Categoría <span className="text-red-500">*</span>
            </label>
            <AppSelect
              label="Categoría"
              value={category}
              onChange={setCategory}
              buttonClassName="rounded-xl bg-white px-4 py-2.5 text-sm shadow-none"
              options={[
                { value: "OTC", label: "OTC" },
                { value: "Fruver", label: "Fruver" },
                { value: "Cuadrante 1", label: "Cuadrante 1" },
                { value: "Estiba completa", label: "Estiba completa" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Número de detra
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Hash className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="Número de transferencia"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 lg:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Datos del producto
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                EAN del producto
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="Escanea o escribe el EAN"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => lookupProduct(ean)}
                  disabled={isSearchingProduct}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {isSearchingProduct ? "Buscando..." : "Buscar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4" />
                  Escanear
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Se llena al buscar el EAN o puedes ajustarlo manualmente"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Diferencia
              </label>
              <AppSelect
                label="Diferencia"
                value={differenceType}
                onChange={setDifferenceType}
                buttonClassName="rounded-xl bg-white px-4 py-2.5 text-sm shadow-none"
                options={[
                  { value: "Faltante", label: "Faltante" },
                  { value: "Sobrante", label: "Sobrante" },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Total de unidades <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="Ej: 96"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Total en valor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={totalValue}
                onChange={(e) => setTotalValue(money(e.target.value))}
                placeholder="Ej: 67.104.000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 lg:p-5">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Novedad detallada <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué faltó o qué sobró en el despacho..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 lg:p-5">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Observaciones o detalles
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-3">
              <ClipboardList className="h-4 w-4 text-slate-400" />
            </div>
            <textarea
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej: soporte recibido, observación del conductor, estado del despacho..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 lg:p-5">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Foto del rótulo (opcional pero recomendada)
          </label>
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:bg-slate-50">
            {evidenceUrl ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-slate-700">Foto adjunta correctamente</p>
                <button
                  type="button"
                  onClick={() => setEvidenceUrl("")}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Quitar foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const url = prompt(
                    "Simulador de cámara: ingresa URL de la foto",
                    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=200&auto=format&fit=crop",
                  );
                  if (url) setEvidenceUrl(url);
                }}
                className="flex w-full flex-col items-center"
              >
                <div className="mb-3 rounded-full bg-blue-50 p-3">
                  <UploadCloud className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Tomar foto del rótulo o documento
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Soporte inicial de la diferencia
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-blue-50/60 p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                Vista previa
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Reporte listo para grupos
              </h2>
            </div>
            <button
              type="button"
              onClick={async () => {
                await copyToClipboard(reportText);
                toast.success("Reporte copiado.");
              }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-[20px] bg-white px-4 py-4 text-sm leading-6 text-slate-700 ring-1 ring-blue-100">
            {reportText}
          </pre>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-70"
        >
          {isPending ? (
            "Guardando..."
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Registrar Diferencia
            </>
          )}
        </button>
      </form>

      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setShowScanner(false);
            lookupProduct(barcode);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
