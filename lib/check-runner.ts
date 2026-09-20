import { prisma } from "@/lib/prisma";
import type { CheckStatus, Monitor } from "@/app/generated/prisma/client";

const DEFAULT_CONCURRENCY = 10;
const CHECK_TIMEOUT_MS = 10_000;

type MonitorWithLastCheck = Monitor & {
  checks: { checkedAt: Date }[];
};

export type RunDueChecksResult = {
  checked: number;
};

export async function runDueChecks(now: Date = new Date()): Promise<RunDueChecksResult> {
  const monitors = await prisma.monitor.findMany({
    where: { isActive: true },
    include: { checks: { orderBy: { checkedAt: "desc" }, take: 1 } },
  });

  const due = monitors.filter((monitor) => isDue(monitor, now));
  await runPool(due, DEFAULT_CONCURRENCY, runSingleCheck);

  return { checked: due.length };
}

function isDue(monitor: MonitorWithLastCheck, now: Date): boolean {
  const lastCheckedAt = monitor.checks[0]?.checkedAt ?? new Date(0);
  const elapsedMs = now.getTime() - lastCheckedAt.getTime();
  return elapsedMs >= monitor.intervalSeconds * 1000;
}

async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function runSingleCheck(monitor: MonitorWithLastCheck): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const start = performance.now();

  try {
    const res = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
      redirect: "follow",
    });
    const latencyMs = Math.round(performance.now() - start);
    const status: CheckStatus = res.status === monitor.expectedStatus ? "UP" : "DOWN";
    const error =
      status === "DOWN" ? `Expected status ${monitor.expectedStatus}, got ${res.status}` : null;
    await recordCheck(monitor, status, res.status, latencyMs, error);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await recordCheck(monitor, "DOWN", null, null, message);
  } finally {
    clearTimeout(timer);
  }
}

async function recordCheck(
  monitor: MonitorWithLastCheck,
  status: CheckStatus,
  statusCode: number | null,
  latencyMs: number | null,
  error: string | null,
): Promise<void> {
  await prisma.check.create({
    data: {
      monitorId: monitor.id,
      status,
      statusCode,
      latencyMs,
      error,
    },
  });

  const openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, resolvedAt: null },
  });

  if (status === "DOWN" && !openIncident) {
    await prisma.incident.create({
      data: { monitorId: monitor.id, cause: error },
    });
  } else if (status === "UP" && openIncident) {
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { resolvedAt: new Date() },
    });
  }
}
