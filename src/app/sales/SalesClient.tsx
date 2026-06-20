"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDaysInMonth,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { setMonthlyBudget, setDailySale, setWeeklyWaste } from "./actions";
import { SalesBudget, DailySale, WeeklyWaste } from "@/lib/domain/types";
import { TrendingUp, Target, Save, Calendar, AlertCircle } from "lucide-react";
import { useProfile } from "@/components/ui/ProfileContext";
import { toast } from "sonner";

function parseMoneyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoneyInput(value: string) {
  const digits = parseMoneyInput(value);
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export default function SalesClient({
  initialBudgets,
  initialSales,
  initialWaste,
}: {
  initialBudgets: SalesBudget[];
  initialSales: DailySale[];
  initialWaste: WeeklyWaste[];
}) {
  const { profile } = useProfile();
  const isSupervisor = profile?.role === "supervisor";
  const canCreateSale =
    profile?.role === "supervisor" ||
    profile?.role === "segundo_al_mando" ||
    profile?.role === "tercero_al_mando" ||
    profile?.role === "admin";
  const canEditSale = profile?.role === "supervisor" || profile?.role === "admin";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [budgetInput, setBudgetInput] = useState("");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saleAmount, setSaleAmount] = useState("");
  const [wasteAmount, setWasteAmount] = useState("");
  const [wasteWeek, setWasteWeek] = useState("");
  const [isSavingWaste, setIsSavingWaste] = useState(false);

  const currentMonthYear = format(currentDate, "yyyy-MM");
  const previousMonthDate = useMemo(() => subMonths(currentDate, 1), [currentDate]);
  const previousMonthYear = format(previousMonthDate, "yyyy-MM");

  const currentBudget = useMemo(() => {
    return initialBudgets.find((budget) => budget.month_year === currentMonthYear)?.budget_amount || 0;
  }, [initialBudgets, currentMonthYear]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBudgetInput(currentBudget > 0 ? formatMoneyInput(String(currentBudget)) : "");
    }, 0);
    return () => clearTimeout(timer);
  }, [currentBudget]);

  const monthSales = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return initialSales.filter((sale) => {
      const date = parseISO(sale.date);
      return isWithinInterval(date, { start, end });
    });
  }, [initialSales, currentDate]);

  const previousMonthSales = useMemo(() => {
    const start = startOfMonth(previousMonthDate);
    const end = endOfMonth(previousMonthDate);
    return initialSales.filter((sale) => {
      const date = parseISO(sale.date);
      return isWithinInterval(date, { start, end });
    });
  }, [initialSales, previousMonthDate]);

  const totalSalesMonth = monthSales.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const salesLifeForLife = useMemo(() => {
    const currentSalesByDay = new Map<number, number>();
    monthSales.forEach((sale) => {
      const day = parseISO(sale.date).getDate();
      currentSalesByDay.set(day, (currentSalesByDay.get(day) || 0) + Number(sale.amount));
    });

    const previousSalesByDay = new Map<number, number>();
    previousMonthSales.forEach((sale) => {
      const day = parseISO(sale.date).getDate();
      previousSalesByDay.set(day, (previousSalesByDay.get(day) || 0) + Number(sale.amount));
    });

    const cutoffDay =
      monthSales.length > 0
        ? Math.max(...monthSales.map((sale) => parseISO(sale.date).getDate()))
        : 0;

    const currentMtd = Array.from(currentSalesByDay.entries())
      .filter(([day]) => day <= cutoffDay)
      .reduce((sum, [, amount]) => sum + amount, 0);

    const previousMtd = Array.from(previousSalesByDay.entries())
      .filter(([day]) => day <= cutoffDay)
      .reduce((sum, [, amount]) => sum + amount, 0);

    const exactCurrent = cutoffDay > 0 ? currentSalesByDay.get(cutoffDay) || 0 : 0;
    const exactPrevious = cutoffDay > 0 ? previousSalesByDay.get(cutoffDay) || 0 : 0;

    const deltaPercent =
      previousMtd > 0 ? ((currentMtd - previousMtd) / previousMtd) * 100 : currentMtd > 0 ? 100 : 0;
    const dailyDeltaPercent =
      exactPrevious > 0
        ? ((exactCurrent - exactPrevious) / exactPrevious) * 100
        : exactCurrent > 0
          ? 100
          : 0;

    return {
      cutoffDay,
      currentMtd,
      previousMtd,
      exactCurrent,
      exactPrevious,
      deltaPercent,
      dailyDeltaPercent,
    };
  }, [monthSales, previousMonthSales]);

  const existingDailySale = useMemo(() => {
    return initialSales.find((sale) => sale.date === saleDate);
  }, [initialSales, saleDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (existingDailySale) {
        setSaleAmount(formatMoneyInput(String(existingDailySale.amount)));
      } else {
        setSaleAmount("");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [existingDailySale]);

  const daysInMonth = getDaysInMonth(currentDate);
  const daysWithSales = new Set(monthSales.map((sale) => sale.date)).size;
  const averageDailySale = daysWithSales > 0 ? totalSalesMonth / daysWithSales : 0;
  const forecastedTotal = averageDailySale * daysInMonth;
  const progressPercent = currentBudget > 0 ? (totalSalesMonth / currentBudget) * 100 : 0;
  const forecastPercent = currentBudget > 0 ? (forecastedTotal / currentBudget) * 100 : 0;

  const weeksInMonth = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
    const weeksMap = new Map<string, { start: Date; end: Date; sales: number; waste: number }>();

    days.forEach((day) => {
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");

      if (!weeksMap.has(weekKey)) {
        const wasteEntry = initialWaste.find((waste) => waste.week_start === weekKey);
        weeksMap.set(weekKey, {
          start: weekStart,
          end: weekEnd,
          sales: 0,
          waste: wasteEntry ? Number(wasteEntry.waste_amount) : 0,
        });
      }

      const daySaleStr = format(day, "yyyy-MM-dd");
      const sale = monthSales.find((item) => item.date === daySaleStr);
      if (sale) {
        const week = weeksMap.get(weekKey)!;
        week.sales += Number(sale.amount);
      }
    });

    return Array.from(weeksMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [currentDate, monthSales, initialWaste]);

  async function handleSaveBudget() {
    if (!budgetInput) return;
    startTransition(async () => {
      try {
        const res = await setMonthlyBudget(currentMonthYear, Number(parseMoneyInput(budgetInput)));
        if (!res.success) throw new Error(res.error);
        toast.success("Presupuesto guardado");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Error al guardar presupuesto");
      }
    });
  }

  async function handleSaveSale() {
    if (!saleDate || !saleAmount) return;
    startTransition(async () => {
      try {
        const res = await setDailySale(saleDate, Number(parseMoneyInput(saleAmount)));
        if (!res.success) throw new Error(res.error);
        setSaleAmount("");
        toast.success(res.mode === "updated" ? "Venta diaria actualizada" : "Venta diaria guardada");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Error al guardar venta");
      }
    });
  }

  async function handleSaveWaste(weekStart: string, weekEndIso: string, amountStr: string) {
    if (!amountStr) return;
    setIsSavingWaste(true);
    const endStr = format(weekEndIso, "yyyy-MM-dd");
    await setWeeklyWaste(weekStart, endStr, Number(parseMoneyInput(amountStr)));
    setIsSavingWaste(false);
    setWasteAmount("");
    setWasteWeek("");
    alert("Merma semanal guardada");
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);

  if (!isMounted) {
    return (
      <div className="flex justify-center p-10">
        <p className="text-sm font-bold text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 pt-6 pb-24 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8 lg:pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Volver
      </Link>

      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e51d2e]">Ventas</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0a3875]">Control comercial</h1>
          <p className="mt-1 text-sm font-medium capitalize text-slate-500">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Puedes cargar meses anteriores moviendo el mes y registrando la fecha exacta.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          >
            →
          </button>
        </div>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/40 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
          <Target className="h-4 w-4" /> Presupuesto del Mes
        </h2>
        {isSupervisor ? (
          <div className="mb-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Valor estimado ($)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={budgetInput}
                onChange={(e) => setBudgetInput(formatMoneyInput(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800"
                placeholder="Ej: 150000000"
              />
            </div>
            <button
              onClick={handleSaveBudget}
              className="h-10 rounded-xl bg-[#0a3875] px-4 text-sm font-bold text-white transition-transform active:scale-95"
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Presupuesto actual</p>
            <p className="text-lg font-black text-[#0a3875]">
              {currentBudget > 0 ? formatCurrency(currentBudget) : "Aun no asignado"}
            </p>
          </div>
        )}

        {currentBudget > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Venta acumulada</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalSalesMonth)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-400">Progreso</p>
                <p
                  className={`text-lg font-black ${
                    progressPercent >= 100 ? "text-emerald-500" : "text-[#0a3875]"
                  }`}
                >
                  {progressPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent >= 100 ? "bg-emerald-500" : "bg-[#e51d2e]"
                }`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-blue-50 p-3">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs font-bold text-blue-900">Pronostico (Run Rate)</p>
                <p className="mt-1 text-[11px] leading-tight text-blue-700">
                  Manteniendo el promedio actual de <b>{formatCurrency(averageDailySale)}/dia</b>,
                  cerraras el mes en <b>{formatCurrency(forecastedTotal)}</b> ({forecastPercent.toFixed(1)}%).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Life for Life
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Comparacion del corte actual frente al mismo corte del mes anterior.
          </p>
        </div>

        {salesLifeForLife.cutoffDay === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Aun no hay ventas registradas en este mes para comparar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Corte acumulado al dia {salesLifeForLife.cutoffDay}
                </p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {formatCurrency(salesLifeForLife.currentMtd)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Mes anterior: {formatCurrency(salesLifeForLife.previousMtd)}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-500">
                  Variacion acumulada
                </p>
                <p
                  className={`mt-2 text-lg font-black ${
                    salesLifeForLife.deltaPercent >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {salesLifeForLife.deltaPercent >= 0 ? "+" : ""}
                  {salesLifeForLife.deltaPercent.toFixed(1)}%
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {salesLifeForLife.deltaPercent >= 0 ? "Mejora" : "Caida"} frente a{" "}
                  {previousMonthYear}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Dia exacto vs mes anterior
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Dia {salesLifeForLife.cutoffDay}: {formatCurrency(salesLifeForLife.exactCurrent)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Mismo dia en {previousMonthYear}: {formatCurrency(salesLifeForLife.exactPrevious)}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                    salesLifeForLife.dailyDeltaPercent >= 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {salesLifeForLife.dailyDeltaPercent >= 0 ? "+" : ""}
                  {salesLifeForLife.dailyDeltaPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
          <Calendar className="h-4 w-4" /> Venta Diaria
        </h2>
        {canCreateSale ? (
          <div className="flex gap-3">
            <div className="w-1/3">
              <label className="text-[10px] font-bold uppercase text-slate-500">Dia</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-800"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Venta ($)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(formatMoneyInput(e.target.value))}
                  placeholder="Ej: 5000000"
                  disabled={Boolean(existingDailySale && !canEditSale)}
                  className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold text-slate-800 transition-colors ${
                    existingDailySale
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  } ${existingDailySale && !canEditSale ? "cursor-not-allowed opacity-70" : ""}`}
                />
                <button
                  onClick={handleSaveSale}
                  disabled={Boolean(existingDailySale && !canEditSale)}
                  className={`mt-1 h-10 rounded-xl px-4 text-sm font-bold text-white transition-all active:scale-95 ${
                    existingDailySale
                      ? canEditSale
                        ? "bg-emerald-600"
                        : "bg-slate-400"
                      : "bg-[#0a3875]"
                  } ${existingDailySale && !canEditSale ? "cursor-not-allowed" : ""}`}
                >
                  {existingDailySale ? (canEditSale ? "Editar" : "Bloqueado") : <Save className="h-4 w-4" />}
                </button>
              </div>
              {existingDailySale && canEditSale && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  ✓ Ya registrada (puedes editarla)
                </p>
              )}
              {existingDailySale && !canEditSale && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-600">
                  ✓ Ya registrada. Solo el supervisor puede editarla.
                </p>
              )}
              {!existingDailySale && !canEditSale && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                  Puedes registrar una venta nueva, pero no editar una ya cargada.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Solo supervisor, segunda o tercera encargada pueden registrar ventas
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-red-50/30 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
          <AlertCircle className="h-4 w-4" /> Cortes Semanales e Impacto Merma
        </h2>

        <div className="space-y-4">
          {weeksInMonth.map((week, idx) => {
            const isEditingWaste = wasteWeek === week.key;
            const impactPercent = week.sales > 0 ? (week.waste / week.sales) * 100 : 0;
            const weeklyBudget = currentBudget > 0 ? currentBudget / weeksInMonth.length : 0;
            const wasteGoal = weeklyBudget * 0.002;

            return (
              <div key={week.key} className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">
                  Semana {idx + 1} ({format(week.start, "dd MMM")} - {format(week.end, "dd MMM")})
                </p>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500">Ventas semana</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(week.sales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">
                      Merma ($){" "}
                      {wasteGoal > 0 && (
                        <span className="font-bold text-blue-600">
                          | Meta: {formatCurrency(wasteGoal)}
                        </span>
                      )}
                    </p>
                    {week.waste > 0 && !isEditingWaste ? (
                      <p
                        className="cursor-pointer text-sm font-black text-slate-800"
                        onClick={() => isSupervisor && setWasteWeek(week.key)}
                      >
                        {formatCurrency(week.waste)}
                      </p>
                    ) : isSupervisor ? (
                      <button
                        onClick={() => setWasteWeek(week.key)}
                        className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-[#0a3875]"
                      >
                        + INGRESAR
                      </button>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold text-slate-400">Sin registrar</p>
                    )}
                  </div>
                </div>

                {isEditingWaste && (
                  <div className="mb-3 flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Total Merma ($)"
                      value={wasteAmount}
                      onChange={(e) => setWasteAmount(formatMoneyInput(e.target.value))}
                      className="w-full rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleSaveWaste(week.key, week.end.toISOString(), wasteAmount)}
                      disabled={isSavingWaste}
                      className="rounded-lg bg-[#0a3875] px-3 text-xs font-bold text-white"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setWasteWeek("")}
                      className="px-2 text-xs font-bold text-blue-800"
                    >
                      X
                    </button>
                  </div>
                )}

                {week.waste > 0 && week.sales > 0 && (
                  <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Impacto sobre ventas
                      </p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          impactPercent > 0.2
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {impactPercent.toFixed(2)}%
                      </span>
                    </div>
                    {impactPercent <= 0.2 ? (
                      <p className="rounded-lg bg-emerald-50 px-2 py-1 text-center text-[10px] font-bold text-emerald-600">
                        Cumpliste la meta. No superaste el 0.20%
                      </p>
                    ) : (
                      <p className="rounded-lg bg-red-50 px-2 py-1 text-center text-[10px] font-bold text-red-600">
                        No cumpliste la meta. Te pasaste por {(impactPercent - 0.2).toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
          <Calendar className="h-4 w-4" /> Historial de {format(currentDate, "MMMM", { locale: es })}
        </h2>
        {monthSales.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Aun no hay ventas registradas en este mes
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...monthSales]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                >
                  <p className="text-xs font-bold text-slate-500">
                    {format(parseISO(sale.date), "EEEE dd", { locale: es }).toUpperCase()}
                  </p>
                  <p className="text-sm font-black text-slate-800">
                    {formatCurrency(Number(sale.amount))}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
