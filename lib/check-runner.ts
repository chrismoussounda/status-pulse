import { prisma } from "@/lib/prisma";
import type { CheckStatus, Monitor } from "@/app/generated/prisma/client";
import { recordCheckResult } from "@/lib/checks/record-check-result";
import { assertPublicTarget } from "@/lib/checks/private-address";

const DEFAULT_CONCURRENCY = 10;
const CHECK_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

// The cron fires "every 5 minutes", but GitHub Actions schedules drift by
// tens of seconds and lastCheckedAt is stamped after the request finishes.
// Without slack, a 300s monitor checked at 299s elapsed would be skipped
// and silently fall back to a 10-minute cadence.
const DUE_GRACE_MS = 30_000;

export type RunDueChecksResult = {
  checked: number;
  skipped: number;
  failed: number;
};

export async function runDueChecks(now: Date = new Date()): Promise<RunDueChecksResult> {
  const monitors = await prisma.monitor.findMany({ where: { isActive: true } });
  const due = monitors.filter((monitor) => isDue(monitor, now));

  let failed = 0;
  await runPool(due, DEFAULT_CONCURRENCY, async (monitor) => {
    // One monitor's DB error must not abort the rest of the batch.
    try {
      await runSingleCheck(monitor);
    } catch (err) {
      failed++;
      console.error(`Check failed to record for monitor ${monitor.id}`, err);
    }
  });

  return { checked: due.length - failed, skipped: monitors.length - due.length, failed };
}

export function isDue(
  monitor: Pick<Monitor, "lastCheckedAt" | "intervalSeconds">,
  now: Date,
): boolean {
  if (!monitor.lastCheckedAt) return true;
  const elapsedMs = now.getTime() - monitor.lastCheckedAt.getTime();
  return elapsedMs + DUE_GRACE_MS >= monitor.intervalSeconds * 1000;
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

type ProbeResult = {
  status: CheckStatus;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
};

async function runSingleCheck(monitor: Monitor): Promise<void> {
  const result = await probe(monitor);
  await recordCheckResult({ monitorId: monitor.id, ...result });
}

/** Performs the HTTP request. Never throws: every failure becomes a DOWN result. */
async function probe(monitor: Monitor): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const res = await fetchWithSafeRedirects(monitor.url, monitor.method);
    const latencyMs = Math.round(performance.now() - start);
    const status: CheckStatus = res.status === monitor.expectedStatus ? "UP" : "DOWN";
    return {
      status,
      statusCode: res.status,
      latencyMs,
      error:
        status === "DOWN" ? `Expected status ${monitor.expectedStatus}, got ${res.status}` : null,
    };
  } catch (err) {
    return { status: "DOWN", statusCode: null, latencyMs: null, error: describeError(err) };
  }
}

/**
 * Follows redirects manually so every hop goes through the SSRF guard —
 * `redirect: "follow"` would let a public URL bounce us to an internal one.
 */
async function fetchWithSafeRedirects(url: string, method: string): Promise<Response> {
  const signal = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicTarget(currentUrl);
    const res = await fetch(currentUrl, { method, signal, redirect: "manual" });
    // Only the status code matters; release the connection right away.
    await res.body?.cancel();

    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(`Too many redirects (more than ${MAX_REDIRECTS})`);
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return `Timed out after ${CHECK_TIMEOUT_MS / 1000}s`;
    }
    // undici wraps the useful bit (ECONNREFUSED, ENOTFOUND…) in `cause`.
    const cause = err.cause instanceof Error ? err.cause.message : null;
    return cause ? `${err.message}: ${cause}` : err.message;
  }
  return "Unknown error";
}
