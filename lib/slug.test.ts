import { describe, expect, it } from "vitest";
import { generateStatusPageSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Status Page")).toBe("acme-status-page");
  });

  it("strips accents", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });

  it("collapses non-alphanumeric runs and trims edge hyphens", () => {
    expect(slugify("  --Hello, World!!--  ")).toBe("hello-world");
  });

  it("returns an empty string for input with no alphanumerics", () => {
    expect(slugify("***")).toBe("");
  });
});

describe("generateStatusPageSlug", () => {
  it("appends a random suffix to the slugified name", () => {
    const slug = generateStatusPageSlug("Acme Inc");
    expect(slug).toMatch(/^acme-inc-[a-z0-9]{4}$/);
  });

  it("falls back to 'status' when the name has no usable characters", () => {
    const slug = generateStatusPageSlug("!!!");
    expect(slug).toMatch(/^status-[a-z0-9]{4}$/);
  });

  it("produces different suffixes across calls", () => {
    const a = generateStatusPageSlug("Acme Inc");
    const b = generateStatusPageSlug("Acme Inc");
    // Not a hard guarantee with a 4-char alphabet, but collision odds are
    // low enough (1/36^4) that this is a reasonable smoke test.
    expect(a).not.toBe(b);
  });
});
