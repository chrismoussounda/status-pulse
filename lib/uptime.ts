const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * UP checks as a percentage of all checks, rounded to 2 decimals. Null (not
 * 0 or 100) when there's no data — a monitor with zero checks in a window
 * isn't "100% up", it's unmeasured.
 */
export function uptimePercent(up: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((up / total) * 10000) / 100;
}

export type UptimeWindows = {
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
  uptime90d: number | null;
};

export const EMPTY_UPTIME: UptimeWindows = {
  uptime24h: null,
  uptime7d: null,
  uptime30d: null,
  uptime90d: null,
};

export type DailyCount = { day: Date; total: number; up: number };
export type DailyBar = { day: Date; uptime: number | null };

/** Midnight UTC of the given instant. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Expands sparse per-day counts (only days that had checks) into one bar per
 * day for the last `days` days, oldest first, ending with today (UTC). Days
 * without checks get `uptime: null` so the UI can show them as "no data".
 */
export function buildDailyBars(counts: DailyCount[], now: Date, days: number): DailyBar[] {
  const byDay = new Map(counts.map((c) => [startOfUtcDay(c.day).getTime(), c]));
  const today = startOfUtcDay(now).getTime();

  return Array.from({ length: days }, (_, i) => {
    const day = today - (days - 1 - i) * DAY_MS;
    const count = byDay.get(day);
    return { day: new Date(day), uptime: count ? uptimePercent(count.up, count.total) : null };
  });
}
