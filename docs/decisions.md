# Engineering decisions

The non-obvious trade-offs in StatusPulse, and why each was made.

## Scheduling

**External cron instead of an in-process scheduler.** Vercel's free tier can't
run a long-lived `node-cron` loop, and its own Cron Jobs run at most once a
day. An external cron service (cron-job.org) calls a secret-protected route
(`/api/cron/run-checks`) every 5 minutes instead. A GitHub Actions schedule
was the first choice, but in production it fired once in 13 hours, so the
workflow is now a manual trigger only. Cron timing still drifts by a few
seconds, so a monitor counts as due 30s early; otherwise a 5-minute monitor
would quietly slip to a 10-minute cadence.

**No job queue.** A stateless route hit by cron is enough at this scale. A
queue (BullMQ/Redis) would be more infrastructure with no current benefit.

**Staying inside the serverless time budget.** `lib/check-runner.ts` runs
checks through a small worker pool (10 at a time) with a 10s timeout each, so
one slow endpoint can't stall the batch and the route stays under its 60s
`maxDuration`. Each monitor is isolated: a database error while recording one
result is logged and counted, and the rest of the batch still runs.

## Checks and incidents

**Three consecutive failures before an incident.** A single failed check is
usually a network blip. `decideIncidentAction` is a pure function, so every
flapping scenario is a plain unit test. The failure count is stored on
`Monitor.consecutiveFailures`, so the runner never re-scans check history.

**SSRF protection.** Monitor URLs are user input fetched by our server. Every
request, including each redirect hop (redirects are followed manually), goes
through `assertPublicTarget`, which resolves the host and refuses loopback,
private, link-local (cloud metadata) and other reserved ranges. IPv6 is
compared as parsed hextets, not text, so IPv4-mapped (`::ffff:7f00:1`), NAT64
and 6to4 forms of a private IPv4 address are refused too.
`ALLOW_PRIVATE_TARGETS=true` turns this off for local development. Known gap:
the check resolves DNS separately from `fetch`, so a hostile DNS server could
answer differently the second time (DNS rebinding). Closing that means pinning
the resolved IP in a custom undici dispatcher.

The public status page shows when incidents happened, never the raw check
error, which can name hosts the page otherwise keeps private.

**Email is best-effort.** The check, monitor state and incident are written in
one transaction; the email goes out after commit, and a failed send is logged,
never thrown. Without `RESEND_API_KEY`, sending is a logged no-op so the app
works with no email account. Every account is alerted at its signup address;
the `NotificationChannel` model is in the schema for future per-channel
settings but isn't wired up yet.

## Data

**Uptime is aggregated in Postgres.** A 5-minute monitor writes ~26k checks
per 90 days, so pages never load raw check rows to count them. One
`COUNT(*) FILTER (...)` query returns the 24h/7d/30d/90d windows for every
monitor on a page, and a `date_trunc('day', ...)` query feeds the daily
uptime bars. Windows with no data show "—", not 0% or 100%.

**90-day retention.** Each cron run deletes checks older than the longest
window the UI shows, so the free-tier database doesn't grow forever. An index
on `Check.checkedAt` keeps that delete cheap.

**Denormalized current status.** `Monitor.lastStatus` / `lastCheckedAt` are
written by the check runner (their only writer), so the dashboard and status
page read a column instead of a "latest check per monitor" query.

**Migrations run during the build.** Vercel has no release-phase hook, so
`prisma migrate deploy` is part of `pnpm run build`. It's idempotent.

**Pooled and direct connection strings.** Serverless functions can exhaust
Neon's connection cap, so the app uses the pooled URL (`DATABASE_URL`) and
migrations use the direct one (`DIRECT_URL`), since `prisma migrate` can't run
through a pooler.

## Auth and tenancy

**Deliberately small auth scope.** NextAuth v5 with email + password (bcrypt)
and JWT sessions. Emails are normalized to lowercase, and a unique-constraint
violation is treated as "email taken" so concurrent signups return 409, not 500. Not built yet: email verification, password reset, login rate limiting.
NextAuth v5 is still beta, but it's the line that supports Next.js 16 /
React 19. `trustHost: true` is needed for non-Vercel hosts (Docker,
self-hosted).

**404, never 403, for someone else's data.** Every monitor query is scoped by
the signed-in user's id, so another account's monitor looks exactly like one
that doesn't exist. A 403 would confirm the id is real.

## UI

**French first, English second.** next-intl with locale-prefixed routes
(`/fr/...`, `/en/...`), the standard SEO-friendly pattern. All UI text lives
in `messages/*.json`; code and comments stay in English. `proxy.ts` (Next.js
16's name for middleware) chains locale routing with the session check.

**Custom shadcn/ui theme.** Teal/indigo palette, Space Grotesk headings,
manual light/dark toggle (status-page visitors should be able to override the
OS setting), and a `3xl` breakpoint so wide screens don't stretch layouts.
