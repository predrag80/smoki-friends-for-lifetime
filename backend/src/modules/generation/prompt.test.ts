import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPhotoPrompt, momentYear } from "./prompt.js";

const now = new Date("2026-10-09T12:00:00Z");
const base = { scenePrompt: "a bench in a park", territory: "SOCIALIZING" as const, period: "YESTERDAY" as const, now };

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
  assert.match(prompt, /No logos or brand names/);
  assert.match(prompt, /birthday banner\) is allowed/);
});

test("companions match the target age and teenagers must not look adult", () => {
  const prompt = buildPhotoPrompt({ ...base, targetAge: 15, currentAge: 46 });
  assert.match(prompt, /about the same age as the person \(around 15/);
  assert.match(prompt, /a teenager of 15, not an adult/);
  assert.match(prompt, /do not copy the clothing/);
  assert.match(prompt, /in the centre of the frame/);
});

test("past moments are set in their calendar year with a period photo look", () => {
  assert.equal(momentYear(8, 46, now), 1988);
  const prompt = buildPhotoPrompt({ ...base, targetAge: 8, currentAge: 46 });
  assert.match(prompt, /around 1988/);
  assert.match(prompt, /colour film photograph/);
  assert.match(buildPhotoPrompt({ ...base, targetAge: 22, currentAge: 30 }), /early digital camera/);
  assert.match(buildPhotoPrompt({ ...base, period: "SOMEDAY", targetAge: 60, currentAge: 30 }), /around 2056.*not science fiction/);
});

test("the product appears only with a packshot reference", () => {
  const without = buildPhotoPrompt({ ...base, targetAge: 30, currentAge: 30, productPlacement: "on the bench" });
  assert.doesNotMatch(without, /snack package|Smoki/);
  const withRef = buildPhotoPrompt({ ...base, targetAge: 30, currentAge: 30, productReference: true, productPlacement: "on the bench" });
  assert.match(withRef, /second reference image shows a snack package/);
  assert.match(withRef, /place it on the bench/);
  assert.match(withRef, /never held up or presented to the camera/);
});
