import {
  loadStatuses,
  saveStatuses,
  setBrokerStatus,
  serializeStatuses,
  parseImportedStatuses,
  isOnboardingDismissed,
  dismissOnboarding,
  shouldShowOnboarding
} from "./lib/storage.js";
import {
  deriveAllBrokerViews,
  summarize,
  filterByCategory,
  sortByRecheckUrgency,
  selectDueToday
} from "./lib/brokers.js";
import { isStale } from "./lib/scheduler.js";
import { ALL_US_STATES } from "./lib/states.js";
import { createSoundEngine } from "./lib/sound.js";
import {
  renderOnboarding,
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
    <div id="onboarding"></div>
    <div id="data-freshness"></div>
    <div class="dossier">
      <aside class="rail">
        <div id="summary"></div>
        <div id="category-tabs"></div>
        <div class="progress-io">
          <button id="export-btn" type="button">Export progress</button>
          <input id="import-input" type="file" accept="application/json" class="visually-hidden" />
          <label class="import-label" for="import-input">Import progress</label>
          <p id="import-status" class="import-status" aria-live="polite"></p>
        </div>
      </aside>
      <div class="main-panel">
        <section class="today-view" aria-labelledby="today-view-heading">
          <h2 id="today-view-heading">What to do today</h2>
          <div id="today-grid"></div>
        </section>
        <div id="broker-grid"></div>
      </div>
    </div>
    <section id="state-laws"></section>
  `;

  const onboardingEl = document.getElementById("onboarding");
  const freshnessEl = document.getElementById("data-freshness");
  const summaryEl = document.getElementById("summary");
  const tabsEl = document.getElementById("category-tabs");
  const todayGridEl = document.getElementById("today-grid");
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

  if (shouldShowOnboarding(statuses, isOnboardingDismissed(window.localStorage))) {
    renderOnboarding(onboardingEl, () => dismissOnboarding(window.localStorage));
  } else {
    onboardingEl.remove();
  }

  function rerender() {
    const views = deriveAllBrokerViews(brokerData.brokers, statuses, today());
    renderSummary(summaryEl, summarize(views));
    renderCategoryTabs(tabsEl, categories, activeCategory, (category) => {
      if (category !== activeCategory) sound.playTick();
      activeCategory = category;
      rerender();
    });
    const handlers = {
      onMarkRequested: (id) => {
        statuses = setBrokerStatus(window.localStorage, statuses, id, "requested", null);
        rerender();
      },
      onMarkConfirmed: (id) => {
        statuses = setBrokerStatus(window.localStorage, statuses, id, "confirmed", today());
        rerender();
        sound.playThump();
        for (const stamp of app.querySelectorAll(`[data-broker-id="${id}"] .stamp-mark`)) {
          stamp.classList.add("stamp-mark--punch");
          stamp.addEventListener(
            "animationend",
            () => stamp.classList.remove("stamp-mark--punch"),
            { once: true }
          );
        }
      }
    };

    renderBrokerCards(
      todayGridEl,
      selectDueToday(views),
      handlers,
      "Nothing overdue or due soon — you're all caught up."
    );

    const filtered = sortByRecheckUrgency(filterByCategory(views, activeCategory));
    renderBrokerCards(gridEl, filtered, handlers);
  }

  setUpProgressIO({
    getStatuses: () => statuses,
    onImport: (imported) => {
      statuses = imported;
      saveStatuses(window.localStorage, statuses);
      rerender();
    }
  });

  rerender();
  renderStateLaws(statesEl, ALL_US_STATES, stateLawData.states);
}

function setUpProgressIO({ getStatuses, onImport }) {
  const exportBtn = document.getElementById("export-btn");
  const importInput = document.getElementById("import-input");
  const importStatus = document.getElementById("import-status");
  if (!exportBtn || !importInput || !importStatus) return;

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([serializeStatuses(getStatuses())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "optoutly-progress.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  function reportImportError(message) {
    importStatus.textContent = `Import failed: ${message}`;
    importStatus.classList.add("import-status--error");
  }

  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImportedStatuses(String(reader.result));
      if (!result.ok) {
        reportImportError(result.error);
        return;
      }
      importStatus.classList.remove("import-status--error");
      importStatus.textContent = "Progress imported.";
      onImport(result.statuses);
    };
    reader.onerror = () => reportImportError("couldn't read the file.");
    reader.readAsText(file);
  });
}

main().catch((error) => {
  const app = document.getElementById("app");
  app.innerHTML = `<p class="error-state">Something went wrong loading Optoutly: ${error.message}</p>`;
  console.error(error);
});
