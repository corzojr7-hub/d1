import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

function fakeThenable(result) {
  return {
    then(resolve) {
      resolve(result);
    },
  };
}

const MOCK_PRODUCTS = [
  { id: "a1", barcode: "7501", materialCode: "MAT001", name: "Producto A" },
  { id: "b2", barcode: "7502", materialCode: "MAT002", name: "Producto B" },
  { id: "c3", barcode: "7503", materialCode: "MAT003", name: "Producto C" },
  { id: "d4", barcode: "7504", materialCode: "MAT004", name: "Producto D" },
  { id: "e5", barcode: "7505", materialCode: "MAT005", name: "Producto E" },
];

const MOCK_EXISTING_BARCODES = ["7501", "7503", "7505"];

describe("createSupabaseProductSeed", () => {
  function createMockSupabase(
    existingBarcodes = [],
    selectError = null,
    insertErrorValue = null,
  ) {
    const selectMock = mock.fn(() => {
      const data = existingBarcodes.map((bc) => ({ barcode: bc }));
      return fakeThenable({ data, error: selectError });
    });
    const insertMock = mock.fn(() => {
      return fakeThenable({ data: null, error: insertErrorValue });
    });
    const fromMock = mock.fn((table) => {
      if (table !== "products") throw new Error(`Unexpected table: ${table}`);
      return {
        select: selectMock,
        insert: insertMock,
      };
    });
    return {
      supabase: { from: fromMock },
      selectMock,
      insertMock,
      fromMock,
    };
  }

  describe("dry run", () => {
    it("returns total products and zero inserted when table is empty", async () => {
      const { supabase, insertMock } = createMockSupabase([]);
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS, { dryRun: true });

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 0);
      assert.equal(result.skipped, 0);
      assert.equal(result.errors.length, 0);
      assert.equal(result.dryRun, true);
      assert.equal(insertMock.mock.callCount(), 0);
    });

    it("skips products that already exist", async () => {
      const { supabase, insertMock } = createMockSupabase(
        MOCK_EXISTING_BARCODES,
      );
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS, { dryRun: true });

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 0);
      assert.equal(result.skipped, 3);
      assert.equal(result.errors.length, 0);
      assert.equal(result.dryRun, true);
      assert.equal(insertMock.mock.callCount(), 0);
    });
  });

  describe("real run", () => {
    it("inserts all products when table is empty", async () => {
      const { supabase, insertMock, fromMock } = createMockSupabase([]);
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS);

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 5);
      assert.equal(result.skipped, 0);
      assert.equal(result.errors.length, 0);
      assert.equal(result.dryRun, false);
      assert.equal(fromMock.mock.callCount(), 2); // 1 select + 1 insert (batch of 100)
      assert.equal(insertMock.mock.callCount(), 1); // all 5 in one batch
      assert.equal(fromMock.mock.calls[0].arguments[0], "products");
    });

    it("skips existing products and inserts only new ones", async () => {
      const { supabase, insertMock } = createMockSupabase(
        MOCK_EXISTING_BARCODES,
      );
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS);

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 2);
      assert.equal(result.skipped, 3);
      assert.equal(result.errors.length, 0);
      assert.equal(insertMock.mock.callCount(), 1);
      const insertedRows = insertMock.mock.calls[0].arguments[0];
      assert.equal(insertedRows.length, 2);
      assert.equal(insertedRows[0].barcode, "7502");
      assert.equal(insertedRows[0].name, "Producto B");
      assert.equal(insertedRows[0].category, "MAT002");
      assert.equal(insertedRows[1].barcode, "7504");
    });

    it("reports error when select fails", async () => {
      const { supabase, insertMock } = createMockSupabase([], new Error("Connection failed"));
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS);

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 0);
      assert.equal(result.skipped, 0);
      assert.equal(result.errors.length, 1);
      assert.ok(result.errors[0].includes("Connection failed"));
      assert.equal(insertMock.mock.callCount(), 0);
    });

    it("reports error when insert fails", async () => {
      const { supabase, insertMock } = createMockSupabase(
        [],
        null,
        new Error("Duplicate key"),
      );
      const { createSupabaseProductSeed } = await import(
        "../../src/lib/supabase/product-seed.ts"
      );
      const seeder = createSupabaseProductSeed(supabase);
      const result = await seeder.seedProducts(MOCK_PRODUCTS);

      assert.equal(result.total, 5);
      assert.equal(result.inserted, 0);
      assert.equal(result.errors.length, 1);
      assert.ok(result.errors[0].includes("Duplicate key"));
      assert.equal(insertMock.mock.callCount(), 1);
    });
  });
});

describe("seedProductsToSupabase", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns error report when supabase is not configured", async () => {
    const { seedProductsToSupabase } = await import(
      "../../src/lib/app/product-seed.ts"
    );
    const result = await seedProductsToSupabase();

    assert.equal(result.total, 0);
    assert.equal(result.inserted, 0);
    assert.equal(result.skipped, 0);
    assert.equal(result.errors.length, 1);
    assert.ok(result.errors[0].includes("Supabase no configurado"));
  });

  it("returns error report with dryRun flag preserved", async () => {
    const { seedProductsToSupabase } = await import(
      "../../src/lib/app/product-seed.ts"
    );
    const result = await seedProductsToSupabase(true);

    assert.equal(result.dryRun, true);
    assert.equal(result.errors.length, 1);
  });
});
