"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ClientImpulseAnalytics({ records }: { records: any[] }) {
  const dataByAssistant = useMemo(() => {
    const map = new Map<string, any>();
    records.forEach(r => {
      if (!map.has(r.assistant)) {
        map.set(r.assistant, { name: r.assistant, total: 0, Nacional: 0, Regional: 0, "Fecha Pronta": 0 });
      }
      const entry = map.get(r.assistant);
      entry.total += r.quantity;
      if (entry[r.impulse_type] !== undefined) {
        entry[r.impulse_type] += r.quantity;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records]);

  const dataByType = useMemo(() => {
    let nac = 0, reg = 0, fcp = 0;
    records.forEach(r => {
      if (r.impulse_type === "Nacional") nac += r.quantity;
      else if (r.impulse_type === "Regional") reg += r.quantity;
      else if (r.impulse_type === "Fecha Pronta") fcp += r.quantity;
    });
    return [
      { name: "Nacional", value: nac, color: "#3b82f6" },
      { name: "Regional", value: reg, color: "#10b981" },
      { name: "Fecha Pronta", value: fcp, color: "#f59e0b" }
    ].filter(d => d.value > 0);
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 text-center text-sm text-slate-500">
        No hay datos registrados en esta semana.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Assistant */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mejor Vendedor</p>
          <p className="text-xl font-bold text-slate-800">{dataByAssistant[0]?.name}</p>
        </div>
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold text-lg">
          👑
        </div>
      </div>

      {/* Chart: Por Asistente */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Unidades por Asistente</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataByAssistant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar dataKey="Nacional" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Regional" stackId="a" fill="#10b981" />
              <Bar dataKey="Fecha Pronta" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart: Por Tipo */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Distribución por Tipo</h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataByType}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {dataByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
