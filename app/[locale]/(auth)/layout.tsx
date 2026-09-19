import { ActivityIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 sm:px-6">
      <div className="mb-8 flex w-full max-w-sm items-center justify-between sm:max-w-md">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <ActivityIcon className="size-5 text-primary" />
          StatusPulse
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <div className="w-full max-w-sm sm:max-w-md">{children}</div>
    </div>
  );
}
