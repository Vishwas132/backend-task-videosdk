import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: ["node_modules/", "tests/", "coverage/"],
    },
  },
});