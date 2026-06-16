import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  addHistoryEntry,
  clearHistory,
} from "../../src/lib/app/submission-history.ts";
import {
  fetchInstructions,
  updateInstructionStatus,
  removeInstruction,
  clearInstructions,
} from "../../src/lib/app/instructions-repository.ts";

describe("instructions-repository", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("fetchInstructions returns empty array when no history entries", async () => {
    const result = await fetchInstructions("local");
    assert.deepEqual(result, []);
  });

  it("fetchInstructions converts history entries to Instruction format", async () => {
    addHistoryEntry("instruction", "Juan - Revisar inventario", {
      status: "pendiente",
      priority: "alta",
      responsiblePerson: "Juan",
      instructionText: "Revisar inventario",
      observations: "Urgente",
    });
    const result = await fetchInstructions("local");
    assert.equal(result.length, 1);
    assert.equal(result[0].responsible_person, "Juan");
    assert.equal(result[0].instruction_text, "Revisar inventario");
    assert.equal(result[0].priority, "alta");
    assert.equal(result[0].status, "pendiente");
    assert.equal(result[0].observations, "Urgente");
    assert.ok(typeof result[0].id === "string");
    assert.ok(result[0].id.length > 0);
  });

  it("fetchInstructions filters only instruction type entries", async () => {
    addHistoryEntry("instruction", "Instruccion 1", {
      priority: "media",
      responsiblePerson: "Ana",
      instructionText: "Instruccion 1",
    });
    addHistoryEntry("waste", "Merma 1", {
      barcode: "123",
      responsiblePerson: "Ana",
      reason: "vencido",
      area: "A",
      observation: "test",
    });
    const result = await fetchInstructions("local");
    assert.equal(result.length, 1);
    assert.equal(result[0].instruction_text, "Instruccion 1");
  });

  it("fetchInstructions returns multiple instructions in reverse chronological order", async () => {
    addHistoryEntry("instruction", "Primera", {
      responsiblePerson: "A",
      instructionText: "Primera",
    });
    await new Promise((r) => setTimeout(r, 5));
    addHistoryEntry("instruction", "Segunda", {
      responsiblePerson: "B",
      instructionText: "Segunda",
    });
    const result = await fetchInstructions("local");
    assert.equal(result.length, 2);
    assert.equal(result[0].instruction_text, "Segunda");
    assert.equal(result[1].instruction_text, "Primera");
  });

  it("updateInstructionStatus updates status in local mode", async () => {
    addHistoryEntry("instruction", "Test", {
      status: "pendiente",
      priority: "media",
      responsiblePerson: "Luis",
      instructionText: "Test",
    });
    const before = await fetchInstructions("local");
    assert.equal(before[0].status, "pendiente");

    await updateInstructionStatus(before[0].id, "en_proceso", undefined, "local");
    const after = await fetchInstructions("local");
    assert.equal(after[0].status, "en_proceso");
  });

  it("updateInstructionStatus throws when instruction not found", async () => {
    await assert.rejects(
      () => updateInstructionStatus("nonexistent", "en_proceso", undefined, "local"),
      /Instruction not found/,
    );
  });

  it("removeInstruction removes entry in local mode", async () => {
    addHistoryEntry("instruction", "Uno", { responsiblePerson: "A", instructionText: "Uno" });
    addHistoryEntry("instruction", "Dos", { responsiblePerson: "B", instructionText: "Dos" });

    const before = await fetchInstructions("local");
    assert.equal(before.length, 2);

    await removeInstruction(before[0].id, "local");
    const after = await fetchInstructions("local");
    assert.equal(after.length, 1);
    assert.equal(after[0].instruction_text, "Uno");
  });

  it("removeInstruction throws when not found", async () => {
    await assert.rejects(
      () => removeInstruction("nonexistent", "local"),
      /Instruction not found/,
    );
  });

  it("clearInstructions removes all entries in local mode", async () => {
    addHistoryEntry("instruction", "A", { responsiblePerson: "A", instructionText: "A" });
    addHistoryEntry("instruction", "B", { responsiblePerson: "B", instructionText: "B" });

    await clearInstructions("local");
    const result = await fetchInstructions("local");
    assert.deepEqual(result, []);
  });
});
