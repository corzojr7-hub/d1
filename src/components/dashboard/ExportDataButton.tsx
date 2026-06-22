"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import AppSelect from "@/components/dashboard/AppSelect";

type WasteExportRow = {
  created_at?: string;
  products?: { name?: string | null } | null;
  qty?: number;
  reason?: string | null;
  deposited_by?: string | null;
  area?: string | null;
  status?: string | null;
};

type ImpulseExportRow = {
  date: string;
  assistant?: string | null;
  product_name?: string | null;
  quantity?: number;
  impulse_type?: string | null;
};

type PosExportRow = {
  date: string;
  assistant?: string | null;
  productivity?: number | null;
  scan?: number | null;
  cancellations?: number | null;
  voids?: number | null;
};

type ExportDataButtonProps = {
  wasteData: WasteExportRow[];
  impulseData: ImpulseExportRow[];
  posData: PosExportRow[];
};

export default function ExportDataButton({ wasteData, impulseData, posData }: ExportDataButtonProps) {
  const [pdfSection, setPdfSection] = useState("ventas");

  const sanitizeCell = (value: string | number | boolean | null | undefined) => {
    if (typeof value !== "string") return value;
    const unsafeChars = ["=", "+", "-", "@"];
    if (unsafeChars.some(char => value.startsWith(char))) {
      return `'${value}`;
    }
    return value;
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Merma
    const wsWaste = XLSX.utils.json_to_sheet(wasteData.map(item => ({
      Fecha: item.created_at ? new Date(item.created_at).toLocaleString("es-CO") : "",
      Producto: sanitizeCell(item.products?.name || "Desconocido"),
      Cantidad: item.qty,
      Motivo: sanitizeCell(item.reason),
      Registrador: sanitizeCell(item.deposited_by),
      Area: sanitizeCell(item.area),
      Estado: sanitizeCell(item.status)
    })));
    XLSX.utils.book_append_sheet(wb, wsWaste, "Merma");

    // Hoja 2: Impulso
    const wsImpulse = XLSX.utils.json_to_sheet(impulseData.map(item => ({
      Fecha: item.date,
      Colaborador: sanitizeCell(item.assistant),
      Producto: sanitizeCell(item.product_name),
      Cantidad: item.quantity,
      Tipo: sanitizeCell(item.impulse_type)
    })));
    XLSX.utils.book_append_sheet(wb, wsImpulse, "Impulso");

    // Hoja 3: POS
    const wsPos = XLSX.utils.json_to_sheet(posData.map(item => ({
      Fecha: item.date,
      Colaborador: sanitizeCell(item.assistant),
      Productividad_Art_Min: item.productivity,
      Escaneo: item.scan,
      Cancelaciones: item.cancellations,
      Anulaciones: item.voids
    })));
    XLSX.utils.book_append_sheet(wb, wsPos, "Productividad Caja");

    XLSX.writeFile(wb, `Estadisticas_Tienda_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPDF = () => {
    const section = document.querySelector<HTMLElement>(`[data-pdf-section="${pdfSection}"]`);
    if (!section) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("");

    const titles: Record<string, string> = {
      "life-for-life": "Life for Life",
      ventas: "Ventas",
      impulso: "Impulso",
      merma: "Merma",
      "productividad-pos": "Productividad POS",
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>${titles[pdfSection] || "Estadísticas"}</title>
          ${styles}
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: white;
              color: #0f172a;
            }
            .pdf-shell {
              max-width: 1100px;
              margin: 0 auto;
            }
            .recharts-responsive-container,
            .recharts-wrapper,
            svg {
              max-width: 100% !important;
            }
            .recharts-surface {
              overflow: visible;
            }
            button, select {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
          </style>
        </head>
        <body>
          <div class="pdf-shell">${section.outerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        onClick={handleExportExcel}
        className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
      >
        <Download className="h-3.5 w-3.5" />
        Excel
      </button>
      <button
        onClick={handlePrintPDF}
        className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-4 py-2.5 text-xs font-bold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
      <AppSelect
        label="Seleccionar seccion para PDF"
        hideLabel
        value={pdfSection}
        onChange={setPdfSection}
        containerClassName="min-w-[170px]"
        buttonClassName="px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm"
        panelClassName="right-0 left-auto w-56"
        options={[
          { value: "ventas", label: "PDF ventas" },
          { value: "impulso", label: "PDF impulso" },
          { value: "merma", label: "PDF merma" },
          { value: "productividad-pos", label: "PDF productividad POS" },
          { value: "life-for-life", label: "PDF comparativo" },
        ]}
      />
    </div>
  );
}
