import { Prisma } from "@/app/generated/prisma/client";

/**
 * True when a write failed on a unique constraint (Prisma P2002). The
 * "check then insert" pattern still races under concurrent requests, so
 * callers treat this as the authoritative "already exists" signal.
 */
export function isUniqueViolation(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  return field === undefined || JSON.stringify(err.meta?.target ?? "").includes(field);
}
