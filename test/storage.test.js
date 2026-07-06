import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  loadStatuses,
  saveStatuses,
  getBrokerStatus,
  setBrokerStatus
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

test("getBrokerStatus defaults to not-started for an unknown broker", () => {
  assert.deepEqual(getBrokerStatus({}, "spokeo"), {
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
