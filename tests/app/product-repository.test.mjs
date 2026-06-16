import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  fetchAllProducts,
  fetchProductById,
  fetchProductByBarcode,
  searchProducts,
  configureProductRepo,
  resetProductRepo,
} from "../../src/lib/app/product-repository.ts";

function createMockRepo() {
  return [
    { id: "a1", barcode: "7501", materialCode: "MAT001", name: "Producto A" },
    { id: "b2", barcode: "7502", materialCode: "MAT002", name: "Producto B" },
    { id: "c3", barcode: "7503", materialCode: "MAT003", name: "Otro item" },
  ];
}

describe("product-repository", () => {
  beforeEach(() => {
    resetProductRepo();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("fetchAllProducts returns all products in local mode", async () => {
    const products = await fetchAllProducts();
    assert.ok(products.length > 0);
    assert.ok(products.every((p) => p.id && p.barcode && p.name));
  });

  it("fetchProductById returns product by id in local mode", async () => {
    const all = await fetchAllProducts();
    const first = all[0];
    const found = await fetchProductById(first.id);
    assert.notEqual(found, null);
    assert.equal(found?.id, first.id);
  });

  it("fetchProductById returns null for unknown id", async () => {
    const result = await fetchProductById("nonexistent-id");
    assert.equal(result, null);
  });

  it("fetchProductByBarcode returns product by barcode in local mode", async () => {
    const all = await fetchAllProducts();
    const first = all[0];
    const found = await fetchProductByBarcode(first.barcode);
    assert.notEqual(found, null);
    assert.equal(found?.id, first.id);
  });

  it("fetchProductByBarcode returns null for unknown barcode", async () => {
    const result = await fetchProductByBarcode("0000000000000");
    assert.equal(result, null);
  });

  it("searchProducts returns results matching query in local mode", async () => {
    const results = await searchProducts("Producto");
    assert.ok(results.length >= 2);
  });

  it("searchProducts returns empty for empty query", async () => {
    const results = await searchProducts("");
    assert.deepEqual(results, []);
  });

  it("searchProducts returns empty for whitespace query", async () => {
    const results = await searchProducts("   ");
    assert.deepEqual(results, []);
  });

  it("configureProductRepo overrides the repository", async () => {
    configureProductRepo({
      async getAllProducts() {
        return createMockRepo();
      },
      async getProductById(id) {
        return createMockRepo().find((p) => p.id === id) ?? null;
      },
      async getProductByBarcode(barcode) {
        return createMockRepo().find((p) => p.barcode === barcode) ?? null;
      },
      async searchProducts(query) {
        const q = query.toLowerCase();
        return createMockRepo().filter(
          (p) =>
            p.barcode.includes(q) ||
            p.materialCode.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q),
        );
      },
    });

    const products = await fetchAllProducts();
    assert.equal(products.length, 3);
    assert.equal(products[0].barcode, "7501");

    const byBarcode = await fetchProductByBarcode("7502");
    assert.equal(byBarcode?.name, "Producto B");

    const byId = await fetchProductById("c3");
    assert.equal(byId?.name, "Otro item");

    const searched = await searchProducts("MAT002");
    assert.equal(searched.length, 1);
    assert.equal(searched[0].name, "Producto B");
  });

  it("resetProductRepo restores local mode after configuration", async () => {
    configureProductRepo({
      async getAllProducts() {
        return createMockRepo();
      },
      async getProductById() { return null; },
      async getProductByBarcode() { return null; },
      async searchProducts() { return []; },
    });

    const before = await fetchAllProducts();
    assert.equal(before.length, 3);

    resetProductRepo();
    const after = await fetchAllProducts();
    assert.ok(after.length > 3); // restored to full static catalog
  });
});
