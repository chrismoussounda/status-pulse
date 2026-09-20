import { getTranslations } from "next-intl/server";

import { MonitorForm } from "@/components/monitor-form";
import { createMonitor } from "@/app/[locale]/dashboard/monitors/actions";

export default async function NewMonitorPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("newMonitor")}</h1>
      <MonitorForm onSubmitAction={createMonitor} mode="create" />
    </div>
  );
}
