import { getTranslations } from "next-intl/server";
import { PlusIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeUptimePercent } from "@/lib/uptime";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MonitorTable, type MonitorRow } from "@/components/monitor-table";
import type { DisplayStatus } from "@/components/monitor-status-badge";

export default async function DashboardPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("dashboard")]);
  const userId = session!.user.id;

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 30 },
    },
  });

  const rows: MonitorRow[] = monitors.map((monitor) => {
    const lastCheck = monitor.checks[0];
    const displayStatus: DisplayStatus = !monitor.isActive
      ? "paused"
      : !lastCheck
        ? "pending"
        : lastCheck.status === "UP"
          ? "up"
          : "down";

    return {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      isActive: monitor.isActive,
      isPublic: monitor.isPublic,
      uptimePercent: computeUptimePercent(monitor.checks),
      displayStatus,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/dashboard/monitors/new">
          <Button className="h-9">
            <PlusIcon className="size-4" />
            {t("newMonitor")}
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Link href="/dashboard/monitors/new">
            <Button variant="outline">{t("emptyCta")}</Button>
          </Link>
        </div>
      ) : (
        <MonitorTable monitors={rows} />
      )}
    </div>
  );
}
