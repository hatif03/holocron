import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@holocron/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
    include: ["src/**/*.test.ts"],
  },
});
