"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth, isWithinInterval, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { setMonthlyBudget, setDailySale, setWeeklyWaste } from "./actions";
import { SalesBudget, DailySale, WeeklyWaste } from "@/lib/domain/types";
import { TrendingUp, Target, Save, Calendar, AlertCircle } from "lucide-react";
import { useProfile } from '@/components/ui/ProfileContext';
import { toast } from 'sonner';

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

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  
  // States for forms
  const [isSavingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saleAmount, setSaleAmount] = useState("");
  const [isSavingSale] = useState(false);

  const [wasteAmount, setWasteAmount] = useState("");
  const [wasteWeek, setWasteWeek] = useState("");
  const [isSavingWaste, setIsSavingWaste] = useState(false);

  const currentMonthYear = format(currentDate, "yyyy-MM");
  
  const currentBudget = useMemo(() => {
    return initialBudgets.find(b => b.month_year === currentMonthYear)?.budget_amount || 0;
  }, [initialBudgets, currentMonthYear]);

  // Use budgetInput state only when editing
  useEffect(() => {
    const timer = setTimeout(() => {
      setBudgetInput(currentBudget > 0 ? currentBudget.toString() : "");
    }, 0);
    return () => clearTimeout(timer);
  }, [currentBudget]);

  const monthSales = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return initialSales.filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start, end });
    });
  }, [initialSales, currentDate]);

  const totalSalesMonth = monthSales.reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Pre-fill daily sale amount if it already exists
  const existingDailySale = useMemo(() => {
    return initialSales.find(s => s.date === saleDate);
  }, [initialSales, saleDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (existingDailySale) {
        setSaleAmount(existingDailySale.amount.toString());
      } else {
        setSaleAmount("");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [existingDailySale]);
  
  // Forecast
  const daysInMonth = getDaysInMonth(currentDate);
  const daysWithSales = new Set(monthSales.map(s => s.date)).size;
  const averageDailySale = daysWithSales > 0 ? totalSalesMonth / daysWithSales : 0;
  const forecastedTotal = averageDailySale * daysInMonth;
  const progressPercent = currentBudget > 0 ? (totalSalesMonth / currentBudget) * 100 : 0;
  const forecastPercent = currentBudget > 0 ? (forecastedTotal / currentBudget) * 100 : 0;

  // Weekly cuts
  const weeksInMonth = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    const weeksMap = new Map<string, { start: Date, end: Date, sales: number, waste: number }>();
    
    days.forEach(day => {
      // Use Monday as start of week
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      
      if (!weeksMap.has(weekKey)) {
        const wasteEntry = initialWaste.find(w => w.week_start === weekKey);
        weeksMap.set(weekKey, {
          start: weekStart,
          end: weekEnd,
          sales: 0,
          waste: wasteEntry ? Number(wasteEntry.waste_amount) : 0
        });
      }
      
      const daySaleStr = format(day, "yyyy-MM-dd");
      const sale = monthSales.find(s => s.date === daySaleStr);
      if (sale) {
        const w = weeksMap.get(weekKey)!;
        w.sales += Number(sale.amount);
      }
    });

    return Array.from(weeksMap.entries()).map(([key, data]) => ({
      key,
      ...data
    })).sort((a, b) => a.key.localeCompare(b.key));
  }, [currentDate, monthSales, initialWaste]);

  async function handleSaveBudget() {
    if (!budgetInput) return;
    startTransition(async () => {
      try {
        const res = await setMonthlyBudget(currentMonthYear, Number(budgetInput));
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
        const res = await setDailySale(saleDate, Number(saleAmount));
        if (!res.success) throw new Error(res.error);
        setSaleAmount("");
        toast.success("Venta diaria guardada");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Error al guardar venta");
      }
    });
  }

  async function handleSaveWaste(weekStart: string, weekEnd: string, amountStr: string) {
    if (!amountStr) return;
    setIsSavingWaste(true);
    const endStr = format(weekEnd, "yyyy-MM-dd");
    await setWeeklyWaste(weekStart, endStr, Number(amountStr));
    setIsSavingWaste(false);
    setWasteAmount("");
    setWasteWeek("");
    alert("Merma semanal guardada");
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

  if (!isMounted) return <div className="flex justify-center p-10"><p className="text-sm font-bold text-slate-400">Cargando...</p></div>;

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24 space-y-6 sm:max-w-2xl md:max-w-4xl md:px-6 lg:max-w-5xl lg:px-6 xl:max-w-6xl xl:px-8 lg:pt-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Volver
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0a3875] tracking-tight">Ventas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
          >
            ←
          </button>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
          >
            →
          </button>
        </div>
      </div>

      {/* Presupuesto */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" /> Presupuesto del Mes
        </h2>
        {isSupervisor ? (
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Valor estimado ($)</label>
              <input 
                type="number" 
                inputMode="decimal" 
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                placeholder="Ej: 150000000"
              />
            </div>
            <button 
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
              className="h-10 px-4 bg-[#0a3875] text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              {isSavingBudget ? "..." : <Save className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Presupuesto Actual</p>
            <p className="text-lg font-black text-[#0a3875]">{currentBudget > 0 ? formatCurrency(currentBudget) : "An no asignado"}</p>
          </div>
        )}

        {currentBudget > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Venta Acumulada</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalSalesMonth)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Progreso</p>
                <p className={`text-lg font-black ${progressPercent >= 100 ? 'text-emerald-500' : 'text-[#0a3875]'}`}>
                  {progressPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full transition-all ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#e51d2e]'}`} 
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              ></div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Pronóstico (Run Rate)</p>
                <p className="text-[11px] text-blue-700 leading-tight mt-1">
                  Manteniendo el promedio actual de <b>{formatCurrency(averageDailySale)}/día</b>, cerrarás el mes en <b>{formatCurrency(forecastedTotal)}</b> ({forecastPercent.toFixed(1)}%).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Registro de Venta Diaria */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Venta Diaria
        </h2>
        {isSupervisor ? (
          <div className="flex gap-3">
            <div className="w-1/3">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Da</label>
              <input 
                type="date" 
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full mt-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Venta ($)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  inputMode="decimal" 
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  placeholder="Ej: 5000000"
                  className={`w-full mt-1 px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold text-slate-800 transition-colors ${existingDailySale ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
                />
                <button 
                  onClick={handleSaveSale}
                  disabled={isSavingSale}
                  className={`h-10 mt-1 px-4 text-white rounded-xl text-sm font-bold active:scale-95 transition-all ${existingDailySale ? 'bg-emerald-600' : 'bg-[#0a3875]'}`}
                >
                  {isSavingSale ? "..." : (existingDailySale ? "Editar" : <Save className="w-4 h-4" />)}
                </button>
              </div>
              {existingDailySale && (
                <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                  ✓ Ya registrada (puedes editarla)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400">Solo el supervisor puede registrar la venta diaria</p>
          </div>
        )}
      </section>

      {/* Cortes Semanales */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Cortes Semanales e Impacto Merma
        </h2>
        
        <div className="space-y-4">
          {weeksInMonth.map((week, idx) => {
            const isEditingWaste = wasteWeek === week.key;
            const impactPercent = week.sales > 0 ? (week.waste / week.sales) * 100 : 0;
            const weeklyBudget = currentBudget > 0 ? currentBudget / weeksInMonth.length : 0;
            const wasteGoal = weeklyBudget * 0.0020; // 0.20%
            
            return (
              <div key={week.key} className="border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                  Semana {idx + 1} ({format(week.start, "dd MMM")} - {format(week.end, "dd MMM")})
                </p>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Ventas Semana</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(week.sales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Merma ($) {wasteGoal > 0 && <span className="font-bold text-blue-600">| Meta: {formatCurrency(wasteGoal)}</span>}</p>
                    {week.waste > 0 && !isEditingWaste ? (
                      <p className="text-sm font-black text-slate-800 cursor-pointer" onClick={() => isSupervisor && setWasteWeek(week.key)}>
                        {formatCurrency(week.waste)}
                      </p>
                    ) : isSupervisor ? (
                      <button 
                        onClick={() => setWasteWeek(week.key)}
                        className="text-[10px] font-bold text-[#0a3875] bg-blue-50 px-2 py-1 rounded-lg mt-1"
                      >
                        + INGRESAR
                      </button>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-400 mt-1">Sin registrar</p>
                    )}
                  </div>
                </div>

                {isEditingWaste && (
                  <div className="flex gap-2 mb-3 bg-blue-50 p-2 rounded-xl border border-blue-100">
                    <input 
                      type="number"
                      inputMode="decimal"
                      placeholder="Total Merma ($)"
                      value={wasteAmount}
                      onChange={(e) => setWasteAmount(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs font-bold border border-blue-200"
                    />
                    <button 
                      onClick={() => handleSaveWaste(week.key, week.end.toISOString(), wasteAmount)}
                      disabled={isSavingWaste}
                      className="bg-[#0a3875] text-white px-3 rounded-lg text-xs font-bold"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setWasteWeek("")} className="px-2 text-xs text-blue-800 font-bold">X</button>
                  </div>
                )}

                {(week.waste > 0 && week.sales > 0) && (
                  <div className="pt-3 border-t border-slate-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Impacto sobre ventas</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${impactPercent > 0.20 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {impactPercent.toFixed(2)}%
                      </span>
                    </div>
                    {impactPercent <= 0.20 ? (
                      <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-center">
                        ✅ ¡Cumpliste la meta! No superaste el 0.20%
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg text-center">
                        ❌ No cumpliste la meta. Te pasaste por {(impactPercent - 0.20).toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Historial de Ventas del Mes */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Historial de {format(currentDate, "MMMM", { locale: es })}
        </h2>
        {monthSales.length === 0 ? (
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-bold text-slate-400">Aún no hay ventas registradas en este mes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...monthSales].sort((a, b) => b.date.localeCompare(a.date)).map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl">
                <p className="text-xs font-bold text-slate-500">{format(parseISO(sale.date), "EEEE dd", { locale: es }).toUpperCase()}</p>
                <p className="text-sm font-black text-slate-800">{formatCurrency(Number(sale.amount))}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
