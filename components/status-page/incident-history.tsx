import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format-timestamp";

type Incident = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  cause: string | null;
};

export async function IncidentHistory({ incidents }: { incidents: Incident[] }) {
  const [t, locale] = await Promise.all([getTranslations("statusPage"), getLocale()]);

  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noIncidents")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {incidents.map((incident) => (
        <li
          key={incident.id}
          className="flex flex-col gap-1 rounded-lg border border-border p-2.5 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {formatTimestamp(incident.startedAt, locale)}
              {incident.resolvedAt ? ` – ${formatTimestamp(incident.resolvedAt, locale)}` : ""}
            </span>
            <Badge variant={incident.resolvedAt ? "outline" : "destructive"}>
              {incident.resolvedAt ? t("resolved") : t("ongoing")}
            </Badge>
          </div>
          {incident.cause ? <span className="text-muted-foreground">{incident.cause}</span> : null}
        </li>
      ))}
    </ul>
  );
}
