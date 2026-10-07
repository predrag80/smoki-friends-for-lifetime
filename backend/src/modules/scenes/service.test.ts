import assert from "node:assert/strict";
import { test } from "node:test";

import { pickTranslation, toSceneDtos, type SceneRow } from "./service.js";

const rows: SceneRow[] = [
  {
    id: "match-in-cafe",
    territory: "SPORT_CHEERING",
    sortOrder: 2,
    minAge: 18,
    maxAge: 90,
    translations: [{ locale: "sr", title: "Utakmica u kafiću", description: "sr" }]
  },
  {
    id: "movie-night-couch",
    territory: "RELAXING",
    sortOrder: 1,
    minAge: 6,
    maxAge: 90,
    translations: [
      { locale: "sr", title: "Filmsko veče na kauču", description: "sr" },
      { locale: "de", title: "Filmabend auf der Couch", description: "de" }
    ]
  }
];

test("uses the requested locale when available", () => {
  assert.equal(pickTranslation(rows[1]!.translations, "de")?.title, "Filmabend auf der Couch");
});

test("falls back to Serbian when a translation is missing", () => {
  assert.equal(pickTranslation(rows[0]!.translations, "mk")?.title, "Utakmica u kafiću");
});

test("orders scenes by territory, then sort order", () => {
  assert.deepEqual(
    toSceneDtos(rows, "sr").map((scene) => scene.id),
    ["movie-night-couch", "match-in-cafe"]
  );
});
