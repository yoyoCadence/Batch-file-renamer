import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T040: the preview must follow rule edits on its own,
// and each rule card must show what that one rule contributes to the chain.

async function addPreviewFiles(page, fileNames) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const paths = [];
  for (const fileName of fileNames) {
    const filePath = join(dir, fileName);
    await writeFile(filePath, "hello");
    paths.push(filePath);
  }
  await page.setInputFiles("#fileInput", paths);
}

async function addReplaceRule(page, find, replaceWith) {
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", find);
  await page.fill("#replaceInput", replaceWith);
  await page.click("#addRuleButton");
}

const targetName = (page) => page.locator('#previewBody tr:first-child input[type="text"]').first();

test("adding a rule fills the preview without pressing the button", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["ab.txt"]);
  await expect(page.locator("#previewBody .empty-table")).toBeVisible();

  await addReplaceRule(page, "a", "X");

  await expect(targetName(page)).toHaveValue("Xb.txt");
});

test("reordering and disabling rules update the preview on their own", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["ab.txt"]);
  await addReplaceRule(page, "a", "X"); // rule 1: a -> X
  await addReplaceRule(page, "X", "Y"); // rule 2: X -> Y
  await expect(targetName(page)).toHaveValue("Yb.txt");

  // X->Y first (no X yet), then a->X.
  await page.locator("#ruleList li:nth-child(2) .rule-up").click();
  await expect(targetName(page)).toHaveValue("Xb.txt");

  await page.locator("#ruleList li:nth-child(2) .rule-enable").uncheck();
  await expect(targetName(page)).toHaveValue("ab.txt");
});

test("removing the last rule clears the preview instead of leaving stale rows", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["ab.txt"]);
  await addReplaceRule(page, "a", "X");
  await expect(targetName(page)).toHaveValue("Xb.txt");

  await page.locator("#ruleList li:first-child .rule-remove").click();
  await expect(page.locator("#previewBody .empty-table")).toBeVisible();
});

test("each rule card shows its own before -> after, chained through earlier rules", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["ab.txt"]);
  await addReplaceRule(page, "a", "X"); // ab.txt -> Xb.txt
  await addReplaceRule(page, "b", "Y"); // Xb.txt -> XY.txt

  const first = page.locator("#ruleList li:nth-child(1) .rule-preview");
  const second = page.locator("#ruleList li:nth-child(2) .rule-preview");

  await expect(first).toHaveAttribute("data-kind", "change");
  await expect(first).toContainText("ab.txt");
  await expect(first).toContainText("Xb.txt");

  // The second card starts from the first card's output, not from the original name.
  await expect(second).toContainText("Xb.txt");
  await expect(second).toContainText("XY.txt");
});

test("a disabled rule card says so and does not advance the chain", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["ab.txt"]);
  await addReplaceRule(page, "a", "X");
  await addReplaceRule(page, "b", "Y");

  await page.locator("#ruleList li:nth-child(1) .rule-enable").uncheck();

  const first = page.locator("#ruleList li:nth-child(1) .rule-preview");
  await expect(first).toHaveAttribute("data-kind", "disabled");
  await expect(first).toHaveText("已停用，不會套用。");

  // Rule 2 now starts from the untouched original name.
  const second = page.locator("#ruleList li:nth-child(2) .rule-preview");
  await expect(second).toContainText("ab.txt");
  await expect(second).toContainText("aY.txt");
});

test("a rule that cannot apply shows a localized reason on its card", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["nodashes.txt"]);

  await page.selectOption("#targetSelect", "Segment");
  await page.fill("#delimiterInput", "-");
  await page.fill("#segmentInput", "3");
  await page.click("#addRuleButton");

  const card = page.locator("#ruleList li:first-child .rule-preview");
  await expect(card).toHaveAttribute("data-kind", "error");
  await expect(card).toContainText("切不出第 3 段");
});

test("an engine guard reports a localized reason, not the raw English message", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, ["a.txt", "b.txt"]);

  // A value-list rule whose list length does not match the file count.
  await page.selectOption("#targetSelect", "Segment");
  await page.fill("#delimiterInput", ".");
  await page.fill("#segmentInput", "1");
  await page.selectOption("#valueModeSelect", "List");
  await page.fill("#valueListInput", "only-one\n");
  await page.click("#addRuleButton");

  await expect(page.locator("#statusText")).toContainText("清單行數與檔案數不符");
  await expect(page.locator("#statusText")).not.toContainText("does not match");
});
