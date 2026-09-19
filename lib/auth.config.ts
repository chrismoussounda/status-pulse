import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config — no bcrypt, no Prisma client, both
 * of which can't run in the Edge middleware runtime. The Credentials
 * provider itself is added on top of this in lib/auth.ts for the Node
 * runtime (route handlers, server actions).
 */
export const authConfig: NextAuthConfig = {
  // Required for any deployment that isn't auto-detected Vercel (self-hosted,
  // Docker, etc.) — otherwise NextAuth rejects every request with
  // "UntrustedHost" since it can't verify the incoming Host header against a
  // known deployment platform. Safe here because CRON_SECRET/session cookies
  // are still what actually gate access, not the host check.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) return isLoggedIn;
      return true;
    },
  },
  providers: [],
};
