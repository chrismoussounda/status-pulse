import { getTranslations } from "next-intl/server";
import { PlusIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUptimeWindows } from "@/lib/uptime-stats";
import { toDisplayStatus } from "@/lib/display-status";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MonitorTable, type MonitorRow } from "@/components/monitor-table";

export default async function DashboardPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("dashboard")]);
  const userId = session!.user.id;

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const uptime = await getUptimeWindows(monitors.map((m) => m.id));

  const rows: MonitorRow[] = monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    isActive: monitor.isActive,
    isPublic: monitor.isPublic,
    uptimePercent: uptime.get(monitor.id)?.uptime30d ?? null,
    displayStatus: toDisplayStatus(monitor.isActive, monitor.lastStatus),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/dashboard/monitors/new" className={buttonVariants({ className: "h-9" })}>
          <PlusIcon className="size-4" />
          {t("newMonitor")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Link href="/dashboard/monitors/new" className={buttonVariants({ variant: "outline" })}>
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <MonitorTable monitors={rows} />
      )}
    </div>
  );
}
