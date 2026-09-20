import { getTranslations } from "next-intl/server";

export default async function StatusPageNotFound() {
  const t = await getTranslations("statusPage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundBody")}</p>
    </div>
  );
}
