export type LatencyCheck = { checkedAt: Date; latencyMs: number | null };
export type LatencyPoint = { checkedAt: Date; latencyMs: number };

/**
 * Most recent `limit` checks with a latency value, oldest first (the order
 * a sparkline draws left-to-right). Expects `checks` already sorted
 * ascending by checkedAt.
 */
export function getLatencySeries(checks: LatencyCheck[], limit = 20): LatencyPoint[] {
  const withLatency = checks.filter(
    (c): c is LatencyPoint => c.latencyMs !== null && c.latencyMs !== undefined,
  );
  return withLatency.slice(-limit);
}
