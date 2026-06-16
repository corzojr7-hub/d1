import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  configureSubmitFlow,
  submitInstructionFlow,
  submitWasteRecordFlow,
  isSubmitFlowConfigured,
  resetSubmitFlow,
  createDevSubmitter,
} from "../../src/lib/app/operation-submit-flow.ts";

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

function createFakeSubmitter() {
  const submitInstruction = mock.fn(async () => ({
    ok: true,
    issues: [],
    error: null,
  }));

  const submitWasteRecord = mock.fn(async () => ({
    ok: true,
    issues: [],
    error: null,
  }));

  const submitter = { submitInstruction, submitWasteRecord };
  return { submitter, submitInstruction, submitWasteRecord };
}

function createFailingSubmitter() {
  const submitInstruction = mock.fn(async () => ({
    ok: false,
    issues: [{ field: "instruction_text", message: "Requerido" }],
    error: null,
  }));

  const submitWasteRecord = mock.fn(async () => ({
    ok: false,
    issues: [{ field: "barcode", message: "Requerido" }],
    error: null,
  }));

  return {
    submitter: { submitInstruction, submitWasteRecord },
    submitInstruction,
    submitWasteRecord,
  };
}

function createErrorSubmitter() {
  const submitInstruction = mock.fn(async () => ({
    ok: false,
    issues: [],
    error: "DB timeout",
  }));

  const submitWasteRecord = mock.fn(async () => ({
    ok: false,
    issues: [],
    error: "Constraint violation",
  }));

  return {
    submitter: { submitInstruction, submitWasteRecord },
    submitInstruction,
    submitWasteRecord,
  };
}

describe("operation-submit-flow", () => {
  beforeEach(() => {
    resetSubmitFlow();
  });

  describe("isSubmitFlowConfigured / configureSubmitFlow / resetSubmitFlow", () => {
    it("return false before configuration", () => {
      assert.equal(isSubmitFlowConfigured(), false);
    });

    it("return true after configuration", () => {
      configureSubmitFlow(createFakeSubmitter().submitter);
      assert.equal(isSubmitFlowConfigured(), true);
    });

    it("return false after reset", () => {
      configureSubmitFlow(createFakeSubmitter().submitter);
      resetSubmitFlow();
      assert.equal(isSubmitFlowConfigured(), false);
    });
  });

  describe("submitInstructionFlow", () => {
    it("return ok=true for valid data", async () => {
      const { submitter, submitInstruction } = createFakeSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitInstructionFlow(VALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, true);
      assert.equal(submitInstruction.mock.callCount(), 1);
    });

    it("return ok=false with issues when submitter fails validation", async () => {
      const { submitter, submitInstruction } = createFailingSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitInstructionFlow(INVALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.equal(r.error, null);
      assert.ok(r.issues.length > 0);
      assert.equal(submitInstruction.mock.callCount(), 1);
    });

    it("return ok=false with error when submitter has persistence error", async () => {
      const { submitter, submitInstruction } = createErrorSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitInstructionFlow(VALID_INSTRUCTION, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, "DB timeout");
      assert.equal(submitInstruction.mock.callCount(), 1);
    });

    it("throw when not configured", async () => {
      await assert.rejects(
        () => submitInstructionFlow(VALID_INSTRUCTION, PROFILE_ID),
        {
          message:
            "SubmitFlow no configurado: llame configureSubmitFlow al iniciar la app",
        },
      );
      assert.equal(isSubmitFlowConfigured(), false);
    });
  });

  describe("createDevSubmitter", () => {
    it("work when configured explicitly", async () => {
      configureSubmitFlow(createDevSubmitter());
      assert.equal(isSubmitFlowConfigured(), true);

      const r1 = await submitInstructionFlow(VALID_INSTRUCTION, PROFILE_ID);
      assert.equal(r1.ok, true);

      const r2 = await submitWasteRecordFlow(VALID_WASTE, PROFILE_ID);
      assert.equal(r2.ok, true);
    });
  });

  describe("submitWasteRecordFlow", () => {
    it("return ok=true for valid data", async () => {
      const { submitter, submitWasteRecord } = createFakeSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitWasteRecordFlow(VALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, true);
      assert.equal(submitWasteRecord.mock.callCount(), 1);
    });

    it("return ok=false with issues when submitter fails validation", async () => {
      const { submitter, submitWasteRecord } = createFailingSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitWasteRecordFlow(INVALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.equal(r.error, null);
      assert.ok(r.issues.length > 0);
      assert.equal(submitWasteRecord.mock.callCount(), 1);
    });

    it("return ok=false with error when submitter has persistence error", async () => {
      const { submitter, submitWasteRecord } = createErrorSubmitter();
      configureSubmitFlow(submitter);

      const r = await submitWasteRecordFlow(VALID_WASTE, PROFILE_ID);

      assert.equal(r.ok, false);
      assert.deepEqual(r.issues, []);
      assert.equal(r.error, "Constraint violation");
      assert.equal(submitWasteRecord.mock.callCount(), 1);
    });

    it("throw when not configured", async () => {
      await assert.rejects(
        () => submitWasteRecordFlow(VALID_WASTE, PROFILE_ID),
        {
          message:
            "SubmitFlow no configurado: llame configureSubmitFlow al iniciar la app",
        },
      );
      assert.equal(isSubmitFlowConfigured(), false);
    });
  });
});
