import type { CheckStatus } from "@/app/generated/prisma/client";
import type { DisplayStatus } from "@/components/monitor-status-badge";

/** Reads the denormalized Monitor.lastStatus instead of loading check rows. */
export function toDisplayStatus(isActive: boolean, lastStatus: CheckStatus | null): DisplayStatus {
  if (!isActive) return "paused";
  if (!lastStatus) return "pending";
  return lastStatus === "UP" ? "up" : "down";
}
