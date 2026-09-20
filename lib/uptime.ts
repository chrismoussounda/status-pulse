import type { CheckStatus } from "@/app/generated/prisma/client";

type CheckLike = { status: CheckStatus };

/**
 * Percentage of checks that were UP, rounded to 2 decimal places.
 * Returns 100 for an empty window (no data yet reads as "no known problems",
 * not "0% uptime").
 */
export function computeUptimePercent(checks: CheckLike[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter((c) => c.status === "UP").length;
  return Math.round((up / checks.length) * 10000) / 100;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type WindowedCheck = CheckLike & { checkedAt: Date };

/**
 * Percentage of UP checks within the window, null (not 0 or 100) when
 * there's no data in it — a monitor with zero checks in the last 24h
 * isn't "100% up", it's unmeasured.
 */
export function calculateUptimeForWindow(
  checks: WindowedCheck[],
  now: Date,
  windowMs: number,
): number | null {
  const since = now.getTime() - windowMs;
  const inWindow = checks.filter((c) => c.checkedAt.getTime() >= since);
  if (inWindow.length === 0) return null;
  const up = inWindow.filter((c) => c.status === "UP").length;
  return Math.round((up / inWindow.length) * 10000) / 100;
}

export type UptimeSummary = {
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
};

export function calculateUptimeSummary(checks: WindowedCheck[], now: Date): UptimeSummary {
  return {
    uptime24h: calculateUptimeForWindow(checks, now, DAY_MS),
    uptime7d: calculateUptimeForWindow(checks, now, 7 * DAY_MS),
    uptime30d: calculateUptimeForWindow(checks, now, 30 * DAY_MS),
  };
}

type IncidentLike = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  cause: string | null;
};

export function isIncidentOpen(incident: Pick<IncidentLike, "resolvedAt">): boolean {
  return incident.resolvedAt === null;
}
