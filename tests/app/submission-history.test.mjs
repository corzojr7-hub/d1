import { describe, it, beforeEach, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  addHistoryEntry,
  getHistory,
  clearHistory,
  removeHistoryEntry,
  updateWasteReviewStatus,
  updateInstructionStatus,
  importHistoryEntries,
  getUndoSnapshot,
  undoHistory,
  clearUndoSnapshot,
  persistUndoMessage,
  getUndoMessage,
} from "../../src/lib/app/submission-history.ts";

const STORAGE_KEY = "scot_submission_history";

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

describe("submission-history", () => {
  beforeEach(() => {
    clearHistory();
  });

  it("return empty array initially", () => {
    assert.deepEqual(getHistory(), []);
  });

  it("contain one entry after adding one", () => {
    addHistoryEntry("instruction", "Revisar inventario");
    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].type, "instruction");
    assert.equal(h[0].summary, "Revisar inventario");
    assert.ok(typeof h[0].timestamp === "number");
    assert.ok(h[0].timestamp > 0);
  });

  it("contain entries in reverse chronological order", () => {
    addHistoryEntry("instruction", "Primera");
    addHistoryEntry("waste", "Segunda");
    const h = getHistory();
    assert.equal(h.length, 2);
    assert.equal(h[0].summary, "Segunda");
    assert.equal(h[1].summary, "Primera");
    assert.ok(h[0].timestamp >= h[1].timestamp);
  });

  it("support both instruction and waste types", () => {
    addHistoryEntry("instruction", "Inspeccion");
    addHistoryEntry("waste", "Barcode 123");
    const h = getHistory();
    assert.equal(h.length, 2);
    assert.equal(h[0].type, "waste");
    assert.equal(h[1].type, "instruction");
  });

  it("limit to MAX_ENTRIES and drop oldest", () => {
    for (let i = 0; i < 25; i++) {
      addHistoryEntry("instruction", `Entry ${i}`);
    }
    assert.equal(getHistory().length, 20);
    assert.equal(getHistory()[0].summary, "Entry 24");
    assert.equal(getHistory()[19].summary, "Entry 5");
  });

  it("clear history when clearHistory is called", () => {
    addHistoryEntry("instruction", "Test");
    clearHistory();
    assert.deepEqual(getHistory(), []);
  });

  it("be shared across calls (singleton behavior)", () => {
    addHistoryEntry("instruction", "Shared");
    const h1 = getHistory();
    const h2 = getHistory();
    assert.equal(h1, h2);
  });

  it("removeHistoryEntry remove the correct entry by index", () => {
    addHistoryEntry("instruction", "Primera");
    addHistoryEntry("waste", "Segunda");
    addHistoryEntry("instruction", "Tercera");
    removeHistoryEntry(1);
    const h = getHistory();
    assert.equal(h.length, 2);
    assert.equal(h[0].summary, "Tercera");
    assert.equal(h[1].summary, "Primera");
  });

  it("removeHistoryEntry persist removal to localStorage", () => {
    addHistoryEntry("instruction", "Para borrar");
    addHistoryEntry("instruction", "Conservar");
    removeHistoryEntry(1);
    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].summary, "Conservar");
  });

  it("removeHistoryEntry do nothing for out-of-bounds index", () => {
    addHistoryEntry("instruction", "Unico");
    removeHistoryEntry(-1);
    removeHistoryEntry(5);
    assert.equal(getHistory().length, 1);
  });
});

