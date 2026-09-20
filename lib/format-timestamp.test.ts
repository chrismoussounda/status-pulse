import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./format-timestamp";

describe("formatTimestamp", () => {
  const date = new Date("2026-09-10T08:44:00Z");

  it("formats in UTC regardless of the runtime's local timezone", () => {
    expect(formatTimestamp(date, "en-US")).toContain("UTC");
  });

  it("renders locale-appropriate month names", () => {
    expect(formatTimestamp(date, "en-US")).toMatch(/Sep/);
    expect(formatTimestamp(date, "fr-FR")).toMatch(/sept/i);
  });
});
