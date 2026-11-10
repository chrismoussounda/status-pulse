import { describe, expect, it } from "vitest";
import { signupSchema } from "./auth-api";

describe("signupSchema", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "Ada@Example.com",
      password: "supersecret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // email is normalized to lowercase — matters because it's the unique lookup key.
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("rejects a missing name", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "ada@example.com",
      password: "supersecret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "not-an-email",
      password: "supersecret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});
