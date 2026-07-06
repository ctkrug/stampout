import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isValidISODate } from "../public/js/lib/scheduler.js";

// The shipped JSON is the app's real input. render.js and brokers.js assume a
// precise shape; a hand-edit that violates it would crash the live page with no
// unit test catching it. These guard that contract against the actual files.

function loadJSON(relPath) {
  const url = new URL(relPath, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

const brokerData = loadJSON("../public/data/brokers.json");
const stateLawData = loadJSON("../public/data/state-laws.json");

// Categories the UI knows how to label (see render.js CATEGORY_LABELS).
const KNOWN_CATEGORIES = new Set([
  "people-search",
  "background-check",
  "marketing",
  "credit-marketing"
]);

test("brokers.json has a valid ISO updated date", () => {
  assert.ok(isValidISODate(brokerData.updated), `updated: ${brokerData.updated}`);
});

test("every broker entry satisfies the shape the UI renders", () => {
  assert.ok(Array.isArray(brokerData.brokers) && brokerData.brokers.length > 0);
  for (const broker of brokerData.brokers) {
    const where = broker.id || JSON.stringify(broker);
    assert.equal(typeof broker.id, "string", `id on ${where}`);
    assert.ok(broker.id.length > 0, `empty id on ${where}`);
    assert.equal(typeof broker.name, "string", `name on ${where}`);
    assert.ok(broker.name.length > 0, `empty name on ${where}`);
    assert.ok(KNOWN_CATEGORIES.has(broker.category), `unknown category on ${where}: ${broker.category}`);
    assert.ok(/^https:\/\//.test(broker.optOutUrl), `non-https optOutUrl on ${where}`);
    assert.ok(Number.isInteger(broker.recheckDays) && broker.recheckDays > 0, `recheckDays on ${where}`);
    assert.equal(typeof broker.notes, "string", `notes on ${where}`);
  }
});

test("broker ids are unique", () => {
  const ids = brokerData.brokers.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("state-laws.json has a valid ISO updated date", () => {
  assert.ok(isValidISODate(stateLawData.updated), `updated: ${stateLawData.updated}`);
});

test("every state-law entry satisfies the shape the UI renders", () => {
  assert.ok(Array.isArray(stateLawData.states) && stateLawData.states.length > 0);
  for (const law of stateLawData.states) {
    const where = law.code || JSON.stringify(law);
    assert.match(law.code, /^[A-Z]{2}$/, `code on ${where}`);
    assert.equal(typeof law.law, "string", `law on ${where}`);
    assert.equal(typeof law.effective, "string", `effective on ${where}`);
    assert.ok(Array.isArray(law.rights) && law.rights.length > 0, `rights on ${where}`);
    assert.ok(law.rights.every((r) => typeof r === "string"), `non-string right on ${where}`);
    assert.equal(typeof law.notes, "string", `notes on ${where}`);
    assert.ok(/^https:\/\//.test(law.authorityUrl), `non-https authorityUrl on ${where}`);
  }
});

test("state-law codes are unique", () => {
  const codes = stateLawData.states.map((s) => s.code);
  assert.equal(new Set(codes).size, codes.length);
});
