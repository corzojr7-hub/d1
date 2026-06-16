import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { clearHistory } from "../../src/lib/app/submission-history.ts";
import { fetchWasteRecords } from "../../src/lib/app/waste-repository.ts";

const ALL = "__all__";

function filterRecords(records, statusFilter, evidenceFilter) {
  return records.filter((rec) => {
    if (statusFilter !== ALL && rec.review_status !== statusFilter) return false;
    if (evidenceFilter === "with" && !rec.evidence_path) return false;
    if (evidenceFilter === "without" && rec.evidence_path) return false;
    return true;
  });
}

describe("waste-ui", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns all records when both filters are ALL", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("waste", "R1", { barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1" });
    addHistoryEntry("waste", "R2", { barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2" });

    const data = await fetchWasteRecords("local");
    const filtered = filterRecords(data, ALL, ALL);
    assert.equal(filtered.length, 2);
  });

  it("filters by review status", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("waste", "Pendiente", { reviewStatus: "pendiente_revision", barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1" });
    addHistoryEntry("waste", "Revisado", { reviewStatus: "revisado", barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2" });

    const data = await fetchWasteRecords("local");
    const pendientes = filterRecords(data, "pendiente_revision", ALL);
    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].barcode, "1");
  });

  it("filters by evidence presence", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("waste", "Con evidencia", { hasEvidence: true, evidenceName: "foto.jpg", barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1" });
    addHistoryEntry("waste", "Sin evidencia", { hasEvidence: false, evidenceName: "", barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2" });

    const data = await fetchWasteRecords("local");
    const conEvi = filterRecords(data, ALL, "with");
    assert.equal(conEvi.length, 1);
    assert.ok(conEvi[0].evidence_path);
  });

  it("filters by both status and evidence", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("waste", "Pendiente con evidencia", { reviewStatus: "pendiente_revision", hasEvidence: true, evidenceName: "a.jpg", barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1" });
    addHistoryEntry("waste", "Revisado con evidencia", { reviewStatus: "revisado", hasEvidence: true, evidenceName: "b.jpg", barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2" });
    addHistoryEntry("waste", "Pendiente sin evidencia", { reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "3", responsiblePerson: "C", reason: "otro", area: "Z", observation: "o3" });

    const data = await fetchWasteRecords("local");
    const result = filterRecords(data, "pendiente_revision", "with");
    assert.equal(result.length, 1);
    assert.equal(result[0].barcode, "1");
  });

  it("returns empty when no items match filter", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );
    addHistoryEntry("waste", "Pendiente", { reviewStatus: "pendiente_revision", barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1" });

    const data = await fetchWasteRecords("local");
    const result = filterRecords(data, "revisado", ALL);
    assert.equal(result.length, 0);
  });

  it("handles empty record list", async () => {
    const data = await fetchWasteRecords("local");
    assert.equal(data.length, 0);
    assert.equal(filterRecords(data, ALL, ALL).length, 0);
    assert.equal(filterRecords(data, "pendiente_revision", ALL).length, 0);
  });
});
