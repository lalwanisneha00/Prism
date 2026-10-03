import { defineConfig, devices } from "@playwright/test";

/*
 * Browser checks of the main user flows (V2.5 onward). They run against a dev server that
 * uses the fake AI (LLM_PROVIDER=fake), so no Gemini quota is spent, in the Edge that is
 * already installed on Windows (no browser download). Every flow runs at desktop width and
 * at 375px, in light and dark mode.
 */

const PORT = 3210;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Edge"], colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Edge"], colorScheme: "dark" } },
    {
      name: "mobile-light",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      name: "mobile-dark",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { LLM_PROVIDER: "fake" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
