import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { updateMonitorSchema } from "@/lib/validation/monitor-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId, unauthorized } = await requireUserId();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ monitor });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId, unauthorized } = await requireUserId();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateMonitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Scoping the WHERE by userId (not just id) means a request for someone
  // else's monitor matches zero rows and falls into the same 404 branch as
  // a monitor that doesn't exist at all — never a 403, which would confirm
  // the id belongs to another account. See docs/decisions.md.
  const { count } = await prisma.monitor.updateMany({
    where: { id, userId },
    data: parsed.data,
  });

  if (count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const monitor = await prisma.monitor.findUnique({ where: { id } });
  return NextResponse.json({ monitor });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId, unauthorized } = await requireUserId();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { count } = await prisma.monitor.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
