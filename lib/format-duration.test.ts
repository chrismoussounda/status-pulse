import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(12 * 60_000)).toBe("12 minutes");
  });

  it("uses singular minute", () => {
    expect(formatDuration(60_000)).toBe("1 minute");
  });

  it("formats hours only", () => {
    expect(formatDuration(2 * 60 * 60_000)).toBe("2 hours");
  });

  it("formats hours and minutes together", () => {
    expect(formatDuration(2 * 60 * 60_000 + 15 * 60_000)).toBe("2 hours 15 minutes");
  });

  it("rounds up to at least 1 minute", () => {
    expect(formatDuration(500)).toBe("1 minute");
  });
});
