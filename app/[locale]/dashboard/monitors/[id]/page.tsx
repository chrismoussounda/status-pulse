import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateUptimeSummary } from "@/lib/uptime";
import { getLatencySeries } from "@/lib/latency";
import { formatTimestamp } from "@/lib/format-timestamp";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorStatusBadge, type DisplayStatus } from "@/components/monitor-status-badge";
import { MonitorDeleteButton } from "@/components/monitor-delete-button";
import { LatencySparkline } from "@/components/latency-sparkline";

export default async function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, t, locale] = await Promise.all([
    auth(),
    getTranslations("monitorForm"),
    getLocale(),
  ]);
  const userId = session!.user.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 100 },
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

  const uptime = calculateUptimeSummary(monitor.checks, new Date());
  const latencyPoints = getLatencySeries([...monitor.checks].reverse());

  const formatPercent = (value: number | null) => (value === null ? t("noData") : `${value}%`);

  return (
    <div className="flex flex-col gap-6">
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
            <Button variant="outline">{t("edit")}</Button>
          </Link>
          <MonitorDeleteButton id={monitor.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("uptime24h")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(uptime.uptime24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("uptime7d")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(uptime.uptime7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("uptime30d")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(uptime.uptime30d)}
          </CardContent>
        </Card>
      </div>

      {latencyPoints.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("latency")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LatencySparkline points={latencyPoints} />
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">{t("recentChecks")}</h2>
        {monitor.checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noChecks")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {monitor.checks.slice(0, 20).map((check) => (
              <li
                key={check.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {formatTimestamp(check.checkedAt, locale)}
                </span>
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
                  {formatTimestamp(incident.startedAt, locale)}
                  {incident.resolvedAt ? ` – ${formatTimestamp(incident.resolvedAt, locale)}` : ""}
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
