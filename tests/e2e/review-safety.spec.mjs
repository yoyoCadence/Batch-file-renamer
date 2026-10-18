import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

async function setup(page, files = { "a.txt": "AAA", "b.txt": "BBB" }) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(installFakeFileSystem, files);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await page.selectOption("#targetSelect", "Affix");
  await page.fill("#affixTextInput", "z");
  await page.click("#addRuleButton");
  await page.click("#previewButton");
  if (await page.locator("#controlledWritesInput").count()) await page.check("#controlledWritesInput");
}

test("B01/B02: undo preserves an external original and retries unresolved rows", async ({ page }) => {
  await setup(page);
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.names())).toEqual(["za.txt", "zb.txt"]);
  await page.evaluate(() => window.__fakeDir.put("a.txt", "NEW_EXTERNAL"));
  await page.click("#undoButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "NEW_EXTERNAL", "za.txt": "AAA", "b.txt": "BBB" });
  await expect(page.locator("#undoButton")).toBeVisible();
  await page.evaluate(() => window.__fakeDir.removeEntry("a.txt"));
  await page.click("#undoButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA", "b.txt": "BBB" });
});

test("B03: exclusion survives a scope change", async ({ page }) => {
  await setup(page);
  await page.locator("#previewBody tr").nth(1).locator("input[type=checkbox]").check();
  await page.click("#excludeSelectedButton");
  await page.fill("#scopeIncludeInput", "b");
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator("#previewBody .status-pill")).toHaveText(/排除/);
});

test("B04: all colliding rows block; excluding one releases the other", async ({ page }) => {
  await setup(page);
  let input = page.locator("#previewBody tr").nth(0).locator("input[type=text]").first();
  await input.fill("same.txt"); await input.press("Tab");
  input = page.locator("#previewBody tr").nth(1).locator("input[type=text]").first();
  await input.fill("same.txt"); await input.press("Tab");
  await expect(page.locator("#previewBody .status-pill")).toHaveText(["目標重複", "目標重複"]);
  await page.locator("#previewBody tr").first().locator("input[type=checkbox]").check();
  await page.click("#excludeSelectedButton");
  await page.click("#previewButton");
  await expect(page.locator("#previewBody tr").nth(1).locator(".status-pill")).toHaveText("OK");
});

test("B05/B15: disk recheck preserves manual names and clears stale collisions", async ({ page }) => {
  await setup(page, { "a.txt": "AAA", "za.txt": "EXTERNAL" });
  const row = page.locator('#previewBody tr').filter({ has: page.locator('[title="MockFolder/a.txt"]') });
  await row.locator("input[type=text]").first().fill("MANUAL.txt");
  await row.locator("input[type=text]").first().press("Tab");
  await page.click("#previewButton");
  await expect(row.locator("input[type=text]").first()).toHaveValue("MANUAL.txt");
  await expect(row.locator(".status-pill")).toHaveText("OK");
});

test("B07: disk permission errors never become OK", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  await page.evaluate(() => window.__fakeDir.failNext("lookup", "za.txt", "NotAllowedError"));
  await page.click("#previewButton");
  await expect(page.locator("#previewBody .status-pill")).not.toHaveText("OK");
  expect(await page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA" });
});

test("B08: a target appearing at confirmation keeps its bytes", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  await page.evaluate(() => {
    window.confirm = () => { window.__fakeDir.put("za.txt", "EXTERNAL"); return true; };
  });
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA", "za.txt": "EXTERNAL" });
});

test("B09: a source-delete failure has a recovery path", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  await page.evaluate(() => window.__fakeDir.failNext("remove", "a.txt"));
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA", "za.txt": "AAA" });
  await expect(page.locator("#undoButton")).toBeVisible();
  await page.click("#undoButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA" });
});

test("B06/B20: CSV paths and OK text never authorize a different Copy source/destination", async ({ page }) => {
  await setup(page);
  await page.locator(".mode-switcher label:has(input[value='copy'])").click();
  await page.click("#pickTemplateButton");
  await page.evaluate(() => { window.__nextDirectory = window.__fakeOutput; });
  await page.click("#pickOutputFolderButton");
  const csv = 'Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Status\nCopy,other.txt,Other/other.txt,same.txt,LabelA,LabelA/same.txt,OK\nCopy,other.txt,Other/other.txt,same.txt,LabelB,LabelB/same.txt,OK';
  await page.setInputFiles("#csvInput", { name: "plan.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#previewBody .status-pill")).toHaveText(["需綁定實際檔案", "需綁定實際檔案"]);
  await page.click("#bindCsvButton");
  await page.click("#executeButton");
  expect(await page.evaluate(() => window.__fakeOutput.contents())).toEqual({});
  await expect(page.locator("#previewBody input[type=text]").nth(1)).toHaveValue("LabelA");
  await expect(page.locator("#previewBody input[type=text]").nth(1)).toHaveAttribute("readonly");
});

