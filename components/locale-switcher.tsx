"use client";

import { useLocale } from "next-intl";
import { LanguagesIcon } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_LABEL: Record<string, string> = {
  fr: "Français",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Switch language">
            <LanguagesIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {routing.locales.map((code) => (
          <DropdownMenuItem key={code} onClick={() => switchTo(code)} data-active={code === locale}>
            {LOCALE_LABEL[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
