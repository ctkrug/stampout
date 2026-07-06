// Standalone integration smoke test for app.js — the wiring layer that loads
// the datasets, renders every section, and drives the mark/persist/re-render
// loop. Booting app.js under node:test + linkedom trips a runner/GC
// interaction, so this runs in a plain node process and is spawned by
// test/app.integration.test.js, which asserts on the exit code.
//
// Exits 0 and prints "SMOKE_OK" on success; exits 1 with a message on failure.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";

function fail(message, error) {
  console.error(`SMOKE_FAIL: ${message}${error ? ` — ${error.message}` : ""}`);
  process.exit(1);
}

process.on("unhandledRejection", (error) => fail("unhandled rejection", error));

const dataFile = (name) =>
  readFileSync(fileURLToPath(new URL(`../public/data/${name}`, import.meta.url)), "utf8");

const { document, window } = parseHTML(`<!doctype html><html><body>
  <header><button id="mute-toggle" type="button" aria-pressed="false">Sound: On</button></header>
  <main id="app"><p class="loading">Loading…</p></main>
  <div id="live-status" role="status" aria-live="polite"></div>
  <footer></footer>
</body></html>`);

const storage = new Map();
globalThis.window = window;
globalThis.document = document;
window.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
window.AudioContext = undefined; // sound engine must no-op without one
window.webkitAudioContext = undefined;
globalThis.fetch = async (path) => ({
  ok: true,
  json: async () => JSON.parse(dataFile(path.replace(/^data\//, "")))
});

await import("../public/js/app.js");
// Let main()'s async load settle.
await new Promise((resolve) => setTimeout(resolve, 150));

try {
  // 1. Full checklist rendered.
  const cards = document.querySelectorAll("#broker-grid .broker-card");
  assert.equal(cards.length, 40, "expected 40 broker cards");
  assert.ok(document.querySelector("#summary .summary-count"), "summary missing");
  assert.ok(document.querySelector("#category-tabs .category-tab"), "category tabs missing");
  assert.ok(document.querySelector("#state-laws select"), "state-law picker missing");
  // Onboarding shows on a first visit (no statuses yet).
  assert.ok(document.getElementById("onboarding"), "onboarding should show on first visit");

  // 2. Mark the first broker confirmed and verify the whole loop.
  const card = document.querySelector("#broker-grid .broker-card");
  const brokerId = card.dataset.brokerId;
  const confirmBtn = [...card.querySelectorAll(".broker-actions button")].find(
    (b) => b.textContent === "Mark confirmed"
  );
  assert.ok(confirmBtn, "confirm button missing");
  confirmBtn.dispatchEvent(new window.Event("click"));

  const stored = JSON.parse(window.localStorage.getItem("optoutly:v1:status"));
  assert.equal(stored[brokerId].status, "confirmed", "status not persisted");
  assert.match(stored[brokerId].lastChecked, /^\d{4}-\d{2}-\d{2}$/, "lastChecked not an ISO date");

  const updated = document.querySelector(`#broker-grid [data-broker-id="${brokerId}"]`);
  assert.ok(updated.classList.contains("status-confirmed"), "card missing confirmed class");
  assert.ok(updated.querySelector(".stamp-mark"), "card missing stamp");
  assert.equal(
    document.querySelector("#summary .summary-count").textContent,
    "1",
    "confirmed count did not update"
  );
  assert.match(
    document.getElementById("live-status").textContent,
    /confirmed/i,
    "status change not announced"
  );

  console.log("SMOKE_OK");
  process.exit(0);
} catch (error) {
  fail("assertion failed", error);
}
