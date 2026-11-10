import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";

import type { DailyBar } from "@/lib/uptime";

function barColor(uptime: number | null): string {
  if (uptime === null) return "bg-muted";
  if (uptime >= 99.9) return "bg-status-up";
  if (uptime >= 95) return "bg-status-degraded";
  return "bg-status-down";
}

/** One bar per day, the classic status-page history strip. */
export async function UptimeBars({ bars }: { bars: DailyBar[] }) {
  const [t, locale] = await Promise.all([getTranslations("uptimeBars"), getLocale()]);
  const formatDay = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex h-8 items-stretch gap-px sm:gap-0.5"
        role="img"
        aria-label={t("label", { days: bars.length })}
      >
        {bars.map((bar) => {
          const label = `${formatDay.format(bar.day)} · ${
            bar.uptime === null ? t("noData") : `${bar.uptime}%`
          }`;
          return (
            <span
              key={bar.day.toISOString()}
              title={label}
              className={cn("min-w-0 flex-1 rounded-[2px]", barColor(bar.uptime))}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("daysAgo", { days: bars.length })}</span>
        <span>{t("today")}</span>
      </div>
    </div>
  );
}
