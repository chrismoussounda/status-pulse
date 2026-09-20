import type { CheckStatus } from "@/app/generated/prisma/client";

// Fewer than this many consecutive failures is treated as noise (a single
// blip, a transient network hiccup) rather than an incident.
export const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export type IncidentAction = "open" | "resolve" | "none";

export type IncidentDecisionInput = {
  newStatus: CheckStatus;
  previousConsecutiveFailures: number;
  hasOpenIncident: boolean;
  threshold?: number;
};

export type IncidentDecision = {
  action: IncidentAction;
  consecutiveFailures: number;
};

/**
 * Pure decision function for "what should this check result do to the
 * incident state" — no DB access, so every flapping scenario (fail-fail-
 * recover, fail-recover-fail, sustained outage, recovery) is a plain unit
 * test rather than something that needs a real database to exercise.
 *
 * The DB-backed caller (lib/check-runner.ts) is responsible for
 * persisting whatever this returns; this function only decides.
 */
export function decideIncidentAction({
  newStatus,
  previousConsecutiveFailures,
  hasOpenIncident,
  threshold = CONSECUTIVE_FAILURE_THRESHOLD,
}: IncidentDecisionInput): IncidentDecision {
  if (newStatus === "DOWN") {
    const consecutiveFailures = previousConsecutiveFailures + 1;
    const justCrossedThreshold = !hasOpenIncident && consecutiveFailures >= threshold;
    return {
      action: justCrossedThreshold ? "open" : "none",
      consecutiveFailures,
    };
  }

  // UP: any run of failures ends here, whether or not it ever crossed the
  // threshold into a real incident.
  return {
    action: hasOpenIncident ? "resolve" : "none",
    consecutiveFailures: 0,
  };
}
