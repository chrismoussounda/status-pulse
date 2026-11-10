import { ActivityIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, label = "StatusPulse" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight",
        className,
      )}
    >
      <ActivityIcon className="size-5 text-primary" />
      {label}
    </span>
  );
}
