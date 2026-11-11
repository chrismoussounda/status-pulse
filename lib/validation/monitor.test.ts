import { describe, expect, it } from "vitest";
import { buildMonitorFormSchema } from "./monitor";

const schema = buildMonitorFormSchema((key) => key);

const valid = {
  name: "API",
  url: "https://example.com/health",
  method: "GET" as const,
  expectedStatus: 200,
  intervalSeconds: 300,
  isActive: true,
  isPublic: true,
};

describe("buildMonitorFormSchema", () => {
  it.each(["https://example.com", "http://example.com:8080/health"])("accepts %s", (url) => {
    expect(schema.safeParse({ ...valid, url }).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "file:///etc/passwd", "ftp://example.com", "not a url"])(
    "rejects %s",
    (url) => {
      const result = schema.safeParse({ ...valid, url });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("urlInvalid");
    },
  );
});