describe("submission-history persistence", () => {
  let mockStorage;

  before(() => {
    mockStorage = createMockStorage();
    globalThis.localStorage = mockStorage;
  });

  after(() => {
    delete globalThis.localStorage;
  });

  beforeEach(() => {
    clearHistory();
  });

  it("persist entries to localStorage after add", () => {
    addHistoryEntry("instruction", "Persistir esto");
    const raw = mockStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].summary, "Persistir esto");
  });

  it("clear localStorage when clearHistory is called", () => {
    addHistoryEntry("instruction", "Test");
    clearHistory();
    assert.equal(mockStorage.getItem(STORAGE_KEY), null);
  });

  it("hydrate from localStorage when entries exist in storage", () => {
    const data = [
      { type: "waste", timestamp: 1000, summary: "De storage" },
    ];
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].summary, "De storage");
    assert.equal(h[0].type, "waste");
  });

  it("survive simulated reload by re-hydrating from storage", () => {
    addHistoryEntry("instruction", "Antes de recargar");
    addHistoryEntry("waste", "Tambien antes");

    const stored = mockStorage.getItem(STORAGE_KEY);
    clearHistory();
    mockStorage.setItem(STORAGE_KEY, stored);

    const h = getHistory();
    assert.equal(h.length, 2);
    assert.equal(h[0].summary, "Tambien antes");
    assert.equal(h[1].summary, "Antes de recargar");
  });

  it("persist updateWasteReviewStatus to localStorage", () => {
    addHistoryEntry("waste", "Persistir status", {
      reviewStatus: "pendiente_revision",
      hasEvidence: false,
      evidenceName: "",
      barcode: "",
      quantity: "",
      unit: "",
      responsiblePerson: "",
      reason: "",
      area: "",
      observation: "",
    });
    updateWasteReviewStatus(0, "anulado");

    const raw = mockStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.equal(parsed[0].meta.reviewStatus, "anulado");
  });
});

describe("submission-history waste meta", () => {
  beforeEach(() => {
    clearHistory();
  });

  it("add waste entry with meta", () => {
    addHistoryEntry("waste", "Barcode 123", {
      reviewStatus: "pendiente_revision",
      hasEvidence: true,
      evidenceName: "foto.jpg",
      barcode: "123",
      quantity: "2",
      unit: "kg",
      responsiblePerson: "Juan",
      reason: "vencido",
      area: "Lacteos",
      observation: "",
    });
    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].type, "waste");
    assert.equal(h[0].meta?.reviewStatus, "pendiente_revision");
    assert.equal(h[0].meta?.hasEvidence, true);
    assert.equal(h[0].meta?.evidenceName, "foto.jpg");
    assert.equal(h[0].meta?.barcode, "123");
    assert.equal(h[0].meta?.quantity, "2");
    assert.equal(h[0].meta?.unit, "kg");
    assert.equal(h[0].meta?.responsiblePerson, "Juan");
    assert.equal(h[0].meta?.reason, "vencido");
    assert.equal(h[0].meta?.area, "Lacteos");
  });

  it("updateWasteReviewStatus change status on waste entry", () => {
    addHistoryEntry("waste", "Test", {
      reviewStatus: "pendiente_revision",
      hasEvidence: false,
      evidenceName: "",
      barcode: "",
      quantity: "",
      unit: "",
      responsiblePerson: "",
      reason: "",
      area: "",
      observation: "",
    });
    const result = updateWasteReviewStatus(0, "recuperable");
    assert.equal(result, true);
    const h = getHistory();
    assert.equal(h[0].meta?.reviewStatus, "recuperable");
  });

  it("updateWasteReviewStatus return false for instruction entry", () => {
    addHistoryEntry("instruction", "Instruccion");
    const result = updateWasteReviewStatus(0, "recuperable");
    assert.equal(result, false);
  });

  it("updateWasteReviewStatus return false for out-of-bounds index", () => {
    const result = updateWasteReviewStatus(0, "recuperable");
    assert.equal(result, false);
  });

  it("updateWasteReviewStatus create meta for legacy entry persisted without meta", () => {
    const prevStorage = globalThis.localStorage;
    const mock = createMockStorage();
    globalThis.localStorage = mock;
    const legacy = [{ type: "waste", timestamp: 1000, summary: "Legacy" }];
    mock.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const h1 = getHistory();
    assert.equal(h1[0].meta, undefined);

    const result = updateWasteReviewStatus(0, "no_recuperable");
    assert.equal(result, true);
    const h2 = getHistory();
    assert.equal(h2[0].meta?.reviewStatus, "no_recuperable");
    globalThis.localStorage = prevStorage;
  });
});

