"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { setBulkPosMetrics } from "@/app/dashboard/actions";

type Props = {
  date: string;
  assistantOptions: string[];
};

type PosImportRow = {
  date: string;
  assistant: string;
  productivity: number;
  scan: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeName(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isProductivityHeader(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));
  return (
    normalized.includes("art mi") ||
    normalized.includes("ar mi") ||
    normalized.includes("articulos min") ||
    normalized.includes("articulos por minuto")
  );
}

function isScanHeader(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));
  return (
    normalized === "esc" ||
    normalized.startsWith("esc ") ||
    normalized.includes("esc prod")
  );
}

function findAssistantName(rawName: unknown, assistantOptions: string[]) {
  const sourceTokens = tokenizeName(String(rawName ?? ""));
  if (sourceTokens.length === 0) return "";

  for (const option of assistantOptions) {
    const targetTokens = tokenizeName(option);
    if (targetTokens.length === 0) continue;

    const firstName = targetTokens[0];
    const surname = targetTokens[targetTokens.length - 1];

    if (sourceTokens.includes(firstName) && sourceTokens.includes(surname)) {
      return option;
    }
  }

  return "";
}

function extractDayByColumn(sheetRows: unknown[][], headerIndex: number, columnIndex: number) {
  for (let rowIndex = Math.max(0, headerIndex - 3); rowIndex < headerIndex; rowIndex += 1) {
    const row = sheetRows[rowIndex];
    if (!Array.isArray(row)) continue;

    for (let offset = 0; offset <= 2; offset += 1) {
      const cell = row[columnIndex - offset];
      const parsed = Number(String(cell ?? "").trim());
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) {
        return parsed;
      }
    }
  }

  return 0;
}

function buildDate(baseDate: string, day: number) {
  const [year, month] = baseDate.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractRows(sheetRows: unknown[][], assistantOptions: string[], baseDate: string) {
  const nameHeaderIndex = sheetRows.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) => normalizeText(String(cell ?? "")) === "nombre"),
  );

  if (nameHeaderIndex < 0) {
    throw new Error("No encontré la columna Nombre en el Excel.");
  }

  const nameHeaderRow = sheetRows[nameHeaderIndex];
  const nameIndex = nameHeaderRow.findIndex(
    (cell) => normalizeText(String(cell ?? "")) === "nombre",
  );

  const dayColumns: Array<{ day: number; productivityIndex: number; scanIndex: number }> = [];
  const headerStart = Math.max(0, nameHeaderIndex - 1);
  const headerEnd = Math.min(sheetRows.length - 1, nameHeaderIndex + 4);

  for (let rowIndex = headerStart; rowIndex <= headerEnd; rowIndex += 1) {
    const row = sheetRows[rowIndex];
    if (!Array.isArray(row)) continue;

    row.forEach((cell, index) => {
      if (!isProductivityHeader(cell)) return;

      const day = extractDayByColumn(sheetRows, rowIndex, index);
      if (!day) return;

      let scanIndex = -1;
      for (let next = index + 1; next <= index + 3; next += 1) {
        if (isScanHeader(row[next])) {
          scanIndex = next;
          break;
        }
      }

      if (scanIndex >= 0) {
        dayColumns.push({ day, productivityIndex: index, scanIndex });
      }
    });
  }

  const uniqueDayColumns = Array.from(
    new Map(dayColumns.map((column) => [column.day, column])).values(),
  ).sort((a, b) => a.day - b.day);

  if (uniqueDayColumns.length === 0) {
    throw new Error("No encontré columnas diarias de Art/Mi y Esc en el Excel.");
  }

  const rows: PosImportRow[] = [];

  for (const row of sheetRows.slice(nameHeaderIndex + 1)) {
    if (!Array.isArray(row)) continue;

    const assistant = findAssistantName(row[nameIndex], assistantOptions);
    if (!assistant) continue;

    for (const dayColumn of uniqueDayColumns) {
      const productivity = parseNumber(row[dayColumn.productivityIndex]);
      const scan = parseNumber(row[dayColumn.scanIndex]);

      if (!Number.isFinite(productivity) || !Number.isFinite(scan)) continue;

      rows.push({
        date: buildDate(baseDate, dayColumn.day),
        assistant,
        productivity,
        scan,
      });
    }
  }

  return rows;
}

export default function PosMetricsImportButton({ date, assistantOptions }: Props) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
      const importedRows = extractRows(rows, assistantOptions, date);

      if (importedRows.length === 0) {
        throw new Error("No encontré filas válidas para importar.");
      }

      const result = await setBulkPosMetrics(importedRows);
      if (!result.success) {
        throw new Error(result.error || "No se pudo importar la productividad POS.");
      }

      toast.success(`Se importaron ${result.count} registros POS del mes.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al leer el archivo Excel.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200">
      {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
      {isImporting ? "Importando..." : "Importar Excel POS"}
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportExcel}
        disabled={isImporting}
      />
    </label>
  );
}
