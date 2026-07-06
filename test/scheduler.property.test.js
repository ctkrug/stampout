import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  getRecheckState,
  toISODate,
  isValidISODate
} from "../public/js/lib/scheduler.js";

// Property-based checks over many generated inputs, without pulling in a
// dependency: a small seeded LCG keeps the cases deterministic (reproducible
// CI) while still covering a wide spread the example tests would miss.
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2000, 0, 1);

// A random valid ISO date within ~100 years of 2000-01-01.
function randomISODate(rng) {
  const dayOffset = Math.floor(rng() * 36525);
  return toISODate(new Date(EPOCH + dayOffset * MS_PER_DAY));
}

test("property: daysBetween inverts addDays for any date and offset", () => {
  const rng = makeRng(0xc0ffee);
  for (let i = 0; i < 2000; i += 1) {
    const iso = randomISODate(rng);
    const n = Math.floor(rng() * 4000) - 2000; // -2000..1999
    assert.equal(daysBetween(iso, addDays(iso, n)), n, `iso=${iso} n=${n}`);
  }
});

test("property: addDays composes additively", () => {
  const rng = makeRng(0x1234);
  for (let i = 0; i < 2000; i += 1) {
    const iso = randomISODate(rng);
    const a = Math.floor(rng() * 1000) - 500;
    const b = Math.floor(rng() * 1000) - 500;
    assert.equal(addDays(addDays(iso, a), b), addDays(iso, a + b), `iso=${iso} a=${a} b=${b}`);
  }
});

test("property: every date addDays produces is itself a valid ISO date", () => {
  const rng = makeRng(0x777);
  for (let i = 0; i < 2000; i += 1) {
    const iso = randomISODate(rng);
    const n = Math.floor(rng() * 8000) - 4000;
    assert.ok(isValidISODate(addDays(iso, n)));
  }
});

test("property: recheck urgency never decreases as today advances", () => {
  const rng = makeRng(0xbeef);
  const rank = { "not-started": 3, ok: 2, "due-soon": 1, overdue: 0 };
  for (let i = 0; i < 1000; i += 1) {
    const lastChecked = randomISODate(rng);
    const recheckDays = 30 + Math.floor(rng() * 700);
    const start = randomISODate(rng);
    const later = addDays(start, 1 + Math.floor(rng() * 400));
    const before = rank[getRecheckState(lastChecked, recheckDays, start)];
    const after = rank[getRecheckState(lastChecked, recheckDays, later)];
    // A later "today" can only make a broker more urgent (lower rank), never less.
    assert.ok(after <= before, `lastChecked=${lastChecked} days=${recheckDays} ${start}->${later}`);
  }
});
