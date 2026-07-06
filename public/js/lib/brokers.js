import { getBrokerStatus } from "./storage.js";
import { getRecheckState } from "./scheduler.js";

const RECHECK_RANK = { overdue: 0, "due-soon": 1, ok: 2, "not-started": 3 };

/**
 * Merges a broker dataset entry with its stored status to produce the view
 * the UI renders. recheckState only means anything once a broker has been
 * confirmed at least once.
 */
export function deriveBrokerView(broker, statuses, todayISO) {
  const { status, lastChecked } = getBrokerStatus(statuses, broker.id);
  const recheckState =
    status === "confirmed"
      ? getRecheckState(lastChecked, broker.recheckDays, todayISO)
      : "not-started";
  return { ...broker, status, lastChecked, recheckState };
}

export function deriveAllBrokerViews(brokers, statuses, todayISO) {
  return brokers.map((broker) => deriveBrokerView(broker, statuses, todayISO));
}

export function summarize(views) {
  return views.reduce(
    (acc, view) => {
      acc.total += 1;
      if (view.status === "confirmed") acc.confirmed += 1;
      else if (view.status === "requested") acc.requested += 1;
      else acc.notStarted += 1;
      if (view.recheckState === "overdue") acc.overdue += 1;
      return acc;
    },
    { total: 0, confirmed: 0, requested: 0, notStarted: 0, overdue: 0 }
  );
}

export function filterByCategory(views, category) {
  if (!category || category === "all") return views;
  return views.filter((view) => view.category === category);
}

export function sortByRecheckUrgency(views) {
  return [...views].sort(
    (a, b) => RECHECK_RANK[a.recheckState] - RECHECK_RANK[b.recheckState]
  );
}
