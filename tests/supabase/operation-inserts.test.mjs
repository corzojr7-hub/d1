import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { createSupabaseGateway } from "../../src/lib/supabase/operation-inserts.ts";

function fakeThenable(result) {
  return {
    then(resolve) {
      resolve(result);
    },
  };
}

function createFakeSupabase() {
  const insertMock = mock.fn(() =>
    fakeThenable({ data: null, error: null }),
  );
  const fromMock = mock.fn(() => ({ insert: insertMock }));
  return { supabase: { from: fromMock }, insertMock, fromMock };
}

function createFakeSupabaseWithError(message) {
  const insertMock = mock.fn(() =>
    fakeThenable({ data: null, error: new Error(message) }),
  );
  const fromMock = mock.fn(() => ({ insert: insertMock }));
  return { supabase: { from: fromMock }, insertMock, fromMock };
}

const SAMPLE_PAYLOAD = {
  responsible_person: "Carlos Perez",
  instruction_text: "Revisar inventario",
  priority: "alta",
  status: "pendiente",
  observations: null,
  created_by: "550e8400-e29b-41d4-a716-446655440000",
};

const SAMPLE_WASTE_PAYLOAD = {
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
  created_by: "550e8400-e29b-41d4-a716-446655440000",
};

describe("createSupabaseGateway", () => {
  describe("insertInstruction", () => {
    it("call supabase.from(instructions).insert with payload on success", async () => {
      const { supabase, insertMock, fromMock } = createFakeSupabase();
      const gateway = createSupabaseGateway(supabase);

      await gateway.insertInstruction(SAMPLE_PAYLOAD);

      assert.equal(fromMock.mock.callCount(), 1);
      assert.equal(fromMock.mock.calls[0].arguments[0], "instructions");
      assert.equal(insertMock.mock.callCount(), 1);
      assert.equal(insertMock.mock.calls[0].arguments[0], SAMPLE_PAYLOAD);
    });

    it("throw Error with message when supabase returns error", async () => {
      const { supabase } = createFakeSupabaseWithError("Instruccion duplicada");
      const gateway = createSupabaseGateway(supabase);

      await assert.rejects(
        () => gateway.insertInstruction(SAMPLE_PAYLOAD),
        (err) => err instanceof Error && err.message === "Instruccion duplicada",
      );
    });
  });

  describe("insertWasteRecord", () => {
    it("call supabase.from(waste_records).insert with payload on success", async () => {
      const { supabase, insertMock, fromMock } = createFakeSupabase();
      const gateway = createSupabaseGateway(supabase);

      await gateway.insertWasteRecord(SAMPLE_WASTE_PAYLOAD);

      assert.equal(fromMock.mock.callCount(), 1);
      assert.equal(fromMock.mock.calls[0].arguments[0], "waste_records");
      assert.equal(insertMock.mock.callCount(), 1);
      assert.equal(insertMock.mock.calls[0].arguments[0], SAMPLE_WASTE_PAYLOAD);
    });

    it("throw Error with message when supabase returns error", async () => {
      const { supabase } = createFakeSupabaseWithError("Merma duplicada");
      const gateway = createSupabaseGateway(supabase);

      await assert.rejects(
        () => gateway.insertWasteRecord(SAMPLE_WASTE_PAYLOAD),
        (err) => err instanceof Error && err.message === "Merma duplicada",
      );
    });
  });
});
