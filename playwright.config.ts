import { defineConfig, devices } from "@playwright/test";

/* Worm Ranch has no browser-level coverage today: every existing test is a unit
   test under src/. This config drives the real shell so the launch -> game flow
   and the player-facing target-color mechanic are exercised end to end. */
const PORT = Number(process.env.E2E_PORT ?? 3317);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    /* A production build, not the dev server: layout.tsx pulls Space Grotesk
       through next/font/google, and the dev server blocks on that fetch on a
       network without gstatic access. `next build` works, so start from it. */
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
