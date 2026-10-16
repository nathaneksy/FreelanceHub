import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.js",
  workers: 1,
  timeout: 60000,
  use: {
    headless: true,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    },
  },
  reporter: "list",
});
