import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T037: rule cards, rule-engine errors, and placeholder
// folder labels must render in the selected interface language instead of leaking the
// internal English enum / message / literal.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

async function setLanguage(page, language) {
  await page.click("#openSettingsButton");
  await page.selectOption("#languageSelect", language);
  await page.click("#closeSettingsButton");
}

test("rule cards show the localized target name, not the raw enum", async ({ page }) => {
  await page.goto("/index.html");

  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "a");
  await page.fill("#replaceInput", "b");
  await page.click("#addRuleButton");

  const card = page.locator("#ruleList li:first-child .rule-summary strong");
  await expect(card).toHaveText("1. 取代");
  await expect(card).not.toHaveText(/Replace/);

  await setLanguage(page, "ja");
  await expect(card).toHaveText("1. 置換");
});

test("a rule that cannot apply reports a localized, actionable reason", async ({ page }) => {
  await page.goto("/index.html");
  // "nodashes.txt" has no "-", so asking for segment 3 cannot resolve.
  await addPreviewFile(page, "nodashes.txt");

  await page.selectOption("#targetSelect", "Segment");
  await page.fill("#delimiterInput", "-");
  await page.fill("#segmentInput", "3");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const status = page.locator("#previewBody tr:first-child .status-pill");
  await expect(status).toHaveText("錯誤: 這個檔名用「-」切不出第 3 段（只有 1 段）。");
  await expect(status).not.toHaveText(/out of range/);

  await setLanguage(page, "en");
  await expect(status).toHaveText('Error: This name has no segment 3 when split by "-" (only 1).');
});

test("preview-only sources report a localized folder label", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "sample.txt");

  await page.selectOption("#targetSelect", "Case");
  await page.selectOption("#caseModeSelect", "upper");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const folderInput = page.locator("#previewBody tr:first-child input[type='text']").nth(1);
  await expect(folderInput).toHaveValue("瀏覽器選取的檔案");
  await expect(folderInput).not.toHaveValue("Browser files");
});
