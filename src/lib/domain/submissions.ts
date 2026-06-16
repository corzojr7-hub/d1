import type { ValidationIssue } from "./validators";
import { validateInstructionInput, validateWasteRecordInput, isUuid } from "./validators";
import type {
  InstructionCreateData,
  WasteRecordCreateData,
  InstructionInsertPayload,
  WasteRecordInsertPayload,
} from "./payloads";
import {
  buildInstructionInsertPayload,
  buildWasteRecordInsertPayload,
} from "./payloads";

export type SubmissionPreparationResult<T> =
  | { ok: true; payload: T; issues: [] }
  | { ok: false; payload: null; issues: ValidationIssue[] };

function prepareCurrentProfileIdIssue(): ValidationIssue {
  return {
    field: "current_profile_id",
    message: "ID de perfil actual debe ser UUID valido",
  };
}

export function prepareInstructionSubmission(
  data: InstructionCreateData,
  currentProfileId: string,
): SubmissionPreparationResult<InstructionInsertPayload> {
  const issues: ValidationIssue[] = [];

  const validation = validateInstructionInput(data);
  issues.push(...validation.issues);

  if (!isUuid(currentProfileId)) {
    issues.push(prepareCurrentProfileIdIssue());
  }

  if (issues.length > 0) {
    return { ok: false, payload: null, issues };
  }

  return {
    ok: true,
    payload: buildInstructionInsertPayload(data, currentProfileId),
    issues: [],
  };
}

export function prepareWasteRecordSubmission(
  data: WasteRecordCreateData,
  currentProfileId: string,
): SubmissionPreparationResult<WasteRecordInsertPayload> {
  const issues: ValidationIssue[] = [];

  const validation = validateWasteRecordInput(data);
  issues.push(...validation.issues);

  if (!isUuid(currentProfileId)) {
    issues.push(prepareCurrentProfileIdIssue());
  }

  if (issues.length > 0) {
    return { ok: false, payload: null, issues };
  }

  return {
    ok: true,
    payload: buildWasteRecordInsertPayload(data, currentProfileId),
    issues: [],
  };
}
