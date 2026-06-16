import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  createAuthProfileResolver,
  tryResolveAuthProfile,
  resetAuthCache,
} from "../../src/lib/app/auth-profile.ts";
import {
  configureProfileResolver,
  getCurrentProfileId,
  getAuthStatus,
  resetProfileResolver,
  setAuthStatus,
} from "../../src/lib/app/current-profile.ts";

describe("createAuthProfileResolver", () => {
  beforeEach(() => {
    resetProfileResolver();
    resetAuthCache();
  });

  it("return a function", () => {
    const resolver = createAuthProfileResolver();
    assert.equal(typeof resolver, "function");
  });

  it("return empty string when auth not resolved yet", () => {
    const resolver = createAuthProfileResolver();
    assert.equal(resolver(), "");
  });

  it("be compatible with configureProfileResolver and return empty string before auth", () => {
    configureProfileResolver(createAuthProfileResolver());
    const id = getCurrentProfileId();
    assert.equal(id, "");
  });

  it("be replaceable by resetProfileResolver", () => {
    configureProfileResolver(createAuthProfileResolver());
    resetProfileResolver();
    const id = getCurrentProfileId();
    assert.equal(typeof id, "string");
    assert.ok(id.length > 0);
  });
});

describe("tryResolveAuthProfile", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    resetProfileResolver();
    resetAuthCache();
    setAuthStatus("loading");
  });

  it("return empty string when no Supabase session exists", async () => {
    const result = await tryResolveAuthProfile();
    assert.equal(result, "");
  });

  it("set auth status to unauthenticated when no session exists", async () => {
    await tryResolveAuthProfile();
    assert.equal(getAuthStatus(), "unauthenticated");
  });

  it("set profile resolver to return empty string when no session", async () => {
    await tryResolveAuthProfile();
    const id = getCurrentProfileId();
    assert.equal(id, "");
  });
});
