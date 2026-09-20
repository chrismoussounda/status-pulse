import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MonitorForm } from "@/components/monitor-form";
import { updateMonitor } from "@/app/[locale]/dashboard/monitors/actions";

export default async function EditMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!monitor) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{monitor.name}</h1>
      <MonitorForm
        mode="edit"
        defaultValues={{
          name: monitor.name,
          url: monitor.url,
          method: monitor.method,
          expectedStatus: monitor.expectedStatus,
          intervalSeconds: monitor.intervalSeconds,
          isActive: monitor.isActive,
          isPublic: monitor.isPublic,
        }}
        onSubmitAction={(values) => updateMonitor(monitor.id, values)}
      />
    </div>
  );
}
