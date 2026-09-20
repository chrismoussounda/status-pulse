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
  });

  it("skips monitors that aren't due yet", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, lastCheckedAt: new Date() }]);
    const fetchSpy = vi.spyOn(global, "fetch");

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(result.checked).toBe(0);
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
});
