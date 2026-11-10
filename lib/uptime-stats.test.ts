import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDailyBars, getUptimeWindows } from "./uptime-stats";

// Runs against the real Postgres (docker compose locally, a service
// container in CI) to prove the raw SQL, not just the math around it.
const now = new Date("2026-03-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
let userId: string;
let monitorId: string;
let emptyMonitorId: string;

beforeAll(async () => {
  const unique = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `uptime-${unique}@example.com`,
      passwordHash: "x",
      statusPageSlug: `uptime-${unique}`,
      monitors: {
        create: [
          { name: "With checks", url: "https://example.com" },
          { name: "Empty", url: "https://example.org" },
        ],
      },
    },
    include: { monitors: { orderBy: { name: "desc" } } },
  });
  userId = user.id;
  [monitorId, emptyMonitorId] = user.monitors.map((m) => m.id);

  await prisma.check.createMany({
    data: [
      { monitorId, status: "UP", checkedAt: hoursAgo(1) },
      { monitorId, status: "DOWN", checkedAt: hoursAgo(2) },
      { monitorId, status: "UP", checkedAt: hoursAgo(3 * 24) },
      { monitorId, status: "UP", checkedAt: hoursAgo(20 * 24) },
      { monitorId, status: "DOWN", checkedAt: hoursAgo(60 * 24) },
      { monitorId, status: "UP", checkedAt: hoursAgo(200 * 24) }, // outside every window
    ],
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("getUptimeWindows", () => {
  it("counts each window separately", async () => {
    const stats = await getUptimeWindows([monitorId, emptyMonitorId], now);
    expect(stats.get(monitorId)).toEqual({
      uptime24h: 50,
      uptime7d: 66.67,
      uptime30d: 75,
      uptime90d: 60,
    });
  });

  it("returns nulls for a monitor with no checks", async () => {
    const stats = await getUptimeWindows([emptyMonitorId], now);
    expect(stats.get(emptyMonitorId)?.uptime30d).toBeNull();
  });

  it("handles an empty id list without querying", async () => {
    expect((await getUptimeWindows([], now)).size).toBe(0);
  });
});

describe("getDailyBars", () => {
  it("groups checks by UTC day", async () => {
    const bars = (await getDailyBars([monitorId], 7, now)).get(monitorId)!;
    expect(bars).toHaveLength(7);
    expect(bars.at(-1)?.uptime).toBe(50); // today: one UP, one DOWN
    expect(bars.at(-4)?.uptime).toBe(100); // three days ago
    expect(bars.at(-2)?.uptime).toBeNull(); // yesterday: no data
  });
});
