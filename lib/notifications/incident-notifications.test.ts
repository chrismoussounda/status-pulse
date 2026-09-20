import { describe, expect, it, vi } from "vitest";

vi.mock("./send-email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { sendEmail } from "./send-email";
import {
  buildIncidentOpenedEmail,
  buildIncidentResolvedEmail,
  notifyIncidentOpened,
  notifyIncidentResolved,
} from "./incident-notifications";

describe("buildIncidentOpenedEmail", () => {
  it("includes the monitor name and url", () => {
    const email = buildIncidentOpenedEmail({
      monitorName: "Homepage",
      monitorUrl: "https://example.com",
      ownerEmail: "owner@example.com",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(email.subject).toContain("Homepage");
    expect(email.html).toContain("Homepage");
    expect(email.html).toContain("https://example.com");
  });

  it("escapes HTML in a user-supplied monitor name", () => {
    const email = buildIncidentOpenedEmail({
      monitorName: "<script>alert(1)</script>",
      monitorUrl: "https://example.com",
      ownerEmail: "owner@example.com",
      startedAt: new Date(),
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("buildIncidentResolvedEmail", () => {
  it("reports how long the incident lasted", () => {
    const email = buildIncidentResolvedEmail({
      monitorName: "Homepage",
      monitorUrl: "https://example.com",
      ownerEmail: "owner@example.com",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      resolvedAt: new Date("2026-01-01T00:12:00.000Z"),
    });
    expect(email.html).toContain("12 minutes");
  });
});

describe("notifyIncidentOpened / notifyIncidentResolved", () => {
  it("sends the opened email to the monitor owner", async () => {
    await notifyIncidentOpened({
      monitorName: "Homepage",
      monitorUrl: "https://example.com",
      ownerEmail: "owner@example.com",
      startedAt: new Date(),
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: expect.stringContaining("down"),
      }),
    );
  });

  it("sends the resolved email to the monitor owner", async () => {
    await notifyIncidentResolved({
      monitorName: "Homepage",
      monitorUrl: "https://example.com",
      ownerEmail: "owner@example.com",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      resolvedAt: new Date("2026-01-01T00:05:00.000Z"),
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: expect.stringContaining("recovered"),
      }),
    );
  });
});
