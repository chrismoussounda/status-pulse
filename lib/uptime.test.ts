import { describe, expect, it } from "vitest";
import {
  calculateUptimeForWindow,
  calculateUptimeSummary,
  computeUptimePercent,
  isIncidentOpen,
} from "./uptime";

describe("computeUptimePercent", () => {
  it("returns 100 for no checks", () => {
    expect(computeUptimePercent([])).toBe(100);
  });

  it("returns 100 when every check is UP", () => {
    expect(computeUptimePercent([{ status: "UP" }, { status: "UP" }])).toBe(100);
  });

  it("returns 0 when every check is DOWN", () => {
    expect(computeUptimePercent([{ status: "DOWN" }, { status: "DOWN" }])).toBe(0);
  });

  it("computes a percentage rounded to 2 decimals", () => {
    const checks = [
      { status: "UP" as const },
      { status: "UP" as const },
      { status: "DOWN" as const },
    ];
    expect(computeUptimePercent(checks)).toBeCloseTo(66.67, 2);
  });
});

describe("calculateUptimeForWindow", () => {
  const now = new Date("2026-09-20T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  it("returns null when there is no data in the window", () => {
    const checks = [{ status: "UP" as const, checkedAt: hoursAgo(48) }];
    expect(calculateUptimeForWindow(checks, now, 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("only counts checks inside the window", () => {
    const checks = [
      { status: "DOWN" as const, checkedAt: hoursAgo(48) },
      { status: "UP" as const, checkedAt: hoursAgo(1) },
    ];
    expect(calculateUptimeForWindow(checks, now, 24 * 60 * 60 * 1000)).toBe(100);
  });
});

describe("calculateUptimeSummary", () => {
  it("computes independent 24h/7d/30d windows", () => {
    const now = new Date("2026-09-20T12:00:00Z");
    const checks = [
      { status: "UP" as const, checkedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
      { status: "DOWN" as const, checkedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    ];
    const summary = calculateUptimeSummary(checks, now);
    expect(summary.uptime24h).toBe(100);
    expect(summary.uptime7d).toBe(100);
    expect(summary.uptime30d).toBe(50);
  });
});

describe("isIncidentOpen", () => {
  it("is open when resolvedAt is null", () => {
    expect(isIncidentOpen({ resolvedAt: null })).toBe(true);
  });

  it("is not open when resolvedAt is set", () => {
    expect(isIncidentOpen({ resolvedAt: new Date() })).toBe(false);
  });
});
