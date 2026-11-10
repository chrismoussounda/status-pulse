import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildDailyBars,
  EMPTY_UPTIME,
  startOfUtcDay,
  uptimePercent,
  type DailyBar,
  type UptimeWindows,
} from "@/lib/uptime";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Uptime over 24h / 7d / 30d / 90d for each monitor, counted in Postgres.
 * A 5-minute monitor produces ~26k checks in 90 days, so loading rows into
 * the app to count them doesn't scale; one aggregate query does.
 */
export async function getUptimeWindows(
  monitorIds: string[],
  now: Date = new Date(),
): Promise<Map<string, UptimeWindows>> {
  const result = new Map<string, UptimeWindows>(monitorIds.map((id) => [id, EMPTY_UPTIME]));
  if (monitorIds.length === 0) return result;

  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);
  const since90d = new Date(now.getTime() - 90 * DAY_MS);

  const rows = await prisma.$queryRaw<
    {
      monitorId: string;
      total24h: bigint;
      up24h: bigint;
      total7d: bigint;
      up7d: bigint;
      total30d: bigint;
      up30d: bigint;
      total90d: bigint;
      up90d: bigint;
    }[]
  >`
    SELECT "monitorId",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since24h})                     AS "total24h",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since24h} AND "status" = 'UP') AS "up24h",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since7d})                      AS "total7d",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since7d} AND "status" = 'UP')  AS "up7d",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since30d})                     AS "total30d",
      COUNT(*) FILTER (WHERE "checkedAt" >= ${since30d} AND "status" = 'UP') AS "up30d",
      COUNT(*)                                                               AS "total90d",
      COUNT(*) FILTER (WHERE "status" = 'UP')                                AS "up90d"
    FROM "Check"
    WHERE "monitorId" IN (${Prisma.join(monitorIds)}) AND "checkedAt" >= ${since90d}
    GROUP BY "monitorId"
  `;

  for (const row of rows) {
    result.set(row.monitorId, {
      uptime24h: uptimePercent(Number(row.up24h), Number(row.total24h)),
      uptime7d: uptimePercent(Number(row.up7d), Number(row.total7d)),
      uptime30d: uptimePercent(Number(row.up30d), Number(row.total30d)),
      uptime90d: uptimePercent(Number(row.up90d), Number(row.total90d)),
    });
  }
  return result;
}

/** One uptime bar per UTC day for the last `days` days, per monitor. */
export async function getDailyBars(
  monitorIds: string[],
  days: number,
  now: Date = new Date(),
): Promise<Map<string, DailyBar[]>> {
  if (monitorIds.length === 0) return new Map();

  const since = new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS);
  const rows = await prisma.$queryRaw<
    { monitorId: string; day: Date; total: bigint; up: bigint }[]
  >`
    SELECT "monitorId",
      date_trunc('day', "checkedAt")          AS "day",
      COUNT(*)                                AS "total",
      COUNT(*) FILTER (WHERE "status" = 'UP') AS "up"
    FROM "Check"
    WHERE "monitorId" IN (${Prisma.join(monitorIds)}) AND "checkedAt" >= ${since}
    GROUP BY "monitorId", 2
  `;

  return new Map(
    monitorIds.map((id) => [
      id,
      buildDailyBars(
        rows
          .filter((row) => row.monitorId === id)
          .map((row) => ({ day: row.day, total: Number(row.total), up: Number(row.up) })),
        now,
        days,
      ),
    ]),
  );
}
