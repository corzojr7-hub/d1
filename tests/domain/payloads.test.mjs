import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildInstructionInsertPayload,
  buildWasteRecordInsertPayload,
} from "../../src/lib/domain/payloads.ts";

const PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000";

function validInstructionData() {
  return {
    responsible_person: "Carlos Perez",
    instruction_text: "Revisar inventario de lacteos",
    priority: "alta",
  };
}

function validWasteData() {
  return {
    barcode: "7701234567890",
    product_id: "660e8400-e29b-41d4-a716-446655440001",
    quantity: 3,
    unit: "unidad",
    reason: "vencido",
    responsible_person: "Maria Lopez",
    area: "Fruta y verdura",
    observation: "Producto vencido en gondola",
  };
}

describe("buildInstructionInsertPayload", () => {
  it("force status to pendiente regardless of input", () => {
    const withInvalid = buildInstructionInsertPayload(
      { ...validInstructionData(), status: "cumplida" },
      PROFILE_ID,
    );
    assert.equal(withInvalid.status, "pendiente");

    const withUndefined = buildInstructionInsertPayload(
      { ...validInstructionData(), status: undefined },
      PROFILE_ID,
    );
    assert.equal(withUndefined.status, "pendiente");
  });

  it("set created_by to currentProfileId", () => {
    const payload = buildInstructionInsertPayload(
      validInstructionData(),
      PROFILE_ID,
    );
    assert.equal(payload.created_by, PROFILE_ID);
  });

  it("convert empty observations to null", () => {
    const empty = buildInstructionInsertPayload(
      { ...validInstructionData(), observations: "" },
      PROFILE_ID,
    );
    assert.equal(empty.observations, null);

    const nullObs = buildInstructionInsertPayload(
      { ...validInstructionData(), observations: null },
      PROFILE_ID,
    );
    assert.equal(nullObs.observations, null);
  });

  it("pass non-empty observations through", () => {
    const payload = buildInstructionInsertPayload(
      { ...validInstructionData(), observations: "Nota adicional" },
      PROFILE_ID,
    );
    assert.equal(payload.observations, "Nota adicional");
  });

  it("not include id, created_at, updated_at or updated_by", () => {
    const payload = buildInstructionInsertPayload(
      validInstructionData(),
      PROFILE_ID,
    );
    assert.equal("id" in payload, false);
    assert.equal("created_at" in payload, false);
    assert.equal("updated_at" in payload, false);
    assert.equal("updated_by" in payload, false);
  });
});

describe("buildWasteRecordInsertPayload", () => {
  it("force review_status to pendiente_revision regardless of input", () => {
    const withInvalid = buildWasteRecordInsertPayload(
      { ...validWasteData(), review_status: "revisado" },
      PROFILE_ID,
    );
    assert.equal(withInvalid.review_status, "pendiente_revision");

    const withUndefined = buildWasteRecordInsertPayload(
      { ...validWasteData(), review_status: undefined },
      PROFILE_ID,
    );
    assert.equal(withUndefined.review_status, "pendiente_revision");
  });

  it("set created_by to currentProfileId", () => {
    const payload = buildWasteRecordInsertPayload(
      validWasteData(),
      PROFILE_ID,
    );
    assert.equal(payload.created_by, PROFILE_ID);
  });

  it("force product_id null when product_not_found is true", () => {
    const payload = buildWasteRecordInsertPayload(
      {
        ...validWasteData(),
        product_id: "660e8400-e29b-41d4-a716-446655440001",
        product_not_found: true,
      },
      PROFILE_ID,
    );
    assert.equal(payload.product_id, null);
    assert.equal(payload.product_not_found, true);
  });

  it("keep product_id when product_not_found is false", () => {
    const pid = "660e8400-e29b-41d4-a716-446655440001";
    const payload = buildWasteRecordInsertPayload(
      { ...validWasteData(), product_id: pid, product_not_found: false },
      PROFILE_ID,
    );
    assert.equal(payload.product_id, pid);
    assert.equal(payload.product_not_found, false);
  });

  it("default product_not_found to false when product_id is present and flag omitted", () => {
    const payload = buildWasteRecordInsertPayload(
      validWasteData(),
      PROFILE_ID,
    );
    assert.equal(payload.product_not_found, false);
    assert.notEqual(payload.product_id, null);
  });

  it("set optional fields to null and force product_not_found true when absent", () => {
    const payload = buildWasteRecordInsertPayload(
      {
        barcode: "7701234567890",
        quantity: 1,
        unit: "unidad",
        reason: "otro",
        responsible_person: "Juan",
        area: "Lacteos",
        observation: "Prueba",
      },
      PROFILE_ID,
    );
    assert.equal(payload.product_id, null);
    assert.equal(payload.product_not_found, true);
    assert.equal(payload.product_name, null);
    assert.equal(payload.category, null);
    assert.equal(payload.evidence_path, null);
  });

  it("force product_not_found true when product_id missing even if flag is false", () => {
    const payload = buildWasteRecordInsertPayload(
      {
        barcode: "7701234567890",
        product_not_found: false,
        quantity: 1,
        unit: "unidad",
        reason: "otro",
        responsible_person: "Juan",
        area: "Lacteos",
        observation: "Prueba",
      },
      PROFILE_ID,
    );
    assert.equal(payload.product_id, null);
    assert.equal(payload.product_not_found, true);
  });

  it("not include id, created_at, updated_at or updated_by", () => {
    const payload = buildWasteRecordInsertPayload(
      validWasteData(),
      PROFILE_ID,
    );
    assert.equal("id" in payload, false);
    assert.equal("created_at" in payload, false);
    assert.equal("updated_at" in payload, false);
    assert.equal("updated_by" in payload, false);
  });
});
