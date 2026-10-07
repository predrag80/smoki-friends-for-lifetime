import assert from "node:assert/strict";
import { test } from "node:test";

import { appLocales } from "./locale";
import { getMessages } from "./messages";

test("every locale defines the same message keys", () => {
  const referenceKeys = Object.keys(getMessages("sr")).sort();

  for (const locale of appLocales) {
    assert.deepEqual(Object.keys(getMessages(locale)).sort(), referenceKeys, locale);
  }
});
