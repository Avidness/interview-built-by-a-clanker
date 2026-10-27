import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Kept separate from vite.config.ts so unit tests do not load the TanStack
// router plugin (which regenerates routeTree.gen.ts) or Tailwind.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    clearMocks: true,
    passWithNoTests: true,
  },
});
