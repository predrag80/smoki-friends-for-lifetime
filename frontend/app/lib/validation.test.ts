import assert from "node:assert/strict";
import { test } from "node:test";

import { hasErrors, validateEmailField, validateNewPassword, validatePasswordConfirm } from "./validation";

test("email field", () => {
  assert.equal(validateEmailField(""), "emailRequired");
  assert.equal(validateEmailField("ana@"), "invalidEmail");
  assert.equal(validateEmailField(" ana@example.com "), undefined);
});

test("new password field explains what is missing", () => {
  assert.equal(validateNewPassword(""), "passwordRequired");
  assert.equal(validateNewPassword("abc1"), "passwordShort");
  assert.equal(validateNewPassword("abcdefgh"), "passwordLetterNumber");
  assert.equal(validateNewPassword("ana12345@x.rs", "ana12345@x.rs"), "passwordSameAsEmail");
  assert.equal(validateNewPassword("smoki2027", "ana@x.rs"), undefined);
});

test("password confirmation must match", () => {
  assert.equal(validatePasswordConfirm("smoki2027", "smoki2028"), "passwordMismatch");
  assert.equal(validatePasswordConfirm("smoki2027", "smoki2027"), undefined);
});

test("hasErrors ignores empty entries", () => {
  assert.equal(hasErrors({ email: undefined }), false);
  assert.equal(hasErrors({ email: "invalidEmail" }), true);
});
