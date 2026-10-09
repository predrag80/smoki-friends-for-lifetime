import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPhotoPrompt } from "./prompt.js";

const base = { scenePrompt: "a bench in a park", territory: "SOCIALIZING" as const, period: "YESTERDAY" as const };

test("younger and older targets are described relative to the current age", () => {
  assert.match(buildPhotoPrompt({ ...base, targetAge: 12, currentAge: 36 }), /24 years younger/);
  assert.match(buildPhotoPrompt({ ...base, period: "SOMEDAY", targetAge: 70, currentAge: 36 }), /34 years older/);
  assert.match(buildPhotoPrompt({ ...base, period: "TODAY", targetAge: 36, currentAge: 36 }), /current age of 36/);
});

test("the prompt keeps identity, the scene and the safety rules", () => {
  const prompt = buildPhotoPrompt({ ...base, targetAge: 12, currentAge: 36 });
  assert.match(prompt, /Preserve their identity/);
  assert.match(prompt, /a bench in a park/);
  assert.match(prompt, /must not resemble real or famous people/);
  assert.match(prompt, /No text/);
});

test("companions match the target age and teenagers must not look adult", () => {
  const prompt = buildPhotoPrompt({ ...base, targetAge: 15, currentAge: 46 });
  assert.match(prompt, /about the same age as the person \(around 15/);
  assert.match(prompt, /a teenager of 15, not an adult/);
  assert.match(prompt, /do not copy the clothing/);
  assert.match(prompt, /never held up or presented to the camera/);
});

test("the product reference image is mentioned only when it is sent", () => {
  assert.match(buildPhotoPrompt({ ...base, targetAge: 30, currentAge: 30, productReference: true }), /second reference image shows the real Smoki package/);
  assert.doesNotMatch(buildPhotoPrompt({ ...base, targetAge: 30, currentAge: 30 }), /second reference image/);
});
