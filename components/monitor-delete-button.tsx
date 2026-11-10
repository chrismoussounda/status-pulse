"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteMonitor } from "@/app/[locale]/dashboard/monitors/actions";

export function MonitorDeleteButton({ id }: { id: string }) {
  const t = useTranslations("monitorForm");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(() => {
      void deleteMonitor(id);
    });
  }

  return (
    <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
      <Trash2Icon className="size-4" />
      {t("delete")}
    </Button>
  );
}
