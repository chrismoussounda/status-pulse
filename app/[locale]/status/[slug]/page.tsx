import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getDailyBars, getUptimeWindows } from "@/lib/uptime-stats";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MonitorCard } from "@/components/status-page/monitor-card";

const HISTORY_DAYS = 90;

// Shared by generateMetadata and the page so the lookup runs once per request.
const getStatusPageOwner = cache((slug: string) =>
  prisma.user.findUnique({
    where: { statusPageSlug: slug },
    select: {
      name: true,
      monitors: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          isActive: true,
          lastStatus: true,
          incidents: { orderBy: { startedAt: "desc" }, take: 5 },
        },
      },
    },
  }),
);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [user, t] = await Promise.all([getStatusPageOwner(slug), getTranslations("statusPage")]);
  if (!user) return { title: t("notFoundTitle") };
  const name = user.name ?? slug;
  return {
    title: t("metaTitle", { name }),
    description: t("metaDescription", { name }),
  };
}

export default async function StatusPage({ params }: Props) {
  const { slug } = await params;
  const [user, t] = await Promise.all([getStatusPageOwner(slug), getTranslations("statusPage")]);
  if (!user) notFound();

  const monitorIds = user.monitors.map((m) => m.id);
  const [uptime, bars] = await Promise.all([
    getUptimeWindows(monitorIds),
    getDailyBars(monitorIds, HISTORY_DAYS),
  ]);

  // Paused monitors aren't being checked, so their last result says
  // nothing about the present and shouldn't turn the banner red.
  const allUp = user.monitors.every((m) => !m.isActive || m.lastStatus !== "DOWN");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:py-14 3xl:max-w-4xl">
        <header className="flex items-center justify-between gap-3">
          <Logo label={user.name ?? "StatusPulse"} />
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
                isActive={monitor.isActive}
                lastStatus={monitor.lastStatus}
                uptime90d={uptime.get(monitor.id)?.uptime90d ?? null}
                bars={bars.get(monitor.id) ?? []}
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
