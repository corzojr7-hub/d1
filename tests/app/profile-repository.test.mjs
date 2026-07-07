import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

function fakeThenable(result) {
  return {
    then(resolve) {
      resolve(result);
    },
  };
}

const MOCK_PROFILE = {
  id: "p001",
  user_id: "u001",
  display_name: "Maria Lopez",
  email: "maria@tienda.com",
  role: "supervisor",
  status: "activo",
  store_name: "2 Centro",
  store_code: "402",
  second_in_charge: "Ana Ruiz",
  third_in_charge: "Luis Mora",
  assistant_count: 1,
  assistants: [{ name: "Pedro", contract_type: "full_time" }],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("createSupabaseProfileRepo", () => {
  function makeChain(result, error = null) {
    const eqMock = mock.fn(() => ({
      maybeSingle: mock.fn(() => fakeThenable({ data: result, error })),
    }));
    const selectMock = mock.fn(() => ({ eq: eqMock }));
    return { selectMock, eqMock };
  }

  it("fetchProfileByUserId queries profiles table with user_id", async () => {
    const { supabase, fromMock } = (() => {
      const { selectMock, eqMock } = makeChain(MOCK_PROFILE);
      const fromMock = mock.fn(() => ({ select: selectMock }));
      return { supabase: { from: fromMock }, fromMock, selectMock, eqMock };
    })();
    const { createSupabaseProfileRepo } = await import(
      "../../src/lib/supabase/profile-repository.ts"
    );
    const repo = createSupabaseProfileRepo(supabase);
    const result = await repo.fetchProfileByUserId("u001");

    assert.equal(fromMock.mock.callCount(), 1);
    assert.equal(fromMock.mock.calls[0].arguments[0], "profiles");
    assert.deepEqual(result, MOCK_PROFILE);
  });

  it("fetchProfileByUserId returns null when no profile exists", async () => {
    const { supabase } = (() => {
      const { selectMock } = makeChain(null);
      const fromMock = mock.fn(() => ({ select: selectMock }));
      return { supabase: { from: fromMock } };
    })();
    const { createSupabaseProfileRepo } = await import(
      "../../src/lib/supabase/profile-repository.ts"
    );
    const repo = createSupabaseProfileRepo(supabase);
    const result = await repo.fetchProfileByUserId("u999");

    assert.equal(result, null);
  });

  it("fetchProfileByUserId throws on error", async () => {
    const { supabase } = (() => {
      const { selectMock } = makeChain(null, new Error("DB error"));
      const fromMock = mock.fn(() => ({ select: selectMock }));
      return { supabase: { from: fromMock } };
    })();
    const { createSupabaseProfileRepo } = await import(
      "../../src/lib/supabase/profile-repository.ts"
    );
    const repo = createSupabaseProfileRepo(supabase);
    await assert.rejects(
      () => repo.fetchProfileByUserId("u001"),
      /DB error/,
    );
  });
});

describe("fetchProfileByUserId (app-level)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns DEV_PROFILE in local mode", async () => {
    const { fetchProfileByUserId } = await import(
      "../../src/lib/app/profile-repository.ts"
    );
    const result = await fetchProfileByUserId("any-id", "local");
    assert.equal(result.display_name, "Usuario de Desarrollo");
    assert.equal(result.role, "supervisor");
    assert.equal(result.email, "dev@tienda.local");
  });

  it("returns null in supabase mode without env vars", async () => {
    const { fetchProfileByUserId } = await import(
      "../../src/lib/app/profile-repository.ts"
    );
    const result = await fetchProfileByUserId("any-id", "supabase");
    assert.equal(result, null);
  });
});
