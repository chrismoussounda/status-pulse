import { afterAll, describe, expect, it } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";

// Hits a real Postgres database (see the CI workflow's Postgres service
// container and `prisma migrate deploy` step). Run `docker compose up -d
// && npm run db:migrate` locally before `npm test` for these to pass.

function postSignup(body: unknown) {
  return POST(
    new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

describe("POST /api/signup", () => {
  it("creates a user with a hashed password and a unique status page slug", async () => {
    const email = `signup-${crypto.randomUUID()}@example.com`;
    createdEmails.push(email);

    const res = await postSignup({ name: "Ada Lovelace", email, password: "supersecret123" });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.user.email).toBe(email);
    expect(body.user.statusPageSlug).toMatch(/^ada-lovelace-[a-z0-9]{4}$/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).not.toBe("supersecret123");
  });

  it("rejects a duplicate email with 409 and does not create a second row", async () => {
    const email = `signup-${crypto.randomUUID()}@example.com`;
    createdEmails.push(email);

    const first = await postSignup({ name: "Grace Hopper", email, password: "supersecret123" });
    expect(first.status).toBe(201);

    const second = await postSignup({ name: "Grace Hopper", email, password: "anotherpassword" });
    expect(second.status).toBe(409);

    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("rejects invalid input with 400 before touching the database", async () => {
    const res = await postSignup({ name: "", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
  });
});
