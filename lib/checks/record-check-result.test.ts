import { beforeEach, describe, expect, it, vi } from "vitest";

const monitorFindUniqueOrThrow = vi.fn();
const incidentFindFirst = vi.fn();
const checkCreate = vi.fn();
const monitorUpdate = vi.fn();
const incidentCreate = vi.fn();
const incidentUpdate = vi.fn();
const notifyIncidentOpened = vi.fn();
const notifyIncidentResolved = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        monitor: { findUniqueOrThrow: monitorFindUniqueOrThrow, update: monitorUpdate },
        incident: { findFirst: incidentFindFirst, create: incidentCreate, update: incidentUpdate },
        check: { create: checkCreate },
      }),
  },
}));

vi.mock("@/lib/notifications/incident-notifications", () => ({
  notifyIncidentOpened: (...args: unknown[]) => notifyIncidentOpened(...args),
  notifyIncidentResolved: (...args: unknown[]) => notifyIncidentResolved(...args),
}));

const baseMonitor = {
  id: "monitor-1",
  name: "Example",
  url: "https://example.com",
  consecutiveFailures: 0,
  user: { email: "owner@example.com" },
};

describe("recordCheckResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monitorFindUniqueOrThrow.mockResolvedValue(baseMonitor);
    incidentFindFirst.mockResolvedValue(null);
    checkCreate.mockResolvedValue({});
    monitorUpdate.mockResolvedValue({});
    notifyIncidentOpened.mockResolvedValue(undefined);
    notifyIncidentResolved.mockResolvedValue(undefined);
  });

  it("does not open an incident or notify on a single failure below the threshold", async () => {
    const { recordCheckResult } = await import("./record-check-result");
    await recordCheckResult({
      monitorId: "monitor-1",
      status: "DOWN",
      statusCode: 500,
      latencyMs: 120,
      error: "Expected 200, got 500",
    });

    expect(monitorUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ consecutiveFailures: 1 }) }),
    );
    expect(incidentCreate).not.toHaveBeenCalled();
    expect(notifyIncidentOpened).not.toHaveBeenCalled();
  });

  it("opens an incident and notifies once the failure threshold is crossed", async () => {
    monitorFindUniqueOrThrow.mockResolvedValue({ ...baseMonitor, consecutiveFailures: 2 });
    incidentCreate.mockResolvedValue({ id: "incident-1", startedAt: new Date() });

    const { recordCheckResult } = await import("./record-check-result");
    await recordCheckResult({
      monitorId: "monitor-1",
      status: "DOWN",
      statusCode: 500,
      latencyMs: 120,
      error: "Expected 200, got 500",
    });

    expect(incidentCreate).toHaveBeenCalledOnce();
    expect(notifyIncidentOpened).toHaveBeenCalledWith(
      expect.objectContaining({ ownerEmail: "owner@example.com", monitorName: "Example" }),
    );
  });

  it("resolves an open incident and notifies on recovery", async () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    monitorFindUniqueOrThrow.mockResolvedValue({ ...baseMonitor, consecutiveFailures: 5 });
    incidentFindFirst.mockResolvedValue({ id: "incident-1", startedAt });
    incidentUpdate.mockResolvedValue({ id: "incident-1", startedAt, resolvedAt: new Date() });

    const { recordCheckResult } = await import("./record-check-result");
    await recordCheckResult({
      monitorId: "monitor-1",
      status: "UP",
      statusCode: 200,
      latencyMs: 80,
      error: null,
    });

    expect(incidentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "incident-1" } }),
    );
    expect(notifyIncidentResolved).toHaveBeenCalledOnce();
  });

  it("does not let a failed notification throw out of recordCheckResult", async () => {
    monitorFindUniqueOrThrow.mockResolvedValue({ ...baseMonitor, consecutiveFailures: 2 });
    incidentCreate.mockResolvedValue({ id: "incident-1", startedAt: new Date() });
    notifyIncidentOpened.mockRejectedValue(new Error("Resend is down"));

    const { recordCheckResult } = await import("./record-check-result");
    await expect(
      recordCheckResult({
        monitorId: "monitor-1",
        status: "DOWN",
        statusCode: 500,
        latencyMs: 120,
        error: "Expected 200, got 500",
      }),
    ).resolves.toBeDefined();
  });
});
