import assert from "node:assert/strict";
import { test } from "node:test";

import { checkAiConfig } from "./env.js";

const vertex = {
  AI_PROVIDER: "gemini" as const,
  GEMINI_USE_VERTEX: true,
  GOOGLE_CLOUD_PROJECT: "sffl-poc",
  GEMINI_API_KEY: undefined,
  GOOGLE_APPLICATION_CREDENTIALS: undefined
};

test("the mock provider needs no AI configuration", () => {
  assert.equal(checkAiConfig({ ...vertex, AI_PROVIDER: "mock", GOOGLE_CLOUD_PROJECT: undefined }), null);
});

test("Vertex needs a project and an existing key file when one is configured", () => {
  assert.equal(checkAiConfig(vertex), null);
  assert.match(checkAiConfig({ ...vertex, GOOGLE_CLOUD_PROJECT: undefined }) ?? "", /GOOGLE_CLOUD_PROJECT/);
  assert.match(
    checkAiConfig({ ...vertex, GOOGLE_APPLICATION_CREDENTIALS: "/run/secrets/sffl/x.json" }, () => false) ?? "",
    /file not found/
  );
  assert.equal(checkAiConfig({ ...vertex, GOOGLE_APPLICATION_CREDENTIALS: "/run/secrets/sffl/x.json" }, () => true), null);
});

test("the Gemini API needs a key", () => {
  assert.match(checkAiConfig({ ...vertex, GEMINI_USE_VERTEX: false }) ?? "", /GEMINI_API_KEY/);
});
