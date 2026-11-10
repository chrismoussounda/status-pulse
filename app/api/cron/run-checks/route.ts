import { runDueChecks } from "@/lib/check-runner";
import { pruneOldChecks } from "@/lib/checks/prune-old-checks";
import { isValidCronSecret } from "@/lib/checks/verify-cron-secret";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isValidCronSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runDueChecks();
  // Housekeeping is best-effort: a failed cleanup must not fail the run.
  const pruned = await pruneOldChecks().catch((err: unknown) => {
    console.error("Failed to prune old checks", err);
    return 0;
  });

  return Response.json({ ...result, pruned });
}
