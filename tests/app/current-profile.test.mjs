import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getCurrentProfileId,
  configureProfileResolver,
  resetProfileResolver,
  isProfileResolverConfigured,
  getAuthStatus,
  setAuthStatus,
} from "../../src/lib/app/current-profile.ts";
import { isUuid } from "../../src/lib/domain/validators.ts";

const EXPECTED_DEV_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOM_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("getCurrentProfileId", () => {
  beforeEach(() => {
    resetProfileResolver();
  });

  it("return a non-empty string without explicit configuration", () => {
    const id = getCurrentProfileId();
    assert.equal(typeof id, "string");
    assert.ok(id.length > 0);
  });

  it("return a valid UUID by default", () => {
    const id = getCurrentProfileId();
    assert.equal(isUuid(id), true);
  });

  it("return the DEV_PROFILE_ID by default", () => {
    const id = getCurrentProfileId();
    assert.equal(id, EXPECTED_DEV_ID);
  });

  it("return custom value when configured with a custom resolver", () => {
    configureProfileResolver(() => CUSTOM_ID);
    const id = getCurrentProfileId();
    assert.equal(id, CUSTOM_ID);
  });

  it("return DEV_PROFILE_ID after reset", () => {
    configureProfileResolver(() => CUSTOM_ID);
    resetProfileResolver();
    const id = getCurrentProfileId();
    assert.equal(id, EXPECTED_DEV_ID);
  });
});

describe("isProfileResolverConfigured", () => {
  beforeEach(() => {
    resetProfileResolver();
  });

  it("return false before any call", () => {
    assert.equal(isProfileResolverConfigured(), false);
  });

  it("return false before first getCurrentProfileId call", () => {
    assert.equal(isProfileResolverConfigured(), false);
  });

  it("return true after explicit configuration", () => {
    configureProfileResolver(() => EXPECTED_DEV_ID);
    assert.equal(isProfileResolverConfigured(), true);
  });

  it("return true after getCurrentProfileId triggers lazy init", () => {
    getCurrentProfileId();
    assert.equal(isProfileResolverConfigured(), true);
  });

  it("return false after reset", () => {
    configureProfileResolver(() => EXPECTED_DEV_ID);
    resetProfileResolver();
    assert.equal(isProfileResolverConfigured(), false);
  });
});

describe("getAuthStatus", () => {
  beforeEach(() => {
    resetProfileResolver();
  });

  it("return loading after reset", () => {
    assert.equal(getAuthStatus(), "loading");
  });

  it("return authenticated after setAuthStatus is called", () => {
    setAuthStatus("authenticated");
    assert.equal(getAuthStatus(), "authenticated");
  });

  it("return unauthenticated after setAuthStatus is called", () => {
    setAuthStatus("unauthenticated");
    assert.equal(getAuthStatus(), "unauthenticated");
  });

  it("return loading after reset clears auth status", () => {
    setAuthStatus("authenticated");
    resetProfileResolver();
    assert.equal(getAuthStatus(), "loading");
  });
});
