import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concrete browser verification for T039: the processing scope must be visible and
// adjustable, and it must actually govern which files reach the preview (and therefore
// execution).

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

const MIXED = ["IMG_2024_a.jpg", "IMG_2024_b.jpg", "report-2023.pdf", "backup-2024.pdf"];

async function addUppercaseRule(page) {
  await page.selectOption("#targetSelect", "Case");
  await page.selectOption("#caseModeSelect", "upper");
  await page.click("#addRuleButton");
}

test("the scope strip states what is in scope and lists extensions with counts", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);

  await expect(page.locator("#scopeStrip")).toBeVisible();
  await expect(page.locator("#scopeSummary")).toHaveText("目前處理全部 4 個檔案（未套用篩選）。");

  const chips = page.locator("#extensionChips .extension-chip");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toContainText(".jpg");
  await expect(chips.nth(0)).toContainText("2");
  await expect(page.locator("#clearScopeButton")).toBeDisabled();
});

test("deselecting an extension narrows the scope and the preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);

  await page.locator('#extensionChips .extension-chip[data-ext=".pdf"]').click();

  await expect(page.locator("#scopeSummary")).toContainText("目前處理 4 個檔案中的 2 個。");
  await expect(page.locator("#scopeSummary")).toContainText("只看副檔名 .jpg");
  await expect(page.locator('#extensionChips .extension-chip[data-ext=".pdf"]')).toHaveAttribute("data-active", "false");

  // Out-of-scope files stay listed, dimmed, rather than vanishing.
  await expect(page.locator("#sourceList span")).toHaveCount(4);
  await expect(page.locator("#sourceList span.is-out-of-scope")).toHaveCount(2);

  await addUppercaseRule(page);
  await page.click("#previewButton");
  await expect(page.locator("#previewBody tr")).toHaveCount(2);
  await expect(page.locator('#previewBody .diff-cell[title="report-2023.pdf"]')).toHaveCount(0);
});

test("name include and exclude filters combine", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);

  await page.fill("#scopeIncludeInput", "2024");
  await expect(page.locator("#scopeSummary")).toContainText("目前處理 4 個檔案中的 3 個。");

  await page.fill("#scopeExcludeInput", "backup");
  await expect(page.locator("#scopeSummary")).toContainText("目前處理 4 個檔案中的 2 個。");
  await expect(page.locator("#scopeSummary")).toContainText("檔名包含「2024」");
  await expect(page.locator("#scopeSummary")).toContainText("檔名不含「backup」");

  await addUppercaseRule(page);
  await page.click("#previewButton");
  await expect(page.locator("#previewBody tr")).toHaveCount(2);
  // The name column renders a diff, so the row's source is identified by the cell title.
  await expect(page.locator("#previewBody .diff-cell").first()).toHaveAttribute("title", "IMG_2024_a.jpg");
  await expect(page.locator('#previewBody .diff-cell[title="backup-2024.pdf"]')).toHaveCount(0);
});

test("clearing the filter restores the full scope", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);

  await page.fill("#scopeIncludeInput", "IMG");
  await expect(page.locator("#scopeSummary")).toContainText("4 個檔案中的 2 個");

  await page.click("#clearScopeButton");
  await expect(page.locator("#scopeSummary")).toHaveText("目前處理全部 4 個檔案（未套用篩選）。");
  await expect(page.locator("#scopeIncludeInput")).toHaveValue("");
  await expect(page.locator("#sourceList span.is-out-of-scope")).toHaveCount(0);
});

test("a filter that excludes everything is reported instead of building an empty preview", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);
  await addUppercaseRule(page);

  await page.fill("#scopeIncludeInput", "no-such-file");
  await expect(page.locator("#scopeSummary")).toContainText("目前處理 4 個檔案中的 0 個。");

  await page.click("#previewButton");
  await expect(page.locator("#statusText")).toContainText("排除了所有檔案");
  await expect(page.locator("#previewBody tr")).toHaveCount(1); // the empty-state row
});

test("loading a new source set clears a filter from the previous one", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFiles(page, MIXED);
  await page.fill("#scopeIncludeInput", "IMG");
  await expect(page.locator("#scopeSummary")).toContainText("4 個檔案中的 2 個");

  await addPreviewFiles(page, ["other-1.txt", "other-2.txt"]);
  await expect(page.locator("#scopeIncludeInput")).toHaveValue("");
  await expect(page.locator("#scopeSummary")).toHaveText("目前處理全部 2 個檔案（未套用篩選）。");
});
