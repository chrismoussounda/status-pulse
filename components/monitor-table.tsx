"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { toggleMonitorActive } from "@/app/[locale]/dashboard/monitors/actions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonitorStatusBadge, type DisplayStatus } from "@/components/monitor-status-badge";

export type MonitorRow = {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  isPublic: boolean;
  uptimePercent: number;
  displayStatus: DisplayStatus;
};

export function MonitorTable({ monitors }: { monitors: MonitorRow[] }) {
  const t = useTranslations("dashboard.table");

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("monitor")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("uptime")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("public")}</TableHead>
            <TableHead className="text-right">{t("active")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monitors.map((monitor) => (
            <MonitorRowItem key={monitor.id} monitor={monitor} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MonitorRowItem({ monitor }: { monitor: MonitorRow }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("dashboard.badge");

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleMonitorActive(monitor.id, checked);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Link href={`/dashboard/monitors/${monitor.id}`} className="flex flex-col gap-0.5">
          <span className="font-medium">{monitor.name}</span>
          <span className="truncate text-xs text-muted-foreground">{monitor.url}</span>
        </Link>
      </TableCell>
      <TableCell>
        <MonitorStatusBadge status={monitor.displayStatus} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">{monitor.uptimePercent}%</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant={monitor.isPublic ? "default" : "outline"}>
          {monitor.isPublic ? t("public") : t("private")}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Switch
          checked={monitor.isActive}
          disabled={isPending}
          onCheckedChange={handleToggle}
          aria-label={monitor.name}
        />
      </TableCell>
    </TableRow>
  );
}
