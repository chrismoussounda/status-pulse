import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { assertPublicTarget, isPrivateAddress, PrivateTargetError } from "./private-address";

const mockLookup = vi.mocked(lookup) as unknown as {
  mockResolvedValue: (value: { address: string; family: number }[]) => void;
};

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "255.255.255.255",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    // The hex forms URL parsing produces for IPv4-mapped addresses.
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "0:0:0:0:0:ffff:7f00:1",
    "::7f00:1",
    "64:ff9b::7f00:1",
    "64:ff9b::169.254.169.254",
    "2002:7f00:1::1",
    "FE80::1",
    "fe80::1%eth0",
    "ff02::1",
  ])("flags %s as private", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1",
    "93.184.216.34",
    "2606:4700::1111",
    "::ffff:808:808",
    "64:ff9b::808:808",
    "2002:808:808::1",
  ])("allows public address %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("assertPublicTarget", () => {
  const original = process.env.ALLOW_PRIVATE_TARGETS;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_PRIVATE_TARGETS;
    else process.env.ALLOW_PRIVATE_TARGETS = original;
  });

  it("rejects localhost and private IP literals without a DNS lookup", async () => {
    delete process.env.ALLOW_PRIVATE_TARGETS;
    await expect(assertPublicTarget("http://localhost:3000")).rejects.toThrow(PrivateTargetError);
    await expect(assertPublicTarget("http://169.254.169.254/latest")).rejects.toThrow(
      PrivateTargetError,
    );
    await expect(assertPublicTarget("http://[::1]/")).rejects.toThrow(PrivateTargetError);
    // URL parsing turns this into [::ffff:7f00:1]; it must still be caught.
    await expect(assertPublicTarget("http://[::ffff:127.0.0.1]/")).rejects.toThrow(
      PrivateTargetError,
    );
    await expect(assertPublicTarget("http://[64:ff9b::a9fe:a9fe]/")).rejects.toThrow(
      PrivateTargetError,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    delete process.env.ALLOW_PRIVATE_TARGETS;
    mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(assertPublicTarget("https://internal.example.com")).rejects.toThrow(
      PrivateTargetError,
    );
  });

  it("allows a hostname that resolves to public addresses", async () => {
    delete process.env.ALLOW_PRIVATE_TARGETS;
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertPublicTarget("https://example.com")).resolves.toBeUndefined();
  });

  it("can be disabled for local development", async () => {
    process.env.ALLOW_PRIVATE_TARGETS = "true";
    await expect(assertPublicTarget("http://localhost:3000")).resolves.toBeUndefined();
  });
});
