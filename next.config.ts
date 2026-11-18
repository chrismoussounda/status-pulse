import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // File tracing misses the Prisma query engine.
  outputFileTracingIncludes: {
    "/**": ["./app/generated/prisma/*.node"],
  },
};

export default withNextIntl(nextConfig);
