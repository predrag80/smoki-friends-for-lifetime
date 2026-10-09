import assert from "node:assert/strict";
import { test } from "node:test";

import { isAgeInPeriod, isSceneAvailableAtAge } from "@sffl/shared";

import { parsePhotoName, planCases } from "./plan.js";

test("plan covers all three periods with valid ages and scenes", () => {
  for (const age of [20, 35, 48, 60]) {
    const cases = planCases(age, age);
    assert.ok(cases.length >= 6, `age ${age}: ${cases.length} cases`);
    for (const period of ["YESTERDAY", "TODAY", "SOMEDAY"] as const) {
      assert.ok(cases.some((item) => item.period === period), `age ${age} misses ${period}`);
    }
    for (const item of cases) {
      assert.ok(isAgeInPeriod(item.period, age, item.targetAge), `${item.period} ${item.targetAge}`);
      assert.ok(isSceneAvailableAtAge(item.scene, item.targetAge), `${item.scene.id} at ${item.targetAge}`);
    }
    const keys = cases.map((item) => `${item.period}-${item.targetAge}-${item.scene.id}`);
    assert.equal(new Set(keys).size, keys.length, "no duplicates");
  }
});

test("the childhood birthday is always part of the plan", () => {
  const cases = planCases(40);
  assert.ok(cases.some((item) => item.period === "YESTERDAY" && item.targetAge === 8 && item.scene.id === "house-birthday"));
});

test("photo names carry the birth year and optional month", () => {
  assert.deepEqual(parsePhotoName("marko__1985.jpg"), { name: "marko", birthYear: 1985, birthMonth: 6 });
  assert.deepEqual(parsePhotoName("ana_m__1990-11.PNG"), { name: "ana_m", birthYear: 1990, birthMonth: 11 });
  assert.equal(parsePhotoName("marko.jpg"), null);
  assert.equal(parsePhotoName("marko__1985-13.jpg"), null);
});
