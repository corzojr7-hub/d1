"use client";

import { Download } from "lucide-react";
import { parseActaReason } from "./actaTemplates";

type FeedbackRecord = {
  directed_to: string;
  type: string;
  reason: string;
  description: string;
  commitment: string;
  created_by: string;
  created_at: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildStandardDocument(feedback: FeedbackRecord) {
  return `
    <div class="sheet">
      <p class="eyebrow">${feedback.type === "llamado_atencion" ? "LLAMADO DE ATENCION" : "RETROALIMENTACION"}</p>
      <h1>${escapeHtml(feedback.reason)}</h1>
      <div class="meta">
        <div><span>Dirigido a</span><strong>${escapeHtml(feedback.directed_to)}</strong></div>
        <div><span>Elaborado por</span><strong>${escapeHtml(feedback.created_by)}</strong></div>
        <div><span>Fecha</span><strong>${escapeHtml(new Date(feedback.created_at).toLocaleDateString("es-CO"))}</strong></div>
      </div>
      <section>
        <h2>Descripcion</h2>
        <p>${escapeHtml(feedback.description)}</p>
      </section>
      <section>
        <h2>Compromiso</h2>
        <p>${escapeHtml(feedback.commitment)}</p>
      </section>
    </div>
  `;
}

function buildActaDocument(feedback: FeedbackRecord) {
  const parsedActa = parseActaReason(feedback.reason);
  if (!parsedActa) return buildStandardDocument(feedback);

  const date = new Date(feedback.created_at);
  const formattedDate = date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div class="sheet acta">
      <h1>${escapeHtml(parsedActa.template.title.toUpperCase())}</h1>
      <p class="lead">
        En la tienda, a los ${escapeHtml(formattedDate)}, siendo las ${escapeHtml(formattedTime)},
        se reunieron ${escapeHtml(feedback.directed_to)} en calidad de trabajador(a) y
        ${escapeHtml(feedback.created_by)} en calidad de representante de D1 S.A.S.
      </p>
      <p>
        La presente reunion se realiza en atencion a los incumplimientos por parte del trabajador(a)
        frente a sus responsabilidades y obligaciones laborales. A traves del presente documento
        se deja constancia del compromiso adquirido para corregir la situacion y evitar su repeticion.
      </p>
      <section>
        <h2>Motivo</h2>
        <p>${escapeHtml(parsedActa.cleanReason)}</p>
      </section>
      <section>
        <h2>Responsabilidad observada</h2>
        <p>${escapeHtml(feedback.description)}</p>
      </section>
      <section>
        <h2>Compromiso adquirido</h2>
        <p>${escapeHtml(feedback.commitment)}</p>
      </section>
      <p>
        D1 S.A.S. confia en que el presente compromiso servira para atender las observaciones
        senaladas y evitar que situaciones similares vuelvan a repetirse.
      </p>
      <div class="signatures">
        <div>
          <span>TRABAJADOR(A)</span>
          <strong>${escapeHtml(feedback.directed_to)}</strong>
        </div>
        <div>
          <span>REPRESENTANTE D1 S.A.S.</span>
          <strong>${escapeHtml(feedback.created_by)}</strong>
        </div>
      </div>
    </div>
  `;
}

export default function FeedbackPrintButton({ feedback }: { feedback: FeedbackRecord }) {
  function handleDownload() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=1200");
    if (!printWindow) return;

    const isActa = Boolean(parseActaReason(feedback.reason));
    const body = isActa ? buildActaDocument(feedback) : buildStandardDocument(feedback);
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("");
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(feedback.directed_to)} - ${escapeHtml(feedback.reason)}</title>
          ${styles}
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #f5f5f5; color: #111827; font-family: Arial, sans-serif; }
            body { padding: 24px; }
            .sheet { width: 100%; max-width: 820px; min-height: 1120px; margin: 0 auto; background: white; padding: 24mm 18mm; }
            .eyebrow { margin: 0 0 8px; font-size: 11px; letter-spacing: .18em; font-weight: 700; color: #b91c1c; }
            h1 { margin: 0 0 18px; font-size: 24px; line-height: 1.2; }
            h2 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .08em; }
            p { margin: 0 0 16px; font-size: 14px; line-height: 1.7; }
            .lead { margin-bottom: 18px; }
            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 22px; }
            .meta div { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
            .meta span, .signatures span { display: block; margin-bottom: 6px; font-size: 11px; letter-spacing: .08em; color: #6b7280; }
            .meta strong, .signatures strong { font-size: 13px; }
            section { margin-bottom: 18px; }
            .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 36px; padding-top: 20px; }
            .signatures div { border-top: 1px solid #111827; padding-top: 10px; }
            button, select, svg.lucide { display: none !important; }
            @page { size: A4 portrait; margin: 12mm; }
            @media print {
              html, body { background: white; }
              body { padding: 0; }
              .sheet { max-width: none; min-height: auto; margin: 0; padding: 18mm 14mm; box-shadow: none; }
            }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const objectUrl = URL.createObjectURL(blob);

    printWindow.location.replace(objectUrl);
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.setTimeout(() => {
        printWindow.print();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      }, 350);
    };
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
    >
      <Download className="h-4 w-4" />
      Descargar PDF
    </button>
  );
}
