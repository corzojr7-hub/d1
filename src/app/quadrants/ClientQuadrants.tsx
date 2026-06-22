"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileSignature, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppSelect from "@/components/dashboard/AppSelect";
import { acceptQuadrant, assignQuadrant, updateQuadrantAssignment } from "./actions";

type QuadrantAssignment = {
  id: string;
  quadrant_name: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  status: string;
};

type Assistant = {
  name: string;
};

export default function ClientQuadrants({
  assignments,
  assistants,
  areas,
  canManage,
  storeName,
  supervisorName,
}: {
  assignments: QuadrantAssignment[];
  assistants: Assistant[];
  areas: string[];
  canManage: boolean;
  storeName: string;
  supervisorName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const usedAssistants = useMemo(
    () => new Set(assignments.map((assignment) => assignment.assigned_to)),
    [assignments],
  );
  const usedAreas = useMemo(
    () => new Set(assignments.map((assignment) => assignment.quadrant_name)),
    [assignments],
  );
  const availableAssistants = assistants.filter((assistant) => !usedAssistants.has(assistant.name));
  const availableAreas = areas.filter((area) => !usedAreas.has(area));

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      try {
        await assignQuadrant(formData);
        toast.success("Cuadrante asignado con éxito.");
        form.reset();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al asignar el cuadrante.");
      }
    });
  }

  function handleAccept(id: string) {
    if (
      !confirm(
        "Al aceptar, asumes la responsabilidad de mantener el cuadrante asignado conforme al estándar de orden, precios, aseo, exhibiciones, fechas y productos aptos para la venta.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await acceptQuadrant(id);
        toast.success("Responsabilidad aceptada con éxito.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al aceptar el cuadrante.");
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateQuadrantAssignment(formData);
        toast.success("Asignación actualizada con éxito.");
        setEditingId(null);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el cuadrante.");
      }
    });
  }

  function handleDownloadPdf(assignment: QuadrantAssignment) {
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión.");
      return;
    }

    const assignmentDate = new Date(assignment.created_at).toLocaleDateString("es-CO");
    const responsibilities = [
      "Mantener layout, microlayout y exhibición del pasillo conforme al estándar.",
      "Verificar precios visibles, correctos y con porta precios en buen estado.",
      "Revisar rotación, fechas de vencimiento y control FEFO en cada frente.",
      "Retirar productos no aptos para la venta y reportar novedades de inmediato.",
      "Conservar limpieza de góndolas, entrepaños, bases y zona de tránsito.",
      "Sostener surtido, orden, frenteo y presentación comercial durante el turno.",
      "Validar averías, empaques dañados y oportunidades de merma o recuperación.",
      "Asegurar señalización, material POP y exhibiciones adicionales del pasillo.",
    ];

    printWindow.document.write(`
      <html>
        <head>
          <title>${assignment.quadrant_name} - ${assignment.assigned_to}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .sheet {
              max-width: 900px;
              margin: 0 auto;
              border: 2px solid #111827;
              padding: 28px 28px 32px;
            }
            .eyebrow {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #b91c1c;
            }
            h1 {
              margin: 6px 0 10px;
              font-size: 28px;
              line-height: 1.1;
            }
            .intro {
              margin: 0 0 18px;
              font-size: 14px;
              line-height: 1.6;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 20px;
            }
            .card {
              border: 1px solid #d1d5db;
              padding: 12px 14px;
              border-radius: 12px;
              background: #f8fafc;
            }
            .label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: #6b7280;
            }
            .value {
              margin-top: 6px;
              font-size: 18px;
              font-weight: 700;
              color: #111827;
            }
            .section-title {
              margin: 22px 0 10px;
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            ol {
              margin: 0;
              padding-left: 20px;
            }
            li {
              margin-bottom: 10px;
              font-size: 14px;
              line-height: 1.55;
            }
            .note {
              margin-top: 18px;
              padding: 14px 16px;
              border-radius: 12px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              font-size: 13px;
              line-height: 1.6;
            }
            .mini-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            .mini-table th,
            .mini-table td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
              font-size: 13px;
            }
            .mini-table th {
              background: #e5e7eb;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            @media print {
              body { padding: 0; }
              .sheet { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="eyebrow">Control de Cuadrantes</div>
            <h1>Acta Operativa de Pasillo</h1>
            <p class="intro">
              En la tienda <strong>${storeName}</strong> se deja registrada la asignación operativa del pasillo
              <strong> ${assignment.quadrant_name}</strong>, bajo responsabilidad de <strong>${assignment.assigned_to}</strong>,
              para seguimiento comercial y control diario del estándar del punto de venta.
            </p>

            <div class="grid">
              <div class="card">
                <div class="label">Pasillo asignado</div>
                <div class="value">${assignment.quadrant_name}</div>
              </div>
              <div class="card">
                <div class="label">Responsable</div>
                <div class="value">${assignment.assigned_to}</div>
              </div>
              <div class="card">
                <div class="label">Supervisor</div>
                <div class="value">${supervisorName}</div>
              </div>
              <div class="card">
                <div class="label">Fecha de asignación</div>
                <div class="value">${assignmentDate}</div>
              </div>
            </div>

            <div class="section-title">Resumen de asignación</div>
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Cuadrante de la tienda</th>
                  <th>Responsable</th>
                  <th>Supervisor</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${assignment.quadrant_name}</td>
                  <td>${assignment.assigned_to}</td>
                  <td>${supervisorName}</td>
                  <td>${assignmentDate}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">Responsabilidades del pasillo</div>
            <ol>
              ${responsibilities.map((item) => `<li>${item}</li>`).join("")}
            </ol>

            <div class="note">
              Este documento es de control operativo interno. Registra la responsabilidad del pasillo asignado y
              sirve como guía de seguimiento semanal, sin incluir firmas.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
      <header className="sticky top-0 z-40 rounded-b-[32px] bg-gradient-to-r from-[#d91d2f] via-[#e51d2e] to-[#ff4f61] px-4 py-4 shadow-[0_16px_34px_rgba(229,29,46,0.22)]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              Pasillos
            </p>
            <h1 className="flex items-center gap-2 text-lg font-black leading-tight text-white">
              Control de Cuadrantes
            </h1>
            <p className="text-[10px] text-white/90">
              Asignación y aceptación de responsabilidades
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-4">
        <form
          onSubmit={handleAssign}
          className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserPlus className="h-4 w-4 text-blue-500" />
            Nueva Asignación
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Responsable
              </label>
              <AppSelect
                name="assigned_to"
                required
                options={[
                  { value: "", label: "Selecciona la persona responsable..." },
                  ...availableAssistants.map((assistant) => ({
                    value: assistant.name,
                    label: assistant.name,
                  })),
                ]}
                buttonClassName="rounded-xl py-2.5 text-sm font-medium shadow-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Cuadrante / Pasillo
              </label>
              {areas.length > 0 ? (
                <AppSelect
                  name="quadrant_name"
                  required
                  options={[
                    { value: "", label: "Selecciona un cuadrante guardado..." },
                    ...availableAreas.map((area) => ({ value: area, label: area })),
                  ]}
                  buttonClassName="rounded-xl py-2.5 text-sm font-medium shadow-none"
                />
              ) : (
                <input
                  type="text"
                  name="quadrant_name"
                  required
                  className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Pasillo 1 - Lácteos"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d1b20] py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              Asignar cuadrante
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-slate-800">
            <FileSignature className="h-4 w-4 text-orange-500" />
            Responsabilidades asignadas
          </h2>

          {assignments && assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">
                    {assignment.quadrant_name}
                  </span>
                  {assignment.status === "aceptado" ? (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> Aceptado
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">
                      Pendiente aceptación
                    </span>
                  )}
                </div>

                {editingId === assignment.id ? (
                  <form onSubmit={handleUpdate} className="mb-3 space-y-3">
                    <input type="hidden" name="id" value={assignment.id} />
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Responsable
                      </span>
                      <AppSelect
                        name="assigned_to"
                        defaultValue={assignment.assigned_to}
                        options={assistants.map((assistant) => ({
                          value: assistant.name,
                          label: assistant.name,
                        }))}
                        buttonClassName="rounded-xl py-2.5 text-sm font-medium shadow-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Cuadrante / Pasillo
                      </span>
                      <AppSelect
                        name="quadrant_name"
                        defaultValue={assignment.quadrant_name}
                        options={areas.map((area) => ({
                          value: area,
                          label: area,
                        }))}
                        buttonClassName="rounded-xl py-2.5 text-sm font-medium shadow-none"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                      >
                        Guardar cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mb-3 space-y-1 text-xs text-slate-500">
                    <p>
                      <strong>Responsable:</strong> {assignment.assigned_to}
                    </p>
                    <p>
                      <strong>Asignado por:</strong> {assignment.assigned_by}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{" "}
                      {new Date(assignment.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                )}

                {canManage && editingId !== assignment.id && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(assignment.id)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Editar asignación
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(assignment)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar PDF
                    </button>
                  </div>
                )}

                {!canManage && editingId !== assignment.id && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(assignment)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar PDF
                    </button>
                  </div>
                )}

                {assignment.status !== "aceptado" && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-3 text-[10px] italic leading-tight text-slate-500">
                      Aceptar esta responsabilidad confirma el compromiso de mantener
                      el cuadrante conforme al estándar de la tienda.
                    </p>
                    <button
                      onClick={() => handleAccept(assignment.id)}
                      disabled={isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Aceptar responsabilidad
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-500">
                No hay cuadrantes asignados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
