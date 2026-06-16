import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { createOperationSubmitter } from "../../src/lib/app/operation-submitters.ts";

function createSuccessGateway() {
  return {
    insertInstruction: mock.fn(() => Promise.resolve()),
    insertWasteRecord: mock.fn(() => Promise.resolve()),
  };
}

function createFailingGateway(instructionMsg, wasteMsg) {
  return {
    insertInstruction: mock.fn(() => Promise.reject(new Error(instructionMsg))),
    insertWasteRecord: mock.fn(() => Promise.reject(new Error(wasteMsg))),
  };
}

const PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_INSTRUCTION = {
  responsible_person: "Carlos Perez",
  instruction_text: "Revisar inventario",
  priority: "alta",
};

const VALID_WASTE = {
  barcode: "7701234567890",
  product_id: "660e8400-e29b-41d4-a716-446655440001",
  quantity: 3,
  unit: "unidad",
  reason: "vencido",
  responsible_person: "Maria Lopez",
  area: "Fruta y verdura",
  observation: "Producto vencido en gondola",
};

const INVALID_INSTRUCTION = {
  responsible_person: "",
  instruction_text: "",
  priority: "inexistente",
};

const INVALID_WASTE = {
  barcode: "",
  quantity: 0,
  unit: "",
  reason: "roto",
  responsible_person: "",
  area: "",
  observation: "",
};

describe("createOperationSubmitter", () => {
  describe("submitInstruction", () => {
    it("return ok=true and delegate to gateway on valid data", async () => {
      const gateway = createSuccessGateway();
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitInstruction(VALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, true);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, null);
      assert.equal(gateway.insertInstruction.mock.callCount(), 1);
    });

    it("return ok=false with issues when data is invalid", async () => {
      const gateway = createSuccessGateway();
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitInstruction(INVALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.equal(r.error, null);
      assert.ok(r.issues.length > 0);
      assert.equal(gateway.insertInstruction.mock.callCount(), 0);
    });

    it("return ok=false with error when gateway fails", async () => {
      const gateway = createFailingGateway("DB error", "");
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitInstruction(VALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, "DB error");
    });
  });

  describe("submitWasteRecord", () => {
    it("return ok=true and delegate to gateway on valid data", async () => {
      const gateway = createSuccessGateway();
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitWasteRecord(VALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, true);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, null);
      assert.equal(gateway.insertWasteRecord.mock.callCount(), 1);
    });

    it("return ok=false with issues when data is invalid", async () => {
      const gateway = createSuccessGateway();
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitWasteRecord(INVALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.equal(r.error, null);
      assert.ok(r.issues.length > 0);
      assert.equal(gateway.insertWasteRecord.mock.callCount(), 0);
    });

    it("return ok=false with error when gateway fails", async () => {
      const gateway = createFailingGateway("", "Constraint violation");
      const submitter = createOperationSubmitter(gateway);
      const r = await submitter.submitWasteRecord(VALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, "Constraint violation");
    });
  });
});
