import { prisma } from "@/lib/prisma";

// The longest window the UI shows is 90 days; anything older is dead weight
// on a free-tier database (~26k rows per 5-minute monitor per 90 days).
export const CHECK_RETENTION_DAYS = 90;

export async function pruneOldChecks(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - CHECK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.check.deleteMany({ where: { checkedAt: { lt: cutoff } } });
  return count;
}
