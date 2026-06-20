import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardPlus, FileText, Radar, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";
import InstructionCard from "@/components/instructions/InstructionCard";
import StoreTeamSummary from "@/components/StoreTeamSummary";
import BudgetEditModal from "@/components/dashboard/BudgetEditModal";
import { FEFO_CATEGORIES } from "@/lib/domain/catalogs";

export const metadata: Metadata = {
  title: "Inicio - Sistema de Control Operativo de Tienda",
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
  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const bogotaMidnight = new Date(`${dateString}T00:00:00-05:00`);

  return { year, month, day, dateString, bogotaMidnight };
}

export default async function Home() {
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

  const storeCode = currentUserProfile?.store_code;

  if (currentUserProfile?.requires_password_change) {
    redirect("/update-password");
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { year, month, day: currentDay, dateString: bogotaToday, bogotaMidnight } =
    getBogotaCalendar();
  const currentMonthYear = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${currentMonthYear}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const weekday = bogotaMidnight.getUTCDay();
  const startOfWeek = new Date(bogotaMidnight);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - ((weekday + 6) % 7));
  const startOfWeekIso = startOfWeek.toISOString();

  const [
    { count: pendingCount },
    { data: recentInstructions },
    { count: wasteCount },
    { count: wasteCountWeek },
    { data: currentBudgetRow },
    { data: monthlySales },
    { data: preShiftData },
    { data: fefoRecords },
    { data: storeAdminProfile },
  ] = await Promise.all([
    adminClient
      .from("instructions")
      .select("*", { count: "exact", head: true })
      .in("status", ["pendiente", "en_proceso"])
      .eq("store_code", storeCode),
    adminClient
      .from("instructions")
      .select("*")
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .limit(3),
    adminClient
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode),
    adminClient
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode)
      .gte("created_at", startOfWeekIso),
    adminClient
      .from("sales_budgets")
      .select("budget_amount")
      .eq("store_code", storeCode)
      .eq("month_year", currentMonthYear)
      .single(),
    adminClient
      .from("daily_sales")
      .select("amount")
      .eq("store_code", storeCode)
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
    adminClient
      .from("pre_shifts")
      .select("*")
      .eq("store_code", storeCode)
      .eq("date", bogotaToday)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    adminClient
      .from("fefo_records")
      .select("id, product_name, expiration_date, quantity")
      .eq("store_code", storeCode)
      .eq("status", "vigente"),
    adminClient
      .from("profiles")
      .select("basic_tasks")
      .eq("store_code", storeCode)
      .in("role", ["supervisor", "admin"])
      .limit(1)
      .single(),
  ]);

  const monthlyBudget = currentBudgetRow?.budget_amount || 0;
  const accumulatedSales =
    monthlySales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const dailyGoal = Math.max(
    0,
    Math.round((monthlyBudget - accumulatedSales) / remainingDays),
  );

  const calculateDaysLeft = (expDateStr: string) => {
    const expDate = new Date(`${expDateStr}T00:00:00-05:00`);
    const diffTime = expDate.getTime() - bogotaMidnight.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const criticalFefoItems = (fefoRecords || []).filter((rec) => {
    const nameParts = rec.product_name.split(" ||| ");
    const categoryVal = nameParts[1] || "otro";
    const daysLeft = calculateDaysLeft(rec.expiration_date);
    const catInfo =
      FEFO_CATEGORIES.find((c) => c.value === categoryVal) ||
      FEFO_CATEGORIES.find((c) => c.value === "otro");
    const threshold = catInfo ? catInfo.retirementDays : 0;
    const delta = daysLeft - threshold;
    return delta <= 6;
  });

  const dayNames = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];
  const currentDayName = dayNames[weekday];

  let todayAseoPerson = "Sin asignar";
  let aseoSchedule: Record<string, string> = {};
  if (storeAdminProfile?.basic_tasks && Array.isArray(storeAdminProfile.basic_tasks)) {
    const aseoTask = storeAdminProfile.basic_tasks.find(
      (t: unknown) =>
        typeof t === "object" &&
        t !== null &&
        "id" in t &&
        (t as { id?: string }).id === "aseo_semanal",
    );
    if (
      aseoTask &&
      typeof aseoTask === "object" &&
      "schedule" in aseoTask &&
      aseoTask.schedule &&
      typeof aseoTask.schedule === "object" &&
      currentDayName in aseoTask.schedule
    ) {
      const assignee = aseoTask.schedule[currentDayName as keyof typeof aseoTask.schedule];
      if (typeof assignee === "string" && assignee.trim()) {
        todayAseoPerson = assignee;
      }
    }
    if (
      aseoTask &&
      typeof aseoTask === "object" &&
      "schedule" in aseoTask &&
      aseoTask.schedule &&
      typeof aseoTask.schedule === "object"
    ) {
      aseoSchedule = Object.entries(aseoTask.schedule).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (typeof value === "string" && value.trim()) {
            acc[key] = value;
          }
          return acc;
        },
        {},
      );
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24 lg:max-w-6xl xl:max-w-7xl">
      <StoreTeamSummary />

      <section className="mx-4 mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#d51b2b] via-[#e51d2e] to-[#f04452] shadow-[0_20px_40px_rgba(229,29,46,0.18)]">
        <div className="flex items-start justify-between gap-4 px-5 py-5 text-white">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl">O</span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">
                Meta del Dia
              </p>
              <p className="mt-1 text-xl font-black tracking-tight text-white">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(dailyGoal)}
              </p>
              <p className="mt-2 max-w-[180px] text-[11px] font-medium leading-snug text-white/80">
                Objetivo operativo del turno con foco directo en avance diario.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/12 px-3 py-3 text-right shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
              Dias Restantes
            </p>
            <p className="mt-1 text-2xl font-black leading-none text-white tabular-nums">
              {remainingDays}
            </p>
          </div>
        </div>

        {preShiftData && (
          <div className="grid gap-3 border-t border-white/10 bg-black/10 px-5 py-3 text-white/92">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                Foco de Impulso
              </span>
              <span className="max-w-[190px] text-right text-[12px] font-semibold leading-snug">
                {preShiftData.impulse_focus}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                Prioridad Tareas
              </span>
              <span className="max-w-[190px] text-right text-[12px] font-semibold leading-snug">
                {preShiftData.priority}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                Aseo de Hoy
              </span>
              <span className="max-w-[190px] text-right text-[12px] font-semibold leading-snug">
                {todayAseoPerson}
              </span>
            </div>
            {preShiftData.average_ticket_goal > 0 && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                  Ticket Promedio
                </span>
                <span className="text-right text-[12px] font-black text-white">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(preShiftData.average_ticket_goal)}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mx-4 mt-5 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Resumen Rapido
          </p>
          <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
            Lo critico del dia
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Tareas"
            value={String(pendingCount ?? 0).padStart(2, "0")}
            tone="text-[#0a58ca]"
          />
          <MetricCard
            label="Merma Sem"
            value={String(wasteCountWeek ?? 0)}
            tone="text-[#e51d2e]"
          />
          <MetricCard
            label="Merma Total"
            value={String(wasteCount ?? 0)}
            tone="text-[#b91c1c]"
          />
        </div>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Acciones Principales
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/instructions/new"
            className="group flex min-h-[136px] flex-col justify-between rounded-[24px] bg-[#e51d2e] p-4 shadow-[0_16px_32px_rgba(229,29,46,0.18)] transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              <ClipboardPlus className="h-[22px] w-[22px] text-white" strokeWidth={2} />
            </div>
            <div className="mt-4">
              <p className="text-[18px] font-black leading-tight tracking-tight text-white">
                Nueva Instruccion
              </p>
              <p className="mt-1 pr-2 text-[11px] leading-snug text-white/88">
                Asignar orden de trabajo urgente
              </p>
            </div>
          </Link>

          <Link
            href="/waste/new"
            className="group flex min-h-[136px] flex-col justify-between rounded-[24px] border border-blue-200 bg-white p-4 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
              <Trash2 className="h-[22px] w-[22px] text-[#0a58ca]" strokeWidth={2} />
            </div>
            <div className="mt-4">
              <p className="text-[18px] font-black leading-tight tracking-tight text-slate-900">
                Registrar Merma
              </p>
              <p className="mt-1 pr-2 text-[11px] leading-snug text-slate-600">
                Trazabilidad de averia o merma
              </p>
            </div>
          </Link>
        </div>
      </section>

      <div className="mx-4 mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Presupuesto
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              Control de Ventas
            </h2>
          </div>
          <BudgetEditModal
            storeCode={storeCode || ""}
            currentBudget={monthlyBudget}
            currentAccumulated={accumulatedSales}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Objetivo Mes
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-slate-800">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(monthlyBudget)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Venta Acumulada
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-[#0a58ca]">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(accumulatedSales)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-[#0a58ca]"
              style={{
                width: `${Math.min(
                  100,
                  (accumulatedSales / (monthlyBudget || 1)) * 100,
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>0%</span>
            <span>
              {Math.round((accumulatedSales / (monthlyBudget || 1)) * 100)}%
              {" "}Cumplimiento
            </span>
          </div>
        </div>
      </div>

      {recentInstructions && recentInstructions.length > 0 && (
        <section className="mx-4 mt-6 rounded-[26px] border border-red-100 bg-white p-5 shadow-[0_10px_24px_rgba(229,29,46,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#e51d2e]">
                Instruccion Activa
              </p>
              <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                Tarea con mayor atencion
              </h2>
            </div>
            <span className="rounded-full bg-[#fff8e6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d97706]">
              {recentInstructions[0].priority === "alta"
                ? "Alta Prioridad"
                : recentInstructions[0].priority === "media"
                  ? "Media Prioridad"
                  : "Baja Prioridad"}
            </span>
          </div>

          <h3 className="mt-4 text-[17px] font-black leading-snug tracking-tight text-slate-900">
            {recentInstructions[0].content}
          </h3>
          <div className="mt-4 flex items-center gap-4 text-[12px]">
            <span className="text-slate-600">
              Resp:{" "}
              <span className="font-bold text-slate-900">
                {recentInstructions[0].responsible}
              </span>
            </span>
            <span className="text-slate-600">
              Estado:{" "}
              <span className="font-bold text-[#e51d2e]">
                {recentInstructions[0].status === "pendiente"
                  ? "Pendiente"
                  : "En Proceso"}
              </span>
            </span>
          </div>
        </section>
      )}

      <section className="mt-6 px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Accesos Rapidos
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              Herramientas de operacion
            </h2>
          </div>
          <Link
            href="/instructions"
            className="rounded-full border border-[#e51d2e]/20 bg-white px-3 py-2 text-[11px] font-bold text-[#e51d2e] shadow-sm transition-transform active:scale-95"
          >
            Manual Encargado
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QuickAccessCard
            href="/preshift"
            title="Pre-Turno"
            subtitle="Objetivos del dia"
            iconBg="bg-amber-50"
            iconTone="text-amber-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            }
          />
          <QuickAccessCard
            href="/logbook"
            title="Bitacora Diaria"
            subtitle="Muro de novedades"
            iconBg="bg-fuchsia-50"
            iconTone="text-fuchsia-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            }
          />
          <QuickAccessCard
            href="/quadrants"
            title="Cuadrantes"
            subtitle="Asignacion de pasillos"
            iconBg="bg-orange-50"
            iconTone="text-orange-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            }
          />
          <QuickAccessCard
            href="/handover"
            title="Entrega Turno"
            subtitle="Foto de bodega"
            iconBg="bg-blue-50"
            iconTone="text-blue-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            }
          />
          <QuickAccessCard
            href="/impulses"
            title="Impulso"
            subtitle="Ventas por asistente"
            iconBg="bg-emerald-50"
            iconTone="text-emerald-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            }
          />
          <QuickAccessCard
            href="/instructions/feedback/new"
            title="Mensaje IA"
            subtitle="Retroalimentacion WhatsApp"
            iconBg="bg-rose-50"
            iconTone="text-rose-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>
            }
          />
        </div>

        <Link
          href="/schedule"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border border-blue-200 bg-white px-4 py-3 text-xs font-bold text-blue-700 shadow-sm transition-transform active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
          Armar Horarios IA
        </Link>
      </section>

      <div className="mx-4 mt-6 rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-100 p-2.5 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Encargado de Aseo Hoy
            </span>
            <h3 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              {todayAseoPerson}
            </h3>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Bano, Cafetin y Aforo
            </p>
          </div>
        </div>
        {Object.keys(aseoSchedule).length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="rounded-2xl border border-blue-100 bg-white/80 px-3 py-2 shadow-sm"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-600">
                  {day}
                </p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-slate-700">
                  {aseoSchedule[day] || "Sin asignar"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {criticalFefoItems.length > 0 && (
        <div className="mx-4 mt-6 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Radar className="h-5 w-5 text-amber-600" />
              Radar FEFO: Atencion Requerida
            </h3>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {criticalFefoItems.length} alertas
            </span>
          </div>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {criticalFefoItems.map((item) => {
              const rawName = item.product_name.split(" ||| ")[0];
              const daysLeft = calculateDaysLeft(item.expiration_date);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white/70 p-2.5 text-xs"
                >
                  <span className="truncate pr-2 font-semibold text-amber-900">
                    {rawName}
                  </span>
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                    {daysLeft}d / {item.quantity}u
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href="/waste/fefo"
            className="mt-3 block rounded-2xl bg-amber-200/60 py-2.5 text-center text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200"
          >
            Ver Radar Completo
          </Link>
        </div>
      )}

      {recentInstructions && recentInstructions.length > 0 && (
        <section className="mt-8 px-4">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Seguimiento
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
              Instrucciones Recientes
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Ultimas tareas asignadas
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {recentInstructions.map((inst) => (
              <InstructionCard key={inst.id} instruction={inst} />
            ))}
          </div>
        </section>
      )}

      {(!recentInstructions || recentInstructions.length === 0) && (
        <div className="mx-4 mt-8 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <FileText className="mb-3 size-6 text-slate-300" />
          <p className="text-xs font-medium text-slate-500">
            No hay instrucciones recientes
          </p>
          <Link
            href="/instructions/new"
            className="app-cta-primary mt-4 px-5 text-[11px] font-bold"
          >
            Crear primera instruccion
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-3xl font-black tracking-tight tabular-nums ${tone}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function QuickAccessCard({
  href,
  title,
  subtitle,
  icon,
  iconBg,
  iconTone,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconTone: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition-transform active:scale-95"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg} ${iconTone}`}>
        {icon}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </div>
    </Link>
  );
}
