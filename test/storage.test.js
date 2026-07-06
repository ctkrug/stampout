import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  loadStatuses,
  saveStatuses,
  getBrokerStatus,
  setBrokerStatus,
  serializeStatuses,
  parseImportedStatuses,
  isOnboardingDismissed,
  dismissOnboarding,
  shouldShowOnboarding
} from "../public/js/lib/storage.js";

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value)
  };
}

test("loadStatuses returns an empty object when nothing is stored", () => {
  assert.deepEqual(loadStatuses(fakeStore()), {});
});

test("loadStatuses recovers from corrupted JSON instead of throwing", () => {
  const store = fakeStore({ [STORAGE_KEY]: "{not json" });
  assert.deepEqual(loadStatuses(store), {});
});

test("loadStatuses ignores a non-object payload (array, string, null)", () => {
  assert.deepEqual(loadStatuses(fakeStore({ [STORAGE_KEY]: "[1,2,3]" })), {});
  assert.deepEqual(loadStatuses(fakeStore({ [STORAGE_KEY]: '"hi"' })), {});
  assert.deepEqual(loadStatuses(fakeStore({ [STORAGE_KEY]: "null" })), {});
});

test("getBrokerStatus defaults to not-started for an unknown broker", () => {
  assert.deepEqual(getBrokerStatus({}, "spokeo"), {
    status: "not-started",
    lastChecked: null
  });
});

test("getBrokerStatus falls back to default for a corrupt non-object entry", () => {
  // A hand-edited localStorage value could store a scalar where an object is
  // expected; the reader must degrade to not-started, not surface undefined.
  assert.deepEqual(getBrokerStatus({ spokeo: "confirmed" }, "spokeo"), {
    status: "not-started",
    lastChecked: null
  });
  assert.deepEqual(getBrokerStatus({ spokeo: { lastChecked: "2026-01-01" } }, "spokeo"), {
    status: "not-started",
    lastChecked: null
  });
});

test("setBrokerStatus persists and returns the updated map", () => {
  const store = fakeStore();
  const next = setBrokerStatus(store, {}, "spokeo", "confirmed", "2026-07-01");
  assert.deepEqual(next.spokeo, { status: "confirmed", lastChecked: "2026-07-01" });
  assert.deepEqual(loadStatuses(store), next);
});

test("setBrokerStatus does not mutate the map it was given", () => {
  const store = fakeStore();
  const original = { spokeo: { status: "not-started", lastChecked: null } };
  setBrokerStatus(store, original, "whitepages", "requested", null);
  assert.deepEqual(original, { spokeo: { status: "not-started", lastChecked: null } });
});

test("saveStatuses round-trips through JSON", () => {
  const store = fakeStore();
  const statuses = { spokeo: { status: "confirmed", lastChecked: "2026-01-01" } };
  saveStatuses(store, statuses);
  assert.deepEqual(loadStatuses(store), statuses);
});

test("serializeStatuses/parseImportedStatuses round-trip a status map", () => {
  const statuses = {
    spokeo: { status: "confirmed", lastChecked: "2026-01-01" },
    whitepages: { status: "requested", lastChecked: null }
  };
  const result = parseImportedStatuses(serializeStatuses(statuses));
  assert.deepEqual(result, { ok: true, statuses });
});

test("parseImportedStatuses rejects malformed JSON without throwing", () => {
  const result = parseImportedStatuses("{not json");
  assert.equal(result.ok, false);
  assert.match(result.error, /valid JSON/);
});

test("parseImportedStatuses rejects a JSON array at the top level", () => {
  const result = parseImportedStatuses("[1, 2, 3]");
  assert.equal(result.ok, false);
  assert.match(result.error, /JSON object/);
});

test("parseImportedStatuses rejects an unknown status value", () => {
  const result = parseImportedStatuses(JSON.stringify({ spokeo: { status: "bogus", lastChecked: null } }));
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid/);
});

test("parseImportedStatuses rejects a non-string, non-null lastChecked", () => {
  const result = parseImportedStatuses(
    JSON.stringify({ spokeo: { status: "confirmed", lastChecked: 12345 } })
  );
  assert.equal(result.ok, false);
});

test("parseImportedStatuses accepts an empty status map", () => {
  assert.deepEqual(parseImportedStatuses("{}"), { ok: true, statuses: {} });
});

test("parseImportedStatuses rejects a lastChecked string that isn't a real date", () => {
  const result = parseImportedStatuses(
    JSON.stringify({ spokeo: { status: "confirmed", lastChecked: "not-a-date" } })
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid/);
});

test("parseImportedStatuses rejects a calendar-impossible lastChecked date", () => {
  const result = parseImportedStatuses(
    JSON.stringify({ spokeo: { status: "confirmed", lastChecked: "2026-02-30" } })
  );
  assert.equal(result.ok, false);
});

test("parseImportedStatuses accepts a valid ISO lastChecked date", () => {
  const result = parseImportedStatuses(
    JSON.stringify({ spokeo: { status: "confirmed", lastChecked: "2026-01-15" } })
  );
  assert.equal(result.ok, true);
});

test("isOnboardingDismissed is false with no stored preference", () => {
  assert.equal(isOnboardingDismissed(fakeStore()), false);
});

test("dismissOnboarding persists the dismissal", () => {
  const store = fakeStore();
  dismissOnboarding(store);
  assert.equal(store.getItem(ONBOARDING_STORAGE_KEY), "true");
  assert.equal(isOnboardingDismissed(store), true);
});

test("shouldShowOnboarding is true with no statuses and no dismissal", () => {
  assert.equal(shouldShowOnboarding({}, false), true);
});

test("shouldShowOnboarding is false once any broker has a status", () => {
  assert.equal(shouldShowOnboarding({ spokeo: { status: "requested", lastChecked: null } }, false), false);
});

test("shouldShowOnboarding is false once dismissed, even with no statuses", () => {
  assert.equal(shouldShowOnboarding({}, true), false);
});
