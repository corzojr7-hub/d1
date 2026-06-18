"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { DailyBasic } from "@/lib/domain/types";
import { TrendingDown, TrendingUp, AlertOctagon } from "lucide-react";

export default function AnalyticsClient({ basics }: { basics: DailyBasic[] }) {
  const chartData = useMemo(() => {
    const assistantStats = new Map<string, { name: string; realizados: number; fallados: number }>();

    for (const b of basics) {
      if (!assistantStats.has(b.assigned_to)) {
        assistantStats.set(b.assigned_to, { name: b.assigned_to, realizados: 0, fallados: 0 });
      }
      
      const stats = assistantStats.get(b.assigned_to)!;
      if (b.status === "realizado") {
        stats.realizados += 1;
      } else if (b.status === "no_realizado" && b.fault === "asistente") {
        stats.fallados += 1;
      }
    }

    return Array.from(assistantStats.values()).sort((a, b) => b.realizados - a.realizados);
  }, [basics]);

  const topFailing = useMemo(() => {
    return [...chartData].sort((a, b) => b.fallados - a.fallados).slice(0, 3);
  }, [chartData]);

  const totalTasks = basics.length;
  const completedTasks = basics.filter(b => b.status === 'realizado').length;
  const complianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Resumen Global */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-center items-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cumplimiento</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-blue-600">{complianceRate}%</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-center items-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Tareas</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-800">{totalTasks}</span>
          </div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Rendimiento por Asistente</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey="realizados" name="Realizados" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="fallados" name="Fallados" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Fallas */}
      {topFailing.length > 0 && topFailing[0].fallados > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Atención Requerida</h3>
          </div>
          <div className="space-y-2">
            {topFailing.filter(a => a.fallados > 0).map(a => (
              <div key={a.name} className="flex justify-between items-center bg-white p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-700">{a.name}</span>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md">
                  {a.fallados} fallas
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
