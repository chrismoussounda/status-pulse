import { afterAll, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";
import { DELETE, GET, PATCH } from "./route";

// See app/api/monitors/route.test.ts for why this cast is needed — auth()'s
// overloaded type trips up plain ReturnType inference.
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
      email: `monitor-detail-${suffix}-${unique}@example.com`,
      passwordHash: "not-a-real-hash",
      name: "Test User",
      statusPageSlug: `test-${unique}`,
    },
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/monitors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(id: string) {
  return new Request(`http://localhost/api/monitors/${id}`, { method: "DELETE" });
}

const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

describe("GET/PATCH/DELETE /api/monitors/[id]", () => {
  it("returns the monitor to its owner", async () => {
    const owner = await createTestUser("owner");
    createdUserIds.push(owner.id);
    const monitor = await prisma.monitor.create({
      data: { name: "Mine", url: "https://example.com", userId: owner.id },
    });

    mockSession(owner.id);
    const res = await GET(
      new Request(`http://localhost/api/monitors/${monitor.id}`),
      ctx(monitor.id),
    );
    expect(res.status).toBe(200);
    const { monitor: found } = await res.json();
    expect(found.id).toBe(monitor.id);
  });

  it("returns 404, not 403, for another user's monitor across GET/PATCH/DELETE", async () => {
    const owner = await createTestUser("owner2");
    const intruder = await createTestUser("intruder");
    createdUserIds.push(owner.id, intruder.id);

    const monitor = await prisma.monitor.create({
      data: { name: "Mine", url: "https://example.com", userId: owner.id },
    });

    mockSession(intruder.id);

    const getRes = await GET(
      new Request(`http://localhost/api/monitors/${monitor.id}`),
      ctx(monitor.id),
    );
    expect(getRes.status).toBe(404);

    const patchRes = await PATCH(patchRequest(monitor.id, { name: "Hijacked" }), ctx(monitor.id));
    expect(patchRes.status).toBe(404);

    const deleteRes = await DELETE(deleteRequest(monitor.id), ctx(monitor.id));
    expect(deleteRes.status).toBe(404);

    const stillThere = await prisma.monitor.findUnique({ where: { id: monitor.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.name).toBe("Mine");
  });

  it("updates a monitor it owns", async () => {
    const owner = await createTestUser("owner3");
    createdUserIds.push(owner.id);
    const monitor = await prisma.monitor.create({
      data: { name: "Old name", url: "https://example.com", userId: owner.id },
    });

    mockSession(owner.id);
    const res = await PATCH(patchRequest(monitor.id, { name: "New name" }), ctx(monitor.id));
    expect(res.status).toBe(200);
    const { monitor: updated } = await res.json();
    expect(updated.name).toBe("New name");
  });

  it("rejects an empty update body with 400", async () => {
    const owner = await createTestUser("owner5");
    createdUserIds.push(owner.id);
    const monitor = await prisma.monitor.create({
      data: { name: "Untouched", url: "https://example.com", userId: owner.id },
    });

    mockSession(owner.id);
    const res = await PATCH(patchRequest(monitor.id, {}), ctx(monitor.id));
    expect(res.status).toBe(400);
  });

  it("deletes a monitor it owns", async () => {
    const owner = await createTestUser("owner4");
    createdUserIds.push(owner.id);
    const monitor = await prisma.monitor.create({
      data: { name: "To delete", url: "https://example.com", userId: owner.id },
    });

    mockSession(owner.id);
    const res = await DELETE(deleteRequest(monitor.id), ctx(monitor.id));
    expect(res.status).toBe(204);

    const gone = await prisma.monitor.findUnique({ where: { id: monitor.id } });
    expect(gone).toBeNull();
  });
});
