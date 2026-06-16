import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert/strict";

import {
  addHistoryEntry,
  clearHistory,
} from "../../src/lib/app/submission-history.ts";
import {
  fetchWasteRecords,
  updateWasteReviewStatusRepo,
  removeWasteRecord,
  clearWasteRecords,
  saveEvidenceLocal,
  getEvidenceLocal,
  removeEvidenceLocal,
} from "../../src/lib/app/waste-repository.ts";

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

describe("waste-repository", () => {
  beforeEach(() => {
    clearHistory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    globalThis.localStorage.clear();
  });

  it("fetchWasteRecords returns empty array when no entries", async () => {
    const result = await fetchWasteRecords("local");
    assert.deepEqual(result, []);
  });

  it("fetchWasteRecords converts waste history entries to WasteRecord format", async () => {
    addHistoryEntry("waste", "123 - 5 kg - Juan", {
      reviewStatus: "pendiente_revision",
      hasEvidence: false,
      evidenceName: "",
      barcode: "123",
      quantity: "5",
      unit: "kg",
      responsiblePerson: "Juan",
      reason: "vencido",
      area: "Lacteos",
      observation: "Producto vencido",
    });
    const result = await fetchWasteRecords("local");
    assert.equal(result.length, 1);
    assert.equal(result[0].barcode, "123");
    assert.equal(result[0].quantity, 5);
    assert.equal(result[0].unit, "kg");
    assert.equal(result[0].reason, "vencido");
    assert.equal(result[0].responsible_person, "Juan");
    assert.equal(result[0].area, "Lacteos");
    assert.equal(result[0].observation, "Producto vencido");
    assert.equal(result[0].review_status, "pendiente_revision");
  });

  it("fetchWasteRecords filters only waste type entries", async () => {
    addHistoryEntry("waste", "Merma 1", {
      barcode: "123", responsiblePerson: "A", reason: "vencido", area: "X", observation: "obs",
    });
    addHistoryEntry("instruction", "Inst 1", {
      responsiblePerson: "B", instructionText: "test",
    });
    const result = await fetchWasteRecords("local");
    assert.equal(result.length, 1);
    assert.equal(result[0].barcode, "123");
  });

  it("fetchWasteRecords returns multiple records in reverse chronological order", async () => {
    addHistoryEntry("waste", "Primero", {
      barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1",
    });
    await new Promise((r) => setTimeout(r, 5));
    addHistoryEntry("waste", "Segundo", {
      barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2",
    });
    const result = await fetchWasteRecords("local");
    assert.equal(result.length, 2);
    assert.equal(result[0].barcode, "2");
    assert.equal(result[1].barcode, "1");
  });

  it("updateWasteReviewStatusRepo updates review status in local mode", async () => {
    addHistoryEntry("waste", "Test", {
      barcode: "123", reviewStatus: "pendiente_revision", responsiblePerson: "A",
      reason: "vencido", area: "X", observation: "obs",
    });
    const before = await fetchWasteRecords("local");
    assert.equal(before[0].review_status, "pendiente_revision");

    await updateWasteReviewStatusRepo(before[0].id, "revisado", undefined, "local");
    const after = await fetchWasteRecords("local");
    assert.equal(after[0].review_status, "revisado");
  });

  it("updateWasteReviewStatusRepo throws when not found", async () => {
    await assert.rejects(
      () => updateWasteReviewStatusRepo("nonexistent", "revisado", undefined, "local"),
      /Waste record not found/,
    );
  });

  it("removeWasteRecord removes entry in local mode", async () => {
    addHistoryEntry("waste", "Uno", {
      barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1",
    });
    addHistoryEntry("waste", "Dos", {
      barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2",
    });

    const before = await fetchWasteRecords("local");
    assert.equal(before.length, 2);

    await removeWasteRecord(before[0].id, "local");
    const after = await fetchWasteRecords("local");
    assert.equal(after.length, 1);
    assert.equal(after[0].barcode, "1");
  });

  it("removeWasteRecord throws when not found", async () => {
    await assert.rejects(
      () => removeWasteRecord("nonexistent", "local"),
      /Waste record not found/,
    );
  });

  it("clearWasteRecords removes all entries in local mode", async () => {
    addHistoryEntry("waste", "A", {
      barcode: "1", responsiblePerson: "A", reason: "vencido", area: "X", observation: "o1",
    });
    addHistoryEntry("waste", "B", {
      barcode: "2", responsiblePerson: "B", reason: "dano", area: "Y", observation: "o2",
    });

    await clearWasteRecords("local");
    const result = await fetchWasteRecords("local");
    assert.deepEqual(result, []);
  });

  it("saveEvidenceLocal and getEvidenceLocal round-trip", () => {
    saveEvidenceLocal("key1", "data:image/png;base64,abc");
    assert.equal(getEvidenceLocal("key1"), "data:image/png;base64,abc");
  });

  it("getEvidenceLocal returns null for missing key", () => {
    assert.equal(getEvidenceLocal("nonexistent"), null);
  });

  it("removeEvidenceLocal removes stored evidence", () => {
    saveEvidenceLocal("key2", "data:image/jpeg;base64,xyz");
    assert.equal(getEvidenceLocal("key2"), "data:image/jpeg;base64,xyz");
    removeEvidenceLocal("key2");
    assert.equal(getEvidenceLocal("key2"), null);
  });
});
