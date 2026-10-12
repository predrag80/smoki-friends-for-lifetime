import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAgedPortraitPrompt, buildPhotoPrompt, momentYear } from "./prompt.js";

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

test("an aged portrait reference shifts the product to the third image", () => {
  const prompt = buildPhotoPrompt({ ...base, targetAge: 8, currentAge: 46, agedPortraitReference: true, productReference: true });
  assert.match(prompt, /second reference image shows this same person at age 8/);
  assert.match(prompt, /third reference image shows a snack package/);
});

test("identity traits and close framing are added on request", () => {
  const prompt = buildPhotoPrompt({ ...base, targetAge: 8, currentAge: 46, identityTraits: "oval face; brown eyes", closeFraming: true });
  assert.match(prompt, /Stable facial traits of this person, to keep at any age: oval face; brown eyes\./);
  assert.match(prompt, /Medium close-up/);
  assert.doesNotMatch(buildPhotoPrompt({ ...base, targetAge: 8, currentAge: 46 }), /Medium close-up|Stable facial traits/);
});

test("the aged portrait prompt is a neutral face study in the right year", () => {
  const prompt = buildAgedPortraitPrompt({ targetAge: 8, currentAge: 46, identityTraits: "oval face", now });
  assert.match(prompt, /head-and-shoulders portrait/);
  assert.match(prompt, /a child of 8, not an adult/);
  assert.match(prompt, /typical for 1988/);
  assert.match(prompt, /plain light grey background/);
});

test("with the portrait as primary reference the photo of today becomes the second image", () => {
  const prompt = buildPhotoPrompt({
    ...base, targetAge: 8, currentAge: 46, agedPortraitReference: true, portraitPrimary: true, calmExpression: true, productReference: true
  });
  assert.match(prompt, /person in the first reference image, who is 8 years old there/);
  assert.match(prompt, /must be identical to that portrait/);
  assert.match(prompt, /second reference image shows the same person today, aged 46/);
  assert.match(prompt, /third reference image shows a snack package/);
  assert.match(prompt, /gentle, natural smile/);
  assert.doesNotMatch(prompt, /reference image shows this same person at age 8/);
});
