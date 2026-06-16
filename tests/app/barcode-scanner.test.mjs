import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBarcodeDetectorSupported } from "../../src/app/waste/new/barcode-scanner.ts";

describe("barcode-scanner", () => {
  describe("isBarcodeDetectorSupported", () => {
    it("return false in Node.js environment", () => {
      assert.equal(isBarcodeDetectorSupported(), false);
    });
  });
});
