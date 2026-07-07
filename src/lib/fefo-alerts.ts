import { FEFO_CATEGORIES } from "@/lib/domain/catalogs";

type FefoRecordLike = {
  id: string;
  product_name: string;
  expiration_date: string;
  quantity: number;
  store_code?: string;
};

export type PreventiveFefoAlert = {
  id: string;
  productName: string;
  categoryLabel: string;
  quantity: number;
  expirationDate: string;
  daysLeft: number;
  windowDays: 7 | 15 | 30;
  severity: "critical" | "warning" | "watch";
  primarySuggestion: string;
  secondarySuggestion: string;
  actionLabel: string;
  storeCode?: string;
};

function getBogotaMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00-05:00`);
}

export function getFefoDaysLeft(expirationDate: string, now = new Date()) {
  const bogotaMidnight = getBogotaMidnight(now);
  const expDate = new Date(`${expirationDate}T00:00:00-05:00`);
  const diffTime = expDate.getTime() - bogotaMidnight.getTime();
  return Math.ceil(diffTime / 86400000);
}

function resolveWindow(daysLeft: number) {
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 15) return 15;
  if (daysLeft <= 30) return 30;
  return null;
}

function resolveSeverity(windowDays: 7 | 15 | 30) {
  if (windowDays === 7) return "critical";
  if (windowDays === 15) return "warning";
  return "watch";
}

function resolveSuggestions(windowDays: 7 | 15 | 30) {
  if (windowDays === 7) {
    return {
      primarySuggestion: "Mover a vitrina principal",
      secondarySuggestion: "Descuento 30%",
    };
  }

  if (windowDays === 15) {
    return {
      primarySuggestion: "Armar impulso en caja",
      secondarySuggestion: "Rotar primero al frente",
    };
  }

  return {
    primarySuggestion: "Programar salida preventiva",
    secondarySuggestion: "Revisar pedido y ritmo de venta",
  };
}

export function buildPreventiveFefoAlerts(
  records: FefoRecordLike[],
  now = new Date(),
): PreventiveFefoAlert[] {
  const alerts: PreventiveFefoAlert[] = [];

  for (const record of records) {
      const daysLeft = getFefoDaysLeft(record.expiration_date, now);
      const windowDays = resolveWindow(daysLeft);

      if (!windowDays) {
        continue;
      }

      const [productName, categoryValue = "otro"] = record.product_name.split(" ||| ");
      const categoryInfo =
        FEFO_CATEGORIES.find((item) => item.value === categoryValue) ||
        FEFO_CATEGORIES.find((item) => item.value === "otro");
      const severity = resolveSeverity(windowDays);
      const suggestions = resolveSuggestions(windowDays);

      alerts.push({
        id: record.id,
        productName: productName || record.product_name,
        categoryLabel: categoryInfo?.label || "Otro / General",
        quantity: Number(record.quantity || 0),
        expirationDate: record.expiration_date,
        daysLeft,
        windowDays,
        severity,
        primarySuggestion: suggestions.primarySuggestion,
        secondarySuggestion: suggestions.secondarySuggestion,
        actionLabel: `${suggestions.primarySuggestion}. ${suggestions.secondarySuggestion}.`,
        storeCode: record.store_code,
      });
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft || b.quantity - a.quantity);
}

function selfCheckBuildPreventiveFefoAlerts() {
  console.assert(resolveWindow(3) === 7);
  console.assert(resolveWindow(10) === 15);
  console.assert(resolveWindow(24) === 30);
  console.assert(resolveWindow(31) === null);
}

selfCheckBuildPreventiveFefoAlerts();
