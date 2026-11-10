import { prisma } from "@/lib/prisma";
import { generateStatusPageSlug } from "@/lib/slug";

/**
 * generateStatusPageSlug() already appends a random suffix, so collisions
 * are rare — but "rare" isn't "never" against a unique column, and a
 * collision should retry rather than 500 the signup request.
 */
export async function generateUniqueStatusPageSlug(name: string, maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = generateStatusPageSlug(name);
    const existing = await prisma.user.findUnique({
      where: { statusPageSlug: slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not generate a unique status page slug after several attempts.");
}