test("bound Copy CSV uses the actual template bytes and records the real destination", async ({ page }) => {
  await setup(page);
  await page.locator(".mode-switcher label:has(input[value='copy'])").click();
  await page.click("#pickTemplateButton");
  await page.evaluate(() => { window.__nextDirectory = window.__fakeOutput; });
  await page.click("#pickOutputFolderButton");
  const csv = 'Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Status\nCopy,template.txt,template.txt,out.txt,OutputFolder,OutputFolder/out.txt,Done';
  await page.setInputFiles("#csvInput", { name: "plan.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#previewBody .status-pill")).toHaveText("需綁定實際檔案");
  await page.click("#bindCsvButton");
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeOutput.contents())).toEqual({ "out.txt": "TEMPLATE" });
  await expect(page.locator("#previewBody .status-pill")).toHaveText("完成");
  await expect(page.locator("#executionSummary")).toContainText("1 列完成");
  await expect(page.locator("#legendCountWarn")).toHaveText("0");
});

test("importing before selecting a Rename folder preserves the CSV plan for explicit binding", async ({ page }) => {
  await page.addInitScript(installFakeFileSystem);
  await page.goto("/index.html");
  const csv = 'Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Status\nRename,a.txt,MockFolder/a.txt,MANUAL.txt,MockFolder,MockFolder/MANUAL.txt,OK';
  await page.setInputFiles("#csvInput", { name: "plan.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#previewBody tr")).toHaveCount(1);
  await expect(page.locator("#previewBody input[type=text]").first()).toHaveValue("MANUAL.txt");
  await page.click("#bindCsvButton");
  await expect(page.locator("#previewBody .status-pill")).toHaveText("OK");
});

test("late disk results cannot overwrite a newer manual edit", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  let input = page.locator("#previewBody input[type=text]").first();
  await input.fill("MANUAL.txt"); await input.press("Tab");
  await page.evaluate(() => window.__fakeDir.pauseAt("lookup", "MANUAL.txt"));
  await page.click("#previewButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.isPaused())).toBe(true);
  input = page.locator("#previewBody input[type=text]").first();
  await input.fill("NEW.txt"); await input.press("Tab");
  await page.evaluate(() => window.__fakeDir.resume());
  await expect(input).toHaveValue("NEW.txt");
  await expect(page.locator("#previewBody .status-pill")).toHaveText("待磁碟檢查");
});

test("the execution lock starts before preflight and freezes plan inputs", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  await page.evaluate(() => window.__fakeDir.pauseAt("read", "a.txt"));
  await page.evaluate(() => { document.querySelector("#executeButton").click(); document.querySelector("#executeButton").dispatchEvent(new MouseEvent("click")); });
  await expect.poll(() => page.evaluate(() => window.__fakeDir.isPaused())).toBe(true);
  await expect(page.locator("#pickTemplateButton")).toBeDisabled();
  await expect(page.locator("#controlledWritesInput")).toBeDisabled();
  await expect(page.locator("#previewBody input[type=text]").first()).toBeDisabled();
  await page.evaluate(() => window.__fakeDir.resume());
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "za.txt": "AAA" });
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#exportRecoveryButton")]);
  const { readFile } = await import("node:fs/promises");
  const report = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(report.batches).toHaveLength(1);
  expect(report.batches[0].entries[0].state).toBe("completed");
});

test("manual overrides survive a rule change and can be explicitly reset", async ({ page }) => {
  await setup(page, { "a.txt": "AAA" });
  let input = page.locator("#previewBody input[type=text]").first();
  await input.fill("MANUAL.txt"); await input.press("Tab");
  await page.fill("#affixTextInput", "x");
  await page.click("#addRuleButton");
  await expect(input).toHaveValue("MANUAL.txt");
  await expect(page.locator(".manual-marker")).toBeVisible();
  await page.click("#resetOverridesButton");
  await expect(input).toHaveValue("xza.txt");
});

test("cancel waits for the current write and prevents the next row from starting", async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.__fakeDir.pauseAt("write", "za.txt"));
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.isPaused())).toBe(true);
  await page.click("#cancelBatchButton");
  await page.evaluate(() => window.__fakeDir.resume());
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "za.txt": "AAA", "b.txt": "BBB" });
  await expect(page.locator("#previewBody .status-pill")).toHaveText(["完成", "已停止，尚未執行"]);
});

test("a second tab cannot start writes while another tab owns the origin lock", async ({ page, context }) => {
  await setup(page, { "a.txt": "AAA" });
  const second = await context.newPage();
  await setup(second, { "a.txt": "SECOND" });
  await page.evaluate(() => window.__fakeDir.pauseAt("read", "a.txt"));
  await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.isPaused())).toBe(true);
  await second.click("#executeButton");
  await expect(second.locator("#statusText")).toContainText("Another tab");
  expect(await second.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "SECOND" });
  await page.evaluate(() => window.__fakeDir.resume());
  await expect.poll(() => page.evaluate(() => window.__fakeDir.names())).toEqual(["za.txt"]);
  await second.close();
});
