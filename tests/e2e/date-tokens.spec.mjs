import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T031: date tokens inside a Static value expand in
// the preview. A fixed clock makes the expected date deterministic.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

test("date tokens in a Static value expand in the preview", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 6, 25, 10, 30, 0)); // 2026-07-25 local
  await page.goto("/index.html");
  await addPreviewFile(page, "doc.txt");

  // Character insert at position 1 with a dated Static value -> "2026-07-25_doc.txt".
  await page.selectOption("#targetSelect", "Character");
  await page.fill("#charStartInput", "1");
  await page.fill("#charLengthInput", "0");
  await page.selectOption("#valueModeSelect", "Static");
  await page.fill("#staticInput", "{yyyy-MM-dd}_");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("2026-07-25_doc.txt");
});
