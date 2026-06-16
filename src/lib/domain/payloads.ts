import type {
  InstructionPriority,
  WasteReason,
} from "./types";

// ---------------------------------------------------------------------------
// CreateData (input aceptado por el constructor)
// ---------------------------------------------------------------------------

export interface InstructionCreateData {
  responsible_person: string;
  instruction_text: string;
  priority: InstructionPriority;
  status?: string;
  observations?: string | null;
}

export interface WasteRecordCreateData {
  barcode: string;
  product_id?: string | null;
  product_name?: string | null;
  category?: string | null;
  quantity: number;
  unit: string;
  reason: WasteReason;
  responsible_person: string;
  area: string;
  observation: string;
  review_status?: string;
  product_not_found?: boolean;
  evidence_path?: string | null;
  transport_driver?: string | null;
  transport_plate?: string | null;
  transport_comment?: string | null;
  transport_evidence?: {
    novedad: string;
    lote: string;
    proveedor: string;
    cantidades: string;
  } | null;
}

// ---------------------------------------------------------------------------
// InsertPayload (lo que se envia a la DB)
// ---------------------------------------------------------------------------

export interface InstructionInsertPayload {
  responsible_person: string;
  instruction_text: string;
  priority: string;
  status: "pendiente";
  observations: string | null;
  created_by: string;
}

export interface WasteRecordInsertPayload {
  barcode: string;
  product_id: string | null;
  product_name: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  reason: string;
  responsible_person: string;
  area: string;
  observation: string;
  review_status: "pendiente_revision";
  product_not_found: boolean;
  evidence_path: string | null;
  transport_driver: string | null;
  transport_plate: string | null;
  transport_comment: string | null;
  transport_evidence: {
    novedad: string;
    lote: string;
    proveedor: string;
    cantidades: string;
  } | null;
  created_by: string;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function buildInstructionInsertPayload(
  data: InstructionCreateData,
  currentProfileId: string,
): InstructionInsertPayload {
  return {
    responsible_person: data.responsible_person,
    instruction_text: data.instruction_text,
    priority: data.priority,
    status: "pendiente",
    observations: data.observations && data.observations.length > 0
      ? data.observations
      : null,
    created_by: currentProfileId,
  };
}

export function buildWasteRecordInsertPayload(
  data: WasteRecordCreateData,
  currentProfileId: string,
): WasteRecordInsertPayload {
  const hasProductId =
    data.product_id !== undefined &&
    data.product_id !== null &&
    data.product_id !== "";
  const userSaysNotFound = data.product_not_found === true;
  const productNotFound = userSaysNotFound || !hasProductId;

  return {
    barcode: data.barcode,
    product_id: productNotFound ? null : data.product_id!,
    product_name: data.product_name ?? null,
    category: data.category ?? null,
    quantity: data.quantity,
    unit: data.unit,
    reason: data.reason,
    responsible_person: data.responsible_person,
    area: data.area,
    observation: data.observation,
    review_status: "pendiente_revision",
    product_not_found: productNotFound,
    evidence_path: data.evidence_path ?? null,
    transport_driver: data.transport_driver ?? null,
    transport_plate: data.transport_plate ?? null,
    transport_comment: data.transport_comment ?? null,
    transport_evidence: data.transport_evidence ?? null,
    created_by: currentProfileId,
  };
}
