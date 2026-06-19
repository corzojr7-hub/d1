"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, TrendingUp } from "lucide-react";
import type { DailySale } from "@/lib/domain/types";

type Period = "day" | "week" | "month";

type ChartPoint = {
  label: string;
  amount: number;
};

const periodOptions: { value: Period; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export default function SalesTrendsChart({ data }: { data: DailySale[] }) {
  const [period, setPeriod] = useState<Period>("day");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }),
    [],
  );
  const compactNumber = useMemo(
    () => new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }),
    [],
  );
  const today = useMemo(() => new Date(), []);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((sale) => {
      const key = sale.date.slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(sale.amount || 0));
    });
    return map;
  }, [data]);

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((sale) => {
      const key = sale.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + Number(sale.amount || 0));
    });
    return map;
  }, [data]);

  const { chartData, total, average, subtitle } = useMemo(() => {
    if (period === "month") {
      const months = Array.from({ length: 6 }, (_, index) => subMonths(today, 5 - index));
      const points: ChartPoint[] = months.map((monthDate) => {
        const key = format(monthDate, "yyyy-MM");
        return {
          label: format(monthDate, "MMM yy", { locale: es }),
          amount: monthlyTotals.get(key) || 0,
        };
      });

      const totalAmount = points.reduce((sum, point) => sum + point.amount, 0);
      return {
        chartData: points,
        total: totalAmount,
        average: points.length ? totalAmount / points.length : 0,
        subtitle: "Últimos 6 meses",
      };
    }

    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    if (period === "week") {
      const weeks = new Map<string, { label: string; amount: number; order: number }>();

      days.forEach((day) => {
        const weekStart = startOfWeek(day, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
        const key = format(weekStart, "yyyy-MM-dd");

        if (!weeks.has(key)) {
          weeks.set(key, {
            label: `${format(weekStart, "dd", { locale: es })} - ${format(weekEnd, "dd MMM", { locale: es })}`,
            amount: 0,
            order: weekStart.getTime(),
          });
        }

        const point = weeks.get(key)!;
        point.amount += dailyTotals.get(format(day, "yyyy-MM-dd")) || 0;
      });

      const points = Array.from(weeks.values())
        .sort((a, b) => a.order - b.order)
        .map(({ label, amount }) => ({ label, amount }));
      const totalAmount = points.reduce((sum, point) => sum + point.amount, 0);
      return {
        chartData: points,
        total: totalAmount,
        average: points.length ? totalAmount / points.length : 0,
        subtitle: "Semanas del mes actual",
      };
    }

    const points: ChartPoint[] = days.map((day) => ({
      label: format(day, "dd", { locale: es }),
      amount: dailyTotals.get(format(day, "yyyy-MM-dd")) || 0,
    }));
    const totalAmount = points.reduce((sum, point) => sum + point.amount, 0);
    return {
      chartData: points,
      total: totalAmount,
      average: points.length ? totalAmount / points.length : 0,
      subtitle: "Días del mes actual",
    };
  }, [dailyTotals, monthlyTotals, period, today]);

  if (!data.length || chartData.every((point) => point.amount === 0)) {
    return (
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-2xl bg-red-50 p-2 text-[#e51d2e]">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">Ventas</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Comportamiento de ventas</h3>
            <p className="mt-1 text-sm text-slate-500">Todavía no hay ventas para mostrar en este periodo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">Ventas</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Comportamiento de ventas</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="inline-flex self-start rounded-2xl bg-slate-50 p-1">
          {periodOptions.map((option) => {
            const active = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-red-50/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">Total del periodo</p>
          <p className="mt-1 text-sm font-black text-slate-900">{currency.format(total)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Promedio</p>
          <p className="mt-1 text-sm font-black text-slate-900">{currency.format(average)}</p>
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => compactNumber.format(Number(value))}
              />
              <Tooltip
                cursor={{ fill: "#fff1f2" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.12)",
                }}
                formatter={(value) => [currency.format(Number(value)), "Ventas"]}
              />
              <Bar dataKey="amount" fill="#e51d2e" radius={[12, 12, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-2xl bg-slate-50" />
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" />
        {period === "day" && "Vista diaria del mes actual"}
        {period === "week" && "Vista semanal del mes actual"}
        {period === "month" && "Vista mensual de los últimos 6 meses"}
      </p>
    </div>
  );
}
