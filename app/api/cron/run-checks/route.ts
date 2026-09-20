import { runDueChecks } from "@/lib/check-runner";
import { isValidCronSecret } from "@/lib/checks/verify-cron-secret";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isValidCronSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runDueChecks();
  return Response.json(result);
}
