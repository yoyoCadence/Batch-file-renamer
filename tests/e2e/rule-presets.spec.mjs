import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T042: the beginner presets must be reachable from the
// rule builder and produce the expected names, without the user working out Segment or
// Character offsets.

async function loadFolder(page, files) {
  await page.addInitScript(installFakeFileSystem, files);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText(Object.keys(files)[0]);
}

const targetName = (page) => page.locator('#previewBody tr:first-child input[type="text"]').first();

test("add prefix renames without any offset arithmetic", async ({ page }) => {
  await loadFolder(page, { "photo.jpg": "x" });

  await page.selectOption("#targetSelect", "Affix");
  await page.selectOption("#affixPositionSelect", "prefix");
  await page.fill("#affixTextInput", "2024_");
  // The sample updates before the rule is even added.
  await expect(page.locator("#sampleOutput")).toHaveText("2024_photo.jpg");

  await page.click("#addRuleButton");
  await expect(targetName(page)).toHaveValue("2024_photo.jpg");
});

test("add suffix appends before the extension", async ({ page }) => {
  await loadFolder(page, { "photo.jpg": "x" });

  await page.selectOption("#targetSelect", "Affix");
  await page.selectOption("#affixPositionSelect", "suffix");
  await page.fill("#affixTextInput", "_final");
  await page.click("#addRuleButton");

  await expect(targetName(page)).toHaveValue("photo_final.jpg");
});

test("change extension replaces the extension and leaves the name alone", async ({ page }) => {
  await loadFolder(page, { "photo.jpeg": "x" });

  await page.selectOption("#targetSelect", "Extension");
  await page.fill("#newExtensionInput", "jpg");
  await page.click("#addRuleButton");

  await expect(targetName(page)).toHaveValue("photo.jpg");
});

test("cleanup turns spaces into underscores", async ({ page }) => {
  await loadFolder(page, { "my report 2024.txt": "x" });

  await page.selectOption("#targetSelect", "Cleanup");
  await page.selectOption("#cleanupModeSelect", "spacesToUnderscore");
  await page.click("#addRuleButton");

  await expect(targetName(page)).toHaveValue("my_report_2024.txt");
});

test("cleanup removes special characters but keeps CJK text", async ({ page }) => {
  await loadFolder(page, { "報表#2024!.xlsx": "x" });

  await page.selectOption("#targetSelect", "Cleanup");
  await page.selectOption("#cleanupModeSelect", "removeSpecial");
  await page.click("#addRuleButton");

  await expect(targetName(page)).toHaveValue("報表2024.xlsx");
});

test("the presets stack with each other and show a localized rule card", async ({ page }) => {
  await loadFolder(page, { "my photo.jpeg": "x" });

  await page.selectOption("#targetSelect", "Cleanup");
  await page.selectOption("#cleanupModeSelect", "spacesToUnderscore");
  await page.click("#addRuleButton");

  await page.selectOption("#targetSelect", "Extension");
  await page.fill("#newExtensionInput", "jpg");
  await page.click("#addRuleButton");

  await page.selectOption("#targetSelect", "Affix");
  await page.selectOption("#affixPositionSelect", "prefix");
  await page.fill("#affixTextInput", "2024_");
  await page.click("#addRuleButton");

  await expect(targetName(page)).toHaveValue("2024_my_photo.jpg");

  // Cards name the target in the interface language, not the internal enum.
  await expect(page.locator("#ruleList li:nth-child(1) .rule-summary strong")).toHaveText("1. 清理");
  await expect(page.locator("#ruleList li:nth-child(2) .rule-summary strong")).toHaveText("2. 改副檔名");
  await expect(page.locator("#ruleList li:nth-child(3) .rule-summary strong")).toHaveText("3. 加前綴／後綴");
  await expect(page.locator("#ruleList li:nth-child(3) .rule-summary span").first()).toHaveText('加在開頭「2024_」。');
});

test("an incomplete preset reports a localized reason instead of breaking", async ({ page }) => {
  await loadFolder(page, { "photo.jpg": "x" });

  await page.selectOption("#targetSelect", "Extension");
  await page.click("#addRuleButton"); // no extension typed

  await expect(page.locator("#ruleList li:first-child .rule-preview")).toHaveAttribute("data-kind", "error");
  await expect(page.locator("#ruleList li:first-child .rule-preview")).toHaveText("新的副檔名不能留空。");
});
