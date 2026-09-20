import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActivityIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MonitorCard } from "@/components/status-page/monitor-card";

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("statusPage");

  const user = await prisma.user.findUnique({
    where: { statusPageSlug: slug },
    include: {
      monitors: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
        include: {
          checks: { orderBy: { checkedAt: "desc" }, take: 100 },
          incidents: { orderBy: { startedAt: "desc" }, take: 10 },
        },
      },
    },
  });
  if (!user) notFound();

  const allUp = user.monitors.every((m) => m.checks[0]?.status !== "DOWN");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:py-14 3xl:max-w-4xl">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-heading text-lg font-semibold">
            <ActivityIcon className="size-5 text-primary" />
            {user.name ?? "StatusPulse"}
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <div
          className={`rounded-xl border p-4 text-center font-medium ${
            allUp
              ? "border-status-up/30 bg-status-up/10 text-status-up"
              : "border-status-down/30 bg-status-down/10 text-status-down"
          }`}
        >
          {allUp ? t("allOperational") : t("someDown")}
        </div>

        {user.monitors.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("noPublicMonitors")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {user.monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                name={monitor.name}
                checks={monitor.checks}
                incidents={monitor.incidents}
              />
            ))}
          </div>
        )}

        <p className="pt-4 text-center text-xs text-muted-foreground">
          {t("poweredBy")} StatusPulse
        </p>
      </div>
    </div>
  );
}
