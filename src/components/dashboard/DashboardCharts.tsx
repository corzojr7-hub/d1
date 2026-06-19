"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#0a58ca", "#e51d2e", "#f59e0b", "#10b981", "#8b5cf6"];

type TopProduct = {
  name: string;
  qty: number;
};

type ReasonData = {
  name: string;
  value: number;
};

export default function DashboardCharts({
  topProducts,
  reasonData,
  userWasteData,
}: {
  topProducts: TopProduct[];
  reasonData: ReasonData[];
  userWasteData?: ReasonData[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Top 5 Merma (Unidades)
        </h3>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="qty" fill="#0a58ca" radius={[0, 4, 4, 0]} barSize={20}>
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
          Distribución por Motivo
        </h3>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={reasonData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {reasonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} uds`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-50" />
          )}
        </div>
      </div>

      {userWasteData && userWasteData.length > 0 && (
        <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
            Merma por Registrador
          </h3>
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={userWasteData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                    {userWasteData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-2xl bg-slate-50" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
