import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { clearHistory } from "../../src/lib/app/submission-history.ts";
import { fetchInstructions } from "../../src/lib/app/instructions-repository.ts";

const ALL = "__all__";

function filterInstructions(instructions, statusFilter, priorityFilter) {
  return instructions.filter((inst) => {
    if (statusFilter !== ALL && inst.status !== statusFilter) return false;
    if (priorityFilter !== ALL && inst.priority !== priorityFilter) return false;
    return true;
  });
}

describe("instructions-ui", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns all instructions when both filters are ALL", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("instruction", "T1", { priority: "alta", responsiblePerson: "A", instructionText: "T1" });
    addHistoryEntry("instruction", "T2", { priority: "baja", responsiblePerson: "B", instructionText: "T2" });

    const data = await fetchInstructions("local");
    const filtered = filterInstructions(data, ALL, ALL);
    assert.equal(filtered.length, 2);
  });

  it("filters by status", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("instruction", "Pendiente", { status: "pendiente", priority: "media", responsiblePerson: "A", instructionText: "Pendiente" });
    addHistoryEntry("instruction", "En proceso", { status: "en_proceso", priority: "media", responsiblePerson: "B", instructionText: "En proceso" });

    const data = await fetchInstructions("local");
    const pendientes = filterInstructions(data, "pendiente", ALL);
    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].instruction_text, "Pendiente");
  });

  it("filters by priority", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("instruction", "Alta", { priority: "alta", responsiblePerson: "A", instructionText: "Alta" });
    addHistoryEntry("instruction", "Baja", { priority: "baja", responsiblePerson: "B", instructionText: "Baja" });

    const data = await fetchInstructions("local");
    const altas = filterInstructions(data, ALL, "alta");
    assert.equal(altas.length, 1);
    assert.equal(altas[0].instruction_text, "Alta");
  });

  it("filters by both status and priority", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("instruction", "Pendiente Alta", { status: "pendiente", priority: "alta", responsiblePerson: "A", instructionText: "Pendiente Alta" });
    addHistoryEntry("instruction", "Pendiente Baja", { status: "pendiente", priority: "baja", responsiblePerson: "B", instructionText: "Pendiente Baja" });
    addHistoryEntry("instruction", "En proceso Alta", { status: "en_proceso", priority: "alta", responsiblePerson: "C", instructionText: "En proceso Alta" });

    const data = await fetchInstructions("local");
    const result = filterInstructions(data, "pendiente", "alta");
    assert.equal(result.length, 1);
    assert.equal(result[0].instruction_text, "Pendiente Alta");
  });

  it("returns empty when no items match filter", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("instruction", "Pendiente", { status: "pendiente", priority: "media", responsiblePerson: "A", instructionText: "Pendiente" });

    const data = await fetchInstructions("local");
    const result = filterInstructions(data, "cumplida", ALL);
    assert.equal(result.length, 0);
  });

  it("handles empty instruction list", async () => {
    const data = await fetchInstructions("local");
    assert.equal(data.length, 0);
    assert.equal(filterInstructions(data, ALL, ALL).length, 0);
    assert.equal(filterInstructions(data, "pendiente", ALL).length, 0);
  });
});
