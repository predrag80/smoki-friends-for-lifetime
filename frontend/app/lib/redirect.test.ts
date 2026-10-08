import assert from "node:assert/strict";
import { test } from "node:test";

import { safeRedirect } from "./redirect";

test("keeps same-site paths", () => {
  assert.equal(safeRedirect("/account"), "/account");
});

test("rejects external and protocol-relative URLs", () => {
  assert.equal(safeRedirect("https://evil.example"), "/account");
  assert.equal(safeRedirect("//evil.example"), "/account");
  assert.equal(safeRedirect(undefined), "/account");
});
