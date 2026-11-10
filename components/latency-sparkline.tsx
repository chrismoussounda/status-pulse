import type { LatencyPoint } from "@/lib/latency";

const WIDTH = 240;
const HEIGHT = 48;
const PADDING = 4;

export function LatencySparkline({ points }: { points: LatencyPoint[] }) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.latencyMs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.latencyMs - min) / range) * (HEIGHT - PADDING * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-16 w-full text-primary"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Latency from ${min}ms to ${max}ms over the last ${points.length} checks`}
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
