import assert from "node:assert/strict";
import { test } from "node:test";

import { checkMomentChoice, chooseMomentAge } from "./rules.js";

const schoolCrew = { minAge: 10, maxAge: 19, isActive: true };

test("a valid YESTERDAY choice passes", () => {
  assert.equal(checkMomentChoice({ period: "YESTERDAY", targetAge: 15, currentAge: 36, scene: schoolCrew }), null);
});

test("ages outside the period range are rejected", () => {
  assert.equal(
    checkMomentChoice({ period: "YESTERDAY", targetAge: 33, currentAge: 36, scene: schoolCrew }),
    "AGE_OUT_OF_PERIOD_RANGE"
  );
  assert.equal(
    checkMomentChoice({ period: "TODAY", targetAge: 30, currentAge: 36, scene: schoolCrew }),
    "AGE_OUT_OF_PERIOD_RANGE"
  );
});

test("a scene not meant for the chosen age is rejected", () => {
  assert.equal(
    checkMomentChoice({ period: "SOMEDAY", targetAge: 65, currentAge: 36, scene: schoolCrew }),
    "SCENE_NOT_AVAILABLE"
  );
  assert.equal(
    checkMomentChoice({ period: "YESTERDAY", targetAge: 15, currentAge: 36, scene: { ...schoolCrew, isActive: false } }),
    "SCENE_NOT_AVAILABLE"
  );
  assert.equal(checkMomentChoice({ period: "YESTERDAY", targetAge: 15, currentAge: 36, scene: null }), "SCENE_NOT_AVAILABLE");
});

test("a period that cannot show a visible difference is unavailable", () => {
  assert.equal(
    checkMomentChoice({ period: "YESTERDAY", targetAge: 6, currentAge: 10, scene: schoolCrew }),
    "PERIOD_NOT_AVAILABLE"
  );
});

test("the app picks the age inside the period and the scene", () => {
  assert.deepEqual(chooseMomentAge({ period: "YESTERDAY", currentAge: 46, scene: schoolCrew, random: () => 0 }), { age: 10 });
  assert.deepEqual(chooseMomentAge({ period: "YESTERDAY", currentAge: 46, scene: schoolCrew, random: () => 0.999 }), { age: 19 });
  assert.deepEqual(chooseMomentAge({ period: "TODAY", currentAge: 16, scene: schoolCrew }), { age: 16 });
});

test("regenerating keeps the age when it still fits", () => {
  assert.deepEqual(chooseMomentAge({ period: "YESTERDAY", currentAge: 46, scene: schoolCrew, keepAge: 15 }), { age: 15 });
  const adultScene = { minAge: 18, maxAge: 90, isActive: true };
  assert.deepEqual(chooseMomentAge({ period: "YESTERDAY", currentAge: 46, scene: adultScene, keepAge: 15, random: () => 0 }), {
    age: 18
  });
});

test("scenes that do not fit the period, and unavailable periods, are refused", () => {
  assert.deepEqual(chooseMomentAge({ period: "SOMEDAY", currentAge: 46, scene: schoolCrew }), { error: "SCENE_NOT_AVAILABLE" });
  assert.deepEqual(chooseMomentAge({ period: "YESTERDAY", currentAge: 10, scene: schoolCrew }), { error: "PERIOD_NOT_AVAILABLE" });
  assert.deepEqual(chooseMomentAge({ period: "TODAY", currentAge: 30, scene: null }), { error: "SCENE_NOT_AVAILABLE" });
});
