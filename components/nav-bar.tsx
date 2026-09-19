import { getTranslations } from "next-intl/server";
import { ActivityIcon, LogOutIcon } from "lucide-react";

import { signOutAction } from "@/lib/actions/signout";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

type NavBarProps = {
  user: { name: string | null; email: string };
};

export async function NavBar({ user }: NavBarProps) {
  const t = await getTranslations("nav");

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 3xl:max-w-7xl">
        <Link href="/dashboard" className="flex items-center gap-2 font-heading font-semibold">
          <ActivityIcon className="size-5 text-primary" />
          <span>StatusPulse</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name ?? user.email}
          </span>
          <LocaleSwitcher />
          <ThemeToggle />
          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" aria-label={t("logout")}>
              <LogOutIcon className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
