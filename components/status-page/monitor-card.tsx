import { getTranslations } from "next-intl/server";

import { computeUptimePercent } from "@/lib/uptime";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MonitorStatusBadge, type DisplayStatus } from "@/components/monitor-status-badge";
import { IncidentHistory } from "@/components/status-page/incident-history";

type MonitorCardProps = {
  name: string;
  checks: { status: "UP" | "DOWN"; checkedAt: Date }[];
  incidents: { id: string; startedAt: Date; resolvedAt: Date | null; cause: string | null }[];
};

export async function MonitorCard({ name, checks, incidents }: MonitorCardProps) {
  const t = await getTranslations("statusPage");
  const lastCheck = checks[0];
  const displayStatus: DisplayStatus = !lastCheck
    ? "pending"
    : lastCheck.status === "UP"
      ? "up"
      : "down";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <span className="font-medium">{name}</span>
        <MonitorStatusBadge status={displayStatus} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t("uptime")}: {computeUptimePercent(checks)}%
        </p>
        <IncidentHistory incidents={incidents} />
      </CardContent>
    </Card>
  );
}
