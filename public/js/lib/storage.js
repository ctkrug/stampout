export const STORAGE_KEY = "optoutly:v1:status";

/**
 * All functions take an explicit `store` (anything with getItem/setItem,
 * e.g. window.localStorage or an in-memory fake for tests) rather than
 * reading a global, so the logic stays deterministic and testable.
 */
export function loadStatuses(store) {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStatuses(store, statuses) {
  store.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export function getBrokerStatus(statuses, brokerId) {
  return statuses[brokerId] || { status: "not-started", lastChecked: null };
}

export function setBrokerStatus(store, statuses, brokerId, status, lastChecked = null) {
  const next = {
    ...statuses,
    [brokerId]: { status, lastChecked }
  };
  saveStatuses(store, next);
  return next;
}
