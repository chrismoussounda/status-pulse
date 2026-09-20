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

type IncidentLike = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  cause: string | null;
};

export function isIncidentOpen(incident: Pick<IncidentLike, "resolvedAt">): boolean {
  return incident.resolvedAt === null;
}
