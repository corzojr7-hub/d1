"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Store, Users, Edit3, X, TrendingUp, AlertCircle, BarChart3 } from "lucide-react";
import { updateStoreInfo } from "./actions";
import { toast } from "sonner";
import type { Profile, DailySale, SalesBudget, WeeklyWaste } from "@/lib/domain/types";

export default function AdminClientPage({ 
  stores, 
  globalSales, 
  globalBudgets, 
  globalWaste 
}: { 
  stores: Profile[];
  globalSales: DailySale[];
  globalBudgets: SalesBudget[];
  globalWaste: WeeklyWaste[];
}) {
  const [selectedStore, setSelectedStore] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"tiendas" | "dashboard">("dashboard");

  // Filtrar solo tiendas reales (que no sean el admin central)
  const realStores = stores.filter(s => s.role === 'supervisor');

  // Calcular KPIs Globales
  const kpiData = useMemo(() => {
    let totalBudget = 0;
    let totalSales = 0;
    let totalWaste = 0;
    
    const storeStats = realStores.map(store => {
      const sBudget = globalBudgets.find(b => b.store_code === store.store_code)?.budget_amount || 0;
      const sSales = globalSales.filter(s => s.store_code === store.store_code).reduce((sum, s) => sum + Number(s.amount), 0);
      const sWaste = globalWaste.filter(w => w.store_code === store.store_code).reduce((sum, w) => sum + Number(w.waste_amount), 0);
      
      totalBudget += sBudget;
      totalSales += sSales;
      totalWaste += sWaste;

      return {
        store,
        budget: sBudget,
        sales: sSales,
        waste: sWaste,
        progress: sBudget > 0 ? (sSales / sBudget) * 100 : 0,
        wastePercent: sSales > 0 ? (sWaste / sSales) * 100 : 0
      };
    });

    const sortedByProgress = [...storeStats].sort((a, b) => b.progress - a.progress);
    const sortedByWaste = [...storeStats].sort((a, b) => b.wastePercent - a.wastePercent);

    return {
      totalBudget,
      totalSales,
      totalWaste,
      globalProgress: totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0,
      globalWastePercent: totalSales > 0 ? (totalWaste / totalSales) * 100 : 0,
      sortedByProgress,
      sortedByWaste
    };
  }, [realStores, globalSales, globalBudgets, globalWaste]);

  const formatCurrency = (val: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-slate-50 pb-20">
      <header className="sticky top-0 z-40 bg-zinc-900 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight text-white">
              Backoffice Central
            </h1>
            <p className="text-xs text-zinc-400">
              Gestin Maestra de Tiendas
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-700"
          >
            Volver a mi tienda
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex w-full border-b border-slate-200 bg-white px-4">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold transition-colors ${activeTab === 'dashboard' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <BarChart3 className="h-4 w-4" />
          KPI Globales
        </button>
        <button 
          onClick={() => setActiveTab("tiendas")}
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold transition-colors ${activeTab === 'tiendas' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Store className="h-4 w-4" />
          Gestin de Tiendas
        </button>
      </div>

      <div className="p-4 sm:p-6">
        
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Global Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ventas Globales Mes</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-2xl font-black text-[#0a3875]">{formatCurrency(kpiData.totalSales)}</h3>
                  <span className="text-xs font-bold text-slate-500 mb-1">/ {formatCurrency(kpiData.totalBudget)}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className={`h-full rounded-full ${kpiData.globalProgress >= 100 ? 'bg-emerald-500' : 'bg-[#0a3875]'}`}
                    style={{ width: `${Math.min(kpiData.globalProgress, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-[#0a3875]">{kpiData.globalProgress.toFixed(1)}% Cumplimiento Global</p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Merma Global Mes</p>
                <h3 className="text-2xl font-black text-red-600">{formatCurrency(kpiData.totalWaste)}</h3>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                  <AlertCircle className={`h-4 w-4 ${kpiData.globalWastePercent > 0.20 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <span className={`text-xs font-bold ${kpiData.globalWastePercent > 0.20 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {kpiData.globalWastePercent.toFixed(2)}% s/Ventas
                  </span>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Ventas */}
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Ranking Ventas
                </h3>
                <div className="space-y-3">
                  {kpiData.sortedByProgress.map((stat, idx) => (
                    <div key={stat.store.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">{idx + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{stat.store.store_name}</p>
                          <p className="text-[10px] text-slate-400">{stat.store.display_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${stat.progress >= 100 ? 'text-emerald-600' : 'text-[#0a3875]'}`}>{stat.progress.toFixed(1)}%</p>
                        <p className="text-[10px] text-slate-400">{formatCurrency(stat.sales)}</p>
                      </div>
                    </div>
                  ))}
                  {kpiData.sortedByProgress.length === 0 && <p className="text-xs text-slate-400">No hay tiendas registradas.</p>}
                </div>
              </div>

              {/* Top Merma (Peores) */}
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Alerta Merma (Ms Altas)
                </h3>
                <div className="space-y-3">
                  {kpiData.sortedByWaste.map((stat, idx) => {
                    if (stat.wastePercent === 0) return null;
                    return (
                      <div key={stat.store.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-500">{idx + 1}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{stat.store.store_name}</p>
                            <p className="text-[10px] text-slate-400">{stat.store.display_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${stat.wastePercent > 0.20 ? 'text-red-600' : 'text-emerald-600'}`}>{stat.wastePercent.toFixed(2)}%</p>
                          <p className="text-[10px] text-slate-400">{formatCurrency(stat.waste)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {kpiData.sortedByWaste.filter(s => s.wastePercent > 0).length === 0 && <p className="text-xs text-slate-400">Sin registros de merma an.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tiendas" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">Tiendas a tu cargo</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              >
                + Nuevo Supervisor
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {realStores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Tienda {store.store_code}
                      </span>
                      <span className="text-base font-extrabold leading-tight text-slate-800">
                        {store.store_name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedStore(store)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Editar Tienda"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Supervisor
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {store.display_name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {store.email}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {realStores.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Store className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    An no has creado ninguna tienda o supervisor.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edicin */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Editar Datos ({selectedStore.store_code})
              </h3>
              <button
                onClick={() => setSelectedStore(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                const res = await updateStoreInfo(formData);
                if (res.error) {
                  toast.error(res.error);
                } else {
                  toast.success("Tienda actualizada.");
                  setSelectedStore(null);
                }
              }}
              className="space-y-4"
            >
              <input type="hidden" name="profile_id" value={selectedStore.id} />
              
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Nombre de la Tienda
                </span>
                <input
                  name="store_name"
                  defaultValue={selectedStore.store_name}
                  required
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Cdigo de Tienda
                </span>
                <input
                  name="store_code"
                  defaultValue={selectedStore.store_code}
                  required
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Nombre del Supervisor
                </span>
                <input
                  name="display_name"
                  defaultValue={selectedStore.display_name}
                  required
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div className="mt-8 flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center rounded-full bg-zinc-900 font-bold text-white transition-all hover:bg-zinc-800 active:scale-95"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className="flex min-h-12 w-full items-center justify-center rounded-full bg-white font-bold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Creacin */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Crear Nuevo Supervisor
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                const { createSupervisor } = await import("./actions");
                const res = await createSupervisor(formData);
                if (res.error) {
                  toast.error(res.error);
                } else {
                  toast.success("Supervisor creado correctamente.");
                  setIsCreating(false);
                }
              }}
              className="flex flex-col gap-4"
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                  Correo Electrnico (Login)
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ej. dairo@tiendad1.com"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                  Contrasea Temporal
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Mnimo 6 caracteres"
                  minLength={6}
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
                <span className="pl-2 text-[10px] text-slate-400">Se le pedirǭ cambiarla al iniciar sesin.</span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                  Nombre del Supervisor
                </span>
                <input
                  name="supervisor_name"
                  required
                  placeholder="Ej. Dairo Corzo"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                  Cdigo de Tienda
                </span>
                <input
                  name="store_code"
                  required
                  placeholder="Ej. 1234"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                  Nombre de Tienda
                </span>
                <input
                  name="store_name"
                  required
                  placeholder="Ej. META PTO GAITAN"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div className="mt-8 flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center rounded-full bg-blue-600 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Crear Supervisor
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex min-h-12 w-full items-center justify-center rounded-full bg-white font-bold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
