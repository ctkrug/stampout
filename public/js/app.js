import { loadStatuses, setBrokerStatus } from "./lib/storage.js";
import { deriveAllBrokerViews, summarize, filterByCategory, sortByRecheckUrgency } from "./lib/brokers.js";
import { isStale } from "./lib/scheduler.js";
import { ALL_US_STATES } from "./lib/states.js";
import { createSoundEngine } from "./lib/sound.js";
import {
  renderFreshnessNotice,
  renderSummary,
  renderCategoryTabs,
  renderBrokerCards,
  renderStateLaws
} from "./render.js";

function setUpMuteToggle(sound) {
  const button = document.getElementById("mute-toggle");
  if (!button) return;
  function sync() {
    button.textContent = sound.isMuted() ? "Sound: Off" : "Sound: On";
    button.setAttribute("aria-pressed", String(sound.isMuted()));
  }
  sync();
  button.addEventListener("click", () => {
    sound.toggleMuted();
    sync();
  });
}

const today = () => new Date().toISOString().slice(0, 10);

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function main() {
  const app = document.getElementById("app");
  const [brokerData, stateLawData] = await Promise.all([
    loadJSON("data/brokers.json"),
    loadJSON("data/state-laws.json")
  ]);

  const sound = createSoundEngine({
    AudioContextClass: window.AudioContext || window.webkitAudioContext,
    store: window.localStorage
  });
  setUpMuteToggle(sound);

  app.innerHTML = `
    <div id="data-freshness"></div>
    <div class="dossier">
      <aside class="rail">
        <div id="summary"></div>
        <div id="category-tabs"></div>
        <div class="progress-io">
          <button id="export-btn" type="button">Export progress</button>
          <label class="import-label" for="import-input">Import progress</label>
          <input id="import-input" type="file" accept="application/json" class="visually-hidden" />
          <p id="import-status" class="import-status" aria-live="polite"></p>
        </div>
      </aside>
      <div class="main-panel">
        <div id="broker-grid"></div>
      </div>
    </div>
    <section id="state-laws"></section>
  `;

  const freshnessEl = document.getElementById("data-freshness");
  const summaryEl = document.getElementById("summary");
  const tabsEl = document.getElementById("category-tabs");
  const gridEl = document.getElementById("broker-grid");
  const statesEl = document.getElementById("state-laws");

  const todayISO = today();
  const staleDates = [...new Set(
    [brokerData.updated, stateLawData.updated].filter((updated) => isStale(updated, todayISO))
  )];
  renderFreshnessNotice(freshnessEl, staleDates);

  const categories = ["all", ...new Set(brokerData.brokers.map((b) => b.category))];
  let activeCategory = "all";
  let statuses = loadStatuses(window.localStorage);

  function rerender() {
    const views = deriveAllBrokerViews(brokerData.brokers, statuses, today());
    renderSummary(summaryEl, summarize(views));
    renderCategoryTabs(tabsEl, categories, activeCategory, (category) => {
      if (category !== activeCategory) sound.playTick();
      activeCategory = category;
      rerender();
    });
    const filtered = sortByRecheckUrgency(filterByCategory(views, activeCategory));
    renderBrokerCards(gridEl, filtered, {
      onMarkRequested: (id) => {
        statuses = setBrokerStatus(window.localStorage, statuses, id, "requested", null);
        rerender();
      },
      onMarkConfirmed: (id) => {
        statuses = setBrokerStatus(window.localStorage, statuses, id, "confirmed", today());
        rerender();
        sound.playThump();
        const stamp = gridEl.querySelector(`[data-broker-id="${id}"] .stamp-mark`);
        if (stamp) {
          stamp.classList.add("stamp-mark--punch");
          stamp.addEventListener(
            "animationend",
            () => stamp.classList.remove("stamp-mark--punch"),
            { once: true }
          );
        }
      }
    });
  }

  rerender();
  renderStateLaws(statesEl, ALL_US_STATES, stateLawData.states);
}

main().catch((error) => {
  const app = document.getElementById("app");
  app.innerHTML = `<p class="error-state">Something went wrong loading Optoutly: ${error.message}</p>`;
  console.error(error);
});
