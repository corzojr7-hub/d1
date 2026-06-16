import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isUuid,
  validateInstructionInput,
  validateWasteRecordInput,
  validateProductInput,
} from "../../src/lib/domain/validators.ts";

function validInstruction() {
  return {
    responsible_person: "Carlos Perez",
    instruction_text: "Revisar inventario de lacteos",
    priority: "alta",
    status: "pendiente",
  };
}

function validWasteRecord() {
  return {
    barcode: "7701234567890",
    product_id: "550e8400-e29b-41d4-a716-446655440000",
    quantity: 3,
    unit: "unidad",
    reason: "vencido",
    responsible_person: "Maria Lopez",
    area: "Fruta y verdura",
    observation: "Producto vencido en gondola",
    review_status: "pendiente_revision",
    product_not_found: false,
  };
}

function validWasteRecordNoProduct() {
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

function validProduct() {
  return {
    barcode: "7701234567890",
    name: "Leche entera 1L",
    status: "activo",
  };
}

describe("validateInstructionInput", () => {
  it("return valid=true for a valid instruction", () => {
    const r = validateInstructionInput(validInstruction());
    assert.equal(r.valid, true);
    assert.equal(r.issues.length, 0);
  });

  it("return valid=false when instruction_text is empty", () => {
    const r = validateInstructionInput({ ...validInstruction(), instruction_text: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "instruction_text"));
  });

  it("return valid=false when responsible_person is missing", () => {
    const r = validateInstructionInput({ ...validInstruction(), responsible_person: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "responsible_person"));
  });

  it("return valid=false when priority is invalid", () => {
    const r = validateInstructionInput({ ...validInstruction(), priority: "urgente" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "priority"));
  });

  it("return valid=false when status is invalid", () => {
    const r = validateInstructionInput({ ...validInstruction(), status: "inexistente" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "status"));
  });
});

describe("validateWasteRecordInput", () => {
  it("return valid=true for a valid waste record with product", () => {
    const r = validateWasteRecordInput(validWasteRecord());
    assert.equal(r.valid, true);
    assert.equal(r.issues.length, 0);
  });

  it("return valid=true for a valid waste record without product", () => {
    const r = validateWasteRecordInput(validWasteRecordNoProduct());
    assert.equal(r.valid, true);
    assert.equal(r.issues.length, 0);
  });

  it("return valid=false when quantity is zero", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), quantity: 0 });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "quantity"));
  });

  it("return valid=false when quantity is negative", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), quantity: -1 });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "quantity"));
  });

  it("return valid=false when barcode is empty", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), barcode: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "barcode"));
  });

  it("return valid=false when reason is invalid", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), reason: "roto" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "reason"));
  });

  it("return valid=false when observation is empty", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), observation: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "observation"));
  });

  it("return invalid when product_id and product_not_found=true conflict", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), product_not_found: true });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "product_not_found"));
  });

  it("return invalid when product_id missing and product_not_found=false", () => {
    const r = validateWasteRecordInput({ ...validWasteRecord(), product_id: null, product_not_found: false });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "product_not_found"));
  });
});

describe("validateProductInput", () => {
  it("return valid=true for a valid product", () => {
    const r = validateProductInput(validProduct());
    assert.equal(r.valid, true);
    assert.equal(r.issues.length, 0);
  });

  it("return valid=false when barcode is missing", () => {
    const r = validateProductInput({ ...validProduct(), barcode: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "barcode"));
  });

  it("return valid=false when name is missing", () => {
    const r = validateProductInput({ ...validProduct(), name: "" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "name"));
  });

  it("return valid=false when status is invalid", () => {
    const r = validateProductInput({ ...validProduct(), status: "eliminado" });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "status"));
  });
});

describe("isUuid", () => {
  it("accept standard lowercase uuid", () => {
    assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  });

  it("accept standard uppercase uuid", () => {
    assert.equal(isUuid("550E8400-E29B-41D4-A716-446655440000"), true);
  });

  it("reject arbitrary text", () => {
    assert.equal(isUuid("not-a-uuid"), false);
  });

  it("reject empty string", () => {
    assert.equal(isUuid(""), false);
  });

  it("reject string with only spaces", () => {
    assert.equal(isUuid("   "), false);
  });

  it("reject non-string values", () => {
    assert.equal(isUuid(123), false);
    assert.equal(isUuid(null), false);
    assert.equal(isUuid(undefined), false);
  });
});

describe("validateWasteRecordInput - UUID validation", () => {
  it("accept valid uuid in product_id", () => {
    const r = validateWasteRecordInput({
      ...validWasteRecord(),
      product_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    assert.equal(r.valid, true);
  });

  it("reject invalid product_id format", () => {
    const r = validateWasteRecordInput({
      ...validWasteRecord(),
      product_id: "not-a-uuid",
    });
    assert.equal(r.valid, false);
    assert.ok(r.issues.some((i) => i.field === "product_id"));
  });

  it("accept waste record without product_id (product_not_found=true)", () => {
    const r = validateWasteRecordInput(validWasteRecordNoProduct());
    assert.equal(r.valid, true);
  });
});
