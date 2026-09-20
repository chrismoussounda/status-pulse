import { prisma } from "@/lib/prisma";
import type { CheckStatus } from "@/app/generated/prisma/client";
import { decideIncidentAction } from "./decide-incident-action";
import {
  notifyIncidentOpened,
  notifyIncidentResolved,
} from "@/lib/notifications/incident-notifications";

export type CheckResultInput = {
  monitorId: string;
  status: CheckStatus;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt?: Date;
};

/**
 * Persists one check's result and applies whatever it means for the
 * monitor's incident state, in a single transaction: the Check row, the
 * denormalized Monitor.lastStatus/lastCheckedAt/consecutiveFailures, and
 * an Incident open/resolve if decideIncidentAction calls for one.
 *
 * Notifications happen after the transaction commits, and are best-effort
 * — a failed send is logged, not thrown, so it can't roll back state we
 * already committed or abort the rest of the check run for other
 * monitors.
 */
export async function recordCheckResult(input: CheckResultInput) {
  const checkedAt = input.checkedAt ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const monitor = await tx.monitor.findUniqueOrThrow({
      where: { id: input.monitorId },
      include: { user: { select: { email: true } } },
    });
    const openIncident = await tx.incident.findFirst({
      where: { monitorId: input.monitorId, resolvedAt: null },
    });

    const decision = decideIncidentAction({
      newStatus: input.status,
      previousConsecutiveFailures: monitor.consecutiveFailures,
      hasOpenIncident: Boolean(openIncident),
    });

    await tx.check.create({
      data: {
        monitorId: input.monitorId,
        status: input.status,
        statusCode: input.statusCode,
        latencyMs: input.latencyMs,
        error: input.error,
        checkedAt,
      },
    });

    await tx.monitor.update({
      where: { id: input.monitorId },
      data: {
        lastCheckedAt: checkedAt,
        lastStatus: input.status,
        consecutiveFailures: decision.consecutiveFailures,
      },
    });

    let incident = openIncident;
    if (decision.action === "open") {
      incident = await tx.incident.create({
        data: { monitorId: input.monitorId, startedAt: checkedAt, cause: input.error },
      });
    } else if (decision.action === "resolve" && openIncident) {
      incident = await tx.incident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: checkedAt },
      });
    }

    return { decision, monitor, incident };
  });

  const { decision, monitor, incident } = result;

  if (decision.action === "open" && incident) {
    await notifyIncidentOpened({
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      ownerEmail: monitor.user.email,
      startedAt: incident.startedAt,
    }).catch((err: unknown) => {
      console.error(
        `Failed to send incident-open notification for monitor ${input.monitorId}`,
        err,
      );
    });
  } else if (decision.action === "resolve" && incident?.resolvedAt) {
    await notifyIncidentResolved({
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      ownerEmail: monitor.user.email,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
    }).catch((err: unknown) => {
      console.error(
        `Failed to send incident-resolve notification for monitor ${input.monitorId}`,
        err,
      );
    });
  }

  return result;
}
