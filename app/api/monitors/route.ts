import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { createMonitorSchema } from "@/lib/validation/monitor-api";

export async function GET() {
  const { userId, unauthorized } = await requireUserId();
  if (unauthorized) return unauthorized;

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ monitors });
}

export async function POST(request: Request) {
  const { userId, unauthorized } = await requireUserId();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createMonitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const monitor = await prisma.monitor.create({
    data: { ...parsed.data, userId },
  });

  return NextResponse.json({ monitor }, { status: 201 });
}
