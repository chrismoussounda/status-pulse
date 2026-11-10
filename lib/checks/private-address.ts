import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for the check runner. Monitors are user-supplied URLs fetched
 * from our server, so without this anyone with an account could point a
 * monitor at internal addresses (cloud metadata at 169.254.169.254,
 * localhost admin ports, the private VPC) and read status codes back.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const PRIVATE_IPV4_RANGES: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 3], // multicast + reserved + broadcast
];

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  // IPv4-mapped (::ffff:10.0.0.1) — judge by the embedded IPv4 address.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  // fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast.
  return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
}

export class PrivateTargetError extends Error {
  constructor() {
    super("Target resolves to a private or reserved network address");
    this.name = "PrivateTargetError";
  }
}

/**
 * Throws if the URL's host is, or resolves to, a non-public address.
 * Set ALLOW_PRIVATE_TARGETS=true to monitor localhost services in local dev.
 */
export async function assertPublicTarget(url: string): Promise<void> {
  if (process.env.ALLOW_PRIVATE_TARGETS === "true") return;

  // URL wraps IPv6 literals in brackets; strip them before checking.
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new PrivateTargetError();
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((entry) => entry.address);

  if (addresses.some(isPrivateAddress)) throw new PrivateTargetError();
}
