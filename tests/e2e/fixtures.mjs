import { test as base, expect } from "@playwright/test";

// Shared fixture for all e2e specs: disable the floating pet companion via saved
// settings before the app loads. The pet drifts across the page and can hover over
// small controls, intercepting Playwright clicks (hit-test failures). Hiding it keeps
// interactions deterministic without changing app behavior.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "batch-file-renamer.settings",
          JSON.stringify({ petEnabled: false })
        );
      } catch {
        // Ignore storage failures; the pet just stays enabled.
      }
    });
    await use(page);
  }
});

export { expect };
