import { prisma } from "@/lib/prisma";
import type { CheckStatus, Monitor } from "@/app/generated/prisma/client";
import { recordCheckResult } from "@/lib/checks/record-check-result";

const DEFAULT_CONCURRENCY = 10;
const CHECK_TIMEOUT_MS = 10_000;

export type RunDueChecksResult = {
  checked: number;
};

export async function runDueChecks(now: Date = new Date()): Promise<RunDueChecksResult> {
  const monitors = await prisma.monitor.findMany({ where: { isActive: true } });

  const due = monitors.filter((monitor) => isDue(monitor, now));
  await runPool(due, DEFAULT_CONCURRENCY, runSingleCheck);

  return { checked: due.length };
}

function isDue(monitor: Monitor, now: Date): boolean {
  const lastCheckedAt = monitor.lastCheckedAt ?? new Date(0);
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

async function runSingleCheck(monitor: Monitor): Promise<void> {
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
    await recordCheckResult({
      monitorId: monitor.id,
      status,
      statusCode: res.status,
      latencyMs,
      error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await recordCheckResult({
      monitorId: monitor.id,
      status: "DOWN",
      statusCode: null,
      latencyMs: null,
      error: message,
    });
  } finally {
    clearTimeout(timer);
  }
}
