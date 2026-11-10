import { z } from "zod";

export const HTTP_METHODS = ["GET", "POST", "PUT", "HEAD"] as const;

// The GitHub Actions cron fires every 5 minutes at best, so anything finer
// than that is aspirational — but the floor still guards against a typo
// (e.g. "30" meant as minutes) creating a monitor no free-tier setup could
// actually honor. The ceiling just keeps the value sane.
const MIN_INTERVAL_SECONDS = 60;
const MAX_INTERVAL_SECONDS = 60 * 60 * 24;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  url: z.string().trim().refine(isHttpUrl, "Enter a valid http:// or https:// URL"),
  method: z.enum(HTTP_METHODS).default("GET"),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  intervalSeconds: z
    .number()
    .int()
    .min(MIN_INTERVAL_SECONDS, `Interval must be at least ${MIN_INTERVAL_SECONDS} seconds`)
    .max(MAX_INTERVAL_SECONDS, `Interval must be at most ${MAX_INTERVAL_SECONDS} seconds`)
    .default(300),
  isPublic: z.boolean().default(true),
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;

export const updateMonitorSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    url: z.string().trim().refine(isHttpUrl, "Enter a valid http:// or https:// URL"),
    method: z.enum(HTTP_METHODS),
    expectedStatus: z.number().int().min(100).max(599),
    intervalSeconds: z
      .number()
      .int()
      .min(MIN_INTERVAL_SECONDS, `Interval must be at least ${MIN_INTERVAL_SECONDS} seconds`)
      .max(MAX_INTERVAL_SECONDS, `Interval must be at most ${MAX_INTERVAL_SECONDS} seconds`),
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .partial();

export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
