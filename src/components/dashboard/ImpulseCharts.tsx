"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

type ImpulseRecord = {
  assistant?: string | null;
  quantity: number;
  date: string;
};

export default function ImpulseCharts({ data }: { data: ImpulseRecord[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">No hay datos de impulso registrados aún.</p>
      </div>
    );
  }

  // Aggregate by assistant
  const byAssistant: Record<string, number> = {};
  data.forEach((item) => {
    const name = item.assistant || "Desconocido";
    byAssistant[name] = (byAssistant[name] || 0) + item.quantity;
  });

  const assistantData = Object.entries(byAssistant)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Aggregate by Date for trend
  const byDate: Record<string, number> = {};
  data.forEach((item) => {
    const d = format(new Date(item.date), "dd MMM", { locale: es });
    byDate[d] = (byDate[d] || 0) + item.quantity;
  });

  const trendData = Object.entries(byDate).map(([date, value]) => ({ date, value }));

  return (
    <div className="space-y-6">
      {/* Trend Line Chart */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Evolución de Impulso Diario
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assistant Bar Chart */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Impulso por Colaborador
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart
              data={assistantData}
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
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                {assistantData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
