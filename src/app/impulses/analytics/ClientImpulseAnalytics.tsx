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
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ImpulseRecord = {
  assistant: string;
  impulse_type: string;
  quantity: number;
};

export default function ClientImpulseAnalytics({
  records,
}: {
  records: ImpulseRecord[];
}) {
  const dataByAssistant = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        total: number;
        Nacional: number;
        Regional: number;
        "Fecha Pronta": number;
      }
    >();

    records.forEach((record) => {
      if (!map.has(record.assistant)) {
        map.set(record.assistant, {
          name: record.assistant,
          total: 0,
          Nacional: 0,
          Regional: 0,
          "Fecha Pronta": 0,
        });
      }

      const entry = map.get(record.assistant);
      if (!entry) return;

      entry.total += record.quantity;
      if (entry[record.impulse_type as keyof typeof entry] !== undefined) {
        const key = record.impulse_type as "Nacional" | "Regional" | "Fecha Pronta";
        entry[key] += record.quantity;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records]);

  const dataByType = useMemo(() => {
    let nac = 0;
    let reg = 0;
    let fcp = 0;

    records.forEach((record) => {
      if (record.impulse_type === "Nacional") nac += record.quantity;
      else if (record.impulse_type === "Regional") reg += record.quantity;
      else if (record.impulse_type === "Fecha Pronta") fcp += record.quantity;
    });

    return [
      { name: "Nacional", value: nac, color: "#2563eb" },
      { name: "Regional", value: reg, color: "#059669" },
      { name: "Fecha Pronta", value: fcp, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
        No hay datos registrados en esta semana.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[24px] border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">
            Mejor registro
          </p>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {dataByAssistant[0]?.name}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Lidera el acumulado semanal de unidades impulsadas.
          </p>
          <div className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            {dataByAssistant[0]?.total || 0} unidades
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            Lectura rápida
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200/80 bg-white px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                Nacional
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {dataByType.find((item) => item.name === "Nacional")?.value || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-white px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                Regional
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {dataByType.find((item) => item.name === "Regional")?.value || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/80 bg-white px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                Fecha pronta
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {dataByType.find((item) => item.name === "Fecha Pronta")?.value || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Ranking por persona
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-900">
            Unidades por asistente
          </h2>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart
              data={dataByAssistant}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
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
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar
                dataKey="Nacional"
                stackId="a"
                fill="#2563eb"
                radius={[0, 0, 4, 4]}
              />
              <Bar dataKey="Regional" stackId="a" fill="#059669" />
              <Bar
                dataKey="Fecha Pronta"
                stackId="a"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Mezcla de campañas
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-900">
            Distribución por tipo
          </h2>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
