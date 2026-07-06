const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseISODate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return date;
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function daysBetween(fromISO, toISO) {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function nextCheckDate(lastCheckedISO, recheckDays) {
  return addDays(lastCheckedISO, recheckDays);
}

/**
 * Recheck state relative to `todayISO`, based on when a broker was last
 * confirmed opted-out and how quickly it's known to re-list data.
 */
export function getRecheckState(lastCheckedISO, recheckDays, todayISO) {
  if (!lastCheckedISO) return "not-started";
  const due = nextCheckDate(lastCheckedISO, recheckDays);
  const daysUntilDue = daysBetween(todayISO, due);
  if (daysUntilDue <= 0) return "overdue";
  if (daysUntilDue <= 14) return "due-soon";
  return "ok";
}

/**
 * Whether a dataset's `updated` timestamp is old enough that the UI should
 * warn a visitor before they rely on links that may no longer be current.
 */
export function isStale(updatedISO, todayISO, thresholdDays = 90) {
  return daysBetween(updatedISO, todayISO) > thresholdDays;
}
