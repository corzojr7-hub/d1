import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { clearHistory } from "../../src/lib/app/submission-history.ts";
import {
  fetchInstructions,
  updateInstructionStatus,
} from "../../src/lib/app/instructions-repository.ts";
import { getRuntimeMode } from "../../src/lib/app/runtime-mode.ts";

describe("instructions-flow", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("default runtime is local when env vars are absent", () => {
    assert.equal(getRuntimeMode(), "local");
  });

  it("empty state returns empty array", async () => {
    const result = await fetchInstructions();
    assert.deepEqual(result, []);
  });

  it("create -> fetch -> update cycle works end-to-end", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("instruction", "Maria - Limpiar area de carga", {
      status: "pendiente",
      priority: "alta",
      responsiblePerson: "Maria",
      instructionText: "Limpiar area de carga",
    });

    const afterCreate = await fetchInstructions();
    assert.equal(afterCreate.length, 1);
    assert.equal(afterCreate[0].status, "pendiente");
    assert.equal(afterCreate[0].priority, "alta");

    const id = afterCreate[0].id;
    await updateInstructionStatus(id, "en_proceso");

    const afterUpdate = await fetchInstructions();
    assert.equal(afterUpdate.length, 1);
    assert.equal(afterUpdate[0].status, "en_proceso");
  });

  it("handles multiple status transitions", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("instruction", "Carlos - Verificar puertas", {
      status: "pendiente",
      priority: "critica",
      responsiblePerson: "Carlos",
      instructionText: "Verificar puertas",
    });

    const afterCreate = await fetchInstructions();
    const id = afterCreate[0].id;

    await updateInstructionStatus(id, "en_proceso");
    assert.equal((await fetchInstructions())[0].status, "en_proceso");

    await updateInstructionStatus(id, "cumplida");
    assert.equal((await fetchInstructions())[0].status, "cumplida");
  });

  it("creates multiple instructions and retrieves all", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("instruction", "A - Tarea 1", {
      priority: "baja",
      responsiblePerson: "A",
      instructionText: "Tarea 1",
    });
    await new Promise((r) => setTimeout(r, 2));
    addHistoryEntry("instruction", "B - Tarea 2", {
      priority: "media",
      responsiblePerson: "B",
      instructionText: "Tarea 2",
    });
    await new Promise((r) => setTimeout(r, 2));
    addHistoryEntry("instruction", "C - Tarea 3", {
      priority: "alta",
      responsiblePerson: "C",
      instructionText: "Tarea 3",
    });

    const all = await fetchInstructions();
    assert.equal(all.length, 3);
    assert.equal(all[0].instruction_text, "Tarea 3");
    assert.equal(all[1].instruction_text, "Tarea 2");
    assert.equal(all[2].instruction_text, "Tarea 1");
  });
});
