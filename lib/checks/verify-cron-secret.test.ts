import { describe, expect, it } from "vitest";
import { isValidCronSecret } from "./verify-cron-secret";

describe("isValidCronSecret", () => {
  it("accepts a correctly formatted bearer token", () => {
    expect(isValidCronSecret("Bearer supersecret", "supersecret")).toBe(true);
  });

  it("rejects a missing Authorization header", () => {
    expect(isValidCronSecret(null, "supersecret")).toBe(false);
  });

  it("rejects when CRON_SECRET isn't configured, even with a header present", () => {
    expect(isValidCronSecret("Bearer supersecret", undefined)).toBe(false);
  });

  it("rejects when CRON_SECRET is an empty string", () => {
    expect(isValidCronSecret("Bearer ", "")).toBe(false);
  });

  it("rejects a wrong token", () => {
    expect(isValidCronSecret("Bearer wrong-token", "supersecret")).toBe(false);
  });

  it("rejects a header missing the 'Bearer ' prefix", () => {
    expect(isValidCronSecret("supersecret", "supersecret")).toBe(false);
  });

  it("rejects a token that differs only in length", () => {
    expect(isValidCronSecret("Bearer supersecret-extra", "supersecret")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isValidCronSecret("bearer supersecret", "supersecret")).toBe(false);
  });
});
