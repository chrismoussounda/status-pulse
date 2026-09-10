import { PrismaClient } from "@/app/generated/prisma/client";

// Reuse a single PrismaClient across hot reloads in dev (and across warm
// serverless invocations) instead of opening a new connection each time —
// see the Engineering Decisions section in the README for the Neon
// connection-pooling context this matters for.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
