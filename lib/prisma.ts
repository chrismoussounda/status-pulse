import path from "node:path";

import { PrismaClient } from "@/app/generated/prisma/client";

// On Vercel, Prisma can't locate its query engine by itself.
if (process.env.VERCEL) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY ??= path.join(
    process.cwd(),
    "app/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
  );
}

// Reuse a single PrismaClient across hot reloads in dev (and across warm
// serverless invocations) instead of opening a new connection each time —
// see docs/decisions.md for the Neon connection-pooling context this matters for.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
