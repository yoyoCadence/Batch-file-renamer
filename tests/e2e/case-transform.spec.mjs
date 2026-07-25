import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T030: the case-transform rule mode, driven
// through the real preview UI. The first text input in a preview row is the target name.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

test("Title Case transform renames a file in the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "my-report_draft.txt");

  await page.selectOption("#targetSelect", "Case");
  await page.selectOption("#caseModeSelect", "title");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("My-Report_Draft.txt");
});

test("UPPERCASE transform keeps the extension untouched", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "My-Report_v2.PDF");

  await page.selectOption("#targetSelect", "Case");
  await page.selectOption("#caseModeSelect", "upper");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("MY-REPORT_V2.PDF");
});
