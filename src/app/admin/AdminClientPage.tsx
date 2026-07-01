"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Edit3,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AI_ACTIONS } from "@/lib/ai/usage";
import type {
  DailySale,
  Profile,
  SalesBudget,
  WeeklyWaste,
} from "@/lib/domain/types";
import { updateStoreInfo } from "./actions";

type AiUsageLog = {
  id: string;
  action_type: string;
  store_code: string;
  created_at: string;
  details: {
    model?: string;
    prompt_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
  };
};

export default function AdminClientPage({
  stores,
  globalSales,
  globalBudgets,
  globalWaste,
  aiUsageLogs,
}: {
  stores: Profile[];
  globalSales: DailySale[];
  globalBudgets: SalesBudget[];
  globalWaste: WeeklyWaste[];
  aiUsageLogs: AiUsageLog[];
}) {
  const [selectedStore, setSelectedStore] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"tiendas" | "dashboard">(
    "dashboard",
  );
  const router = useRouter();

  const realStores = stores.filter((store) => store.role === "supervisor");

  const kpiData = useMemo(() => {
    const storeStats = realStores.map((store) => {
      const budget =
        globalBudgets.find((item) => item.store_code === store.store_code)
          ?.budget_amount || 0;
      const sales = globalSales
        .filter((item) => item.store_code === store.store_code)
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const waste = globalWaste
        .filter((item) => item.store_code === store.store_code)
        .reduce((sum, item) => sum + Number(item.waste_amount), 0);

      return {
        store,
        budget,
        sales,
        waste,
        progress: budget > 0 ? (sales / budget) * 100 : 0,
        wastePercent: sales > 0 ? (waste / sales) * 100 : 0,
      };
    });

    const totalBudget = storeStats.reduce((sum, item) => sum + item.budget, 0);
    const totalSales = storeStats.reduce((sum, item) => sum + item.sales, 0);
    const totalWaste = storeStats.reduce((sum, item) => sum + item.waste, 0);

    return {
      totalBudget,
      totalSales,
      totalWaste,
      globalProgress: totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0,
      globalWastePercent: totalSales > 0 ? (totalWaste / totalSales) * 100 : 0,
      sortedByProgress: [...storeStats].sort((a, b) => b.progress - a.progress),
      sortedByWaste: [...storeStats].sort(
        (a, b) => b.wastePercent - a.wastePercent,
      ),
    };
  }, [globalBudgets, globalSales, globalWaste, realStores]);

  const aiUsageSummary = useMemo(() => {
    const scheduleLogs = aiUsageLogs.filter(
      (log) => log.action_type === AI_ACTIONS.schedule,
    );
    const feedbackLogs = aiUsageLogs.filter(
      (log) => log.action_type === AI_ACTIONS.feedback,
    );

    return {
      totalCostUsd: aiUsageLogs.reduce(
        (sum, log) => sum + Number(log.details?.estimated_cost_usd || 0),
        0,
      ),
      totalTokens: aiUsageLogs.reduce(
        (sum, log) => sum + Number(log.details?.total_tokens || 0),
        0,
      ),
      scheduleCount: scheduleLogs.length,
      feedbackCount: feedbackLogs.length,
    };
  }, [aiUsageLogs]);

  const adminHighlights = [
    {
      label: "Tiendas con estructura",
      value: realStores.length,
      tone: "bg-white/16 text-white ring-white/15",
    },
    {
      label: "Uso IA operativo",
      value: aiUsageSummary.scheduleCount + aiUsageSummary.feedbackCount,
      tone: "bg-white/12 text-white/90 ring-white/10",
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);

  const formatUsd = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-20 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <header className="rounded-[34px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-900 px-5 py-5 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.7)] ring-1 ring-white/10 lg:px-7 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-rose-200/80">
              Estructura de tienda
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-white lg:text-[2.25rem]">
              Estructura de tienda
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-300">
              Visión administrativa de tiendas, equipo, horarios y cuadrantes.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/16"
          >
            Volver al panel
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          {adminHighlights.map((item) => (
            <div
              key={item.label}
              className={`rounded-[24px] px-4 py-3 ring-1 backdrop-blur ${item.tone}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="mt-5 flex w-full rounded-[28px] border border-slate-200/80 bg-white/90 p-2 shadow-sm backdrop-blur">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[20px] px-3 text-sm font-bold transition-colors ${
            activeTab === "dashboard"
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Lectura global
        </button>
        <button
          onClick={() => setActiveTab("tiendas")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[20px] px-3 text-sm font-bold transition-colors ${
            activeTab === "tiendas"
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Store className="h-4 w-4" />
          Estructura de tienda
        </button>
      </div>

      <div className="py-4 sm:py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Ventas Globales Mes
                </p>
                <div className="flex items-end justify-between gap-4">
                  <h3 className="text-2xl font-black text-[#0a3875]">
                    {formatCurrency(kpiData.totalSales)}
                  </h3>
                  <span className="mb-1 text-xs font-bold text-slate-500">
                    / {formatCurrency(kpiData.totalBudget)}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      kpiData.globalProgress >= 100
                        ? "bg-emerald-500"
                        : "bg-[#0a3875]"
                    }`}
                    style={{ width: `${Math.min(kpiData.globalProgress, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-[#0a3875]">
                  {kpiData.globalProgress.toFixed(1)}% Cumplimiento Global
                </p>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Merma Global Mes
                </p>
                <h3 className="text-2xl font-black text-red-600">
                  {formatCurrency(kpiData.totalWaste)}
                </h3>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                  <AlertCircle
                    className={`h-4 w-4 ${
                      kpiData.globalWastePercent > 0.2
                        ? "text-red-500"
                        : "text-emerald-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      kpiData.globalWastePercent > 0.2
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {kpiData.globalWastePercent.toFixed(2)}% s/Ventas
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Costo IA Estimado Mes
                </p>
                <h3 className="text-2xl font-black text-violet-700">
                  {formatUsd(aiUsageSummary.totalCostUsd)}
                </h3>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Basado en tokens de Gemini 3.5 Flash.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                    Horarios: {aiUsageSummary.scheduleCount}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                    Correcciones IA: {aiUsageSummary.feedbackCount}
                  </span>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Consumo IA Mes
                </p>
                <h3 className="text-2xl font-black text-slate-900">
                  {new Intl.NumberFormat("es-CO").format(
                    aiUsageSummary.totalTokens,
                  )}
                </h3>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Tokens totales acumulados en horarios y cualificación de
                  mensajes.
                </p>
                <p className="mt-4 text-[11px] font-semibold text-slate-400">
                  Vista operativa estimada, no factura oficial del proveedor.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-800">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Ranking Ventas
                </h3>
                <div className="space-y-3">
                  {kpiData.sortedByProgress.map((stat, idx) => (
                    <div
                      key={stat.store.id}
                      className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {stat.store.store_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {stat.store.display_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-black ${
                            stat.progress >= 100
                              ? "text-emerald-600"
                              : "text-[#0a3875]"
                          }`}
                        >
                          {stat.progress.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatCurrency(stat.sales)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {kpiData.sortedByProgress.length === 0 && (
                    <p className="text-xs text-slate-400">
                      No hay tiendas registradas.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-800">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Alertas operativas
                </h3>
                <div className="space-y-3">
                  {kpiData.sortedByWaste.map((stat, idx) => {
                    if (stat.wastePercent === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={stat.store.id}
                        className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-500">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {stat.store.store_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {stat.store.display_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-black ${
                              stat.wastePercent > 0.2
                                ? "text-red-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {stat.wastePercent.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatCurrency(stat.waste)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {kpiData.sortedByWaste.filter((item) => item.wastePercent > 0)
                    .length === 0 && (
                    <p className="text-xs text-slate-400">
                      Sin registros de merma aún.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tiendas" && (
          <div>
            <div className="mb-6 flex flex-col gap-4 rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Directorio maestro
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-800">
                  Tiendas a tu cargo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Edita datos base y crea supervisores sin salir del backoffice.
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                + Nuevo Supervisor
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {realStores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-col rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
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
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title="Editar Tienda"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
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
                <div className="col-span-full rounded-[30px] border border-dashed border-slate-200 bg-white py-12 text-center">
                  <Store className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    Aún no has creado ninguna tienda o supervisor.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Ajuste operativo
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  Editar Datos ({selectedStore.store_code})
                </h3>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                const result = await updateStoreInfo(formData);
                if (result.error) {
                  toast.error(result.error);
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
                  Código de Tienda
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

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Alta de tienda
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  Crear Nuevo Supervisor
                </h3>
              </div>
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
                const result = await createSupervisor(formData);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success("Supervisor creado correctamente.");
                  setIsCreating(false);
                  router.refresh();
                }
              }}
              className="flex flex-col gap-4"
            >
              <label className="flex flex-col gap-1.5">
                <span className="pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Usuario (Login)
                </span>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="ej. supervisor.demo@tienda.com"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contraseña Temporal
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
                <span className="pl-2 text-[10px] text-slate-400">
                  Se le pedirá cambiarla al iniciar sesión.
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nombre del Supervisor
                </span>
                <input
                  name="supervisor_name"
                  required
                  placeholder="Ej. Nombre Apellido"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Código de Tienda
                </span>
                <input
                  name="store_code"
                  required
                  placeholder="Ej. 1234"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nombre de Tienda
                </span>
                <input
                  name="store_name"
                  required
                  placeholder="Ej. META PTO GAITÁN"
                  className="min-h-12 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div className="mt-8 flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
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
