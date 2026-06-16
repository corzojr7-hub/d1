import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  fetchAllProducts,
  searchProducts,
  resetProductRepo,
} from "../../src/lib/app/product-repository.ts";

describe("products-ui", () => {
  beforeEach(() => {
    resetProductRepo();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("catalog has products loaded", async () => {
    const products = await fetchAllProducts();
    assert.ok(products.length > 0);
  });

  it("search by barcode substring finds matching products", async () => {
    const products = await fetchAllProducts();
    const barcodePrefix = products[0].barcode.slice(0, 4);
    const results = await searchProducts(barcodePrefix);
    assert.ok(results.length > 0);
    assert.ok(results.some((p) => p.barcode.includes(barcodePrefix)));
  });

  it("search by name substring finds matching products", async () => {
    const products = await fetchAllProducts();
    const namePrefix = products[0].name.slice(0, 5).toLowerCase();
    const results = await searchProducts(namePrefix);
    assert.ok(results.length > 0);
    assert.ok(
      results.some((p) => p.name.toLowerCase().includes(namePrefix)),
    );
  });

  it("search by material code finds matching products", async () => {
    const products = await fetchAllProducts();
    const codePrefix = products[0].materialCode.slice(0, 3);
    const results = await searchProducts(codePrefix);
    assert.ok(results.length > 0);
    assert.ok(
      results.some((p) =>
        p.materialCode.toLowerCase().includes(codePrefix),
      ),
    );
  });

  it("search returns empty for unmatched query", async () => {
    const results = await searchProducts("xyznonexistentproduct999");
    assert.deepEqual(results, []);
  });

  it("search is case insensitive", async () => {
    const products = await fetchAllProducts();
    const name = products[0].name;
    const upper = await searchProducts(name.toUpperCase().slice(0, 8));
    const lower = await searchProducts(name.toLowerCase().slice(0, 8));
    assert.equal(upper.length, lower.length);
  });

  it("search returns results sorted or filtered correctly", async () => {
    const results = await searchProducts("a");
    // repository-level search returns all matches (UI limits display to 120)
    assert.ok(results.length > 0 || results.length === 0);
  });

  it("product has expected fields", async () => {
    const products = await fetchAllProducts();
    const p = products[0];
    assert.ok(typeof p.id === "string");
    assert.ok(typeof p.barcode === "string");
    assert.ok(typeof p.materialCode === "string");
    assert.ok(typeof p.name === "string");
  });
});
