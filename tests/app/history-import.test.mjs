import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateImportPayload } from "../../src/app/history/history-import.ts";

function makeExportPayload(entriesOverrides) {
  return {
    exportedAt: "2026-06-05T10:00:00.000Z",
    entryCount: 1,
    filtersApplied: {
      type: "all",
      searchText: "",
      dateFrom: null,
      dateTo: null,
      status: "",
      responsiblePerson: "",
    },
    entries: [
      {
        type: "instruction",
        timestamp: 1000,
        summary: "Test entry",
        meta: {
          reviewStatus: "",
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
      },
      ...(entriesOverrides ?? []),
    ],
  };
}

describe("history-import", () => {
  describe("validateImportPayload", () => {
    it("return error for null input", () => {
      const result = validateImportPayload(null);
      assert.equal(result.valid, false);
      assert.ok(result.error);
      assert.deepEqual(result.entries, []);
    });

    it("return error for non-object input", () => {
      const result = validateImportPayload("string");
      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("return error when entries is missing", () => {
      const result = validateImportPayload({});
      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("return error when entries is not an array", () => {
      const result = validateImportPayload({ entries: "not-array" });
      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("return error when entries array is empty", () => {
      const result = validateImportPayload({ entries: [] });
      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("extract valid entries from a well-formed payload", () => {
      const payload = makeExportPayload();
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 1);
      assert.equal(result.entries[0].type, "instruction");
      assert.equal(result.entries[0].summary, "Test entry");
    });

    it("include waste entries", () => {
      const payload = makeExportPayload([
        {
          type: "waste",
          timestamp: 2000,
          summary: "Waste entry",
          meta: {
            reviewStatus: "pendiente_revision",
            hasEvidence: false,
            evidenceName: "",
            barcode: "123",
            quantity: "2",
            unit: "kg",
            responsiblePerson: "Juan",
            reason: "vencido",
            area: "Lacteos",
            observation: "",
            status: "",
            priority: "",
            instructionText: "",
            observations: "",
          },
        },
      ]);
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 2);
      assert.equal(result.entries[1].type, "waste");
    });

    it("skip entries with invalid type", () => {
      const payload = makeExportPayload([
        { type: "unknown", timestamp: 2000, summary: "Bad" },
      ]);
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 1);
    });

    it("skip entries without timestamp", () => {
      const payload = makeExportPayload([
        { type: "instruction", summary: "No ts" },
      ]);
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 1);
    });

    it("skip entries with empty summary", () => {
      const payload = makeExportPayload([
        { type: "instruction", timestamp: 3000, summary: "   " },
      ]);
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 1);
    });

    it("return error when no valid entries remain after filtering", () => {
      const payload = {
        exportedAt: "2026-06-05T10:00:00.000Z",
        entryCount: 1,
        entries: [{ type: "bogus" }],
      };
      const result = validateImportPayload(payload);
      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("handle entries without meta", () => {
      const payload = makeExportPayload([
        { type: "waste", timestamp: 2000, summary: "Sin meta" },
      ]);
      payload.entries[1].meta = undefined;
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries.length, 2);
      assert.equal(result.entries[1].meta, undefined);
    });

    it("trim whitespace from summary", () => {
      const payload = makeExportPayload([
        { type: "instruction", timestamp: 2000, summary: "  Con espacios  " },
      ]);
      const result = validateImportPayload(payload);
      assert.equal(result.valid, true);
      assert.equal(result.entries[1].summary, "Con espacios");
    });
  });
});