describe("submission-history instruction meta", () => {
  beforeEach(() => {
    clearHistory();
  });

  it("add instruction entry with meta", () => {
    addHistoryEntry("instruction", "Test instruction", {
      status: "pendiente",
      priority: "alta",
      responsiblePerson: "Carlos",
      instructionText: "Revisar inventario",
      observations: "Urgente",
    });
    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].type, "instruction");
    const m = h[0].meta;
    assert.ok(m !== undefined);
    assert.equal("status" in m ? m.status : undefined, "pendiente");
    assert.equal("priority" in m ? m.priority : undefined, "alta");
    assert.equal("responsiblePerson" in m ? m.responsiblePerson : undefined, "Carlos");
    assert.equal("instructionText" in m ? m.instructionText : undefined, "Revisar inventario");
    assert.equal("observations" in m ? m.observations : undefined, "Urgente");
  });

  it("updateInstructionStatus change status on instruction entry", () => {
    addHistoryEntry("instruction", "Test", {
      status: "pendiente",
      priority: "media",
      responsiblePerson: "",
      instructionText: "",
      observations: "",
    });
    const result = updateInstructionStatus(0, "cumplida");
    assert.equal(result, true);
    const h = getHistory();
    const m = h[0].meta;
    assert.ok(m !== undefined);
    assert.equal("status" in m ? m.status : undefined, "cumplida");
  });

  it("updateInstructionStatus return false for waste entry", () => {
    addHistoryEntry("waste", "Waste entry");
    const result = updateInstructionStatus(0, "cumplida");
    assert.equal(result, false);
  });

  it("updateInstructionStatus return false for out-of-bounds index", () => {
    const result = updateInstructionStatus(0, "cumplida");
    assert.equal(result, false);
  });

  it("updateInstructionStatus change status when entry has auto-created meta", () => {
    addHistoryEntry("instruction", "Sin meta explicita");
    const h1 = getHistory();
    assert.equal(h1[0].meta?.status, "pendiente");

    const result = updateInstructionStatus(0, "anulada");
    assert.equal(result, true);
    const h2 = getHistory();
    assert.equal(h2[0].meta?.status, "anulada");
  });
});

