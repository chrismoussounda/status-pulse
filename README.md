# StatusPulse

An uptime monitoring & public status-page tool. Add HTTP endpoints to watch; a
scheduled check runner detects incidents, sends notifications, and publishes a
shareable public status page per account.

> **Status:** early scaffold (Sprint 1, Epic 1). Auth, monitor CRUD, the check
> runner, and the public status page land over the next few tickets — see the
> [issues](../../issues) for the full backlog.

## Stack

Next.js (App Router) + TypeScript, Prisma + Postgres, NextAuth, Resend
(email), deployed on Vercel with a GitHub Actions cron workflow driving the
check runner. See **Engineering Decisions** below for why.

## Getting started

Requires Node 22+ and Docker.

```bash
git clone <repo-url>
cd status-pulse
cp .env.example .env      # defaults already match docker-compose.yml
docker compose up -d      # starts local Postgres
npm install                # also generates the Prisma client (postinstall)
npm run db:migrate         # applies migrations to the local database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                  | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start the dev server                          |
| `npm run build`         | Production build                              |
| `npm run lint`          | ESLint                                        |
| `npm run typecheck`     | Generate route types, then `tsc --noEmit`     |
| `npm run test`          | Run the test suite once (Vitest)              |
| `npm run test:watch`    | Run tests in watch mode                       |
| `npm run test:coverage` | Run tests with coverage                       |
| `npm run format`        | Format the codebase with Prettier             |
| `npm run format:check`  | Check formatting without writing              |
| `npm run db:migrate`    | Apply Prisma migrations to the local database |
| `npm run db:generate`   | Regenerate the Prisma client                  |

CI runs lint → typecheck → test → build (with migrations applied to a fresh
Postgres service container) on every pull request — see
`.github/workflows/ci.yml`.

## Engineering Decisions

**Why an external cron instead of an in-process scheduler.** Vercel's Hobby
tier can't run a persistent `node-cron` loop — serverless functions exit when
the request completes — and its own Cron Jobs feature is capped at once a day
on the free tier. Checks instead run behind a secured API route
(`/api/cron/run-checks`, protected by a `CRON_SECRET` bearer token) that a
GitHub Actions scheduled workflow calls every 5 minutes. It's a real
constraint of free-tier hosting, worked around with the simplest thing that
fits it — not hidden.

**Why no job queue.** At this scale, an external cron hitting a stateless
route is already the simplest thing that works. A queue (BullMQ/Redis) would
add infrastructure this project doesn't need yet — see the check-runner
concurrency note below for how the route itself stays within a serverless
timeout without one.

**Check-runner concurrency and timeout budget.** A single invocation of
`/api/cron/run-checks` checks every monitor due in that cycle. Run
unbounded in parallel, one slow endpoint could stall the whole batch and
exceed the function's `maxDuration`; run serially, and the batch scales
linearly with monitor count. The runner instead uses bounded concurrency
(a small worker pool) with a per-check `AbortController` timeout, sized so
`(due monitors ÷ concurrency) × per-check timeout` fits under the route's
time budget — documented here as the resulting capacity once implemented in
Epic 3.

**Why `directUrl` alongside `url` in the Prisma datasource.** Neon's free
tier has a real connection cap, and serverless functions can open a new
connection per invocation. Production uses the pooled (`-pooler`) connection
string for `DATABASE_URL` and the unpooled one for `DIRECT_URL`, since
`prisma migrate` can't run through a connection pooler. Locally, both point
at the same Docker Postgres instance.

**Auth scope.** Sign up/login uses NextAuth's Credentials provider with
bcrypt-hashed passwords — no email verification, password reset, or OAuth
providers in this scope. That's a deliberate cut to keep auth from eating
the time budget for the check runner and incident detection, which are the
parts of this project that aren't a CRUD-app rerun. What I'd add for
production: email verification, a password reset flow, and rate-limited
login attempts.

**Cross-tenant isolation.** Monitor and incident queries are scoped by the
authenticated user's ID, and a request for another user's resource returns
404 rather than 403 — a 403 would confirm the resource exists to someone who
shouldn't be able to tell that.

_(This section grows as each epic lands — the goal is that by ship, it
covers every non-obvious trade-off in the project, not just the ones above.)_
