import { afterAll, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

// auth() reads cookies via next/headers, which has no request context when
// a route handler is invoked directly in a test — mocking it lets us drive
// the session our own code sees without reimplementing NextAuth's cookie
// machinery. A real Postgres instance still backs every query below (see
// the CI Postgres service; needs `docker compose up` to pass locally).
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";
import { GET, POST } from "./route";

// `auth` is overloaded (plain session lookup vs. wrapping a middleware
// handler), which trips up naive ReturnType inference — casting through
// the real Session type (via unknown, since the shapes don't structurally
// overlap) is the annotation TypeScript actually needs here.
const mockAuth = vi.mocked(auth) as unknown as {
  mockResolvedValue: (value: Session | null) => void;
};

function mockSession(userId: string) {
  mockAuth.mockResolvedValue({
    user: { id: userId, email: `${userId}@example.com`, name: "Test User" },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  });
}

async function createTestUser(suffix: string) {
  const unique = crypto.randomUUID();
  return prisma.user.create({
    data: {
      email: `monitors-${suffix}-${unique}@example.com`,
      passwordHash: "not-a-real-hash",
      name: "Test User",
      statusPageSlug: `test-${unique}`,
    },
  });
}

function postMonitors(body: unknown) {
  return POST(
    new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

describe("GET/POST /api/monitors", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("creates a monitor for the authenticated user and lists it back", async () => {
    const user = await createTestUser("owner");
    createdUserIds.push(user.id);
    mockSession(user.id);

    const createRes = await postMonitors({
      name: "Example",
      url: "https://example.com",
      intervalSeconds: 300,
    });
    expect(createRes.status).toBe(201);
    const { monitor } = await createRes.json();
    expect(monitor.userId).toBe(user.id);
    expect(monitor.method).toBe("GET");
    expect(monitor.expectedStatus).toBe(200);

    const listRes = await GET();
    expect(listRes.status).toBe(200);
    const { monitors } = await listRes.json();
    expect(monitors.map((m: { id: string }) => m.id)).toContain(monitor.id);
  });

  it("rejects an invalid URL with 400", async () => {
    const user = await createTestUser("badurl");
    createdUserIds.push(user.id);
    mockSession(user.id);

    const res = await postMonitors({ name: "Bad", url: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("rejects an interval outside the allowed range with 400", async () => {
    const user = await createTestUser("badinterval");
    createdUserIds.push(user.id);
    mockSession(user.id);

    const res = await postMonitors({
      name: "Too fast",
      url: "https://example.com",
      intervalSeconds: 5,
    });
    expect(res.status).toBe(400);
  });

  it("only lists the authenticated user's own monitors", async () => {
    const userA = await createTestUser("a");
    const userB = await createTestUser("b");
    createdUserIds.push(userA.id, userB.id);

    mockSession(userA.id);
    await postMonitors({ name: "A's monitor", url: "https://a.example.com" });

    mockSession(userB.id);
    const res = await GET();
    const { monitors } = await res.json();
    expect(monitors).toHaveLength(0);
  });
});
