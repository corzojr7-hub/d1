"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Truck, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createDispatchDifference } from "../actions";

export default function NewDispatchDifferencePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [driverName, setDriverName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [category, setCategory] = useState("Cuadrante 1");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !truckPlate || !dispatchDate || !description) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    const formData = new FormData();
    formData.append("driver_name", driverName);
    formData.append("truck_plate", truckPlate);
    formData.append("dispatch_date", dispatchDate);
    formData.append("category", category);
    formData.append("description", description);
    if (evidenceUrl) {
      formData.append("initial_evidence_url", evidenceUrl);
    }

    startTransition(async () => {
      const res = await createDispatchDifference(formData);
      if (res.success) {
        toast.success("Diferencia de despacho creada exitosamente");
        router.push("/dispatches");
      } else {
        toast.error(res.error || "Error al crear la diferencia");
      }
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl px-4 sm:px-6">
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
          Registra una diferencia de despacho para iniciar su seguimiento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Conductor <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Truck className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nombre del conductor"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Placa del Vehículo <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={truckPlate}
              onChange={(e) => setTruckPlate(e.target.value)}
              placeholder="Ej: ABC-123"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha de Despacho <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                required
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Categoría <span className="text-red-500">*</span></label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Cuadrante 1">Cuadrante 1</option>
              <option value="OTC">OTC</option>
              <option value="Fruber">Fruber</option>
              <option value="Estiba Completa">Estiba Completa</option>
              <option value="Aseo">Aseo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Novedad Detallada <span className="text-red-500">*</span></label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué productos faltaron o sobraron..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Foto del Rótulo (Opcional pero recomendada)</label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
            {evidenceUrl ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
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
                  const url = prompt("Simulador de cámara: Ingresa URL de la foto (o deja predeterminada)", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=200&auto=format&fit=crop");
                  if (url) setEvidenceUrl(url);
                }}
                className="flex flex-col items-center w-full"
              >
                <div className="bg-blue-50 p-3 rounded-full mb-3">
                  <UploadCloud className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Tomar foto del rótulo o documento</span>
                <span className="text-xs text-slate-500 mt-1">Soporte inicial de la diferencia</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isPending ? "Guardando..." : (
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
