import { loadStatuses, setBrokerStatus } from "./lib/storage.js";
import { deriveAllBrokerViews, summarize, filterByCategory, sortByRecheckUrgency } from "./lib/brokers.js";
import { ALL_US_STATES } from "./lib/states.js";
import { renderSummary, renderCategoryTabs, renderBrokerCards, renderStateLaws } from "./render.js";

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

  app.innerHTML = `
    <div id="summary"></div>
    <div id="category-tabs"></div>
    <div id="broker-grid"></div>
    <section id="state-laws"></section>
  `;

  const summaryEl = document.getElementById("summary");
  const tabsEl = document.getElementById("category-tabs");
  const gridEl = document.getElementById("broker-grid");
  const statesEl = document.getElementById("state-laws");

  const categories = ["all", ...new Set(brokerData.brokers.map((b) => b.category))];
  let activeCategory = "all";
  let statuses = loadStatuses(window.localStorage);

  function rerender() {
    const views = deriveAllBrokerViews(brokerData.brokers, statuses, today());
    renderSummary(summaryEl, summarize(views));
    renderCategoryTabs(tabsEl, categories, activeCategory, (category) => {
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
