import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateUniqueStatusPageSlug } from "@/lib/generate-unique-status-slug";
import { signupSchema } from "@/lib/validation/auth-api";
import { isUniqueViolation } from "@/lib/is-unique-violation";

const EMAIL_TAKEN = "An account with this email already exists.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
  }

  const [passwordHash, statusPageSlug] = await Promise.all([
    hashPassword(password),
    generateUniqueStatusPageSlug(name),
  ]);

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, statusPageSlug },
      select: { id: true, email: true, name: true, statusPageSlug: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    // Lost a race with a concurrent signup for the same email.
    if (isUniqueViolation(err, "email")) {
      return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
    }
    throw err;
  }
}
