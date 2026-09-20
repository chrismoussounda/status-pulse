import { beforeEach, describe, expect, it, vi } from "vitest";

const monitorFindMany = vi.fn();
const checkCreate = vi.fn();
const incidentFindFirst = vi.fn();
const incidentCreate = vi.fn();
const incidentUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitor: { findMany: (...args: unknown[]) => monitorFindMany(...args) },
    check: { create: (...args: unknown[]) => checkCreate(...args) },
    incident: {
      findFirst: (...args: unknown[]) => incidentFindFirst(...args),
      create: (...args: unknown[]) => incidentCreate(...args),
      update: (...args: unknown[]) => incidentUpdate(...args),
    },
  },
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
};

describe("runDueChecks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    monitorFindMany.mockReset();
    checkCreate.mockReset();
    incidentFindFirst.mockReset();
    incidentCreate.mockReset();
    incidentUpdate.mockReset();
    incidentFindFirst.mockResolvedValue(null);
  });

  it("skips monitors that aren't due yet", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, checks: [{ checkedAt: new Date() }] }]);
    const fetchSpy = vi.spyOn(global, "fetch");

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(result.checked).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("records an UP check when the response matches expectedStatus", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, checks: [] }]);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const { runDueChecks } = await import("./check-runner");
    const result = await runDueChecks(new Date());

    expect(result.checked).toBe(1);
    expect(checkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "UP", statusCode: 200 }) }),
    );
    expect(incidentCreate).not.toHaveBeenCalled();
  });

  it("records a DOWN check and opens an incident on a non-matching status", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, checks: [] }]);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(checkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DOWN", statusCode: 500 }),
      }),
    );
    expect(incidentCreate).toHaveBeenCalledOnce();
  });

  it("records a DOWN check and resolves an open incident when fetch throws", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, checks: [] }]);
    incidentFindFirst.mockResolvedValue({ id: "incident-1" });
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(checkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DOWN", statusCode: null, error: "network error" }),
      }),
    );
    expect(incidentUpdate).not.toHaveBeenCalled();
  });

  it("resolves an open incident when a monitor recovers", async () => {
    monitorFindMany.mockResolvedValue([{ ...baseMonitor, checks: [] }]);
    incidentFindFirst.mockResolvedValue({ id: "incident-1" });
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const { runDueChecks } = await import("./check-runner");
    await runDueChecks(new Date());

    expect(incidentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "incident-1" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      }),
    );
  });
});
