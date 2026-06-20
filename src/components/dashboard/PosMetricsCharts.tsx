"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PosMetricRecord = {
  assistant?: string | null;
  productivity?: number | null;
  scan?: number | null;
  cancellations?: number | null;
  voids?: number | null;
  date: string;
};

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(`${date}T12:00:00`));
}

export default function PosMetricsCharts({ data }: { data: PosMetricRecord[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">No hay metricas de POS registradas aun.</p>
      </div>
    );
  }

  const dailyStats: Record<
    string,
    {
      count: number;
      productivitySum: number;
      scanSum: number;
      cancellationsSum: number;
      voidsSum: number;
    }
  > = {};

  data.forEach((item) => {
    if (!dailyStats[item.date]) {
      dailyStats[item.date] = {
        count: 0,
        productivitySum: 0,
        scanSum: 0,
        cancellationsSum: 0,
        voidsSum: 0,
      };
    }
    dailyStats[item.date].count += 1;
    dailyStats[item.date].productivitySum += Number(item.productivity || 0);
    dailyStats[item.date].scanSum += Number(item.scan || 0);
    dailyStats[item.date].cancellationsSum += Number(item.cancellations || 0);
    dailyStats[item.date].voidsSum += Number(item.voids || 0);
  });

  const chartData = Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      label: formatShortDate(date),
      productividad: Number((stats.productivitySum / stats.count).toFixed(1)),
      escaneo: Number((stats.scanSum / stats.count).toFixed(1)),
      cancelaciones: stats.cancellationsSum,
      anulaciones: stats.voidsSum,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Articulos por minuto
          </h3>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
            Meta 30
          </span>
        </div>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="productividad" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Escaneo
          </h3>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-700">
            Meta 15+
          </span>
        </div>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="escaneo" fill="#0ea5e9" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Cancelaciones
          </h3>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
            Diario
          </span>
        </div>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="cancelaciones" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Anulaciones
          </h3>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
            Diario
          </span>
        </div>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="anulaciones" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>
    </div>
  );
}
