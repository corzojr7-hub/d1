import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getRuntimeMode,
  getRuntimeModeLabel,
} from "../../src/lib/app/runtime-mode.ts";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

describe("runtime-mode", () => {
  beforeEach(() => {
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
  });

  it("getRuntimeMode returns local when env vars are not set", () => {
    assert.equal(getRuntimeMode(), "local");
  });

  it("getRuntimeMode returns local when URL is set but key is empty", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[ANON_KEY] = "";
    assert.equal(getRuntimeMode(), "local");
  });

  it("getRuntimeMode returns local when key is set but URL is empty", () => {
    process.env[URL_KEY] = "";
    process.env[ANON_KEY] = "abc123";
    assert.equal(getRuntimeMode(), "local");
  });

  it("getRuntimeMode returns supabase when both env vars are set", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[ANON_KEY] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    assert.equal(getRuntimeMode(), "supabase");
  });

  it("getRuntimeMode returns local when env vars contain only whitespace", () => {
    process.env[URL_KEY] = "  ";
    process.env[ANON_KEY] = "   ";
    assert.equal(getRuntimeMode(), "local");
  });

  it("getRuntimeModeLabel returns Local for local mode", () => {
    assert.equal(getRuntimeModeLabel("local"), "Local");
  });

  it("getRuntimeModeLabel returns Supabase for supabase mode", () => {
    assert.equal(getRuntimeModeLabel("supabase"), "Supabase");
  });
});
