import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T036: free-text search over preview rows (a view concern)
// and explicit per-row exclusion (which really does change what executes).

async function loadFolder(page, files) {
  await page.addInitScript(installFakeFileSystem, files);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText(Object.keys(files)[0]);
}

// A case-only change would validate as "No change": normalizePathKey lowercases paths to
// match how Windows treats them, so the rename would be a no-op. Use a prefix instead.
async function addPrefixRule(page) {
  await page.selectOption("#targetSelect", "Affix");
  await page.selectOption("#affixPositionSelect", "prefix");
  await page.fill("#affixTextInput", "x_");
  await page.click("#addRuleButton");
}

const FILES = { "alpha.txt": "1", "beta.txt": "2", "gamma.txt": "3" };

test("search narrows the visible rows without changing the counts", async ({ page }) => {
  await loadFolder(page, FILES);
  await addPrefixRule(page);
  await expect(page.locator("#previewBody tr")).toHaveCount(3);

  await page.fill("#rowSearchInput", "beta");
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator('#previewBody .diff-cell[title="MockFolder/beta.txt"]')).toHaveCount(1);

  // The batch counts still describe every row, and the UI says the view is narrowed.
  await expect(page.locator("#legendCountOk")).toHaveText("3");
  await expect(page.locator("#previewSummary")).toContainText("只顯示 1 / 3 列");

  await page.fill("#rowSearchInput", "");
  await expect(page.locator("#previewBody tr")).toHaveCount(3);
  await expect(page.locator("#previewSummary")).not.toContainText("只顯示");
});

test("search matches the target name too", async ({ page }) => {
  await loadFolder(page, FILES);
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "alpha");
  await page.fill("#replaceInput", "zulu");
  await page.click("#addRuleButton");

  await page.fill("#rowSearchInput", "zulu");
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator('#previewBody .diff-cell[title="MockFolder/alpha.txt"]')).toHaveCount(1);
});

test("search combines with the status filter", async ({ page }) => {
  await loadFolder(page, { "alpha.txt": "1", "alphakeep.txt": "2", "beta.txt": "3" });
  // Replace acts on the base name only. "keep" matches just alphakeep, so that row is OK
  // while the other two are blocked as "No change".
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "keep");
  await page.fill("#replaceInput", "kept");
  await page.click("#addRuleButton");

  await page.fill("#rowSearchInput", "alpha");
  await expect(page.locator("#previewBody tr")).toHaveCount(2);

  // Narrowing to the blocked bucket leaves only the alpha row that the rule did not touch.
  await page.locator('.legend-chip[data-filter="warn"]').click();
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator('#previewBody .diff-cell[title="MockFolder/alpha.txt"]')).toHaveCount(1);
});

test("excluding selected rows takes them out of the run and can be undone", async ({ page }) => {
  await loadFolder(page, FILES);
  await addPrefixRule(page);
  await expect(page.locator("#legendCountOk")).toHaveText("3");

  const betaRow = page.locator("#previewBody tr").filter({ has: page.locator('.diff-cell[title="MockFolder/beta.txt"]') });
  await betaRow.locator('input[type="checkbox"]').check();
  await page.click("#excludeSelectedButton");

  await expect(betaRow.locator(".status-pill")).toHaveText("已排除");
  await expect(betaRow.locator(".status-reason")).toHaveText("你手動把這一列排除了，執行時會跳過。");
  await expect(betaRow).toHaveAttribute("data-excluded", "true");
  await expect(page.locator("#legendCountOk")).toHaveText("2");

  await page.click("#includeSelectedButton");
  await expect(betaRow.locator(".status-pill")).toHaveText("OK");
  await expect(page.locator("#legendCountOk")).toHaveText("3");
});

test("an excluded row is skipped by execute while the others still run", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await loadFolder(page, FILES);
  await addPrefixRule(page);

  const betaRow = page.locator("#previewBody tr").filter({ has: page.locator('.diff-cell[title="MockFolder/beta.txt"]') });
  await betaRow.locator('input[type="checkbox"]').check();
  await page.click("#excludeSelectedButton");

  await page.click("#executeButton");
  await expect(page.locator("#statusText")).toContainText("2");

  // beta.txt keeps its original name; the other two were renamed.
  const names = await page.evaluate(() => window.__fakeDir.names());
  expect(names).toEqual(["beta.txt", "x_alpha.txt", "x_gamma.txt"]);
});

test("exclusion survives a rule change", async ({ page }) => {
  await loadFolder(page, FILES);
  await addPrefixRule(page);

  const betaRow = page.locator("#previewBody tr").filter({ has: page.locator('.diff-cell[title="MockFolder/beta.txt"]') });
  await betaRow.locator('input[type="checkbox"]').check();
  await page.click("#excludeSelectedButton");
  await expect(page.locator("#legendCountOk")).toHaveText("2");

  // Adding another rule rebuilds every row; the exclusion is keyed to a stable row id.
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "a");
  await page.fill("#replaceInput", "A");
  await page.click("#addRuleButton");

  await expect(page.locator("#legendCountOk")).toHaveText("2");
  await expect(betaRow.locator(".status-pill")).toHaveText("已排除");
});

test("exclude with nothing checked says so instead of doing nothing", async ({ page }) => {
  await loadFolder(page, FILES);
  await addPrefixRule(page);

  await page.click("#excludeSelectedButton");
  await expect(page.locator("#statusText")).toContainText("請先勾選");
  await expect(page.locator("#legendCountOk")).toHaveText("3");
});
