import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 4187);
process.env.E2E_PORT = String(PORT);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  // The bundled static file server is single-threaded; run specs serially so parallel
  // workers don't starve it and time out. The suite is small and finishes in seconds.
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Keep general UI tests independent of cached workers. The dedicated
    // service-worker-safety spec enables SW and verifies first-claim preservation.
    serviceWorkers: "block"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/e2e/static-server.mjs",
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 20_000
  }
});
