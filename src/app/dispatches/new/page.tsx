"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { createDispatchDifference } from "../actions";

export default function NewDispatchDifferencePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [driverName, setDriverName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [category, setCategory] = useState("OTC");
  const [description, setDescription] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [materialCode, setMaterialCode] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [differenceType, setDifferenceType] = useState("Faltante");
  const [productValue, setProductValue] = useState("");
  const [unitsPerUmp, setUnitsPerUmp] = useState("");
  const [differenceUmp, setDifferenceUmp] = useState("");
  const [differenceUnits, setDifferenceUnits] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [receivedTotalValue, setReceivedTotalValue] = useState("");
  const [observations, setObservations] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !truckPlate || !dispatchDate || !description) {
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
    formData.append("material_code", materialCode);
    formData.append("material_description", materialDescription);
    formData.append("difference_type", differenceType);
    formData.append("product_value", productValue);
    formData.append("units_per_ump", unitsPerUmp);
    formData.append("difference_ump", differenceUmp);
    formData.append("difference_units", differenceUnits);
    formData.append("total_units", totalUnits);
    formData.append("received_total_value", receivedTotalValue);
    formData.append("observations", observations);
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
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-28 sm:max-w-2xl sm:px-6 md:max-w-4xl">
      <div className="mb-6 mt-6">
        <Link
          href="/dispatches"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Trazabilidad
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nueva Diferencia</h1>
        <p className="text-sm text-slate-500">
          Registra toda la diferencia del despacho desde el primer reporte.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                placeholder="Nombre del conductor"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Placa del vehiculo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={truckPlate}
              onChange={(e) => setTruckPlate(e.target.value)}
              placeholder="Ej: ABC123"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OTC">OTC</option>
              <option value="Fruver">Fruver</option>
              <option value="Cuadrante 1">Cuadrante 1</option>
              <option value="Estiba Completa">Estiba Completa</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Numero de tra
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Hash className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="Numero de transferencia"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Datos del material
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Codigo material
              </label>
              <input
                type="text"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                placeholder="Ej: 12008133"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Diferencia
              </label>
              <select
                value={differenceType}
                onChange={(e) => setDifferenceType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Faltante">Faltante</option>
                <option value="Sobrante">Sobrante</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Descripcion material
              </label>
              <input
                type="text"
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="Ej: X RAY DOL X 4 TABLETAS"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Valor producto
              </label>
              <input
                type="text"
                value={productValue}
                onChange={(e) => setProductValue(e.target.value)}
                placeholder="Ej: 6990000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Unidad por UMP
              </label>
              <input
                type="text"
                value={unitsPerUmp}
                onChange={(e) => setUnitsPerUmp(e.target.value)}
                placeholder="Ej: 48"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Diferencia UMP
              </label>
              <input
                type="text"
                value={differenceUmp}
                onChange={(e) => setDifferenceUmp(e.target.value)}
                placeholder="Ej: 2"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Diferencia unidad
              </label>
              <input
                type="text"
                value={differenceUnits}
                onChange={(e) => setDifferenceUnits(e.target.value)}
                placeholder="Ej: 96"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Total unidades
              </label>
              <input
                type="text"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="Ej: 96"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Valor total recibido
              </label>
              <input
                type="text"
                value={receivedTotalValue}
                onChange={(e) => setReceivedTotalValue(e.target.value)}
                placeholder="Ej: 67104000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Novedad detallada <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe que productos faltaron o sobraron..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
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
              placeholder="Ej: 20/06/2026, soporte entregado por conductor..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Foto del rotulo (opcional pero recomendada)
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
                    "Simulador de camara: Ingresa URL de la foto",
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
                  Tomar foto del rotulo o documento
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Soporte inicial de la diferencia
                </span>
              </button>
            )}
          </div>
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
    </div>
  );
}