describe("submission-history import", () => {
  beforeEach(() => {
    clearHistory();
  });

  it("import entries into empty history", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "Importada" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 1);
    assert.equal(result.duplicates, 0);
    assert.equal(result.discarded, 0);
    const h = getHistory();
    assert.equal(h.length, 1);
    assert.equal(h[0].summary, "Importada");
  });

  it("append entries to existing history", () => {
    addHistoryEntry("instruction", "Existente");
    const incoming = [
      { type: "waste", timestamp: 200, summary: "Importada" },
    ];
    importHistoryEntries(incoming);
    const h = getHistory();
    assert.equal(h.length, 2);
  });

  it("skip entries with invalid type", () => {
    const incoming = [
      { type: "bogus", timestamp: 100, summary: "Mala" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 0);
    assert.equal(result.discarded, 1);
    assert.equal(getHistory().length, 0);
  });

  it("skip entries without numeric timestamp", () => {
    const incoming = [
      { type: "instruction", timestamp: "no-number", summary: "Mala" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 0);
    assert.equal(result.discarded, 1);
  });

  it("skip entries with empty summary", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 0);
    assert.equal(result.discarded, 1);
  });

  it("trim whitespace from summary on import", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "  Texto  " },
    ];
    importHistoryEntries(incoming);
    assert.equal(getHistory()[0].summary, "Texto");
  });

  it("normalize meta fields to correct types", () => {
    const incoming = [
      {
        type: "waste",
        timestamp: 100,
        summary: "Con meta",
        meta: {
          reviewStatus: 123,
          hasEvidence: "true",
          evidenceName: null,
          barcode: undefined,
          quantity: true,
          unit: 42,
          responsiblePerson: "Juan",
          reason: "vencido",
          area: null,
          observation: undefined,
          status: undefined,
          priority: null,
          instructionText: 0,
          observations: false,
        },
      },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 1);
    const m = getHistory()[0].meta;
    assert.ok(m);
    assert.equal(m.reviewStatus, "123");
    assert.equal(m.hasEvidence, true);
    assert.equal(m.evidenceName, "");
    assert.equal(m.barcode, "");
    assert.equal(m.quantity, "true");
    assert.equal(m.unit, "42");
    assert.equal(m.responsiblePerson, "Juan");
    assert.equal(m.instructionText, "0");
    assert.equal(m.observations, "false");
  });

  it("enforce MAX_ENTRIES removing oldest entries", () => {
    for (let i = 0; i < 20; i++) {
      addHistoryEntry("instruction", `Entry ${i}`);
    }
    const incoming = [];
    for (let i = 0; i < 5; i++) {
      incoming.push({ type: "waste", timestamp: 2000 + i, summary: `Imp ${i}` });
    }
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 5);
    assert.equal(getHistory().length, 20);
    assert.equal(getHistory()[0].summary, "Imp 4");
  });

  it("return count of successfully imported entries", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "A" },
      { type: "waste", timestamp: 200, summary: "B" },
      { type: "bogus", timestamp: 300, summary: "C" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 2);
    assert.equal(result.discarded, 1);
    assert.equal(result.duplicates, 0);
  });

  it("replace mode clears existing history before import", () => {
    addHistoryEntry("instruction", "Existente");
    addHistoryEntry("waste", "Otro existente");
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "Nuevo" },
    ];
    const result = importHistoryEntries(incoming, "replace");
    assert.equal(result.imported, 1);
    assert.equal(result.duplicates, 0);
    assert.equal(result.discarded, 0);
    assert.equal(getHistory().length, 1);
    assert.equal(getHistory()[0].summary, "Nuevo");
  });

  it("replace mode with empty incoming clears history", () => {
    addHistoryEntry("instruction", "Existente");
    const result = importHistoryEntries([], "replace");
    assert.equal(result.imported, 0);
    assert.equal(result.duplicates, 0);
    assert.equal(result.discarded, 0);
    assert.equal(getHistory().length, 0);
  });

  it("combine is default mode when no mode passed", () => {
    addHistoryEntry("instruction", "Existente");
    const incoming = [
      { type: "waste", timestamp: 100, summary: "Importado" },
    ];
    importHistoryEntries(incoming);
    assert.equal(getHistory().length, 2);
  });

  it("combine mode preserves existing entries", () => {
    addHistoryEntry("instruction", "Original");
    const incoming = [
      { type: "waste", timestamp: 100, summary: "Agregado" },
    ];
    importHistoryEntries(incoming, "combine");
    assert.equal(getHistory().length, 2);
    assert.equal(getHistory()[1].summary, "Original");
  });

  it("detect duplicate when exact same entry already exists", () => {
    addHistoryEntry("instruction", "Existente", { status: "pendiente" });
    const incoming = [
      {
        type: "instruction", timestamp: getHistory()[0].timestamp,
        summary: "Existente",
        meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "",
          barcode: "", quantity: "", unit: "", responsiblePerson: "",
          reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "",
          observations: "",
        },
      },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 0);
    assert.equal(result.duplicates, 1);
    assert.equal(result.discarded, 0);
    assert.equal(getHistory().length, 1);
  });

  it("detect duplicate within incoming batch", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "A" },
      { type: "instruction", timestamp: 100, summary: "A" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.discarded, 0);
    assert.equal(getHistory().length, 1);
  });

  it("not detect duplicate when timestamp differs", () => {
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "Misma" },
      { type: "instruction", timestamp: 200, summary: "Misma" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 2);
    assert.equal(result.duplicates, 0);
    assert.equal(result.discarded, 0);
    assert.equal(getHistory().length, 2);
  });

  it("count imported duplicates and discarded separately", () => {
    addHistoryEntry("instruction", "Original", { status: "pendiente" });
    const incoming = [
      { type: "instruction", timestamp: 100, summary: "Nueva" },
      {
        type: "instruction", timestamp: getHistory()[0].timestamp,
        summary: "Original",
        meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "",
          barcode: "", quantity: "", unit: "", responsiblePerson: "",
          reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "",
          observations: "",
        },
      },
      { type: "bogus", timestamp: 300, summary: "Invalida" },
    ];
    const result = importHistoryEntries(incoming);
    assert.equal(result.imported, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.discarded, 1);
    assert.equal(getHistory().length, 2);
  });
});

