/**
 * Demo data so the dashboard and public status page aren't empty on first
 * view. Idempotent: re-running wipes and recreates the demo user's data.
 * Uses relative imports (not the "@/..." alias) since it runs under tsx,
 * outside Next's path resolution.
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@statuspulse.dev";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_SLUG = "demo";
const CHECK_INTERVAL_HOURS = 6;
const HISTORY_DAYS = 30;

type MonitorSeed = {
  name: string;
  url: string;
  isPublic: boolean;
  /** Indices (from oldest=0) of checks in the generated history that are DOWN. */
  downAt: Set<number>;
};

function buildHistory(seed: MonitorSeed, now: Date) {
  const checksPerDay = 24 / CHECK_INTERVAL_HOURS;
  const totalChecks = HISTORY_DAYS * checksPerDay;

  const checks = Array.from({ length: totalChecks }, (_, i) => {
    const hoursAgo = (totalChecks - 1 - i) * CHECK_INTERVAL_HOURS;
    const checkedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const isDown = seed.downAt.has(i);
    return {
      status: isDown ? ("DOWN" as const) : ("UP" as const),
      statusCode: isDown ? 503 : 200,
      latencyMs: isDown ? 0 : 80 + Math.round(Math.random() * 150),
      error: isDown ? "Service unavailable" : null,
      checkedAt,
    };
  });

  return { checks, totalChecks };
}

async function seedMonitor(userId: string, seed: MonitorSeed, now: Date) {
  const { checks, totalChecks } = buildHistory(seed, now);

  const monitor = await prisma.monitor.create({
    data: {
      userId,
      name: seed.name,
      url: seed.url,
      method: "GET",
      expectedStatus: 200,
      intervalSeconds: CHECK_INTERVAL_HOURS * 60 * 60,
      isPublic: seed.isPublic,
      lastStatus: checks[checks.length - 1].status,
      lastCheckedAt: checks[checks.length - 1].checkedAt,
      // Consecutive-failure count at the tail of the generated history.
      consecutiveFailures: countTrailingFailures(seed.downAt, totalChecks),
    },
  });

  await prisma.check.createMany({
    data: checks.map((c) => ({ ...c, monitorId: monitor.id })),
  });

  return monitor;
}

function countTrailingFailures(downAt: Set<number>, totalChecks: number): number {
  let count = 0;
  for (let i = totalChecks - 1; i >= 0 && downAt.has(i); i--) count++;
  return count;
}

/** Contiguous run of DOWN indices, e.g. downRun(100, 3) = {100, 101, 102}. */
function downRun(startIndex: number, length: number): Set<number> {
  return new Set(Array.from({ length }, (_, i) => startIndex + i));
}

async function main() {
  const now = new Date();
  const checksPerDay = 24 / CHECK_INTERVAL_HOURS;

  // Wipe any previous run's data (cascades to monitors/checks/incidents).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: "Demo Org",
      statusPageSlug: DEMO_SLUG,
    },
  });

  const totalChecks = HISTORY_DAYS * checksPerDay;

  const marketingSite = await seedMonitor(
    user.id,
    { name: "Marketing Site", url: "https://example.com", isPublic: true, downAt: new Set() },
    now,
  );

  // API: one past incident ~5 days ago, lasting a few checks, now resolved.
  const apiIncidentStart = totalChecks - 5 * checksPerDay;
  const api = await seedMonitor(
    user.id,
    {
      name: "API",
      url: "https://api.example.com",
      isPublic: true,
      downAt: downRun(apiIncidentStart, 3),
    },
    now,
  );

  // Checkout Service: currently down — an open incident, degrading the
  // public status page's overall status.
  const checkout = await seedMonitor(
    user.id,
    {
      name: "Checkout Service",
      url: "https://checkout.example.com",
      isPublic: true,
      downAt: downRun(totalChecks - 4, 4), // trailing 4 checks, i.e. right up to "now"
    },
    now,
  );

  await seedMonitor(
    user.id,
    { name: "Docs Site", url: "https://docs.example.com", isPublic: true, downAt: new Set() },
    now,
  );

  // Private monitor — should never appear on the public status page.
  await seedMonitor(
    user.id,
    {
      name: "Internal Admin",
      url: "https://admin.example.com",
      isPublic: false,
      downAt: new Set(),
    },
    now,
  );

  const apiIncidentStartedAt = new Date(
    now.getTime() - (totalChecks - apiIncidentStart) * CHECK_INTERVAL_HOURS * 60 * 60 * 1000,
  );
  await prisma.incident.create({
    data: {
      monitorId: api.id,
      startedAt: apiIncidentStartedAt,
      resolvedAt: new Date(
        apiIncidentStartedAt.getTime() + 3 * CHECK_INTERVAL_HOURS * 60 * 60 * 1000,
      ),
    },
  });

  const checkoutIncidentStartedAt = new Date(
    now.getTime() - 4 * CHECK_INTERVAL_HOURS * 60 * 60 * 1000,
  );
  await prisma.incident.create({
    data: { monitorId: checkout.id, startedAt: checkoutIncidentStartedAt, resolvedAt: null },
  });

  console.log(`Seeded demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Public status page: /status/${DEMO_SLUG}`);
  console.log(
    `Monitors: ${[marketingSite, api, checkout].map((m) => m.name).join(", ")}, Docs Site, Internal Admin (private)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
