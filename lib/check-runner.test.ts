import { beforeEach, describe, expect, it, vi } from "vitest";

const monitorFindMany = vi.fn();
const recordCheckResult = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitor: { findMany: (...args: unknown[]) => monitorFindMany(...args) },
  },
}));

vi.mock("@/lib/checks/record-check-result", () => ({
  recordCheckResult: (...args: unknown[]) => recordCheckResult(...args),
}));

// The real guard does DNS lookups; tests drive it explicitly instead.
const assertPublicTarget = vi.fn();
vi.mock("@/lib/checks/private-address", () => ({
  assertPublicTarget: (...args: unknown[]) => assertPublicTarget(...args),
}));

const baseMonitor = {
  id: "monitor-1",
  userId: "user-1",
  name: "Example",
  url: "https://example.com",
  method: "GET" as const,
  expectedStatus: 200,
  intervalSeconds: 300,
  isActive: true,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastCheckedAt: null as Date | null,
  lastStatus: null,
  consecutiveFailures: 0,
};

describe("runDueChecks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    monitorFindMany.mockReset();
    recordCheckResult.mockReset();
    recordCheckResult.mockResolvedValue(undefined);
    assertPublicTarget.mockReset();
    assertPublicTarget.mockResolvedValue(undefined);
  });

  it("skips monitors that aren't due yet", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, lastCheckedAt: new Date() }]);
    const fetchSpy = vi.spyOn(global, "fetch");

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(result).toEqual({ checked: 0, skipped: 1, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("records an UP result when the response matches expectedStatus", async () => {
    monitorFindMany.mockResolvedValue([baseMonitor]);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(result.checked).toBe(1);
    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({ monitorId: "monitor-1", status: "UP", statusCode: 200 }),
    );
  });

  it("records a DOWN result on a non-matching status", async () => {
    monitorFindMany.mockResolvedValue([baseMonitor]);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({ monitorId: "monitor-1", status: "DOWN", statusCode: 500 }),
    );
  });

  it("records a DOWN result with no status code when fetch throws", async () => {
    monitorFindMany.mockResolvedValue([baseMonitor]);
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorId: "monitor-1",
        status: "DOWN",
        statusCode: null,
        error: "network error",
      }),
    );
  });

  it("reports a timeout in plain words", async () => {
    monitorFindMany.mockResolvedValue([baseMonitor]);
    vi.spyOn(global, "fetch").mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DOWN", error: "Timed out after 10s" }),
    );
  });

  it("follows redirects and judges the final response", async () => {
    monitorFindMany.mockResolvedValue([baseMonitor]);
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/home" } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(fetchSpy).toHaveBeenLastCalledWith("https://example.com/home", expect.anything());
    expect(assertPublicTarget).toHaveBeenCalledWith("https://example.com/home");
    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "UP", statusCode: 200 }),
    );
  });

  it("records DOWN without fetching when the target is a private address", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, url: "http://169.254.169.254" }]);
    assertPublicTarget.mockRejectedValue(new Error("Target resolves to a private address"));
    const fetchSpy = vi.spyOn(global, "fetch");

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(recordCheckResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DOWN", error: "Target resolves to a private address" }),
    );
  });

  it("keeps checking other monitors when recording one result fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    monitorFindMany.mockResolvedValue([baseMonitor, { ...baseMonitor, id: "monitor-2" }]);
    vi.spyOn(global, "fetch").mockImplementation(async () => new Response(null, { status: 200 }));
    recordCheckResult.mockRejectedValueOnce(new Error("db down"));

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(recordCheckResult).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ checked: 1, skipped: 0, failed: 1 });
  });
});

describe("isDue", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

  it("is due when the monitor has never been checked", async () => {
    const { isDue } = await import("./check-runner");
    expect(isDue({ lastCheckedAt: null, intervalSeconds: 300 }, now)).toBe(true);
  });

  it("tolerates cron drift so a 5-minute monitor isn't skipped at 4m50s", async () => {
    const { isDue } = await import("./check-runner");
    expect(isDue({ lastCheckedAt: secondsAgo(290), intervalSeconds: 300 }, now)).toBe(true);
  });

  it("is not due well before its interval", async () => {
    const { isDue } = await import("./check-runner");
    expect(isDue({ lastCheckedAt: secondsAgo(120), intervalSeconds: 300 }, now)).toBe(false);
  });
});
