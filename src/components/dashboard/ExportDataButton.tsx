"use client";

import { Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";

type ExportDataButtonProps = {
  wasteData: any[];
  impulseData: any[];
  posData: any[];
};

export default function ExportDataButton({ wasteData, impulseData, posData }: ExportDataButtonProps) {
  
  const sanitizeCell = (value: any) => {
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
      Fecha: new Date(item.created_at).toLocaleString("es-CO"),
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
      Anulaciones: item.cancellations,
      Voids: item.voids
    })));
    XLSX.utils.book_append_sheet(wb, wsPos, "Productividad Caja");

    XLSX.writeFile(wb, `Estadisticas_Tienda_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExportExcel}
        className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Excel
      </button>
      <button
        onClick={handlePrintPDF}
        className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  );
}
