import { getTranslations } from "next-intl/server";

import type { CheckStatus } from "@/app/generated/prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MonitorStatusBadge } from "@/components/monitor-status-badge";
import { IncidentHistory } from "@/components/status-page/incident-history";
import { UptimeBars } from "@/components/uptime-bars";
import { toDisplayStatus } from "@/lib/display-status";
import type { DailyBar } from "@/lib/uptime";

type MonitorCardProps = {
  name: string;
  isActive: boolean;
  lastStatus: CheckStatus | null;
  uptime90d: number | null;
  bars: DailyBar[];
  incidents: { id: string; startedAt: Date; resolvedAt: Date | null; cause: string | null }[];
};

export async function MonitorCard({
  name,
  isActive,
  lastStatus,
  uptime90d,
  bars,
  incidents,
}: MonitorCardProps) {
  const t = await getTranslations("statusPage");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <span className="font-medium">{name}</span>
        <MonitorStatusBadge status={toDisplayStatus(isActive, lastStatus)} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <UptimeBars bars={bars} />
        <p className="text-sm text-muted-foreground">
          {t("uptime")}: {uptime90d === null ? "—" : `${uptime90d}%`}
        </p>
        <IncidentHistory incidents={incidents} />
      </CardContent>
    </Card>
  );
}
