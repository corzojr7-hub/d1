import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildExportPayload,
  generateExportFilename,
} from "../../src/app/history/history-export.ts";

function makeEntry(overrides) {
  return {
    type: "instruction",
    timestamp: 1000,
    summary: "Test entry",
    meta: {
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
      status: "pendiente",
      priority: "",
      instructionText: "",
      observations: "",
    },
    ...overrides,
  };
}

function makeFilters(overrides) {
  return {
    typeFilter: "all",
    searchText: "",
    dateFrom: undefined,
    dateTo: undefined,
    statusFilter: "",
    responsiblePersonFilter: "",
    ...overrides,
  };
}

describe("history-export", () => {
  describe("buildExportPayload", () => {
    it("return payload with exportedAt ISO string", () => {
      const payload = buildExportPayload([], makeFilters());
      assert.match(payload.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
    });

    it("include entryCount matching input length", () => {
      const entries = [makeEntry({ summary: "A" }), makeEntry({ summary: "B" })];
      const payload = buildExportPayload(entries, makeFilters());
      assert.equal(payload.entryCount, 2);
    });

    it("include all filtered entries in the payload", () => {
      const entries = [makeEntry({ summary: "X" }), makeEntry({ summary: "Y" })];
      const payload = buildExportPayload(entries, makeFilters());
      assert.equal(payload.entries.length, 2);
      assert.equal(payload.entries[0].summary, "X");
      assert.equal(payload.entries[1].summary, "Y");
    });

    it("deep copy entries to avoid mutation", () => {
      const entry = makeEntry({ summary: "Original" });
      const payload = buildExportPayload([entry], makeFilters());
      payload.entries[0].summary = "Mutated";
      assert.equal(entry.summary, "Original");
    });

    it("include filtersApplied with all filter values", () => {
      const filters = makeFilters({
        typeFilter: "waste",
        searchText: "leche",
        dateFrom: 1000,
        dateTo: 2000,
        statusFilter: "aprobado",
        responsiblePersonFilter: "Juan",
      });
      const payload = buildExportPayload([makeEntry()], filters);
      assert.equal(payload.filtersApplied.type, "waste");
      assert.equal(payload.filtersApplied.searchText, "leche");
      assert.equal(payload.filtersApplied.status, "aprobado");
      assert.equal(payload.filtersApplied.responsiblePerson, "Juan");
    });

    it("include dateFrom and dateTo as ISO strings when present", () => {
      const filters = makeFilters({
        dateFrom: 500,
        dateTo: 1500,
      });
      const payload = buildExportPayload([makeEntry()], filters);
      assert.match(payload.filtersApplied.dateFrom, /^\d{4}-\d{2}-\d{2}T/);
      assert.match(payload.filtersApplied.dateTo, /^\d{4}-\d{2}-\d{2}T/);
    });

    it("set dateFrom and dateTo to null when not provided", () => {
      const payload = buildExportPayload([makeEntry()], makeFilters());
      assert.equal(payload.filtersApplied.dateFrom, null);
      assert.equal(payload.filtersApplied.dateTo, null);
    });

    it("handle entries without meta gracefully", () => {
      const entries = [
        { type: "instruction", timestamp: 100, summary: "No meta" },
      ];
      const payload = buildExportPayload(entries, makeFilters());
      assert.equal(payload.entries.length, 1);
      assert.equal(payload.entries[0].meta, undefined);
    });
  });

  describe("generateExportFilename", () => {
    it("include date components in filename", () => {
      const name = generateExportFilename(5);
      assert.match(name, /^historial-operativo-\d{8}-/);
    });

    it("include time components in filename", () => {
      const name = generateExportFilename(3);
      const parts = name.split("-");
      assert.equal(parts.length >= 5, true);
    });

    it("include entry count and .json extension", () => {
      const name = generateExportFilename(7);
      assert.match(name, /-7registros\.json$/);
    });

    it("handle zero entries", () => {
      const name = generateExportFilename(0);
      assert.match(name, /-0registros\.json$/);
    });
  });
});
