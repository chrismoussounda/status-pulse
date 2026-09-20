import { sendEmail } from "./send-email";
import { formatDuration } from "@/lib/format-duration";

export type IncidentEmailContext = {
  monitorName: string;
  monitorUrl: string;
  ownerEmail: string;
  startedAt: Date;
};

export type IncidentResolvedContext = IncidentEmailContext & { resolvedAt: Date };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildIncidentOpenedEmail(ctx: IncidentEmailContext) {
  const name = escapeHtml(ctx.monitorName);
  const url = escapeHtml(ctx.monitorUrl);
  return {
    subject: `StatusPulse: ${ctx.monitorName} is down`,
    html: `<p><strong>${name}</strong> (${url}) stopped responding as expected.</p><p>Incident opened at ${ctx.startedAt.toISOString()}.</p>`,
  };
}

export function buildIncidentResolvedEmail(ctx: IncidentResolvedContext) {
  const name = escapeHtml(ctx.monitorName);
  const url = escapeHtml(ctx.monitorUrl);
  const duration = formatDuration(ctx.resolvedAt.getTime() - ctx.startedAt.getTime());
  return {
    subject: `StatusPulse: ${ctx.monitorName} recovered`,
    html: `<p><strong>${name}</strong> (${url}) is back up.</p><p>It was down for ${duration}.</p>`,
  };
}

export async function notifyIncidentOpened(ctx: IncidentEmailContext): Promise<void> {
  const { subject, html } = buildIncidentOpenedEmail(ctx);
  await sendEmail({ to: ctx.ownerEmail, subject, html });
}

export async function notifyIncidentResolved(ctx: IncidentResolvedContext): Promise<void> {
  const { subject, html } = buildIncidentResolvedEmail(ctx);
  await sendEmail({ to: ctx.ownerEmail, subject, html });
}
