import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/game/**/*.test.ts", "src/components/**/*.test.ts", "src/lib/**/*.test.ts"],
  },
});