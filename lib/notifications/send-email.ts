import { Resend } from "resend";

const FROM_ADDRESS = "StatusPulse <alerts@statuspulse.dev>";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Thin wrapper around Resend so the rest of the codebase depends on this
 * function's signature, not the SDK's. Without RESEND_API_KEY set (e.g.
 * local dev, or a demo deploy) it logs and no-ops instead of throwing —
 * notification delivery is a nice-to-have, not something that should
 * break the check runner for everyone else's monitors.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${input.to}: "${input.subject}"`);
    return;
  }

  await client.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
