import { isValidISODate } from "./scheduler.js";

export const STORAGE_KEY = "optoutly:v1:status";
export const ONBOARDING_STORAGE_KEY = "optoutly:v1:onboarding-dismissed";

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
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStatuses(store, statuses) {
  store.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export function getBrokerStatus(statuses, brokerId) {
  const entry = statuses[brokerId];
  if (!entry || typeof entry !== "object" || typeof entry.status !== "string") {
    return { status: "not-started", lastChecked: null };
  }
  return entry;
}

export function setBrokerStatus(store, statuses, brokerId, status, lastChecked = null) {
  const next = {
    ...statuses,
    [brokerId]: { status, lastChecked }
  };
  saveStatuses(store, next);
  return next;
}

export function serializeStatuses(statuses) {
  return JSON.stringify(statuses, null, 2);
}

export function isOnboardingDismissed(store) {
  return store.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function dismissOnboarding(store) {
  store.setItem(ONBOARDING_STORAGE_KEY, "true");
}

/**
 * The onboarding explainer only makes sense before someone has touched any
 * broker's status, and only until they've dismissed it once.
 */
export function shouldShowOnboarding(statuses, dismissed) {
  return !dismissed && Object.keys(statuses).length === 0;
}

const VALID_BROKER_STATUSES = new Set(["not-started", "requested", "confirmed"]);

function isValidStatusEntry(entry) {
  return (
    entry !== null &&
    typeof entry === "object" &&
    VALID_BROKER_STATUSES.has(entry.status) &&
    (entry.lastChecked === null || isValidISODate(entry.lastChecked))
  );
}

/**
 * Parses and validates a previously-exported status map. Never throws:
 * malformed JSON or a mismatched shape comes back as `{ ok: false, error }`
 * so a caller can show an inline message instead of crashing.
 */
export function parseImportedStatuses(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON object mapping broker IDs to status." };
  }
  const isValid = Object.values(parsed).every(isValidStatusEntry);
  if (!isValid) {
    return { ok: false, error: "One or more entries have an invalid status or lastChecked value." };
  }
  return { ok: true, statuses: parsed };
}
