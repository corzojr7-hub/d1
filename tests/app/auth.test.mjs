import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

function fakeThenable(result) {
  return {
    then(resolve) {
      resolve(result);
    },
  };
}

function createMockSupabaseAuth() {
  const signInWithPasswordMock = mock.fn(() =>
    fakeThenable({
      data: {
        user: { id: "user-abc-123", email: "test@test.com" },
        session: { access_token: "token" },
      },
      error: null,
    }),
  );
  const signOutMock = mock.fn(() =>
    fakeThenable({ error: null }),
  );
  const getSessionMock = mock.fn(() =>
    fakeThenable({
      data: {
        session: {
          user: { id: "user-abc-123", email: "test@test.com" },
          access_token: "token",
        },
      },
    }),
  );
  const supabase = {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      getSession: getSessionMock,
    },
  };
  return { supabase, signInWithPasswordMock, signOutMock, getSessionMock };
}

describe("createSupabaseAuth", () => {
  it("login calls signInWithPassword with credentials", async () => {
    const { supabase, signInWithPasswordMock } = createMockSupabaseAuth();
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    const user = await auth.login("test@test.com", "password123");

    assert.equal(signInWithPasswordMock.mock.callCount(), 1);
    assert.deepEqual(signInWithPasswordMock.mock.calls[0].arguments[0], {
      email: "test@test.com",
      password: "password123",
    });
    assert.equal(user.id, "user-abc-123");
  });

  it("login throws when signInWithPassword fails", async () => {
    const { supabase } = createMockSupabaseAuth();
    supabase.auth.signInWithPassword = mock.fn(() =>
      fakeThenable({
        data: { user: null, session: null },
        error: new Error("Invalid credentials"),
      }),
    );
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    await assert.rejects(
      () => auth.login("bad@test.com", "wrong"),
      /Invalid credentials/,
    );
  });

  it("logout calls signOut", async () => {
    const { supabase, signOutMock } = createMockSupabaseAuth();
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    await auth.logout();

    assert.equal(signOutMock.mock.callCount(), 1);
  });

  it("logout throws when signOut fails", async () => {
    const { supabase } = createMockSupabaseAuth();
    supabase.auth.signOut = mock.fn(() =>
      fakeThenable({ error: new Error("Session not found") }),
    );
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    await assert.rejects(
      () => auth.logout(),
      /Session not found/,
    );
  });

  it("getSession returns session when logged in", async () => {
    const { supabase, getSessionMock } = createMockSupabaseAuth();
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    const session = await auth.getSession();

    assert.equal(getSessionMock.mock.callCount(), 1);
    assert.equal(session.user.id, "user-abc-123");
  });

  it("getSession returns null when not logged in", async () => {
    const { supabase } = createMockSupabaseAuth();
    supabase.auth.getSession = mock.fn(() =>
      fakeThenable({ data: { session: null } }),
    );
    const { createSupabaseAuth } = await import(
      "../../src/lib/supabase/auth.ts"
    );
    const auth = createSupabaseAuth(supabase);
    const session = await auth.getSession();

    assert.equal(session, null);
  });
});
