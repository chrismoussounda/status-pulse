import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";

import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createIntlMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(/.*)?$`);
  const match = pathname.match(localePattern);
  const locale = match?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale = match?.[2] ?? pathname;

  if (pathWithoutLocale.startsWith("/dashboard") && !req.auth?.user) {
    return Response.redirect(new URL(`/${locale}/login`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
