import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import StoreTeamSummary from "@/components/StoreTeamSummary";
import HomeStartupAlerts from "@/components/dashboard/HomeStartupAlerts";
import TruckArrivalReportCard from "@/components/dashboard/TruckArrivalReportCard";
import InstructionCard from "@/components/instructions/InstructionCard";
import { FEFO_CATEGORIES } from "@/lib/domain/catalogs";
import { parseTruckReportContent } from "@/lib/truck-report";

export const metadata: Metadata = {
  title: "Centro de control del supervisor - Sistema de Control Operativo de Tienda",
};

function getBogotaCalendar(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const bogotaMidnight = new Date(`${dateString}T00:00:00-05:00`);

  return { year, month, day, hour, minute, dateString, bogotaMidnight };
}

function getBogotaDateString(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

  const storeCode = currentUserProfile?.store_code;

  if (currentUserProfile?.requires_password_change) {
    redirect("/update-password");
  }

  const {
    year,
    month,
    day: currentDay,
    hour: currentHour,
    dateString: bogotaToday,
    bogotaMidnight,
  } = getBogotaCalendar();
  const sessionAlertKey = user?.last_sign_in_at
    ? `${user.id}:${user.last_sign_in_at}`
    : `${user?.id ?? "anon"}:${bogotaToday}`;
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
    { count: wasteCount },
    { count: wasteCountWeek },
    { data: currentBudgetRow },
    { data: monthlySales },
    { data: preShiftData },
    { data: fefoRecords },
    { data: storeAdminProfile },
    { data: recentInstructions },
    { data: rawTruckReports },
    { data: pendingDispatches },
  ] = await Promise.all([
    supabase
      .from("instructions")
      .select("*", { count: "exact", head: true })
      .in("status", ["pendiente", "en_proceso"])
      .eq("store_code", storeCode),
    supabase
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode),
    supabase
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode)
      .gte("created_at", startOfWeekIso),
    supabase
      .from("sales_budgets")
      .select("budget_amount")
      .eq("store_code", storeCode)
      .eq("month_year", currentMonthYear)
      .single(),
    supabase
      .from("daily_sales")
      .select("amount")
      .eq("store_code", storeCode)
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
    supabase
      .from("pre_shifts")
      .select("*")
      .eq("store_code", storeCode)
      .eq("date", bogotaToday)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("fefo_records")
      .select("id, product_name, expiration_date, quantity")
      .eq("store_code", storeCode)
      .eq("status", "vigente"),
    supabase
      .from("profiles")
      .select("basic_tasks")
      .eq("store_code", storeCode)
      .in("role", ["supervisor", "admin"])
      .limit(1)
      .single(),
    supabase
      .from("instructions")
      .select("id, responsible, content, priority, status, created_at")
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("daily_logbook")
      .select("id, author, content, created_at")
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("dispatch_differences")
      .select("id, category, description, dispatch_date, created_at, status")
      .eq("store_code", storeCode)
      .eq("status", "pendiente")
      .order("created_at", { ascending: false }),
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

  const startupFefoItems = (fefoRecords || []).flatMap((rec) => {
    const nameParts = rec.product_name.split(" ||| ");
    const cleanName = nameParts[0] || rec.product_name;
    const categoryVal = nameParts[1] || "otro";
    const categoryInfo =
      FEFO_CATEGORIES.find((item) => item.value === categoryVal) ||
      FEFO_CATEGORIES.find((item) => item.value === "otro");
    const retirementDays = categoryInfo?.retirementDays ?? 0;
    const expirationDate = new Date(`${rec.expiration_date}T00:00:00-05:00`);
    const removalDate = new Date(expirationDate);
    removalDate.setUTCDate(removalDate.getUTCDate() - retirementDays);
    const removalDateKey = getBogotaDateString(removalDate);
    const reminderStart = new Date(removalDate);
    reminderStart.setUTCDate(reminderStart.getUTCDate() - 1);
    const reminderStartKey = getBogotaDateString(reminderStart);
    const shouldWarnTonight = currentHour >= 20 && bogotaToday === reminderStartKey;
    const shouldWarnToday = bogotaToday >= removalDateKey;

    if (!shouldWarnTonight && !shouldWarnToday) {
      return [];
    }

    return [
      {
        id: rec.id,
        productName: cleanName,
        quantity: rec.quantity,
        expirationDate: rec.expiration_date,
        actionLabel: shouldWarnTonight
          ? "Preparalo desde esta noche para salida o venta final manana."
          : "Revisalo hoy y sacalo si ya cumplio el retiro FEFO.",
      },
    ];
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
      aseoSchedule = Object.fromEntries(
        Object.entries(aseoTask.schedule).filter(
          ([, value]) => typeof value === "string" && value.trim(),
        ),
      ) as Record<string, string>;
    }
  }

  const todayTruckReports = (rawTruckReports || [])
    .map((entry) => {
      const payload = parseTruckReportContent(entry.content);
      if (!payload || getBogotaDateString(entry.created_at) !== bogotaToday) {
        return null;
      }

      return {
        id: entry.id,
        author: entry.author,
        created_at: entry.created_at,
        payload,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const startupDispatchAlerts = (pendingDispatches || []).map((dispatch) => ({
    id: dispatch.id,
    title: dispatch.category,
    createdAt: dispatch.created_at,
    message:
      "Comprueba el corte documental y valida si ya dieron respuesta a la diferencia.",
    detail: dispatch.description,
  }));

  const controlFlowGroups = [
    {
      code: "OD",
      title: "Operacion diaria",
      subtitle: "Instrucciones, auditorias, bitacora, pre-turno y entrega de turno.",
      tone: "text-[#b91c1c]",
      chip:
        "border-[#e51d2e]/15 bg-[#fff6f7] text-[#b91c1c] hover:bg-[#ffecee]",
      links: [
        { href: "/instructions", label: "Instrucciones" },
        { href: "/audits", label: "Auditorias" },
        { href: "/logbook", label: "Bitacora" },
        { href: "/preshift", label: "Pre-turno" },
        { href: "/handover", label: "Entrega" },
      ],
    },
    {
      code: "PP",
      title: "Prevencion y perdida",
      subtitle: "Merma, radar FEFO, evidencias y cierre semanal.",
      tone: "text-[#c2410c]",
      chip:
        "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
      links: [
        { href: "/waste", label: "Merma" },
        { href: "/waste/fefo", label: "FEFO" },
        { href: "/waste/evidence", label: "Evidencias" },
      ],
    },
    {
      code: "CM",
      title: "Comercial",
      subtitle: "Indicadores, ventas y accion comercial en caja.",
      tone: "text-[#0a58ca]",
      chip: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
      links: [
        { href: "/dashboard", label: "Indicadores" },
        { href: "/sales", label: "Ventas" },
        { href: "/impulses", label: "Impulso" },
      ],
    },
    {
      code: "ET",
      title: "Estructura de tienda",
      subtitle: "Equipo, horarios y cuadrantes en un solo frente.",
      tone: "text-[#0f766e]",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      links: [
        { href: "/team", label: "Equipo" },
        { href: "/schedule", label: "Horarios" },
        { href: "/quadrants", label: "Cuadrantes" },
      ],
    },
  ] as const;

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] pb-24">
      <StoreTeamSummary />
      <HomeStartupAlerts
        todayKey={bogotaToday}
        sessionKey={sessionAlertKey}
        storeCode={storeCode || ""}
        aseoPerson={todayAseoPerson}
        dispatchAlerts={startupDispatchAlerts}
        fefoAlerts={startupFefoItems}
      />

      <section className="mx-4 mt-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)] lg:mx-6 xl:mx-8">
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)]">
          <div className="bg-white px-6 py-5 text-slate-900 sm:px-7 sm:py-6">
            <div className="mb-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-[#e51d2e] via-[#ef4444] to-[#f59e0b]" />
            <span className="inline-flex items-center rounded-full border border-[#e51d2e]/15 bg-[#fff6f7] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#b91c1c]">
              Centro de control del supervisor
            </span>
            <h1 className="mt-4 max-w-xl text-2xl font-black tracking-tight text-slate-950 sm:text-[2.2rem]">
              Lo importante de hoy, en un solo vistazo.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Arranca el turno con prioridades claras: revisar, ejecutar y cerrar sin perder el hilo entre lo urgente, lo operativo y lo comercial.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Tareas abiertas
                </p>
                <p className="mt-2 text-[26px] font-black leading-none tabular-nums text-[#b91c1c]">
                  {String(pendingCount ?? 0).padStart(2, "0")}
                </p>
                <p className="mt-2 text-[11px] leading-snug text-slate-500">
                  Instrucciones y tareas que no se deben perder de vista.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Alertas FEFO
                </p>
                <p className="mt-2 text-[26px] font-black leading-none tabular-nums text-[#c2410c]">
                  {criticalFefoItems.length}
                </p>
                <p className="mt-2 text-[11px] leading-snug text-slate-500">
                  Productos que ya piden revisión hoy o salida preventiva.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Diferencias
                </p>
                <p className="mt-2 text-[26px] font-black leading-none tabular-nums text-[#0a58ca]">
                  {startupDispatchAlerts.length}
                </p>
                <p className="mt-2 text-[11px] leading-snug text-slate-500">
                  Casos por validar antes de cambiar de frente.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white/95 px-6 py-5 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Prioridad de arranque
            </p>
            <div className="mt-4 space-y-3">
              <ControlRow
                label="Aseo de hoy"
                value={todayAseoPerson}
                hint="Tenlo presente desde el arranque del turno."
              />
              <ControlRow
                label="Meta del dia"
                value={new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(dailyGoal)}
                hint="Objetivo operativo para avanzar sin perder foco."
              />
              <ControlRow
                label="Prioridad del pre-turno"
                value={preShiftData?.priority || "Sin definir"}
                hint={preShiftData?.impulse_focus || "Revisa lo que se debe impulsar hoy."}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
                    Comercial en curso
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-slate-900">
                    Meta mensual vs venta acumulada
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
                  {Math.round((accumulatedSales / (monthlyBudget || 1)) * 100)}%
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Objetivo mes
                  </p>
                  <p className="mt-1 text-[13px] font-black leading-snug text-slate-900">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(monthlyBudget)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Venta acumulada
                  </p>
                  <p className="mt-1 text-[13px] font-black leading-snug text-[#0a58ca]">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(accumulatedSales)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
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
              <p className="mt-2 text-[10px] font-bold text-slate-500">
                {Math.round((accumulatedSales / (monthlyBudget || 1)) * 100)}% de cumplimiento
              </p>
            </div>

            {Object.keys(aseoSchedule).length > 0 && (
              <details className="group mt-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Programacion semanal
                    </p>
                    <p className="mt-1 text-[13px] font-bold text-slate-900">
                      Responsables de aseo de la semana
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 transition group-open:bg-blue-600 group-open:text-white">
                    Ver
                  </span>
                </summary>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        {day}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-slate-700">
                        {aseoSchedule[day] || "Sin asignar"}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </section>

      <section className="mx-4 mt-6 lg:mx-6 xl:mx-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Lo que se revisa primero
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-950">
              Prioridades del turno
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-slate-500">
              Si alguna alarma sigue activa, se resuelve antes de moverse a otros frentes.
            </p>
          </div>
          <Link
            href="/waste/fefo"
            className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
          >
            Ver radar FEFO
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Tareas"
            value={String(pendingCount ?? 0).padStart(2, "0")}
            tone="text-[#0a58ca]"
          />
          <MetricCard
            label="Merma sem"
            value={String(wasteCountWeek ?? 0)}
            tone="text-[#e51d2e]"
          />
          <MetricCard
            label="Merma total"
            value={String(wasteCount ?? 0)}
            tone="text-[#b91c1c]"
          />
        </div>

        <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[12px] leading-snug text-slate-600">
            Si tienes alertas FEFO o diferencias de despacho, atiéndelas antes de pasar a ventas o cuadrantes.
          </p>
        </div>
      </section>

      <div className="mx-4 mt-6 lg:mx-6 xl:mx-8">
        <TruckArrivalReportCard
          storeName={profile.store_name}
          initialReports={todayTruckReports}
          canManage={profile.role === "supervisor" || profile.role === "admin"}
        />
      </div>

      <section className="mx-4 mt-6 lg:mx-6 xl:mx-8">
        <div className="mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Rutas del dia
          </p>
          <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-950">
            Cuatro frentes para moverse sin perder el hilo
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-slate-500">
            La home deja de ser una lista suelta y pasa a agrupar lo que el supervisor realmente usa.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {controlFlowGroups.map((group) => (
            <FlowGroupCard
              key={group.title}
              code={group.code}
              title={group.title}
              subtitle={group.subtitle}
              tone={group.tone}
              chipClass={group.chip}
              links={group.links}
            />
          ))}
        </div>
      </section>

      {recentInstructions && recentInstructions.length > 0 && (
        <section className="mx-4 mt-8 lg:mx-6 xl:mx-8">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Seguimiento
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-slate-950">
              Instrucciones recientes
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Ultimas tareas asignadas
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {recentInstructions.map((inst) => (
              <InstructionCard key={inst.id} instruction={inst} />
            ))}
          </div>
        </section>
      )}

      {(!recentInstructions || recentInstructions.length === 0) && (
        <div className="mx-4 mt-8 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center shadow-sm lg:mx-6 xl:mx-8">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <span className="text-sm font-black">i</span>
          </div>
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

function HomeLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-[1600px] bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] px-4 py-6 pb-24 lg:px-6 xl:px-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="h-1.5 w-24 rounded-full bg-slate-200" />
        <div className="mt-5 h-5 w-48 rounded-full bg-slate-100" />
        <div className="mt-4 h-9 w-full max-w-xl rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="h-3 w-28 rounded-full bg-slate-100" />
              <div className="mt-3 h-8 w-16 rounded-2xl bg-slate-100" />
              <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ControlRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-black leading-tight text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
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

function FlowGroupCard({
  code,
  title,
  subtitle,
  tone,
  chipClass,
  links,
}: {
  code: string;
  title: string;
  subtitle: string;
  tone: string;
  chipClass: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-[12px] font-black ${chipClass} ${tone}`}>
        {code}
      </div>
      <h3 className="mt-3 text-[18px] font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-1 text-[12px] leading-snug text-slate-500">{subtitle}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full border px-3 py-2 text-[11px] font-bold transition ${chipClass}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
