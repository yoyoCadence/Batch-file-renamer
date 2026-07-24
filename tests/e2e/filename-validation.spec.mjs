import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T027: Windows reserved-name and
// trailing dot/space validation, checked against the real shipped app in Chromium.

test("app shell loads without uncaught errors", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/index.html");
  await expect(page.locator("#previewBody")).toBeAttached();
  await expect(page.locator(".status-legend")).toBeVisible();
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("shipped rules.js flags reserved and trailing names in the browser engine", async ({ page }) => {
  await page.goto("/index.html");
  const result = await page.evaluate(async () => {
    const rules = await import("./assets/rules.js");
    const reserved = rules.validateRows([
      { action: "Rename", sourceName: "a.txt", sourcePath: "S/a.txt", targetName: "CON.txt", targetFolder: "S" }
    ])[0].status;
    const trailing = rules.validateRows([
      { action: "Rename", sourceName: "a.txt", sourcePath: "S/a.txt", targetName: "report.", targetFolder: "S" }
    ])[0].status;
    return {
      isReserved: rules.isReservedFilename("com1.PDF"),
      notReserved: rules.isReservedFilename("console.txt"),
      trailingFlag: rules.hasTrailingDotOrSpace("draft "),
      reserved,
      trailing
    };
  });
  expect(result.isReserved).toBe(true);
  expect(result.notReserved).toBe(false);
  expect(result.trailingFlag).toBe(true);
  expect(result.reserved).toBe("Reserved name");
  expect(result.trailing).toBe("Trailing dot or space");
});

test("preview UI shows the reserved-name status for a CON.* target", async ({ page }) => {
  await page.goto("/index.html");
  // Force English so the visible status label is deterministic.
  // The language select lives inside the settings drawer, so open it first.
  await page.click("#openSettingsButton");
  await page.selectOption("#languageSelect", "en");
  await page.click("#closeSettingsButton");

  // Add a source file through the preview-only file input.
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, "aaa.txt");
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);

  // Character rule: replace the first 3 characters with "CON" -> "CON.txt" (reserved).
  await page.selectOption("#targetSelect", "Character");
  await page.fill("#charStartInput", "1");
  await page.fill("#charLengthInput", "3");
  await page.selectOption("#valueModeSelect", "Static");
  await page.fill("#staticInput", "CON");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  const pill = page.locator("#previewBody tr .status-pill").first();
  await expect(pill).toBeVisible();
  const [text, cls] = await pill.evaluate((el) => [el.textContent.trim(), el.className]);
  expect(text).toBe("Reserved name (Windows)");
  expect(cls).toContain("warn");
});
