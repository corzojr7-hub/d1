import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import {
  insertInstruction,
  insertWasteRecord,
} from "../../src/lib/services/operation-inserts.ts";

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

function createSuccessGateway() {
  return {
    insertInstruction: mock.fn(() => Promise.resolve()),
    insertWasteRecord: mock.fn(() => Promise.resolve()),
  };
}

describe("insertInstruction", () => {
  it("return ok=true with payload sent to gateway", async () => {
    const gateway = createSuccessGateway();
    const r = await insertInstruction(validInstructionData(), PROFILE_ID, gateway);

    assert.equal(r.ok, true);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, null);
    assert.equal(gateway.insertInstruction.mock.callCount(), 1);
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 0);

    const sentPayload = gateway.insertInstruction.mock.calls[0].arguments[0];
    assert.deepEqual(sentPayload, {
      responsible_person: "Carlos Perez",
      instruction_text: "Revisar inventario de lacteos",
      priority: "alta",
      status: "pendiente",
      observations: null,
      created_by: PROFILE_ID,
    });
  });

  it("return ok=false with issues and error=null when data is invalid", async () => {
    const gateway = createSuccessGateway();
    const r = await insertInstruction(
      { ...validInstructionData(), instruction_text: "" },
      PROFILE_ID,
      gateway,
    );

    assert.equal(r.ok, false);
    assert.equal(r.error, null);
    assert.ok(r.issues.some((i) => i.field === "instruction_text"));
    assert.equal(gateway.insertInstruction.mock.callCount(), 0);
  });

  it("return ok=false with issues and error=null when profileId is invalid", async () => {
    const gateway = createSuccessGateway();
    const r = await insertInstruction(
      validInstructionData(),
      INVALID_PROFILE_ID,
      gateway,
    );

    assert.equal(r.ok, false);
    assert.equal(r.error, null);
    assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
    assert.equal(gateway.insertInstruction.mock.callCount(), 0);
  });

  it("return ok=false with issues=[] and error string when gateway throws Error", async () => {
    const gateway = {
      insertInstruction: mock.fn(() => Promise.reject(new Error("DB timeout"))),
      insertWasteRecord: mock.fn(() => Promise.resolve()),
    };
    const r = await insertInstruction(validInstructionData(), PROFILE_ID, gateway);

    assert.equal(r.ok, false);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, "DB timeout");
    assert.equal(gateway.insertInstruction.mock.callCount(), 1);
  });

  it("return ok=false with issues=[] and generic error when gateway throws non-Error", async () => {
    const gateway = {
      insertInstruction: mock.fn(() => Promise.reject("string error")),
      insertWasteRecord: mock.fn(() => Promise.resolve()),
    };
    const r = await insertInstruction(validInstructionData(), PROFILE_ID, gateway);

    assert.equal(r.ok, false);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, "Error de persistencia desconocido");
    assert.equal(gateway.insertInstruction.mock.callCount(), 1);
  });
});

describe("insertWasteRecord", () => {
  it("return ok=true with payload sent to gateway (with product)", async () => {
    const gateway = createSuccessGateway();
    const r = await insertWasteRecord(validWasteData(), PROFILE_ID, gateway);

    assert.equal(r.ok, true);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, null);
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 1);
    assert.equal(gateway.insertInstruction.mock.callCount(), 0);

    const sentPayload = gateway.insertWasteRecord.mock.calls[0].arguments[0];
    assert.deepEqual(sentPayload, {
      barcode: "7701234567890",
      product_id: "660e8400-e29b-41d4-a716-446655440001",
      product_name: null,
      category: null,
      quantity: 3,
      unit: "unidad",
      reason: "vencido",
      responsible_person: "Maria Lopez",
      area: "Fruta y verdura",
      observation: "Producto vencido en gondola",
      review_status: "pendiente_revision",
      product_not_found: false,
      evidence_path: null,
      created_by: PROFILE_ID,
    });
  });

  it("return ok=true with payload sent to gateway (no product)", async () => {
    const gateway = createSuccessGateway();
    const r = await insertWasteRecord(
      validWasteDataNoProduct(),
      PROFILE_ID,
      gateway,
    );

    assert.equal(r.ok, true);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, null);
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 1);

    const sentPayload = gateway.insertWasteRecord.mock.calls[0].arguments[0];
    assert.deepEqual(sentPayload, {
      barcode: "9999999999999",
      product_id: null,
      product_name: null,
      category: null,
      quantity: 1,
      unit: "unidad",
      reason: "otro",
      responsible_person: "Juan Diaz",
      area: "Lacteos",
      observation: "Producto no encontrado en base",
      review_status: "pendiente_revision",
      product_not_found: true,
      evidence_path: null,
      created_by: PROFILE_ID,
    });
  });

  it("return ok=false with issues and error=null when data is invalid", async () => {
    const gateway = createSuccessGateway();
    const r = await insertWasteRecord(
      { ...validWasteData(), barcode: "" },
      PROFILE_ID,
      gateway,
    );

    assert.equal(r.ok, false);
    assert.equal(r.error, null);
    assert.ok(r.issues.some((i) => i.field === "barcode"));
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 0);
  });

  it("return ok=false with issues and error=null when profileId is invalid", async () => {
    const gateway = createSuccessGateway();
    const r = await insertWasteRecord(
      validWasteData(),
      INVALID_PROFILE_ID,
      gateway,
    );

    assert.equal(r.ok, false);
    assert.equal(r.error, null);
    assert.ok(r.issues.some((i) => i.field === "current_profile_id"));
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 0);
  });

  it("return ok=false with issues=[] and error string when gateway throws Error", async () => {
    const gateway = {
      insertInstruction: mock.fn(() => Promise.resolve()),
      insertWasteRecord: mock.fn(() => Promise.reject(new Error("Constraint violation"))),
    };
    const r = await insertWasteRecord(validWasteData(), PROFILE_ID, gateway);

    assert.equal(r.ok, false);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, "Constraint violation");
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 1);
  });

  it("return ok=false with issues=[] and generic error when gateway throws non-Error", async () => {
    const gateway = {
      insertInstruction: mock.fn(() => Promise.resolve()),
      insertWasteRecord: mock.fn(() => Promise.reject(null)),
    };
    const r = await insertWasteRecord(validWasteData(), PROFILE_ID, gateway);

    assert.equal(r.ok, false);
    assert.deepEqual(r.issues, []);
    assert.equal(r.error, "Error de persistencia desconocido");
    assert.equal(gateway.insertWasteRecord.mock.callCount(), 1);
  });
});
