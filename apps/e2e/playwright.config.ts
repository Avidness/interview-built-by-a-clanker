import { defineConfig, devices } from "@playwright/test";

// Ports 5173/5174/3001 may be in use by developer sessions, so the e2e
// suite always boots its own isolated API + web pair on dedicated ports.
const API_PORT = Number(process.env.E2E_API_PORT ?? 3101);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5273);
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

process.env.E2E_API_URL = API_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      // Both apps import @acme/shared from its dist, so build it first.
      command:
        "pnpm --filter @acme/shared build && pnpm --filter @acme/api exec tsx src/index.ts",
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(API_PORT),
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      command: `pnpm --filter @acme/web exec vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
