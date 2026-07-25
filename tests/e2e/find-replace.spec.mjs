import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T029: the find-and-replace rule mode, driven
// through the real preview UI. The first text input in a preview row is the target name.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

test("literal find-and-replace renames a file in the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "report-draft-v1.pdf");

  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "draft");
  await page.fill("#replaceInput", "final");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("report-final-v1.pdf");
});

test("regex find-and-replace with a capture group works in the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "IMG1234.jpg");

  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "img(\\d+)");
  await page.fill("#replaceInput", "photo$1");
  await page.check("#useRegexInput");
  await page.check("#caseInsensitiveInput");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("photo1234.jpg");
});
