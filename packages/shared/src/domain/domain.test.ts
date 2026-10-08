import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getPeriodAgeRange,
  isAgeInPeriod,
  MAX_SCENE_AGE,
  MIN_SCENE_AGE
} from "./life-periods.js";
import { filterScenesByAge, sceneCatalog, territories } from "./scenes.js";

test("period age ranges follow the agreed rules", () => {
  assert.deepEqual(getPeriodAgeRange("YESTERDAY", 36), { min: MIN_SCENE_AGE, max: 31 });
  assert.deepEqual(getPeriodAgeRange("TODAY", 36), { min: 36, max: 36 });
  assert.deepEqual(getPeriodAgeRange("SOMEDAY", 36), { min: 46, max: MAX_SCENE_AGE });
});

test("periods that cannot show a visible difference are unavailable", () => {
  assert.equal(getPeriodAgeRange("YESTERDAY", 10), null);
  assert.equal(getPeriodAgeRange("SOMEDAY", 80), null);
});

test("target age must be an integer inside the period range", () => {
  assert.equal(isAgeInPeriod("YESTERDAY", 36, 12), true);
  assert.equal(isAgeInPeriod("YESTERDAY", 36, 33), false);
  assert.equal(isAgeInPeriod("TODAY", 36, 37), false);
  assert.equal(isAgeInPeriod("SOMEDAY", 36, 70.5), false);
});

test("catalog has 15 scenes, five per territory, with unique ids", () => {
  assert.equal(sceneCatalog.length, 15);
  assert.equal(new Set(sceneCatalog.map((scene) => scene.id)).size, 15);
  for (const territory of territories) {
    assert.equal(sceneCatalog.filter((scene) => scene.territory === territory).length, 5, territory);
  }
});

test("school crew is not offered at 65 and evening for two is not offered to children", () => {
  const atSixtyFive = filterScenesByAge(sceneCatalog, 65).map((scene) => scene.id);
  const atTen = filterScenesByAge(sceneCatalog, 10).map((scene) => scene.id);

  assert.ok(!atSixtyFive.includes("crew-in-front-of-school"));
  assert.ok(!atTen.includes("evening-for-two"));
  assert.ok(!atTen.includes("match-in-cafe"));
  assert.ok(atTen.includes("crew-in-front-of-school"));
});

test("every age a period can offer has at least one scene in every territory", () => {
  for (let age = MIN_SCENE_AGE; age <= MAX_SCENE_AGE; age += 1) {
    const available = filterScenesByAge(sceneCatalog, age);
    for (const territory of territories) {
      assert.ok(
        available.some((scene) => scene.territory === territory),
        `no ${territory} scene at age ${age}`
      );
    }
  }
});
