import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T035: named rule presets and remembering the last-used
// rule stack across reloads.

async function loadFolder(page, files) {
  await page.addInitScript(installFakeFileSystem, files);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText(Object.keys(files)[0]);
}

async function addReplaceRule(page, find, replaceWith) {
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", find);
  await page.fill("#replaceInput", replaceWith);
  await page.click("#addRuleButton");
}

const targetName = (page) => page.locator('#previewBody tr:first-child input[type="text"]').first();

test("the rule stack survives a reload", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await addReplaceRule(page, "a", "X");
  await addReplaceRule(page, "b", "Y");
  await expect(targetName(page)).toHaveValue("XY.txt");

  await page.reload();
  await expect(page.locator("#ruleList li")).toHaveCount(2);
  await expect(page.locator("#ruleList li:nth-child(1) .rule-summary span").first()).toContainText("X");

  // Sources cannot be restored (no handle persistence), so reload starts with an empty table
  // but the rules are ready to apply again.
  await page.click("#pickSourceFolderButton");
  await expect(targetName(page)).toHaveValue("XY.txt");
});

test("a disabled rule stays disabled after a reload", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await addReplaceRule(page, "a", "X");
  await addReplaceRule(page, "b", "Y");
  await page.locator("#ruleList li:nth-child(1) .rule-enable").uncheck();
  await expect(targetName(page)).toHaveValue("aY.txt");

  await page.reload();
  await expect(page.locator("#ruleList li:nth-child(1) .rule-enable")).not.toBeChecked();
  await page.click("#pickSourceFolderButton");
  await expect(targetName(page)).toHaveValue("aY.txt");
});

test("saving, loading, and deleting a named preset", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await expect(page.locator("#presetSelect")).toBeDisabled();

  await addReplaceRule(page, "a", "X");
  page.once("dialog", (dialog) => dialog.accept("My preset"));
  await page.click("#savePresetButton");

  await expect(page.locator("#presetSelect")).toBeEnabled();
  await expect(page.locator("#presetSelect option")).toHaveCount(2);
  await expect(page.locator("#presetSelect option").nth(1)).toHaveText("My preset (1)");

  // Wipe the rules, then bring them back from the preset.
  await page.click("#clearRulesButton");
  await expect(page.locator("#ruleList li")).toHaveCount(1); // the empty-state row
  await page.selectOption("#presetSelect", { label: "My preset (1)" });
  await expect(page.locator("#ruleList li")).toHaveCount(1);
  await expect(targetName(page)).toHaveValue("Xb.txt");

  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#deletePresetButton");
  await expect(page.locator("#presetSelect")).toBeDisabled();
});

test("presets survive a reload", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await addReplaceRule(page, "a", "X");
  page.once("dialog", (dialog) => dialog.accept("Kept"));
  await page.click("#savePresetButton");

  await page.reload();
  await expect(page.locator("#presetSelect option").nth(1)).toHaveText("Kept (1)");
});

test("saving under an existing name overwrites instead of duplicating", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await addReplaceRule(page, "a", "X");
  page.once("dialog", (dialog) => dialog.accept("Same name"));
  await page.click("#savePresetButton");
  await expect(page.locator("#presetSelect option").nth(1)).toHaveText("Same name (1)");

  await addReplaceRule(page, "b", "Y");
  page.once("dialog", (dialog) => dialog.accept("Same name"));
  await page.click("#savePresetButton");

  await expect(page.locator("#presetSelect option")).toHaveCount(2);
  await expect(page.locator("#presetSelect option").nth(1)).toHaveText("Same name (2)");
});

test("cancelling the name prompt saves nothing", async ({ page }) => {
  await loadFolder(page, { "ab.txt": "x" });
  await addReplaceRule(page, "a", "X");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.click("#savePresetButton");
  await expect(page.locator("#presetSelect")).toBeDisabled();
});

test("a corrupt saved rule stack degrades instead of breaking the app", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("batch-file-renamer.session", JSON.stringify({
      rules: [{ target: "Case", caseMode: "upper" }, { target: "NoSuchTarget" }, null],
      valueListText: "",
      mode: "rename"
    }));
  });
  await page.addInitScript(installFakeFileSystem, { "ab.txt": "x" });
  await page.goto("/index.html");

  // The unusable entries are dropped; the valid rule still works.
  await expect(page.locator("#ruleList li")).toHaveCount(1);
  await page.click("#pickSourceFolderButton");
  await expect(targetName(page)).toHaveValue("AB.txt");
});