describe("submission-history undo", () => {
  beforeEach(() => {
    clearHistory();
    clearUndoSnapshot();
  });

  it("return false when no snapshot exists", () => {
    const result = undoHistory();
    assert.equal(result, false);
  });

  it("return null snapshot when no action taken", () => {
    const snap = getUndoSnapshot();
    assert.equal(snap, null);
  });

  it("save snapshot after removeHistoryEntry", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    removeHistoryEntry(0);
    const snap = getUndoSnapshot();
    assert.ok(snap !== null);
    assert.equal(snap.length, 2);
    assert.equal(snap[0].summary, "B");
    assert.equal(snap[1].summary, "A");
  });

  it("restore entries after undoHistory following removeHistoryEntry", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    removeHistoryEntry(0);
    assert.equal(getHistory().length, 1);
    const result = undoHistory();
    assert.equal(result, true);
    assert.equal(getHistory().length, 2);
    assert.equal(getHistory()[0].summary, "B");
    assert.equal(getHistory()[1].summary, "A");
  });

  it("save snapshot after clearHistory", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    clearHistory();
    const snap = getUndoSnapshot();
    assert.ok(snap !== null);
    assert.equal(snap.length, 2);
  });

  it("restore entries after undoHistory following clearHistory", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    clearHistory();
    assert.equal(getHistory().length, 0);
    const result = undoHistory();
    assert.equal(result, true);
    assert.equal(getHistory().length, 2);
    assert.equal(getHistory()[0].summary, "B");
    assert.equal(getHistory()[1].summary, "A");
  });

  it("snapshot is null after undoHistory", () => {
    addHistoryEntry("instruction", "A");
    removeHistoryEntry(0);
    undoHistory();
    const snap = getUndoSnapshot();
    assert.equal(snap, null);
  });

  it("only last action is undoable (snapshot overwritten)", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    addHistoryEntry("instruction", "C");
    removeHistoryEntry(0);
    removeHistoryEntry(0);
    undoHistory();
    assert.equal(getHistory().length, 2);
    assert.equal(getHistory()[0].summary, "B");
    assert.equal(getHistory()[1].summary, "A");
  });

  it("removeHistoryEntry with out-of-bounds index does not save snapshot", () => {
    clearHistory();
    addHistoryEntry("instruction", "A");
    removeHistoryEntry(5);
    const snap = getUndoSnapshot();
    assert.equal(snap, null);
  });

  it("clearHistory on empty history does not save snapshot", () => {
    clearHistory();
    clearHistory();
    const snap = getUndoSnapshot();
    assert.equal(snap, null);
  });
});

