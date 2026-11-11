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

/** Expands an IPv6 address (any notation, incl. a dotted IPv4 tail) to 8 hextets. */
function ipv6ToHextets(ip: string): number[] {
  let address = ip.toLowerCase().split("%")[0]; // drop a zone id like %eth0
  const dottedTail = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dottedTail) {
    const v4 = ipv4ToInt(dottedTail[1]);
    const tail = `${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
    address = address.slice(0, -dottedTail[1].length) + tail;
  }
  const [head, rest] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const restParts = rest ? rest.split(":") : [];
  const zeros = rest === undefined ? [] : Array(8 - headParts.length - restParts.length).fill("0");
  return [...headParts, ...zeros, ...restParts].map((part) => parseInt(part, 16));
}

function hextetsToIpv4(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function isPrivateIpv6(ip: string): boolean {
  const h = ipv6ToHextets(ip);
  const firstSixZero = h.slice(0, 6).every((part) => part === 0);
  const embeddedIpv4 = hextetsToIpv4(h[6], h[7]);

  // ::/128 unspecified, ::1/128 loopback, and the deprecated ::/96
  // IPv4-compatible form (::a.b.c.d) — all of ::/96 is non-public.
  if (firstSixZero) return true;
  // ::ffff:0:0/96 IPv4-mapped. URL parsing rewrites ::ffff:127.0.0.1 to
  // ::ffff:7f00:1, so this must work on hextets, not the dotted text form.
  if (h.slice(0, 5).every((part) => part === 0) && h[5] === 0xffff) {
    return isPrivateIpv4(embeddedIpv4);
  }
  // 64:ff9b::/96 NAT64 — the gateway forwards to the embedded IPv4 address.
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((part) => part === 0)) {
    return isPrivateIpv4(embeddedIpv4);
  }
  // 2002::/16 6to4 — the tunnel endpoint is the IPv4 address in hextets 1–2.
  if (h[0] === 0x2002) return isPrivateIpv4(hextetsToIpv4(h[1], h[2]));

  return (
    (h[0] & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (h[0] & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (h[0] & 0xff00) === 0xff00 // ff00::/8 multicast
  );
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
