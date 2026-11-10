import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const input = { to: "owner@example.com", subject: "Down", html: "<p>Down</p>" };

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    send.mockReset();
  });

  it("no-ops without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendEmail } = await import("./send-email");
    await sendEmail(input);
    expect(send).not.toHaveBeenCalled();
  });

  it("uses EMAIL_FROM when set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Alerts <alerts@mydomain.dev>");
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    const { sendEmail } = await import("./send-email");
    await sendEmail(input);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Alerts <alerts@mydomain.dev>" }),
    );
  });

  it("throws when Resend returns an error instead of failing silently", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const { sendEmail } = await import("./send-email");
    await expect(sendEmail(input)).rejects.toThrow("domain not verified");
  });
});
