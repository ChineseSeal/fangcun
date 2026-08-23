import { defineConfig, devices } from "@playwright/test";

// Keep E2E isolated from the developer's usual :3000 server and its .next directory.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const devServerUrl = new URL(baseURL);
const devServerPort = devServerUrl.port || "3000";
const devServerDistDir = `.next-playwright-${devServerPort}`;
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const protectionBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    // Fresh dev servers compile the Unicode glyph route on first use; production
    // latency is measured separately, so assertions allow that one-time compile.
    timeout: 10_000,
  },
  // Next dev rewrites manifests and webpack packs while compiling MDX and
  // dynamic routes. Serialize E2E so one isolated distDir has a single writer.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    extraHTTPHeaders: protectionBypassSecret
      ? {
          "x-vercel-protection-bypass": protectionBypassSecret,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
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
  webServer: usesExternalServer
    ? undefined
    : {
        command: `NEXT_DIST_DIR=${devServerDistDir} pnpm exec next dev --hostname ${devServerUrl.hostname} --port ${devServerPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
