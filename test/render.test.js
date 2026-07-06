import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";

// render.js builds DOM against the global `document`, so stand up a linkedom
// document before importing it. This exercises the real DOM layer end to end
// (structure, escaping, link hardening, and interaction callbacks) without a
// browser.
const { document, window } = parseHTML("<!doctype html><html><body></body></html>");
globalThis.document = document;
globalThis.window = window;

const {
  renderOnboarding,
  renderFreshnessNotice,
  renderSummary,
  renderCategoryTabs,
  renderBrokerCards,
  renderStateLaws
} = await import("../public/js/render.js");

function el() {
  return document.createElement("div");
}

const VIEW = {
  id: "spokeo",
  name: "Spokeo",
  category: "people-search",
  optOutUrl: "https://www.spokeo.com/optout",
  notes: "Some notes.",
  status: "not-started",
  recheckState: "not-started"
};

test("renderSummary shows every count", () => {
  const container = el();
  renderSummary(container, { total: 5, confirmed: 2, requested: 1, notStarted: 2, overdue: 1 });
  const counts = [...container.querySelectorAll(".summary-count")].map((n) => n.textContent);
  assert.deepEqual(counts, ["2", "1", "2", "1"]);
});

test("renderCategoryTabs marks the active tab and fires onSelect", () => {
  const container = el();
  let picked = null;
  renderCategoryTabs(container, ["all", "marketing"], "all", (c) => (picked = c));
  const tabs = container.querySelectorAll(".category-tab");
  assert.equal(tabs.length, 2);
  assert.equal(tabs[0].getAttribute("aria-pressed"), "true");
  assert.equal(tabs[1].getAttribute("aria-pressed"), "false");
  tabs[1].dispatchEvent(new window.Event("click"));
  assert.equal(picked, "marketing");
});

test("renderBrokerCards shows the empty message when there are no views", () => {
  const container = el();
  renderBrokerCards(container, [], {}, "Nothing here.");
  assert.equal(container.querySelector(".empty-state").textContent, "Nothing here.");
});

test("renderBrokerCards escapes broker-supplied text instead of injecting HTML", () => {
  const container = el();
  const evil = { ...VIEW, name: "<img src=x onerror=alert(1)>", notes: "<script>bad</script>" };
  renderBrokerCards(container, [evil], {});
  assert.equal(container.querySelector("img"), null);
  assert.equal(container.querySelector("script"), null);
  assert.equal(container.querySelector(".broker-name").textContent, evil.name);
});

test("renderBrokerCards hardens external links and stamps confirmed cards", () => {
  const container = el();
  renderBrokerCards(container, [{ ...VIEW, status: "confirmed", recheckState: "ok" }], {});
  const link = container.querySelector("a");
  assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  assert.equal(link.getAttribute("target"), "_blank");
  const stamp = container.querySelector(".stamp-mark");
  assert.ok(stamp);
  assert.equal(stamp.getAttribute("aria-hidden"), "true");
});

test("renderBrokerCards wires the action buttons to their handlers", () => {
  const container = el();
  const calls = [];
  renderBrokerCards(container, [VIEW], {
    onMarkRequested: (id) => calls.push(["req", id]),
    onMarkConfirmed: (id) => calls.push(["conf", id])
  });
  const [reqBtn, confBtn] = container.querySelectorAll(".broker-actions button");
  reqBtn.dispatchEvent(new window.Event("click"));
  confBtn.dispatchEvent(new window.Event("click"));
  assert.deepEqual(calls, [["req", "spokeo"], ["conf", "spokeo"]]);
});

test("renderBrokerCards shows the human recheck label for each state", () => {
  const cases = [
    ["not-started", "Not started"],
    ["ok", "On track"],
    ["due-soon", "Recheck due soon"],
    ["overdue", "Recheck overdue"]
  ];
  for (const [recheckState, label] of cases) {
    const container = el();
    renderBrokerCards(container, [{ ...VIEW, status: "confirmed", recheckState }], {});
    assert.equal(container.querySelector(".broker-status-line").textContent, label);
  }
});

test("renderCategoryTabs falls back to the raw name for an unknown category", () => {
  const container = el();
  renderCategoryTabs(container, ["all", "surprise-category"], "all", () => {});
  const labels = [...container.querySelectorAll(".category-tab")].map((t) => t.textContent);
  assert.deepEqual(labels, ["All", "surprise-category"]);
});

test("renderFreshnessNotice is empty with fresh data and shown when stale", () => {
  const container = el();
  renderFreshnessNotice(container, []);
  assert.equal(container.textContent, "");
  renderFreshnessNotice(container, ["2020-01-01"]);
  assert.match(container.textContent, /2020-01-01/);
});

test("renderOnboarding dismisses and removes itself", () => {
  const parent = el();
  const container = el();
  parent.appendChild(container);
  let dismissed = false;
  renderOnboarding(container, () => (dismissed = true));
  container.querySelector("button").dispatchEvent(new window.Event("click"));
  assert.equal(dismissed, true);
  assert.equal(parent.querySelector("div"), null);
});

test("renderStateLaws lists every state and resolves a chosen law", () => {
  const container = el();
  const allStates = [{ code: "CA", name: "California" }, { code: "WY", name: "Wyoming" }];
  const enacted = [{
    code: "CA", law: "CCPA", effective: "2020-01-01",
    rights: ["access", "delete"], notes: "Landmark law.", authorityUrl: "https://oag.ca.gov"
  }];
  renderStateLaws(container, allStates, enacted);
  const select = container.querySelector("select");
  assert.equal(select.querySelectorAll("option").length, 3); // placeholder + 2 states

  // linkedom doesn't implement <select>.value semantics, so shim the value the
  // change handler reads; the logic under test is resolveStateLaw + rendering.
  const choose = (code) => {
    Object.defineProperty(select, "value", { value: code, configurable: true });
    select.dispatchEvent(new window.Event("change"));
  };

  choose("CA");
  assert.match(container.querySelector(".state-law-details").textContent, /CCPA/);

  choose("WY");
  assert.match(container.querySelector(".state-law-uncovered").textContent, /Not yet covered/);
});
