"use client";

import { useTranslations } from "next-intl";
import { cn } from "cn";

export type DisplayStatus = "up" | "down" | "paused" | "pending";

const STATUS_DOT: Record<DisplayStatus, string> = {
  up: "bg-status-up",
  down: "bg-status-down",
  paused: "bg-muted-foreground",
  pending: "bg-status-degraded",
};

export function MonitorStatusBadge({ status }: { status: DisplayStatus }) {
  const t = useTranslations("monitorStatus");

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])} />
      {t(status)}
    </span>
  );
}
