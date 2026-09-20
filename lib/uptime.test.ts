import { describe, expect, it } from "vitest";
import { computeUptimePercent, isIncidentOpen } from "./uptime";

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

describe("isIncidentOpen", () => {
  it("is open when resolvedAt is null", () => {
    expect(isIncidentOpen({ resolvedAt: null })).toBe(true);
  });

  it("is not open when resolvedAt is set", () => {
    expect(isIncidentOpen({ resolvedAt: new Date() })).toBe(false);
  });
});
