"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6"];

export default function PosMetricsCharts({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">No hay métricas de POS registradas aún.</p>
      </div>
    );
  }

  // Aggregate average productivity and sum of voids/cancellations by assistant
  const assistantStats: Record<string, { count: number; prodSum: number; cancels: number; voids: number }> = {};
  
  data.forEach((item) => {
    const name = item.assistant || "Desconocido";
    if (!assistantStats[name]) {
      assistantStats[name] = { count: 0, prodSum: 0, cancels: 0, voids: 0 };
    }
    assistantStats[name].count += 1;
    assistantStats[name].prodSum += Number(item.productivity || 0);
    assistantStats[name].cancels += Number(item.cancellations || 0);
    assistantStats[name].voids += Number(item.voids || 0);
  });

  const chartData = Object.entries(assistantStats).map(([name, stats]) => ({
    name,
    productividad: Math.round(stats.prodSum / stats.count),
    anulaciones: stats.cancels,
    voids: stats.voids,
    erroresTotales: stats.cancels + stats.voids
  })).sort((a, b) => b.productividad - a.productividad);

  return (
    <div className="space-y-6">
      {/* Productivity Bar Chart */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Productividad Media (Artículos/Min)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer minWidth={1} width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Bar dataKey="productividad" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Errors (Cancels + Voids) Chart */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Anulaciones y Voids Totales
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer minWidth={1} width="100%" height="100%">
            <BarChart
              data={chartData.sort((a,b) => b.erroresTotales - a.erroresTotales)}
              layout="vertical"
              margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                width={90}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Bar dataKey="anulaciones" stackId="a" fill="#ef4444" name="Anulaciones" radius={[0, 0, 0, 0]} barSize={24} />
              <Bar dataKey="voids" stackId="a" fill="#f59e0b" name="Voids" radius={[0, 4, 4, 0]} barSize={24} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

