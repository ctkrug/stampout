import { getBrokerStatus } from "./storage.js";
import { getRecheckState, nextCheckDate } from "./scheduler.js";

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

/**
 * The "what to do today" view: only brokers that are overdue or due soon,
 * most-urgent first (overdue before due-soon, and within a bucket the one
 * whose recheck date is furthest in the past first).
 */
export function selectDueToday(views) {
  return views
    .filter((view) => view.recheckState === "overdue" || view.recheckState === "due-soon")
    .sort((a, b) => {
      const rankDiff = RECHECK_RANK[a.recheckState] - RECHECK_RANK[b.recheckState];
      if (rankDiff !== 0) return rankDiff;
      const aDue = nextCheckDate(a.lastChecked, a.recheckDays);
      const bDue = nextCheckDate(b.lastChecked, b.recheckDays);
      return aDue < bDue ? -1 : aDue > bDue ? 1 : 0;
    });
}
