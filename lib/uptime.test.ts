import { describe, expect, it } from "vitest";
import { buildDailyBars, startOfUtcDay, uptimePercent } from "./uptime";

describe("uptimePercent", () => {
  it("returns null when there are no checks", () => {
    expect(uptimePercent(0, 0)).toBeNull();
  });

  it("returns 100 and 0 at the extremes", () => {
    expect(uptimePercent(5, 5)).toBe(100);
    expect(uptimePercent(0, 5)).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    expect(uptimePercent(2, 3)).toBe(66.67);
  });
});

describe("startOfUtcDay", () => {
  it("truncates to midnight UTC", () => {
    expect(startOfUtcDay(new Date("2026-03-04T23:59:59Z")).toISOString()).toBe(
      "2026-03-04T00:00:00.000Z",
    );
  });
});

describe("buildDailyBars", () => {
  const now = new Date("2026-03-10T15:00:00Z");

  it("returns one bar per day, oldest first, ending today", () => {
    const bars = buildDailyBars([], now, 3);
    expect(bars.map((b) => b.day.toISOString().slice(0, 10))).toEqual([
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
  });

  it("marks days without checks as null and fills days with data", () => {
    const bars = buildDailyBars(
      [
        { day: new Date("2026-03-10T00:00:00Z"), total: 4, up: 3 },
        { day: new Date("2026-03-08T00:00:00Z"), total: 2, up: 2 },
      ],
      now,
      3,
    );
    expect(bars.map((b) => b.uptime)).toEqual([100, null, 75]);
  });

  it("ignores counts older than the requested range", () => {
    const bars = buildDailyBars(
      [{ day: new Date("2026-01-01T00:00:00Z"), total: 1, up: 0 }],
      now,
      2,
    );
    expect(bars.every((b) => b.uptime === null)).toBe(true);
  });
});
