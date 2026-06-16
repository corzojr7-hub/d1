import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert/strict";

import { clearHistory } from "../../src/lib/app/submission-history.ts";
import {
  fetchWasteRecords,
  updateWasteReviewStatusRepo,
  saveEvidenceLocal,
  getEvidenceLocal,
} from "../../src/lib/app/waste-repository.ts";
import { getRuntimeMode } from "../../src/lib/app/runtime-mode.ts";

function createMockStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
    get length() { return store.size; },
    key(index) { return [...store.keys()][index] ?? null; },
  };
}

before(() => {
  globalThis.localStorage = createMockStorage();
});

describe("waste-flow", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    globalThis.localStorage.clear();
  });

  it("default runtime is local when env vars are absent", () => {
    assert.equal(getRuntimeMode(), "local");
  });

  it("empty state returns empty array", async () => {
    const result = await fetchWasteRecords();
    assert.deepEqual(result, []);
  });

  it("create -> fetch -> update cycle works end-to-end", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("waste", "7501 - 10 pza - Maria", {
      reviewStatus: "pendiente_revision",
      hasEvidence: false,
      evidenceName: "",
      barcode: "7501",
      quantity: "10",
      unit: "pza",
      responsiblePerson: "Maria",
      reason: "vencido",
      area: "Lacteos",
      observation: "Leche vencida",
    });

    const afterCreate = await fetchWasteRecords();
    assert.equal(afterCreate.length, 1);
    assert.equal(afterCreate[0].review_status, "pendiente_revision");
    assert.equal(afterCreate[0].barcode, "7501");

    const id = afterCreate[0].id;
    await updateWasteReviewStatusRepo(id, "revisado");

    const afterUpdate = await fetchWasteRecords();
    assert.equal(afterUpdate.length, 1);
    assert.equal(afterUpdate[0].review_status, "revisado");
  });

  it("handles multiple status transitions", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("waste", "123 - 2 kg - Carlos", {
      barcode: "123", quantity: "2", unit: "kg", responsiblePerson: "Carlos",
      reason: "dano_manipulacion", area: "Fruta", observation: "Golpeado",
    });

    const records = await fetchWasteRecords();
    const id = records[0].id;

    await updateWasteReviewStatusRepo(id, "revisado");
    assert.equal((await fetchWasteRecords())[0].review_status, "revisado");

    await updateWasteReviewStatusRepo(id, "recuperable");
    assert.equal((await fetchWasteRecords())[0].review_status, "recuperable");

    await updateWasteReviewStatusRepo(id, "no_recuperable");
    assert.equal((await fetchWasteRecords())[0].review_status, "no_recuperable");
  });

  it("creates multiple records and retrieves all in reverse order", async () => {
    const { addHistoryEntry } = await import(
      "../../src/lib/app/submission-history.ts"
    );

    addHistoryEntry("waste", "A - 1 kg - Luis", {
      barcode: "A", quantity: "1", unit: "kg", responsiblePerson: "Luis",
      reason: "vencido", area: "X", observation: "o1",
    });
    await new Promise((r) => setTimeout(r, 2));
    addHistoryEntry("waste", "B - 2 kg - Ana", {
      barcode: "B", quantity: "2", unit: "kg", responsiblePerson: "Ana",
      reason: "dano", area: "Y", observation: "o2",
    });
    await new Promise((r) => setTimeout(r, 2));
    addHistoryEntry("waste", "C - 3 kg - Pedro", {
      barcode: "C", quantity: "3", unit: "kg", responsiblePerson: "Pedro",
      reason: "otro", area: "Z", observation: "o3",
    });

    const all = await fetchWasteRecords();
    assert.equal(all.length, 3);
    assert.equal(all[0].barcode, "C");
    assert.equal(all[1].barcode, "B");
    assert.equal(all[2].barcode, "A");
  });

  it("evidence storage round-trip works in local mode", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    saveEvidenceLocal("rec_001", dataUrl);
    const loaded = getEvidenceLocal("rec_001");
    assert.equal(loaded, dataUrl);
  });
});
