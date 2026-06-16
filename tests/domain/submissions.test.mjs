import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  prepareInstructionSubmission,
  prepareWasteRecordSubmission,
} from "../../src/lib/domain/submissions.ts";

const PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_PROFILE_ID = "not-a-uuid";

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

function validWasteDataNoProduct() {
  return {
    barcode: "9999999999999",
    quantity: 1,
    unit: "unidad",
    reason: "otro",
    responsible_person: "Juan Diaz",
    area: "Lacteos",
    observation: "Producto no encontrado en base",
    product_not_found: true,
  };
}

describe("prepareInstructionSubmission", () => {
  it("return ok=true with payload for valid data", () => {
    const r = prepareInstructionSubmission(validInstructionData(), PROFILE_ID);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.responsible_person, "Carlos Perez");
      assert.equal(r.payload.priority, "alta");
      assert.equal(r.payload.created_by, PROFILE_ID);
    }
  });

  it("return ok=false when data is invalid", () => {
    const r = prepareInstructionSubmission(
      { ...validInstructionData(), instruction_text: "" },
      PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "instruction_text"));
      assert.equal(r.payload, null);
    }
  });

  it("return ok=false when profileId is invalid", () => {
    const r = prepareInstructionSubmission(
      validInstructionData(),
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
      assert.equal(r.payload, null);
    }
  });

  it("accumulate issues when both data and profileId are invalid", () => {
    const r = prepareInstructionSubmission(
      {
        responsible_person: "",
        instruction_text: "",
        priority: "inexistente",
      },
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "responsible_person"));
      assert.ok(r.issues.some((i) => i.field === "instruction_text"));
      assert.ok(r.issues.some((i) => i.field === "priority"));
      assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
      assert.equal(r.payload, null);
    }
  });

  it("not produce payload when ok=false", () => {
    const r = prepareInstructionSubmission(
      { ...validInstructionData(), instruction_text: "" },
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.payload, null);
    }
  });

  it("set payload status to pendiente on success", () => {
    const r = prepareInstructionSubmission(validInstructionData(), PROFILE_ID);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.status, "pendiente");
    }
  });
});

describe("prepareWasteRecordSubmission", () => {
  it("return ok=true with payload for valid data (with product)", () => {
    const r = prepareWasteRecordSubmission(validWasteData(), PROFILE_ID);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.barcode, "7701234567890");
      assert.equal(r.payload.product_id, "660e8400-e29b-41d4-a716-446655440001");
      assert.equal(r.payload.product_not_found, false);
      assert.equal(r.payload.created_by, PROFILE_ID);
    }
  });

  it("return ok=true with payload for valid data (without product)", () => {
    const r = prepareWasteRecordSubmission(
      validWasteDataNoProduct(),
      PROFILE_ID,
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.product_id, null);
      assert.equal(r.payload.product_not_found, true);
      assert.equal(r.payload.created_by, PROFILE_ID);
    }
  });

  it("return ok=false when data is invalid", () => {
    const r = prepareWasteRecordSubmission(
      { ...validWasteData(), barcode: "" },
      PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "barcode"));
      assert.equal(r.payload, null);
    }
  });

  it("return ok=false when profileId is invalid", () => {
    const r = prepareWasteRecordSubmission(
      validWasteData(),
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
      assert.equal(r.payload, null);
    }
  });

  it("accumulate issues when both data and profileId are invalid", () => {
    const r = prepareWasteRecordSubmission(
      {
        barcode: "",
        quantity: 0,
        unit: "",
        reason: "roto",
        responsible_person: "",
        area: "",
        observation: "",
      },
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "barcode"));
      assert.ok(r.issues.some((i) => i.field === "quantity"));
      assert.ok(r.issues.some((i) => i.field === "reason"));
      assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
      assert.equal(r.payload, null);
    }
  });

  it("not produce payload when ok=false", () => {
    const r = prepareWasteRecordSubmission(
      { ...validWasteData(), barcode: "" },
      INVALID_PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.payload, null);
    }
  });

  it("return ok=false when product_id has invalid UUID", () => {
    const r = prepareWasteRecordSubmission(
      { ...validWasteData(), product_id: "not-a-uuid" },
      PROFILE_ID,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.issues.some((i) => i.field === "product_id"));
      assert.equal(r.payload, null);
    }
  });

  it("set payload review_status to pendiente_revision on success", () => {
    const r = prepareWasteRecordSubmission(validWasteData(), PROFILE_ID);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.review_status, "pendiente_revision");
    }
  });
});
