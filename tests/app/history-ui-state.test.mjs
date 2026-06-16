import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  saveFilterState,
  loadFilterState,
  saveExpandedState,
  loadExpandedState,
  saveImportMode,
  loadImportMode,
} from "../../src/app/history/history-ui-state.ts";

const STORAGE_KEY = "scot_history_filters";
const EXPANDED_KEY = "scot_history_expanded";
const IMPORT_MODE_KEY = "scot_history_import_mode";

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

describe("history-ui-state", () => {
  let mockStorage;

  before(() => {
    mockStorage = createMockStorage();
    globalThis.localStorage = mockStorage;
  });

  after(() => {
    delete globalThis.localStorage;
  });

  beforeEach(() => {
    mockStorage.clear();
  });

  it("loadFilterState returns default filters when storage is empty", () => {
    const result = loadFilterState();
    assert.equal(result.typeFilter, "all");
    assert.equal(result.searchText, "");
    assert.equal(result.dateFrom, undefined);
    assert.equal(result.dateTo, undefined);
    assert.equal(result.statusFilter, "");
    assert.equal(result.responsiblePersonFilter, "");
  });

  it("loadFilterState returns default filters for invalid JSON", () => {
    mockStorage.setItem(STORAGE_KEY, "not-json");
    const result = loadFilterState();
    assert.equal(result.typeFilter, "all");
    assert.equal(result.searchText, "");
  });

  it("loadFilterState returns default filters for non-object value", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify("string"));
    const result = loadFilterState();
    assert.equal(result.typeFilter, "all");
  });

  it("loadFilterState returns default filters for null value", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(null));
    const result = loadFilterState();
    assert.equal(result.typeFilter, "all");
  });

  it("loadFilterState parses valid stored filters", () => {
    const stored = {
      typeFilter: "waste",
      searchText: "prueba",
      dateFrom: 1000,
      dateTo: 2000,
      statusFilter: "revisado",
      responsiblePersonFilter: "Juan",
    };
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadFilterState();
    assert.equal(result.typeFilter, "waste");
    assert.equal(result.searchText, "prueba");
    assert.equal(result.dateFrom, 1000);
    assert.equal(result.dateTo, 2000);
    assert.equal(result.statusFilter, "revisado");
    assert.equal(result.responsiblePersonFilter, "Juan");
  });

  it("loadFilterState falls back to defaults for invalid typeFilter", () => {
    mockStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ typeFilter: "invalid" }),
    );
    const result = loadFilterState();
    assert.equal(result.typeFilter, "all");
  });

  it("loadFilterState falls back to defaults for non-string searchText", () => {
    mockStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ searchText: 123 }),
    );
    const result = loadFilterState();
    assert.equal(result.searchText, "");
  });

  it("loadFilterState treats missing dateFrom/dateTo as undefined", () => {
    mockStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ typeFilter: "instruction" }),
    );
    const result = loadFilterState();
    assert.equal(result.dateFrom, undefined);
    assert.equal(result.dateTo, undefined);
  });

  it("loadFilterState treats non-number dateFrom as undefined", () => {
    mockStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dateFrom: "string", dateTo: null }),
    );
    const result = loadFilterState();
    assert.equal(result.dateFrom, undefined);
    assert.equal(result.dateTo, undefined);
  });

  it("saveFilterState stores filters to localStorage", () => {
    const filters = {
      typeFilter: "instruction",
      searchText: "buscar",
      dateFrom: 500,
      dateTo: undefined,
      statusFilter: "pendiente",
      responsiblePersonFilter: "",
    };
    saveFilterState(filters);
    const raw = mockStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.typeFilter, "instruction");
    assert.equal(parsed.searchText, "buscar");
    assert.equal(parsed.dateFrom, 500);
    assert.equal(parsed.dateTo, undefined);
    assert.equal(parsed.statusFilter, "pendiente");
    assert.equal(parsed.responsiblePersonFilter, "");
  });

  it("saveFilterState then loadFilterState round-trips correctly", () => {
    const filters = {
      typeFilter: "waste",
      searchText: "residuo",
      dateFrom: undefined,
      dateTo: 3000,
      statusFilter: "aprobado",
      responsiblePersonFilter: "Maria",
    };
    saveFilterState(filters);
    const loaded = loadFilterState();
    assert.equal(loaded.typeFilter, "waste");
    assert.equal(loaded.searchText, "residuo");
    assert.equal(loaded.dateFrom, undefined);
    assert.equal(loaded.dateTo, 3000);
    assert.equal(loaded.statusFilter, "aprobado");
    assert.equal(loaded.responsiblePersonFilter, "Maria");
  });

  it("saveFilterState does not throw when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      const filters = {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      };
      saveFilterState(filters);
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });

  it("loadFilterState returns defaults when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      const result = loadFilterState();
      assert.equal(result.typeFilter, "all");
      assert.equal(result.searchText, "");
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });

  it("loadExpandedState returns undefined when nothing stored", () => {
    const result = loadExpandedState();
    assert.equal(result, undefined);
  });

  it("loadExpandedState returns stored timestamp", () => {
    mockStorage.setItem(EXPANDED_KEY, "12345");
    const result = loadExpandedState();
    assert.equal(result, 12345);
  });

  it("loadExpandedState returns undefined for non-numeric value", () => {
    mockStorage.setItem(EXPANDED_KEY, "not-a-number");
    const result = loadExpandedState();
    assert.equal(result, undefined);
  });

  it("loadExpandedState returns undefined when key is absent", () => {
    const result = loadExpandedState();
    assert.equal(result, undefined);
  });

  it("saveExpandedState stores timestamp", () => {
    saveExpandedState(999);
    const raw = mockStorage.getItem(EXPANDED_KEY);
    assert.equal(raw, "999");
  });

  it("saveExpandedState removes key when called with undefined", () => {
    mockStorage.setItem(EXPANDED_KEY, "123");
    saveExpandedState(undefined);
    assert.equal(mockStorage.getItem(EXPANDED_KEY), null);
  });

  it("saveExpandedState removes key when called with null", () => {
    mockStorage.setItem(EXPANDED_KEY, "123");
    saveExpandedState(null);
    assert.equal(mockStorage.getItem(EXPANDED_KEY), null);
  });

  it("saveExpandedState then loadExpandedState round-trips correctly", () => {
    saveExpandedState(555);
    assert.equal(loadExpandedState(), 555);
  });

  it("saveExpandedState with undefined then loadExpandedState returns undefined", () => {
    saveExpandedState(555);
    saveExpandedState(undefined);
    assert.equal(loadExpandedState(), undefined);
  });

  it("saveExpandedState does not throw when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      saveExpandedState(123);
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });

  it("loadExpandedState returns undefined when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      const result = loadExpandedState();
      assert.equal(result, undefined);
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });

  it("loadImportMode returns combine when nothing stored", () => {
    const result = loadImportMode();
    assert.equal(result, "combine");
  });

  it("loadImportMode returns combine when stored value is combine", () => {
    mockStorage.setItem(IMPORT_MODE_KEY, "combine");
    const result = loadImportMode();
    assert.equal(result, "combine");
  });

  it("loadImportMode returns replace when stored value is replace", () => {
    mockStorage.setItem(IMPORT_MODE_KEY, "replace");
    const result = loadImportMode();
    assert.equal(result, "replace");
  });

  it("loadImportMode returns combine for unknown stored value", () => {
    mockStorage.setItem(IMPORT_MODE_KEY, "unknown");
    const result = loadImportMode();
    assert.equal(result, "combine");
  });

  it("saveImportMode stores combine", () => {
    saveImportMode("combine");
    assert.equal(mockStorage.getItem(IMPORT_MODE_KEY), "combine");
  });

  it("saveImportMode stores replace", () => {
    saveImportMode("replace");
    assert.equal(mockStorage.getItem(IMPORT_MODE_KEY), "replace");
  });

  it("saveImportMode then loadImportMode round-trips correctly", () => {
    saveImportMode("replace");
    assert.equal(loadImportMode(), "replace");
    saveImportMode("combine");
    assert.equal(loadImportMode(), "combine");
  });

  it("saveImportMode does not throw when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      saveImportMode("replace");
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });

  it("loadImportMode returns combine when storage is unavailable", () => {
    const prevStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      const result = loadImportMode();
      assert.equal(result, "combine");
    } finally {
      globalThis.localStorage = prevStorage;
    }
  });
});
