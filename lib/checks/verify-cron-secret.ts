import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison so a wrong or brute-forced bearer token can't
 * be distinguished from a correct one by response timing. The length
 * check upfront leaks length, which is unavoidable with timingSafeEqual
 * (it throws on mismatched buffer lengths) and a non-issue for a
 * fixed-format secret like this one.
 */
export function isValidCronSecret(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret || !authorizationHeader) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  const provided = Buffer.from(authorizationHeader);

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
