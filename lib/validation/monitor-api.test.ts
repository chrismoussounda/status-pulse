import { describe, expect, it } from "vitest";
import { createMonitorSchema, updateMonitorSchema } from "./monitor-api";

describe("createMonitorSchema", () => {
  it("accepts a minimal valid payload and fills in defaults", () => {
    const result = createMonitorSchema.safeParse({
      name: "Homepage",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe("GET");
      expect(result.data.expectedStatus).toBe(200);
      expect(result.data.intervalSeconds).toBe(300);
      expect(result.data.isPublic).toBe(true);
    }
  });

  it("rejects a non-URL string", () => {
    const result = createMonitorSchema.safeParse({ name: "Bad", url: "not a url" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-http(s) URL scheme", () => {
    const result = createMonitorSchema.safeParse({ name: "Bad", url: "ftp://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an interval below the floor", () => {
    const result = createMonitorSchema.safeParse({
      name: "Too fast",
      url: "https://example.com",
      intervalSeconds: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an interval above the ceiling", () => {
    const result = createMonitorSchema.safeParse({
      name: "Too slow",
      url: "https://example.com",
      intervalSeconds: 60 * 60 * 24 * 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = createMonitorSchema.safeParse({ name: "  ", url: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported HTTP method", () => {
    const result = createMonitorSchema.safeParse({
      name: "Bad method",
      url: "https://example.com",
      method: "DELETE",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMonitorSchema", () => {
  it("accepts a partial payload with a single field", () => {
    const result = updateMonitorSchema.safeParse({ name: "Renamed" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (no fields to change)", () => {
    const result = updateMonitorSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("still validates a provided field", () => {
    const result = updateMonitorSchema.safeParse({ url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("does not silently apply defaults for omitted fields", () => {
    const result = updateMonitorSchema.safeParse({ name: "Renamed" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Renamed" });
    }
  });
});