describe("submission-history undo persistence", () => {
  let mockStorage;

  before(() => {
    mockStorage = createMockStorage();
    globalThis.localStorage = mockStorage;
  });

  after(() => {
    delete globalThis.localStorage;
  });

  beforeEach(() => {
    clearHistory();
    clearUndoSnapshot();
  });

  it("persist undo snapshot to localStorage after removeHistoryEntry", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    removeHistoryEntry(0);
    const raw = mockStorage.getItem("scot_undo_snapshot");
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.snapshot.length, 2);
    assert.equal(parsed.snapshot[0].summary, "B");
    assert.ok(typeof parsed.createdAt === "number");
  });

  it("persist undo snapshot to localStorage after clearHistory", () => {
    addHistoryEntry("instruction", "A");
    addHistoryEntry("instruction", "B");
    clearHistory();
    const raw = mockStorage.getItem("scot_undo_snapshot");
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.snapshot.length, 2);
  });

  it("load snapshot from localStorage when getUndoSnapshot called after simulated reload", () => {
    addHistoryEntry("instruction", "A");
    removeHistoryEntry(0);
    const stored = mockStorage.getItem("scot_undo_snapshot");
    clearUndoSnapshot();
    mockStorage.setItem("scot_undo_snapshot", stored);
    const snap = getUndoSnapshot();
    assert.ok(snap !== null);
    assert.equal(snap.length, 1);
    assert.equal(snap[0].summary, "A");
  });

  it("restore history via undoHistory using snapshot from localStorage after simulated reload", () => {
    addHistoryEntry("instruction", "A");
    removeHistoryEntry(0);
    const stored = mockStorage.getItem("scot_undo_snapshot");
    clearUndoSnapshot();
    mockStorage.setItem("scot_undo_snapshot", stored);
    const result = undoHistory();
    assert.equal(result, true);
    assert.equal(getHistory().length, 1);
    assert.equal(getHistory()[0].summary, "A");
  });

  it("clear undo localStorage data when undoHistory succeeds", () => {
    addHistoryEntry("instruction", "A");
    removeHistoryEntry(0);
    undoHistory();
    assert.equal(mockStorage.getItem("scot_undo_snapshot"), null);
  });

  it("persist undo message and retrieve it", () => {
    persistUndoMessage("Entrada eliminada.");
    assert.equal(getUndoMessage(), "Entrada eliminada.");
  });

  it("clear undo message when clearUndoSnapshot is called", () => {
    persistUndoMessage("Historial limpiado.");
    clearUndoSnapshot();
    assert.equal(getUndoMessage(), null);
  });

  it("return null when persisted snapshot is expired", () => {
    clearUndoSnapshot();
    const oldTimestamp = Date.now() - 6 * 60 * 1000;
    const expiredData = {
      createdAt: oldTimestamp,
      snapshot: [{ type: "instruction", timestamp: 100, summary: "Vieja" }],
    };
    mockStorage.setItem("scot_undo_snapshot", JSON.stringify(expiredData));
    const snap = getUndoSnapshot();
    assert.equal(snap, null);
    assert.equal(mockStorage.getItem("scot_undo_snapshot"), null);
  });

  it("undoHistory returns false when persisted snapshot is expired", () => {
    clearUndoSnapshot();
    const oldTimestamp = Date.now() - 6 * 60 * 1000;
    const expiredData = {
      createdAt: oldTimestamp,
      snapshot: [{ type: "instruction", timestamp: 100, summary: "Vieja" }],
    };
    mockStorage.setItem("scot_undo_snapshot", JSON.stringify(expiredData));
    const result = undoHistory();
    assert.equal(result, false);
    assert.equal(mockStorage.getItem("scot_undo_snapshot"), null);
  });

  it("use snapshot created within expiry window", () => {
    clearUndoSnapshot();
    const data = {
      createdAt: Date.now() - 60 * 1000, // 1 minute ago
      snapshot: [{ type: "instruction", timestamp: 100, summary: "Reciente" }],
    };
    mockStorage.setItem("scot_undo_snapshot", JSON.stringify(data));
    const snap = getUndoSnapshot();
    assert.ok(snap !== null);
    assert.equal(snap.length, 1);
    assert.equal(snap[0].summary, "Reciente");
  });
});
