"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertOctagon } from "lucide-react";
import type { DailyBasic } from "@/lib/domain/types";

export default function AnalyticsClient({ basics }: { basics: DailyBasic[] }) {
  const chartData = useMemo(() => {
    const assistantStats = new Map<
      string,
      { name: string; realizados: number; fallados: number }
    >();

    for (const b of basics) {
      if (!assistantStats.has(b.assigned_to)) {
        assistantStats.set(b.assigned_to, {
          name: b.assigned_to,
          realizados: 0,
          fallados: 0,
        });
      }

      const stats = assistantStats.get(b.assigned_to)!;
      if (b.status === "realizado") {
        stats.realizados += 1;
      } else if (b.status === "no_realizado" && b.fault === "asistente") {
        stats.fallados += 1;
      }
    }

    return Array.from(assistantStats.values()).sort(
      (a, b) => b.realizados - a.realizados,
    );
  }, [basics]);

  const topFailing = useMemo(() => {
    return [...chartData].sort((a, b) => b.fallados - a.fallados).slice(0, 3);
  }, [chartData]);

  const totalTasks = basics.length;
  const completedTasks = basics.filter((b) => b.status === "realizado").length;
  const complianceRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:max-w-3xl">
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm lg:min-h-[132px] lg:p-5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Cumplimiento
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-blue-600">
              {complianceRate}%
            </span>
          </div>
        </div>
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm lg:min-h-[132px] lg:p-5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Total Tareas
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-800">
              {totalTasks}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Lectura del equipo
            </p>
            <h3 className="mt-1 text-sm font-black uppercase tracking-wide text-slate-800">
              Rendimiento por asistente
            </h3>
          </div>
          <p className="max-w-sm text-right text-[11px] font-medium leading-relaxed text-slate-500">
            Comparativo visual entre tareas realizadas y fallas atribuibles al
            asistente.
          </p>
        </div>
        <div className="h-64 w-full lg:h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
              <Bar
                dataKey="realizados"
                name="Realizados"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
              <Bar
                dataKey="fallados"
                name="Fallados"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {topFailing.length > 0 && topFailing[0].fallados > 0 && (
        <div className="rounded-[28px] border border-red-100 bg-red-50 p-4 shadow-sm lg:p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-red-800">
              Atención requerida
            </h3>
          </div>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {topFailing
              .filter((assistant) => assistant.fallados > 0)
              .map((assistant) => (
                <div
                  key={assistant.name}
                  className="flex items-center justify-between rounded-xl bg-white p-3"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {assistant.name}
                  </span>
                  <span className="rounded-md bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                    {assistant.fallados} fallas
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
