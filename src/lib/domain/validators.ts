import {
  INSTRUCTION_PRIORITIES,
  INSTRUCTION_STATUSES,
  PRODUCT_STATUSES,
  WASTE_REASONS,
  WASTE_REVIEW_STATUSES,
  type CatalogItem,
} from "./catalogs";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function isCatalogValue<T extends string>(
  value: unknown,
  catalog: CatalogItem<T>[],
): value is T {
  return catalog.some((item) => item.value === value);
}

function issue(field: string, message: string): ValidationIssue {
  return { field, message };
}

// ---------------------------------------------------------------------------
// Instruction
// ---------------------------------------------------------------------------
export interface InstructionInput {
  responsible_person: unknown;
  instruction_text: unknown;
  priority: unknown;
  status?: unknown;
  observations?: unknown;
}

export function validateInstructionInput(
  input: InstructionInput,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyText(input.responsible_person)) {
    issues.push(issue("responsible_person", "Responsable es requerido"));
  }

  if (!isNonEmptyText(input.instruction_text)) {
    issues.push(issue("instruction_text", "Texto de instruccion es requerido"));
  }

  if (!isCatalogValue(input.priority, INSTRUCTION_PRIORITIES)) {
    issues.push(
      issue(
        "priority",
        "Prioridad invalida. Valores: baja, media, alta, critica",
      ),
    );
  }

  if (input.status !== undefined && input.status !== null) {
    if (!isCatalogValue(input.status, INSTRUCTION_STATUSES)) {
      issues.push(
        issue(
          "status",
          "Estado invalido. Valores: pendiente, en_proceso, cumplida, no_cumplida, requiere_seguimiento, anulada",
        ),
      );
    }
  }

  if (
    input.observations !== undefined &&
    input.observations !== null &&
    input.observations !== ""
  ) {
    if (!isNonEmptyText(input.observations)) {
      issues.push(issue("observations", "Observaciones debe ser texto"));
    }
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// WasteRecord
// ---------------------------------------------------------------------------
export interface WasteRecordInput {
  barcode: unknown;
  product_id?: unknown;
  product_name?: unknown;
  category?: unknown;
  quantity: unknown;
  unit: unknown;
  reason: unknown;
  responsible_person: unknown;
  area: unknown;
  observation: unknown;
  review_status?: unknown;
  product_not_found?: unknown;
  evidence_path?: unknown;
  transport_driver?: unknown;
  transport_plate?: unknown;
  transport_comment?: unknown;
}

export function validateWasteRecordInput(
  input: WasteRecordInput,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyText(input.barcode)) {
    issues.push(issue("barcode", "Codigo de barras es requerido"));
  }

  if (!isPositiveNumber(input.quantity)) {
    issues.push(
      issue("quantity", "Cantidad debe ser un numero mayor a cero"),
    );
  }

  if (!isNonEmptyText(input.unit)) {
    issues.push(issue("unit", "Unidad de medida es requerida"));
  }

  if (!isCatalogValue(input.reason, WASTE_REASONS)) {
    issues.push(issue("reason", "Motivo de merma invalido"));
  }

  if (input.reason === "averia_transporte") {
    if (!isNonEmptyText(input.transport_driver)) {
      issues.push(issue("transport_driver", "El nombre del conductor es requerido para averías de transporte"));
    }
    if (!isNonEmptyText(input.transport_plate)) {
      issues.push(issue("transport_plate", "La placa del vehículo es requerida para averías de transporte"));
    }
  }

  if (input.reason === "averia_transporte" || input.reason === "reporte_calidad") {
    if (!isNonEmptyText(input.transport_comment)) {
      issues.push(issue("transport_comment", "Debe especificar la novedad (comentario)"));
    }
  }

  if (!isNonEmptyText(input.responsible_person)) {
    issues.push(
      issue("responsible_person", "Responsable que deposito es requerido"),
    );
  }

  if (!isNonEmptyText(input.area)) {
    issues.push(issue("area", "Area o cuadrante es requerido"));
  }

  if (!isNonEmptyText(input.observation)) {
    issues.push(issue("observation", "Observacion es requerida"));
  }

  if (input.review_status !== undefined && input.review_status !== null) {
    if (!isCatalogValue(input.review_status, WASTE_REVIEW_STATUSES)) {
      issues.push(
        issue(
          "review_status",
          "Estado de revision invalido. Valores: pendiente_revision, revisado, recuperable, no_recuperable, requiere_seguimiento, anulado",
        ),
      );
    }
  }

  const productNotFound =
    input.product_not_found === true || input.product_not_found === "true";
  const hasProductId =
    input.product_id !== undefined &&
    input.product_id !== null &&
    input.product_id !== "";

  if (hasProductId && !isUuid(input.product_id)) {
    issues.push(
      issue("product_id", "ID de producto debe ser UUID valido"),
    );
  }

  if (hasProductId && productNotFound) {
    issues.push(
      issue(
        "product_not_found",
        "Si product_id existe, product_not_found debe ser false",
      ),
    );
  }

  if (!hasProductId && !productNotFound) {
    issues.push(
      issue(
        "product_not_found",
        "Si no hay product_id, product_not_found debe ser true",
      ),
    );
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export interface ProductInput {
  barcode: unknown;
  name: unknown;
  category?: unknown;
  suggested_unit?: unknown;
  status?: unknown;
  source_note?: unknown;
}

export function validateProductInput(input: ProductInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyText(input.barcode)) {
    issues.push(issue("barcode", "Codigo de barras es requerido"));
  }

  if (!isNonEmptyText(input.name)) {
    issues.push(issue("name", "Nombre del producto es requerido"));
  }

  if (
    input.status !== undefined &&
    input.status !== null &&
    input.status !== ""
  ) {
    if (!isCatalogValue(input.status, PRODUCT_STATUSES)) {
      issues.push(
        issue(
          "status",
          "Estado invalido. Valores: activo, inactivo",
        ),
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
