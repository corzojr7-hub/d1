import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/supabase/require-auth";

export const ADMIN_PERIODS = [
  { key: "current", label: "Mes actual" },
  { key: "previous", label: "Mes pasado" },
  { key: "last30", label: "Ultimos 30 dias" },
] as const;

export type AdminPeriodKey = (typeof ADMIN_PERIODS)[number]["key"];

export type AdminSearchParams = Promise<{ period?: string }>;

export function resolveAdminPeriod(rawPeriod?: string) {
  const selected = ADMIN_PERIODS.some((item) => item.key === rawPeriod)
    ? (rawPeriod as AdminPeriodKey)
    : "current";
  const today = new Date();
  const start =
    selected === "previous"
      ? startOfMonth(subMonths(today, 1))
      : selected === "last30"
        ? subDays(today, 29)
        : startOfMonth(today);
  const end = selected === "previous" ? endOfMonth(subMonths(today, 1)) : today;

  return {
    key: selected,
    label: ADMIN_PERIODS.find((item) => item.key === selected)?.label || "Mes actual",
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    monthYear: format(start, "yyyy-MM"),
  };
}

export async function requireAdminContext() {
  const context = await requireAuth();

  if (context.profile.role !== "admin") {
    redirect("/");
  }

  return context;
}

export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
