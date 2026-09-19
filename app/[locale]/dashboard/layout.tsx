import { getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { NavBar } from "@/components/nav-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) {
    redirect({ href: "/login", locale });
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar user={{ name: session.user.name ?? null, email: session.user.email ?? "" }} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8 3xl:max-w-7xl">
        {children}
      </main>
    </div>
  );
}
