import { getTranslations } from "next-intl/server";
import { ActivitySquareIcon, BellRingIcon, GlobeIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function Home() {
  const t = await getTranslations("landing");

  const features = [
    {
      icon: ActivitySquareIcon,
      title: t("featureMonitoringTitle"),
      body: t("featureMonitoringBody"),
    },
    { icon: BellRingIcon, title: t("featureIncidentsTitle"), body: t("featureIncidentsBody") },
    { icon: GlobeIcon, title: t("featureStatusPageTitle"), body: t("featureStatusPageBody") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8 3xl:max-w-7xl">
        <span className="font-heading text-lg font-semibold tracking-tight">StatusPulse</span>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-20 3xl:max-w-7xl">
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-xl text-balance text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="h-11 px-6">
              {t("cta")}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-11 px-6">
              {t("secondaryCta")}
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="text-left">
              <CardHeader>
                <Icon className="size-5 text-primary" />
                <CardTitle className="mt-2 text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-16 text-sm text-muted-foreground">
          {t("underConstruction")}{" "}
          <a
            href="https://github.com/chrismoussounda/status-pulse/issues"
            className="font-medium underline underline-offset-2"
          >
            {t("issueTracker")}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
