import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  nextCheckDate,
  getRecheckState,
  isStale,
  isValidISODate
} from "../public/js/lib/scheduler.js";

test("addDays advances across month and year boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("daysBetween is positive for a later date and negative for an earlier one", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-10"), 9);
  assert.equal(daysBetween("2026-01-10", "2026-01-01"), -9);
});

test("nextCheckDate adds the recheck interval to the last-checked date", () => {
  assert.equal(nextCheckDate("2026-01-01", 180), "2026-06-30");
});

test("getRecheckState is not-started when never checked", () => {
  assert.equal(getRecheckState(null, 180, "2026-07-06"), "not-started");
});

test("getRecheckState is ok well before the recheck date", () => {
  assert.equal(getRecheckState("2026-07-01", 180, "2026-07-06"), "ok");
});

test("getRecheckState is due-soon within 14 days of the recheck date", () => {
  assert.equal(getRecheckState("2026-01-01", 180, "2026-06-25"), "due-soon");
});

test("getRecheckState is overdue once the recheck date has passed", () => {
  assert.equal(getRecheckState("2026-01-01", 180, "2026-07-06"), "overdue");
});

test("getRecheckState treats an unparseable lastChecked as not-started", () => {
  // A corrupt localStorage entry or a hand-crafted import must not crash the
  // recheck math — it degrades to not-started instead of throwing.
  assert.equal(getRecheckState("not-a-date", 180, "2026-07-06"), "not-started");
  assert.equal(getRecheckState("", 180, "2026-07-06"), "not-started");
});

test("getRecheckState rejects a calendar-invalid date instead of rolling it forward", () => {
  // 2026-02-30 does not exist; Date would silently roll it to March, so we
  // treat it as unusable rather than compute a misleading recheck state.
  assert.equal(getRecheckState("2026-02-30", 180, "2026-07-06"), "not-started");
});

test("isStale is false exactly at the threshold", () => {
  assert.equal(isStale("2026-04-07", "2026-07-06", 90), false);
});

test("isStale is true once a dataset is older than the threshold", () => {
  assert.equal(isStale("2026-01-01", "2026-07-06", 90), true);
});

test("isStale defaults to a 90-day threshold", () => {
  assert.equal(isStale("2026-01-01", "2026-07-06"), true);
  assert.equal(isStale("2026-06-01", "2026-07-06"), false);
});

test("isValidISODate accepts a well-formed calendar date", () => {
  assert.equal(isValidISODate("2026-07-06"), true);
  assert.equal(isValidISODate("2000-01-01"), true);
});

test("isValidISODate rejects wrong shapes, non-strings, and impossible dates", () => {
  assert.equal(isValidISODate("not-a-date"), false);
  assert.equal(isValidISODate("2026-7-6"), false); // unpadded
  assert.equal(isValidISODate("2026/07/06"), false); // wrong separator
  assert.equal(isValidISODate("2026-02-30"), false); // rolls forward
  assert.equal(isValidISODate("2026-13-01"), false); // no 13th month
  assert.equal(isValidISODate(""), false);
  assert.equal(isValidISODate(null), false);
  assert.equal(isValidISODate(20260706), false);
});
