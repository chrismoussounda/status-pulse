import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "app/generated"],
    // Integration tests share one real Postgres instance, and the cron route
    // scans monitors across all users by design, so files run sequentially.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
