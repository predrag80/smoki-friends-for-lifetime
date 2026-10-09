import assert from "node:assert/strict";
import { test } from "node:test";

import { checkMomentChoice } from "./rules.js";

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
