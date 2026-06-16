import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProductCatalog,
  searchProducts,
  getProductById,
  getProductByBarcode,
} from "../../src/lib/app/product-catalog.ts";
import { resolveProductIdFromBarcode } from "../../src/app/waste/new/barcode-resolution.ts";

const sampleBarcode = "7702024047179";
const sampleMaterial = "12000000";
const sampleName = "ALIMENTO LÁCTEO KLIM NUTRI-RINDE 364 GR";

describe("product-catalog", () => {
  describe("getProductCatalog", () => {
    it("return the full Excel-backed catalog", () => {
      const catalog = getProductCatalog();
      assert.equal(catalog.length, 9624);
    });

    it("return products with valid UUID ids", () => {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const p of getProductCatalog()) {
        assert.match(p.id, uuidRe);
      }
    });

    it("return products with non-empty barcodes, material codes and names", () => {
      for (const p of getProductCatalog()) {
        assert.ok(p.barcode.length > 0);
        assert.ok(p.materialCode.length > 0);
        assert.ok(p.name.length > 0);
      }
    });
  });

  describe("searchProducts", () => {
    it("return empty array for empty query", () => {
      assert.deepEqual(searchProducts(""), []);
      assert.deepEqual(searchProducts("   "), []);
    });

    it("find product by partial barcode", () => {
      const results = searchProducts("2024047");
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.barcode === sampleBarcode));
    });

    it("find product by full barcode", () => {
      const results = searchProducts(sampleBarcode);
      assert.ok(results.length > 0);
      assert.equal(results[0].barcode, sampleBarcode);
      assert.equal(results[0].materialCode, sampleMaterial);
    });

    it("find product by material code", () => {
      const results = searchProducts(sampleMaterial);
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.barcode === sampleBarcode));
    });

    it("find product by description", () => {
      const results = searchProducts("KLIM");
      assert.ok(results.length > 0);
      assert.ok(results.some((p) => p.name === sampleName));
    });

    it("be case insensitive", () => {
      const upper = searchProducts("KLIM");
      const lower = searchProducts("klim");
      assert.deepEqual(upper, lower);
    });

    it("return empty for unmatched query", () => {
      assert.deepEqual(searchProducts("xyzxyz"), []);
    });
  });

  describe("getProductById", () => {
    it("return product for valid id", () => {
      const p = getProductByBarcode(sampleBarcode);
      assert.ok(p);
      const byId = getProductById(p.id);
      assert.equal(byId?.barcode, sampleBarcode);
      assert.equal(byId?.materialCode, sampleMaterial);
    });

    it("return undefined for unknown id", () => {
      assert.equal(getProductById("unknown"), undefined);
    });
  });

  describe("getProductByBarcode", () => {
    it("return product for valid barcode", () => {
      const p = getProductByBarcode(sampleBarcode);
      assert.equal(p?.name, sampleName);
      assert.equal(p?.materialCode, sampleMaterial);
    });

    it("return undefined for unknown barcode", () => {
      assert.equal(getProductByBarcode("0000000000000"), undefined);
    });

    it("transition from known to unknown barcode", () => {
      const known = getProductByBarcode(sampleBarcode);
      assert.notEqual(known, undefined);
      const unknown = getProductByBarcode("9999999999999");
      assert.equal(unknown, undefined);
    });
  });

  describe("waste-form barcode to product_id resolution", () => {
    it("set product_id when barcode matches a known product", async () => {
      const product = getProductByBarcode(sampleBarcode);
      const id = await resolveProductIdFromBarcode(sampleBarcode, false);
      assert.equal(id, product?.id);
    });

    it("clear product_id when barcode changes to unknown", async () => {
      await resolveProductIdFromBarcode(sampleBarcode, false);
      const id = await resolveProductIdFromBarcode("9999999999999", false);
      assert.equal(id, "");
    });

    it("clear product_id when barcode is empty", async () => {
      const id = await resolveProductIdFromBarcode("", false);
      assert.equal(id, "");
    });

    it("keep product_id cleared when product_not_found is true", async () => {
      await resolveProductIdFromBarcode(sampleBarcode, true);
      const id = await resolveProductIdFromBarcode("9999999999999", true);
      assert.equal(id, "");
    });

    it("switch product_id when barcode changes to a different known product", async () => {
      const id1 = await resolveProductIdFromBarcode(sampleBarcode, false);
      assert.ok(id1);
      const id2 = await resolveProductIdFromBarcode("7702024027577", false);
      assert.ok(id2);
      assert.notEqual(id1, id2);
    });

    it("not auto-fill when product_not_found is true even with known barcode", async () => {
      const id = await resolveProductIdFromBarcode(sampleBarcode, true);
      assert.equal(id, "");
    });
  });
});
