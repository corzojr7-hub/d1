import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Centro de control del supervisor - Sistema de Control Operativo de Tienda",
};

function getBogotaCalendar(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  return { year, month, day };
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const supabase = await createClient();
  const { profile } = await requireAuth();

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("store_code, requires_password_change")
    .eq("user_id", user?.id)
    .single();

  if (currentUserProfile?.requires_password_change) {
    redirect("/update-password");
  }

  const { year, month, day } = getBogotaCalendar();
  const currentMonthYear = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${currentMonthYear}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const [
    { count: pendingCount },
    { data: currentBudgetRow },
    { data: monthlySales },
    { data: preShiftData },
  ] = await Promise.all([
    supabase
      .from("instructions")
      .select("*", { count: "exact", head: true })
      .in("status", ["pendiente", "en_proceso"])
      .eq("store_code", currentUserProfile?.store_code),
    supabase
      .from("sales_budgets")
      .select("budget_amount")
      .eq("store_code", currentUserProfile?.store_code)
      .eq("month_year", currentMonthYear)
      .single(),
    supabase
      .from("daily_sales")
      .select("amount")
      .eq("store_code", currentUserProfile?.store_code)
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
    supabase
      .from("pre_shifts")
      .select("priority, impulse_focus")
      .eq("store_code", currentUserProfile?.store_code)
      .eq("date", `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const monthlyBudget = currentBudgetRow?.budget_amount || 0;
  const accumulatedSales =
    monthlySales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - day);
  const dailyGoal = Math.max(0, Math.round((monthlyBudget - accumulatedSales) / remainingDays));

  const quickLinks = [
    { href: "/instructions", label: "Instrucciones" },
    { href: "/waste", label: "Merma" },
    { href: "/dashboard", label: "Indicadores" },
    { href: "/team", label: "Equipo" },
  ] as const;

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-slate-50 px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
          Prioridad del turno
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          Lo importante de hoy.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Menos ruido, más ejecución. Revisa esto primero y sigue por los accesos rápidos.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoRow label="Tareas abiertas" value={String(pendingCount ?? 0).padStart(2, "0")} />
          <InfoRow
            label="Meta del dia"
            value={new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(dailyGoal)}
          />
          <InfoRow
            label="Pre-turno"
            value={preShiftData?.priority || "Sin definir"}
            hint={preShiftData?.impulse_focus || "Revisa el foco operativo."}
          />
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Accesos rápidos
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <details className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer list-none text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Ver mas
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <Link href="/waste/fefo" className="rounded-2xl border border-slate-200 px-4 py-3">
            Radar FEFO
          </Link>
          <Link href="/instructions/new" className="rounded-2xl border border-slate-200 px-4 py-3">
            Nueva instruccion
          </Link>
          <Link href="/schedule" className="rounded-2xl border border-slate-200 px-4 py-3">
            Horarios
          </Link>
        </div>
      </details>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-slate-50 px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="h-3 w-32 rounded-full bg-slate-100" />
        <div className="mt-4 h-7 w-56 rounded-full bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 rounded-[20px] border border-slate-200 bg-slate-50" />
          ))}
        </div>
      </section>
      <section className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-3 w-32 rounded-full bg-slate-100" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 rounded-[20px] border border-slate-200 bg-slate-50" />
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-[15px] font-black leading-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}
