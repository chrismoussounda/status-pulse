/**
 * Turns a display name into a URL-safe slug for a public status page
 * (e.g. "/status/acme-status-4f2a"). A short random suffix keeps two users
 * with the same name from colliding on the unique statusPageSlug column.
 */
export function generateStatusPageSlug(name: string): string {
  const base = slugify(name) || "status";
  const suffix = randomSuffix();
  return `${base}-${suffix}`;
}

const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "") // strip accents, e.g. "é" -> "e"
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomSuffix(length = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
