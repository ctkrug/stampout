import { resolveStateLaw } from "./lib/states.js";

const CATEGORY_LABELS = {
  all: "All",
  "people-search": "People search",
  "background-check": "Background check",
  marketing: "Marketing",
  "credit-marketing": "Credit marketing"
};

const RECHECK_LABELS = {
  "not-started": "Not started",
  ok: "On track",
  "due-soon": "Recheck due soon",
  overdue: "Recheck overdue"
};

export function renderOnboarding(container, onDismiss) {
  container.innerHTML = "";
  container.className = "onboarding";
  const heading = document.createElement("h2");
  heading.textContent = "How this case file works";
  const body = document.createElement("p");
  body.textContent =
    "Open a broker's opt-out link, submit the request, then mark it “confirmed.” " +
    "Optoutly stamps the card and schedules a recheck date, since some brokers quietly " +
    "re-list your data after a while — the overdue ones will surface at the top.";
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.textContent = "Got it";
  dismissBtn.addEventListener("click", () => {
    onDismiss();
    container.remove();
  });
  container.append(heading, body, dismissBtn);
}

export function renderFreshnessNotice(container, staleDates) {
  container.innerHTML = "";
  if (staleDates.length === 0) {
    container.className = "";
    return;
  }
  container.className = "freshness-notice";
  const dates = staleDates.join(", ");
  container.textContent = `Data last verified on ${dates}. Some links or details may be out of date.`;
}

export function renderSummary(container, summary) {
  container.innerHTML = "";
  container.className = "summary";
  const entries = [
    ["Confirmed", summary.confirmed],
    ["Requested", summary.requested],
    ["Not started", summary.notStarted],
    ["Overdue rechecks", summary.overdue]
  ];
  for (const [label, count] of entries) {
    const stat = document.createElement("div");
    stat.className = "summary-stat";
    stat.innerHTML = `<span class="summary-count">${count}</span><span class="summary-label">${label}</span>`;
    container.appendChild(stat);
  }
}

export function renderCategoryTabs(container, categories, activeCategory, onSelect) {
  container.innerHTML = "";
  container.className = "category-tabs";
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", "Filter by category");
  for (const category of categories) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "category-tab";
    tab.textContent = CATEGORY_LABELS[category] || category;
    tab.setAttribute("aria-pressed", String(category === activeCategory));
    if (category === activeCategory) tab.classList.add("active");
    tab.addEventListener("click", () => onSelect(category));
    container.appendChild(tab);
  }
}

export function renderBrokerCards(container, views, handlers, emptyMessage = "No brokers in this category yet.") {
  container.innerHTML = "";
  container.className = "broker-grid";
  if (views.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  for (const view of views) {
    container.appendChild(renderBrokerCard(view, handlers));
  }
}

function renderBrokerCard(view, { onMarkRequested, onMarkConfirmed }) {
  const card = document.createElement("article");
  card.className = `broker-card status-${view.status} recheck-${view.recheckState}`;
  card.dataset.brokerId = view.id;

  if (view.status === "confirmed") {
    const stamp = document.createElement("div");
    stamp.className = "stamp-mark";
    stamp.textContent = "OPTED OUT";
    stamp.setAttribute("aria-hidden", "true");
    card.appendChild(stamp);
  }

  const title = document.createElement("h3");
  title.className = "broker-name";
  title.textContent = view.name;
  card.appendChild(title);

  const category = document.createElement("p");
  category.className = "broker-category";
  category.textContent = CATEGORY_LABELS[view.category] || view.category;
  card.appendChild(category);

  const link = document.createElement("a");
  link.href = view.optOutUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open opt-out page";
  card.appendChild(link);

  const notes = document.createElement("p");
  notes.className = "broker-notes";
  notes.textContent = view.notes;
  card.appendChild(notes);

  const statusLine = document.createElement("p");
  statusLine.className = "broker-status-line";
  statusLine.textContent = RECHECK_LABELS[view.recheckState];
  card.appendChild(statusLine);

  const actions = document.createElement("div");
  actions.className = "broker-actions";

  const requestedBtn = document.createElement("button");
  requestedBtn.type = "button";
  requestedBtn.textContent = "Mark requested";
  requestedBtn.addEventListener("click", () => onMarkRequested(view.id));
  actions.appendChild(requestedBtn);

  const confirmedBtn = document.createElement("button");
  confirmedBtn.type = "button";
  confirmedBtn.textContent = "Mark confirmed";
  confirmedBtn.addEventListener("click", () => onMarkConfirmed(view.id));
  actions.appendChild(confirmedBtn);

  card.appendChild(actions);
  return card;
}

export function renderStateLaws(container, allStates, enactedLaws) {
  container.innerHTML = "";
  container.className = "state-laws";
  const heading = document.createElement("h2");
  heading.textContent = "State privacy-law rights";
  container.appendChild(heading);

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Choose your state");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose your state…";
  select.appendChild(placeholder);
  for (const state of allStates) {
    const option = document.createElement("option");
    option.value = state.code;
    option.textContent = state.name;
    select.appendChild(option);
  }
  container.appendChild(select);

  const details = document.createElement("div");
  details.className = "state-law-details";
  details.setAttribute("aria-live", "polite");
  container.appendChild(details);

  select.addEventListener("change", () => {
    details.innerHTML = "";
    if (!select.value) return;
    const law = resolveStateLaw(enactedLaws, select.value);
    if (!law) {
      const notice = document.createElement("p");
      notice.className = "state-law-uncovered";
      notice.textContent = "Not yet covered: this state has no comprehensive privacy law in force yet.";
      details.appendChild(notice);
      return;
    }
    const title = document.createElement("p");
    title.innerHTML = `<strong>${law.law}</strong> &mdash; effective ${law.effective}`;
    const rights = document.createElement("p");
    rights.textContent = `Rights: ${law.rights.join(", ")}`;
    const notes = document.createElement("p");
    notes.textContent = law.notes;
    const link = document.createElement("a");
    link.href = law.authorityUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Enforcing authority";
    details.append(title, rights, notes, link);
  });
}
