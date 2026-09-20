import { describe, expect, it } from "vitest";
import { getLatencySeries } from "./latency";

describe("getLatencySeries", () => {
  it("drops checks with no latency value", () => {
    const checks = [
      { checkedAt: new Date("2026-09-20T10:00:00Z"), latencyMs: null },
      { checkedAt: new Date("2026-09-20T10:01:00Z"), latencyMs: 120 },
    ];
    expect(getLatencySeries(checks)).toEqual([
      { checkedAt: new Date("2026-09-20T10:01:00Z"), latencyMs: 120 },
    ]);
  });

  it("keeps only the most recent `limit` points", () => {
    const checks = Array.from({ length: 5 }, (_, i) => ({
      checkedAt: new Date(2026, 8, 20, 10, i),
      latencyMs: i,
    }));
    const series = getLatencySeries(checks, 2);
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.latencyMs)).toEqual([3, 4]);
  });
});
