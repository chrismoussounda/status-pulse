import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeUptimePercent } from "@/lib/uptime";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorStatusBadge, type DisplayStatus } from "@/components/monitor-status-badge";
import { MonitorDeleteButton } from "@/components/monitor-delete-button";

export default async function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, t] = await Promise.all([auth(), getTranslations("monitorForm")]);
  const userId = session!.user.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 20 },
      incidents: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
  if (!monitor) notFound();

  const lastCheck = monitor.checks[0];
  const displayStatus: DisplayStatus = !monitor.isActive
    ? "paused"
    : !lastCheck
      ? "pending"
      : lastCheck.status === "UP"
        ? "up"
        : "down";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          &larr; {t("backToDashboard")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{monitor.name}</h1>
          <p className="text-sm text-muted-foreground">{monitor.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/monitors/${monitor.id}/edit`}>
            <Button variant="outline" size="sm">
              {t("edit")}
            </Button>
          </Link>
          <MonitorDeleteButton id={monitor.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("detailTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonitorStatusBadge status={displayStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {computeUptimePercent(monitor.checks)}%
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">{t("recentChecks")}</h2>
        {monitor.checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noChecks")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {monitor.checks.map((check) => (
              <li
                key={check.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{check.checkedAt.toLocaleString()}</span>
                <span className="flex items-center gap-3">
                  {check.latencyMs != null ? (
                    <span className="text-muted-foreground">{check.latencyMs}ms</span>
                  ) : null}
                  <MonitorStatusBadge status={check.status === "UP" ? "up" : "down"} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">{t("incidentHistory")}</h2>
        {monitor.incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noIncidents")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {monitor.incidents.map((incident) => (
              <li key={incident.id} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
                <span className="font-medium">
                  {incident.startedAt.toLocaleString()}
                  {incident.resolvedAt ? ` – ${incident.resolvedAt.toLocaleString()}` : ""}
                </span>
                {incident.cause ? (
                  <span className="text-muted-foreground">{incident.cause}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
