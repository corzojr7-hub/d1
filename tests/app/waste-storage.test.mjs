import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

function fakeThenable(result) {
  return {
    then(resolve) {
      resolve(result);
    },
  };
}

function createMockSupabaseStorage() {
  const uploadMock = mock.fn(() =>
    fakeThenable({ data: { path: "waste-evidence/test.jpg" }, error: null }),
  );
  const getPublicUrlMock = mock.fn(() => ({
    data: { publicUrl: "https://supabase.co/storage/v1/object/public/waste-evidence/test.jpg" },
  }));
  const removeMock = mock.fn(() => fakeThenable({ data: null, error: null }));
  const fromBucketMock = mock.fn(() => ({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
    remove: removeMock,
  }));
  return {
    supabase: {
      storage: {
        from: fromBucketMock,
      },
    },
    uploadMock,
    getPublicUrlMock,
    removeMock,
    fromBucketMock,
  };
}

describe("createWasteStorage", () => {
  it("uploadEvidence calls supabase.storage.from().upload with correct args", async () => {
    const { supabase, uploadMock, fromBucketMock } = createMockSupabaseStorage();
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    const file = new File(["test"], "foto.jpg", { type: "image/jpeg" });
    const result = await storage.uploadEvidence("rec_abc", file);

    assert.equal(fromBucketMock.mock.callCount(), 1);
    assert.equal(fromBucketMock.mock.calls[0].arguments[0], "waste-evidence");
    assert.equal(uploadMock.mock.callCount(), 1);
    assert.equal(uploadMock.mock.calls[0].arguments[0], "waste-evidence/rec_abc.jpg");
    assert.equal(uploadMock.mock.calls[0].arguments[1], file);
    assert.equal(uploadMock.mock.calls[0].arguments[2].contentType, "image/jpeg");
    assert.equal(result, "waste-evidence/rec_abc.jpg");
  });

  it("uploadEvidence preserves file extension from name", async () => {
    const { supabase, uploadMock } = createMockSupabaseStorage();
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    const file = new File(["p"], "evidencia.png", { type: "image/png" });
    await storage.uploadEvidence("key1", file);
    assert.equal(uploadMock.mock.calls[0].arguments[0], "waste-evidence/key1.png");
  });

  it("uploadEvidence falls back to jpg when file has no extension", async () => {
    const { supabase, uploadMock } = createMockSupabaseStorage();
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    const file = new File(["p"], "noext", { type: "image/jpeg" });
    await storage.uploadEvidence("key2", file);
    assert.equal(uploadMock.mock.calls[0].arguments[0], "waste-evidence/key2.jpg");
  });

  it("uploadEvidence throws when upload fails", async () => {
    const { supabase } = createMockSupabaseStorage();
    supabase.storage.from = mock.fn(() => ({
      upload: mock.fn(() => fakeThenable({ data: null, error: new Error("Bucket not found") })),
      getPublicUrl: mock.fn(),
      remove: mock.fn(),
    }));
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    const file = new File(["t"], "f.jpg", { type: "image/jpeg" });
    await assert.rejects(
      () => storage.uploadEvidence("r1", file),
      /Bucket not found/,
    );
  });

  it("getPublicUrl returns public URL for storage path", async () => {
    const { supabase, getPublicUrlMock, fromBucketMock } = createMockSupabaseStorage();
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    const url = storage.getPublicUrl("waste-evidence/rec_abc.jpg");

    assert.equal(fromBucketMock.mock.callCount(), 1);
    assert.equal(fromBucketMock.mock.calls[0].arguments[0], "waste-evidence");
    assert.equal(getPublicUrlMock.mock.callCount(), 1);
    assert.equal(getPublicUrlMock.mock.calls[0].arguments[0], "waste-evidence/rec_abc.jpg");
    assert.equal(url, "https://supabase.co/storage/v1/object/public/waste-evidence/test.jpg");
  });

  it("deleteEvidence removes file from storage", async () => {
    const { supabase, removeMock, fromBucketMock } = createMockSupabaseStorage();
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    await storage.deleteEvidence("waste-evidence/old.jpg");

    assert.equal(fromBucketMock.mock.callCount(), 1);
    assert.equal(fromBucketMock.mock.calls[0].arguments[0], "waste-evidence");
    assert.equal(removeMock.mock.callCount(), 1);
    assert.deepEqual(removeMock.mock.calls[0].arguments[0], ["waste-evidence/old.jpg"]);
  });

  it("deleteEvidence throws when removal fails", async () => {
    const { supabase } = createMockSupabaseStorage();
    supabase.storage.from = mock.fn(() => ({
      upload: mock.fn(),
      getPublicUrl: mock.fn(),
      remove: mock.fn(() => fakeThenable({ data: null, error: new Error("Not found") })),
    }));
    const { createWasteStorage } = await import(
      "../../src/lib/supabase/waste-storage.ts"
    );
    const storage = createWasteStorage(supabase);
    await assert.rejects(
      () => storage.deleteEvidence("missing"),
      /Not found/,
    );
  });
});

describe("uploadWasteEvidence", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns local path and URL when mode is local", async () => {
    const { uploadWasteEvidence } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    const file = new File(["t"], "test.jpg", { type: "image/jpeg" });
    const result = await uploadWasteEvidence(file, "data:image/jpeg;base64,abc", "local");

    assert.ok(result.path.startsWith("local:"));
    assert.equal(result.url, "data:image/jpeg;base64,abc");
  });

  it("returns local path with null URL when no dataUrl in local mode", async () => {
    const { uploadWasteEvidence } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    const file = new File(["t"], "test.jpg", { type: "image/jpeg" });
    const result = await uploadWasteEvidence(file, null, "local");

    assert.ok(result.path.startsWith("local:"));
    assert.equal(result.url, null);
  });
});

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

describe("getEvidenceDisplayUrl", () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
  });

  it("returns null when evidencePath is null", async () => {
    const { getEvidenceDisplayUrl } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    const result = await getEvidenceDisplayUrl(null);
    assert.equal(result, null);
  });

  it("returns local URL for local: prefixed path", async () => {
    const { saveEvidenceLocal, getEvidenceDisplayUrl } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    saveEvidenceLocal("ev_123", "data:image/png;base64,xyz");
    const result = await getEvidenceDisplayUrl("local:ev_123", "local");
    assert.equal(result, "data:image/png;base64,xyz");
  });

  it("returns null for local: path when evidence not stored", async () => {
    const { getEvidenceDisplayUrl } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    const result = await getEvidenceDisplayUrl("local:missing", "local");
    assert.equal(result, null);
  });
});

describe("updateWasteEvidencePath", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("does nothing in local mode", async () => {
    const { updateWasteEvidencePath } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    await updateWasteEvidencePath("r1", "path/to/file", "local");
  });
});

describe("getLatestWasteRecordId", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns null in local mode", async () => {
    const { getLatestWasteRecordId } = await import(
      "../../src/lib/app/waste-repository.ts"
    );
    const result = await getLatestWasteRecordId("user123", "local");
    assert.equal(result, null);
  });
});
