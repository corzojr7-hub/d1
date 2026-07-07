import PeriodFilter from "../PeriodFilter";
import {
  formatCop,
  type AdminSearchParams,
  requireAdminContext,
  resolveAdminPeriod,
} from "../admin-metrics";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const period = resolveAdminPeriod(params.period);
  const { supabase } = await requireAdminContext();
  const todayKey = getBogotaDateKey();
  const forecastHistoryStart = shiftDateKey(todayKey, -56);
  const forecastHistoryEnd = shiftDateKey(todayKey, -1);
  const budgetMonths = [...new Set([period.startDate.slice(0, 7), period.endDate.slice(0, 7)])];

  const [
    { data: sales, error: salesError },
    { data: budgets, error: budgetsError },
    { data: wasteRecords, error: wasteError },
    { data: stores },
    { data: forecastSales, error: forecastSalesError },
  ] = await Promise.all([
    supabase
      .from("daily_sales")
      .select("store_code, amount, date")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("date", period.startDate)
      .lte("date", period.endDate),
    supabase
      .from("sales_budgets")
      .select("store_code, budget_amount, month_year")
      .neq("store_code", "ADMIN-CENTRAL")
      .in("month_year", budgetMonths),
    supabase
      .from("waste_records")
      .select("store_code, qty, created_at")
      .neq("store_code", "ADMIN-CENTRAL")
      .eq("is_archived", false)
      .gte("created_at", period.startIso)
      .lte("created_at", period.endIso),
    supabase
      .from("profiles")
      .select("store_code, store_name")
      .eq("role", "supervisor")
      .eq("status", "activo")
      .neq("store_code", "ADMIN-CENTRAL"),
    supabase
      .from("daily_sales")
      .select("store_code, amount, date")
      .neq("store_code", "ADMIN-CENTRAL")
      .gte("date", forecastHistoryStart)
      .lte("date", forecastHistoryEnd),
  ]);

  if (salesError) {
    throw new Error(`No se pudieron cargar los indicadores globales: ${salesError.message}`);
  }

  if (budgetsError) {
    throw new Error(`No se pudieron cargar los presupuestos globales: ${budgetsError.message}`);
  }

  if (wasteError) {
    throw new Error(`No se pudieron cargar las mermas globales: ${wasteError.message}`);
  }

  if (forecastSalesError) {
    throw new Error(`No se pudo cargar el histórico para pronóstico: ${forecastSalesError.message}`);
  }

  const storeNames = new Map((stores || []).map((store) => [store.store_code, store.store_name]));
  const activeStoreCodes = new Set(storeNames.keys());
  const salesByStore = new Map<string, number>();
  const budgetsByStore = new Map<string, number>();
  const wasteUnitsByStore = new Map<string, number>();
  const activeDates = new Set<string>();

  for (const sale of sales || []) {
    if (!activeStoreCodes.has(sale.store_code)) continue;
    const amount = Number(sale.amount || 0);
    salesByStore.set(sale.store_code, (salesByStore.get(sale.store_code) || 0) + amount);
    activeDates.add(sale.date);
  }

  for (const budget of budgets || []) {
    if (!activeStoreCodes.has(budget.store_code)) continue;
    const amount = Number(budget.budget_amount || 0);
    const overlapDays = getMonthOverlapDays(budget.month_year, period.startDate, period.endDate);
    const daysInMonth = getDaysInMonth(budget.month_year);

    if (amount <= 0 || overlapDays <= 0 || daysInMonth <= 0) continue;

    budgetsByStore.set(
      budget.store_code,
      (budgetsByStore.get(budget.store_code) || 0) + amount * (overlapDays / daysInMonth),
    );
  }

  for (const waste of wasteRecords || []) {
    if (!activeStoreCodes.has(waste.store_code)) continue;
    const units = Number(waste.qty || 0);
    wasteUnitsByStore.set(
      waste.store_code,
      (wasteUnitsByStore.get(waste.store_code) || 0) + units,
    );
  }

  const totalSales = Array.from(salesByStore.values()).reduce((sum, amount) => sum + amount, 0);
  const activeStores = Array.from(salesByStore.values()).filter((amount) => amount > 0).length;
  const dailyAverage = activeDates.size > 0 ? totalSales / activeDates.size : 0;
  const ranking = Array.from(salesByStore.entries())
    .map(([storeCode, amount]) => ({
      storeCode,
      storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const healthRows = Array.from(activeStoreCodes)
    .map((storeCode) => {
      const salesAmount = salesByStore.get(storeCode) || 0;
      const budgetTarget = budgetsByStore.get(storeCode) || 0;
      const wasteUnits = wasteUnitsByStore.get(storeCode) || 0;
      const budgetCompletion =
        budgetTarget > 0 ? (salesAmount / budgetTarget) * 100 : salesAmount > 0 ? 100 : 0;
      const salesScore = Math.min(100, budgetCompletion) * 0.75;
      const wasteScore = Math.max(0, 100 - Math.min(wasteUnits, 100)) * 0.25;
      const score = Math.round(salesScore + wasteScore);

      return {
        storeCode,
        storeName: storeNames.get(storeCode) || `Tienda ${storeCode}`,
        salesAmount,
        budgetTarget,
        budgetCompletion,
        wasteUnits,
        score,
        light: getHealthLight(score),
      };
    })
    .sort((a, b) => b.score - a.score || b.salesAmount - a.salesAmount || a.wasteUnits - b.wasteUnits);
  const greenCount = healthRows.filter((store) => store.light.label === "Verde").length;
  const yellowCount = healthRows.filter((store) => store.light.label === "Amarillo").length;
  const redCount = healthRows.filter((store) => store.light.label === "Rojo").length;
  const forecast = buildSalesForecast({
    sales: (forecastSales || [])
      .filter((sale) => activeStoreCodes.has(sale.store_code))
      .map((sale) => ({
        storeCode: sale.store_code,
        date: sale.date,
        amount: Number(sale.amount || 0),
      })),
    storeNames,
    referenceDate: todayKey,
  });

  return (
    <main className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 2xl:max-w-7xl">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Indicadores globales
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Lectura regional</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ventas consolidadas por tienda para {period.label.toLowerCase()}.
            </p>
          </div>
          <PeriodFilter active={period.key} pathname="/admin/dashboard" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard label="Venta regional" value={formatCop(totalSales)} />
        <MetricCard label="Tiendas con venta" value={String(activeStores)} />
        <MetricCard label="Promedio diario" value={formatCop(dailyAverage)} />
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Pronóstico operativo
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Ventas proyectadas y dotación sugerida</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Lectura de la próxima semana usando el histórico reciente de ventas por día.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Siguiente semana</p>
            <p className="mt-1 text-lg font-black text-slate-950">{formatCop(forecast.nextWeekTotal)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <article className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm font-black text-slate-950">{forecast.headline}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{forecast.recommendation}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Pico proyectado" value={`${forecast.peakDay.label} · ${formatCop(forecast.peakDay.amount)}`} />
              <MetricCard label="Fin de semana" value={formatCop(forecast.weekendTotal)} />
              <MetricCard label="Tienda foco" value={forecast.focusStore.name} />
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-black text-slate-950">Proyección diaria</h3>
            <div className="mt-4 space-y-3">
              {forecast.days.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{day.label}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {day.date}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">{formatCop(day.amount)}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-black text-slate-950">Top 10 tiendas por venta</h2>
        <div className="mt-4 space-y-3">
          {ranking.map((store, index) => (
            <div
              key={store.storeCode}
              className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {index + 1}. {store.storeName}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {store.storeCode}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">{formatCop(store.amount)}</p>
            </div>
          ))}
          {ranking.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No hay ventas registradas para este periodo.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e51d2e]">
              Salud de tiendas
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Scorecard diario con semaforo</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Score de 0 a 100 ponderando cumplimiento del presupuesto y control de merma.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatusPill label="Verde" value={greenCount} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
            <StatusPill label="Amarillo" value={yellowCount} tone="border-amber-200 bg-amber-50 text-amber-700" />
            <StatusPill label="Rojo" value={redCount} tone="border-rose-200 bg-rose-50 text-rose-700" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2">
              {healthRows.slice(0, 6).map((store, index) => (
                <article
                  key={store.storeCode}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                        #{index + 1} {store.storeCode}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-black text-slate-950">
                        {store.storeName}
                      </h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${store.light.badgeClassName}`}>
                      {store.light.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Score
                      </p>
                      <p className="mt-1 text-3xl font-black text-slate-950">{store.score}</p>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-500">
                      <p>{store.budgetCompletion.toFixed(0)}% presupuesto</p>
                      <p>{store.wasteUnits.toFixed(0)} uds merma</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${store.light.barClassName}`}
                      style={{ width: `${Math.min(100, store.score)}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-black text-slate-950">Ranking regional</h3>
            <div className="mt-4 space-y-3">
              {healthRows.map((store, index) => (
                <div
                  key={store.storeCode}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {index + 1}. {store.storeName}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {store.storeCode} · {store.wasteUnits.toFixed(0)} uds merma
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950">{store.score}</p>
                    <p className={`text-[11px] font-bold ${store.light.textClassName}`}>
                      {store.light.label}
                    </p>
                  </div>
                </div>
              ))}
              {healthRows.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                  No hay tiendas activas con datos para este periodo.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 min-w-0 break-words text-lg font-black leading-tight text-slate-950 sm:text-xl xl:text-2xl">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-full border px-3 py-2 text-center ${tone}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function getHealthLight(score: number) {
  if (score > 80) {
    return {
      label: "Verde",
      textClassName: "text-emerald-600",
      badgeClassName: "bg-emerald-50 text-emerald-700",
      barClassName: "bg-emerald-500",
    };
  }

  if (score >= 60) {
    return {
      label: "Amarillo",
      textClassName: "text-amber-600",
      badgeClassName: "bg-amber-50 text-amber-700",
      barClassName: "bg-amber-400",
    };
  }

  return {
    label: "Rojo",
    textClassName: "text-rose-600",
    badgeClassName: "bg-rose-50 text-rose-700",
    barClassName: "bg-rose-500",
  };
}

function getDaysInMonth(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getBogotaDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const shifted = new Date(`${dateKey}T12:00:00-05:00`);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return getBogotaDateKey(shifted);
}

function getWeekday(dateKey: string) {
  return new Date(`${dateKey}T12:00:00-05:00`).getUTCDay();
}

function getWeekdayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00-05:00`));
}

type ForecastDay = {
  date: string;
  weekday: number;
  label: string;
  amount: number;
};

type SalesForecastSummary = {
  nextWeekTotal: number;
  weekendTotal: number;
  headline: string;
  recommendation: string;
  peakDay: {
    label: string;
    amount: number;
  };
  focusStore: {
    code: string;
    name: string;
  };
  days: ForecastDay[];
};

function buildSalesForecast({
  sales,
  storeNames,
  referenceDate,
}: {
  sales: Array<{ storeCode: string; date: string; amount: number }>;
  storeNames: Map<string, string>;
  referenceDate: string;
}): SalesForecastSummary {
  const orderedSales = [...sales].sort((a, b) => a.date.localeCompare(b.date));
  const regionalDaily = new Map<string, number>();

  for (const sale of orderedSales) {
    regionalDaily.set(sale.date, (regionalDaily.get(sale.date) || 0) + Number(sale.amount || 0));
  }

  const dailySeries = Array.from(regionalDaily.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date,
      amount,
      weekday: getWeekday(date),
    }));

  if (dailySeries.length === 0) {
    return {
      nextWeekTotal: 0,
      weekendTotal: 0,
      headline: "Aún no hay suficiente histórico para pronosticar la próxima semana.",
      recommendation: "Mantén la dotación base hasta completar al menos varios días de ventas reales.",
      peakDay: {
        label: "Sin dato",
        amount: 0,
      },
      focusStore: {
        code: "SIN-DATO",
        name: "Sin dato",
      },
      days: [],
    };
  }

  const overallAverage =
    dailySeries.reduce((sum, day) => sum + day.amount, 0) / Math.max(dailySeries.length, 1);
  const weekendWeekdays = new Set([5, 6, 0]);
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => shiftDateKey(referenceDate, index + 1));
  const forecastDays = nextSevenDays.map((date) => {
    const weekday = getWeekday(date);
    const samples = dailySeries.filter((day) => day.weekday === weekday).slice(-6);
    const projectedAmount = Math.round(
      samples.length > 0
        ? samples.reduce((sum, sample) => sum + sample.amount, 0) / samples.length
        : overallAverage,
    );

    return {
      date,
      weekday,
      label: getWeekdayLabel(date),
      amount: projectedAmount,
    };
  });

  const nextWeekTotal = forecastDays.reduce((sum, day) => sum + day.amount, 0);
  const weekendDays = forecastDays.filter((day) => weekendWeekdays.has(day.weekday));
  const weekendTotal = weekendDays.reduce((sum, day) => sum + day.amount, 0);
  const recentWeekendDays = dailySeries.filter((day) => weekendWeekdays.has(day.weekday)).slice(-9);
  const baselineWeekendTotal =
    recentWeekendDays.length > 0
      ? (recentWeekendDays.reduce((sum, day) => sum + day.amount, 0) / recentWeekendDays.length) *
        Math.max(weekendDays.length, 1)
      : weekendTotal;
  const weekendRatio = baselineWeekendTotal > 0 ? weekendTotal / baselineWeekendTotal : 1;
  const peakDay = forecastDays.reduce((highest, day) => (day.amount > highest.amount ? day : highest), forecastDays[0]);

  const focusStoreCandidates = Array.from(
    orderedSales.reduce((acc, sale) => {
      const weekday = getWeekday(sale.date);
      if (weekday !== peakDay.weekday) {
        return acc;
      }

      const storeEntry = acc.get(sale.storeCode) || [];
      storeEntry.push(sale.amount);
      acc.set(sale.storeCode, storeEntry.slice(-6));
      return acc;
    }, new Map<string, number[]>()),
  ).map(([storeCode, amounts]) => ({
    code: storeCode,
    name: storeNames.get(storeCode) || `Tienda ${storeCode}`,
    average: amounts.reduce((sum, amount) => sum + amount, 0) / Math.max(amounts.length, 1),
  }));

  const focusStore =
    focusStoreCandidates.sort((a, b) => b.average - a.average)[0] || {
      code: "SIN-DATO",
      name: "Sin dato",
      average: 0,
    };

  if (weekendRatio >= 1.15 || peakDay.amount >= overallAverage * 1.2) {
    return {
      nextWeekTotal,
      weekendTotal,
      headline: "Fin de semana proyectado con ventas muy altas.",
      recommendation: `Recomendación: aumentar 1 asistente en el turno de la tarde y preparar reposición temprana para ${peakDay.label}. La tienda con mayor presión esperada es ${focusStore.name}.`,
      peakDay: {
        label: peakDay.label,
        amount: peakDay.amount,
      },
      focusStore,
      days: forecastDays,
    };
  }

  if (weekendRatio <= 0.9) {
    return {
      nextWeekTotal,
      weekendTotal,
      headline: "Fin de semana proyectado con demanda contenida.",
      recommendation: `Recomendación: mantener la dotación base y usar la tarde para recuperación comercial, vitrina y control de merma. El mayor pico esperado sigue siendo ${peakDay.label}.`,
      peakDay: {
        label: peakDay.label,
        amount: peakDay.amount,
      },
      focusStore,
      days: forecastDays,
    };
  }

  return {
    nextWeekTotal,
    weekendTotal,
    headline: "Fin de semana proyectado con ventas estables a altas.",
    recommendation: `Recomendación: sostener la dotación actual y dejar apoyo flexible en la tarde de ${peakDay.label}. La tienda foco para seguimiento preventivo es ${focusStore.name}.`,
    peakDay: {
      label: peakDay.label,
      amount: peakDay.amount,
    },
    focusStore,
    days: forecastDays,
  };
}

function getMonthOverlapDays(monthYear: string, startDate: string, endDate: string) {
  const [year, month] = monthYear.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const periodStart = new Date(`${startDate}T00:00:00Z`);
  const periodEnd = new Date(`${endDate}T00:00:00Z`);

  const overlapStart = Math.max(monthStart.getTime(), periodStart.getTime());
  const overlapEnd = Math.min(monthEnd.getTime(), periodEnd.getTime());

  if (overlapEnd < overlapStart) {
    return 0;
  }

  return Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
}
