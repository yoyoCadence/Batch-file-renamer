import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T041: the table must show what changed, let the legend
// narrow the rows, and offer a working one-click repair for mechanically fixable statuses.
//
// These specs load sources through the fake File System Access API rather than the file
// input, because only a real directory handle produces the genuine validation statuses --
// preview-only sources are masked by the "Source folder only" execution limit.

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

test("the change column marks the replaced span and the new span", async ({ page }) => {
  await loadFolder(page, { "50-INDS-AT-1.pdf": "x" });
  await addReplaceRule(page, "INDS", "PROJ");

  const cell = page.locator("#previewBody .diff-cell").first();
  await expect(cell).toHaveAttribute("data-changed", "true");
  await expect(cell.locator("del")).toHaveText("INDS");
  await expect(cell.locator("ins")).toHaveText("PROJ");
  // Unchanged text stays plain, so the row still reads as a filename.
  await expect(cell).toContainText("50-");
  await expect(cell).toContainText("-AT-1.pdf");
});

test("an unchanged row is marked as such and carries no diff marks", async ({ page }) => {
  await loadFolder(page, { "keep.txt": "x" });
  await addReplaceRule(page, "nomatch", "x");

  const cell = page.locator("#previewBody .diff-cell").first();
  await expect(cell).toHaveAttribute("data-changed", "false");
  await expect(cell.locator("del")).toHaveCount(0);
  await expect(cell).toHaveText("keep.txt");
});

test("legend chips show counts and filter the table", async ({ page }) => {
  await loadFolder(page, { "dupa.txt": "x", "dupb.txt": "y", "solo.txt": "z" });
  await addReplaceRule(page, "dupa", "same");
  await addReplaceRule(page, "dupb", "same");
  // Without this, solo.txt would be unchanged and land in the blocked bucket as "No change",
  // which is not the case this test is about.
  await addReplaceRule(page, "solo", "only");

  await expect(page.locator("#legendCountOk")).toHaveText("2");
  await expect(page.locator("#legendCountWarn")).toHaveText("1");
  await expect(page.locator("#previewBody tr")).toHaveCount(3);

  await page.locator('.legend-chip[data-filter="warn"]').click();
  await expect(page.locator('.legend-chip[data-filter="warn"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator("#previewBody .status-pill")).toHaveText("目標重複");

  // Clicking the same chip again clears the filter.
  await page.locator('.legend-chip[data-filter="warn"]').click();
  await expect(page.locator("#previewBody tr")).toHaveCount(3);
});

test("a duplicate target explains itself and the one-click fix resolves it", async ({ page }) => {
  await loadFolder(page, { "dupa.txt": "x", "dupb.txt": "y" });
  await addReplaceRule(page, "dupa", "same");
  await addReplaceRule(page, "dupb", "same");

  const blocked = page.locator("#previewBody tr").filter({ hasText: "目標重複" });
  await expect(blocked.locator(".status-reason")).toHaveText("另一列已經要輸出同樣的檔名。");

  await blocked.locator(".fix-button").click();

  // The collision is gone and both rows are executable again.
  await expect(page.locator("#legendCountOk")).toHaveText("2");
  await expect(page.locator("#legendCountWarn")).toHaveText("0");
  await expect(page.locator("#previewBody")).toContainText("same-1.txt");
});

test("a reserved Windows name explains itself and can be repaired", async ({ page }) => {
  await loadFolder(page, { "report.txt": "x" });
  await addReplaceRule(page, "report", "CON");

  const row = page.locator("#previewBody tr").first();
  await expect(row.locator(".status-pill")).toHaveText("保留名稱（Windows）");
  await expect(row.locator(".status-reason")).toContainText("保留的裝置名稱");

  await row.locator(".fix-button").click();
  await expect(row.locator("input[type='text']").first()).toHaveValue("CON_.txt");
  await expect(page.locator("#legendCountOk")).toHaveText("1");
});

test("an invalid filename can be repaired in one click", async ({ page }) => {
  await loadFolder(page, { "report.txt": "x" });
  // The rule engine cleans its own replacement, so type the bad name into the row directly.
  await addReplaceRule(page, "report", "ab");
  const row = page.locator("#previewBody tr").first();
  const targetInput = row.locator("input[type='text']").first();
  await targetInput.fill("a:b.txt");
  await targetInput.dispatchEvent("change");

  await expect(row.locator(".status-pill")).toHaveText("檔名無效");
  await expect(row.locator(".status-reason")).toContainText("Windows 不允許");

  await row.locator(".fix-button").click();
  await expect(row.locator("input[type='text']").first()).toHaveValue("a_b.txt");
  await expect(page.locator("#legendCountOk")).toHaveText("1");
});

test("a no-change row explains itself and offers no fix", async ({ page }) => {
  await loadFolder(page, { "keep.txt": "x" });
  await addReplaceRule(page, "nomatch", "x");

  const row = page.locator("#previewBody tr").first();
  await expect(row.locator(".status-pill")).toHaveText("沒有變更");
  await expect(row.locator(".status-reason")).toHaveText("套用規則後檔名沒有變化，不需要執行。");
  await expect(row.locator(".fix-button")).toHaveCount(0);
});

test("a target that already exists on disk is caught by the recheck and repairable", async ({ page }) => {
  // "taken.txt" already sits in the folder, so renaming onto it must be blocked.
  await loadFolder(page, { "source.txt": "x", "taken.txt": "y" });
  await addReplaceRule(page, "source", "taken");
  await page.click("#previewButton");

  // Anchor on the source name: filtering by status would stop matching once the fix lands.
  const row = page.locator("#previewBody tr").filter({ has: page.locator('.diff-cell[title="MockFolder/source.txt"]') });
  await expect(row.locator(".status-pill")).toHaveText("目標已存在");
  await expect(row.locator(".status-reason")).toHaveText("目標資料夾裡已經有同名檔案。");

  await row.locator(".fix-button").click();
  await expect(row.locator("input[type='text']").first()).toHaveValue("taken-1.txt");
  await expect(row.locator(".status-pill")).toHaveText("OK");
});
