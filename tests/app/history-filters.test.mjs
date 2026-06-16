import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  filterHistory,
  getFilterStatuses,
  getUniqueResponsiblePersons,
  statusLabel,
} from "../../src/app/history/history-filters.ts";

function makeEntry(overrides) {
  return {
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

describe("history-filters", () => {
  describe("filterHistory", () => {
    it("return all entries when no filters active", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A" }),
        makeEntry({ type: "waste", summary: "B" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 2);
    });

    it("filter by type instruction", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A" }),
        makeEntry({ type: "waste", summary: "B" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "instruction",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "A");
    });

    it("filter by type waste", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A" }),
        makeEntry({ type: "waste", summary: "B" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "waste",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "B");
    });

    it("filter by search text matching summary", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Inventario mensual" }),
        makeEntry({ type: "waste", summary: "Productos vencidos" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "Inventario",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "Inventario mensual");
    });

    it("filter by search text matching meta responsiblePerson", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Revision", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", summary: "Merma", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Maria", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "Maria",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
    });

    it("filter by search text matching meta barcode", () => {
      const entries = [
        makeEntry({ type: "waste", summary: "Prod A", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "7501234567890",
          quantity: "", unit: "", responsiblePerson: "", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "750123",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
    });

    it("filter by dateFrom", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Old", timestamp: 100 }),
        makeEntry({ type: "instruction", summary: "New", timestamp: 2000 }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: 500,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "New");
    });

    it("filter by dateTo", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Old", timestamp: 100 }),
        makeEntry({ type: "instruction", summary: "New", timestamp: 2000 }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: 500,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "Old");
    });

    it("filter by date range", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", timestamp: 100 }),
        makeEntry({ type: "instruction", summary: "B", timestamp: 500 }),
        makeEntry({ type: "instruction", summary: "C", timestamp: 1000 }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: 200,
        dateTo: 800,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "B");
    });

    it("filter by waste status", () => {
      const entries = [
        makeEntry({ type: "waste", summary: "A", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", summary: "B", meta: {
          reviewStatus: "anulado", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "anulado",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "B");
    });

    it("filter by instruction status", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "instruction", summary: "B", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "cumplida", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "cumplida",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "B");
    });

    it("filter by instruction status when typeFilter is all and entries have mixed types", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", summary: "B", meta: {
          reviewStatus: "anulado", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "pendiente",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "A");
    });

    it("return empty when no search match", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Uno" }),
        makeEntry({ type: "waste", summary: "Dos" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "xyz",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 0);
    });

    it("handle entry without meta gracefully", () => {
      const entries = [
        { type: "instruction", timestamp: 100, summary: "No meta" },
        { type: "waste", timestamp: 200, summary: "Waste no meta" },
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 2);
    });

    it("apply typeFilter with searchText simultaneously", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "Revisar todo" }),
        makeEntry({ type: "waste", summary: "Revisar merma" }),
      ];
      const result = filterHistory(entries, {
        typeFilter: "waste",
        searchText: "Revisar",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].type, "waste");
    });
  });

  describe("getFilterStatuses", () => {
    it("return instruction statuses when type is instruction", () => {
      const statuses = getFilterStatuses("instruction");
      assert.equal(statuses.length, 7);
      assert.equal(statuses[0].value, "");
      assert.equal(statuses[1].value, "pendiente");
    });

    it("return waste statuses when type is waste", () => {
      const statuses = getFilterStatuses("waste");
      assert.equal(statuses.length, 7);
      assert.equal(statuses[0].value, "");
      assert.equal(statuses[1].value, "pendiente_revision");
    });

    it("return waste statuses when type is all", () => {
      const statuses = getFilterStatuses("all");
      assert.equal(statuses.length, 7);
      assert.equal(statuses[0].value, "");
    });
  });

  describe("filterHistory with responsiblePersonFilter", () => {
    it("filter by responsible person", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", summary: "B", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Maria", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "Maria",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].summary, "B");
    });

    it("return empty when no entry matches responsiblePersonFilter", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "Pedro",
      });
      assert.equal(result.length, 0);
    });

    it("skip entries without meta when filtering by responsiblePersonFilter", () => {
      const entries = [
        { type: "instruction", timestamp: 100, summary: "Sin meta" },
        makeEntry({ type: "instruction", summary: "Con meta", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Luis", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "all",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "Luis",
      });
      assert.equal(result.length, 1);
    });

    it("filter by responsiblePersonFilter combined with typeFilter", () => {
      const entries = [
        makeEntry({ type: "instruction", summary: "A", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", summary: "B", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = filterHistory(entries, {
        typeFilter: "instruction",
        searchText: "",
        dateFrom: undefined,
        dateTo: undefined,
        statusFilter: "",
        responsiblePersonFilter: "Carlos",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].type, "instruction");
    });
  });

  describe("getUniqueResponsiblePersons", () => {
    it("return empty array for empty entries", () => {
      const result = getUniqueResponsiblePersons([], "all");
      assert.deepEqual(result, []);
    });

    it("return sorted unique persons from all entries", () => {
      const entries = [
        makeEntry({ type: "instruction", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Zara", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Ana", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "instruction", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Zara", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = getUniqueResponsiblePersons(entries, "all");
      assert.deepEqual(result, ["Ana", "Zara"]);
    });

    it("respect typeFilter", () => {
      const entries = [
        makeEntry({ type: "instruction", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Carlos", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
        makeEntry({ type: "waste", meta: {
          reviewStatus: "pendiente_revision", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Maria", reason: "", area: "", observation: "",
          status: "", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = getUniqueResponsiblePersons(entries, "instruction");
      assert.deepEqual(result, ["Carlos"]);
    });

    it("omit entries without meta", () => {
      const entries = [
        { type: "instruction", timestamp: 100, summary: "Sin meta" },
        makeEntry({ type: "instruction", meta: {
          reviewStatus: "", hasEvidence: false, evidenceName: "", barcode: "", quantity: "", unit: "",
          responsiblePerson: "Luis", reason: "", area: "", observation: "",
          status: "pendiente", priority: "", instructionText: "", observations: "",
        }}),
      ];
      const result = getUniqueResponsiblePersons(entries, "all");
      assert.deepEqual(result, ["Luis"]);
    });
  });

  describe("statusLabel", () => {
    it("return label for known status", () => {
      assert.equal(statusLabel("pendiente"), "Pendiente");
      assert.equal(statusLabel("cumplida"), "Cumplida");
      assert.equal(statusLabel("anulado"), "Anulado");
    });

    it("return value itself for unknown status", () => {
      assert.equal(statusLabel("desconocido"), "desconocido");
    });
  });
});
