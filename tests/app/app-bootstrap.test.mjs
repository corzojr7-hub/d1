import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { runBootstrap } from "../../src/lib/app/app-bootstrap.ts";
import { isSubmitFlowConfigured, resetSubmitFlow } from "../../src/lib/app/operation-submit-flow.ts";
import {
  isProfileResolverConfigured,
  resetProfileResolver,
  getCurrentProfileId,
} from "../../src/lib/app/current-profile.ts";

const EXPECTED_DEV_ID = "00000000-0000-0000-0000-000000000001";

describe("app-bootstrap", () => {
  beforeEach(() => {
    resetProfileResolver();
    resetSubmitFlow();
  });

  it("runBootstrap returns mode local when env vars are absent", async () => {
    const info = await runBootstrap();
    assert.equal(info.mode, "local");
  });

  it("runBootstrap configures profile resolver in local mode", async () => {
    await runBootstrap();
    assert.equal(isProfileResolverConfigured(), true);
    assert.equal(getCurrentProfileId(), EXPECTED_DEV_ID);
  });

  it("runBootstrap configures submit flow in local mode", async () => {
    await runBootstrap();
    assert.equal(isSubmitFlowConfigured(), true);
  });
});
