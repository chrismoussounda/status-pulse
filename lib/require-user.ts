import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Every /api/monitors handler needs the same "who's asking?" check before
 * touching the database — this centralizes it so the 401 response and the
 * session lookup can't drift apart across endpoints.
 */
export async function requireUserId(): Promise<
  { userId: string; unauthorized?: undefined } | { userId?: undefined; unauthorized: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}
