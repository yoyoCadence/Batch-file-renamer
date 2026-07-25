import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T032: enabling/disabling and reordering rules,
// verified by how they change the preview output.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

async function addReplaceRule(page, find, replaceWith) {
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", find);
  await page.fill("#replaceInput", replaceWith);
  await page.click("#addRuleButton");
}

test("reordering rules changes the applied order in the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "ab.txt");
  await addReplaceRule(page, "a", "X"); // rule 1: a -> X
  await addReplaceRule(page, "X", "Y"); // rule 2: X -> Y

  await page.click("#previewButton");
  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("Yb.txt"); // a->X then X->Y

  // Move rule 2 (X->Y) above rule 1, so X->Y runs first (no X yet), then a->X.
  await page.locator("#ruleList li:nth-child(2) .rule-up").click();
  await page.click("#previewButton");
  await expect(targetInput).toHaveValue("Xb.txt");
});

test("disabling a rule excludes it from the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "ab.txt");
  await addReplaceRule(page, "a", "X"); // rule 1
  await addReplaceRule(page, "X", "Y"); // rule 2

  await page.click("#previewButton");
  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("Yb.txt");

  // Disable rule 1 (a->X); only X->Y remains, which finds no X -> "ab" unchanged.
  await page.locator("#ruleList li:nth-child(1) .rule-enable").uncheck();
  await page.click("#previewButton");
  await expect(targetInput).toHaveValue("ab.txt");
});
