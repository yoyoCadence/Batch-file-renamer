import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";
import { readFile } from "node:fs/promises";

async function folder(page, input = { "a.txt": "AAA" }) {
  await page.addInitScript(installFakeFileSystem, input);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
}

test("hidden List values do not affect an Affix rule", async ({ page }) => {
  await folder(page);
  await page.selectOption("#valueModeSelect", "List");
  await page.fill("#valueListInput", "one\ntwo\nthree");
  await page.selectOption("#targetSelect", "Affix");
  await page.fill("#affixTextInput", "z");
  await page.click("#addRuleButton");
  await expect(page.locator("#previewBody input[type=text]").first()).toHaveValue("za.txt");
});

test("rule cards and full preview share changed multi-part extension state", async ({ page }) => {
  await folder(page);
  await page.selectOption("#targetSelect", "Extension");
  await page.fill("#newExtensionInput", "tar.gz");
  await page.click("#addRuleButton");
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "tar"); await page.fill("#replaceInput", "zip");
  await page.click("#addRuleButton");
  await expect(page.locator("#previewBody input[type=text]").first()).toHaveValue("a.tar.gz");
  await expect(page.locator(".rule-preview").last()).toHaveText("a.tar.gz→a.tar.gz");
});

test("literal dollar replacement matches the draft sample and generated preview", async ({ page }) => {
  await folder(page, { "aba.txt": "AAA" });
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "b"); await page.fill("#replaceInput", "$&");
  await expect(page.locator("#sampleOutput")).toHaveText("a$&a.txt");
  await page.click("#addRuleButton");
  await expect(page.locator("#previewBody input[type=text]").first()).toHaveValue("a$&a.txt");
});

test("blocked localStorage getter keeps settings and the app usable in memory", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("Denied", "SecurityError"); } }));
  await folder(page);
  await expect(page.locator("#persistenceWarning")).toBeVisible();
  await page.click("#openSettingsButton");
  await page.selectOption("#languageSelect", "en");
  await page.selectOption("#themeSelect", "midnight");
  await page.click("#closeSettingsButton");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "midnight");
  await expect(page.locator("#persistenceWarning")).toContainText("storage is unavailable");
  await page.selectOption("#targetSelect", "Affix");
  await page.fill("#affixTextInput", "z"); await page.click("#addRuleButton");
  await expect(page.locator("#previewBody input[type=text]").first()).toHaveValue("za.txt");
});

test("custom CSV column mapping reports invalid records and binds only exact matches", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await folder(page, { "a.txt": "AAA", "b.txt": "BBB" });
  const csv = "操作,原名,來源,新名,資料夾\nRename,a.txt,MockFolder/a.txt,out.txt,MockFolder\nUnknown,b.txt,MockFolder/b.txt,bad.txt,MockFolder";
  await page.setInputFiles("#csvInput", { name: "custom.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#csvBindingPanel")).toBeVisible();
  for (const [field, column] of Object.entries({ Action: "操作", SourceName: "原名", SourcePath: "來源", TargetName: "新名", TargetFolder: "資料夾" })) {
    await page.selectOption(`[data-csv-field="${field}"]`, column);
  }
  await page.click("#applyCsvMappingButton");
  await expect(page.locator("#previewBody .status-pill")).toHaveText(["需綁定實際檔案", "CSV 列有誤，不能綁定"]);
  await page.click("#bindCsvButton");
  await expect(page.locator("#csvBindingSummary")).toContainText("已綁定 1/2");
  await page.selectOption('[data-csv-field="TargetName"]', "原名");
  await expect(page.locator("#csvBindingSummary")).toContainText("已綁定 0/2");
  await page.click("#bindCsvButton");
  await expect(page.locator("#csvBindingSummary")).toContainText("已綁定 0/2");
  await expect(page.locator("#statusText")).toContainText("再套用對應");
  await page.click("#applyCsvMappingButton");
  await expect(page.locator("#statusText")).toContainText("不能同時對應");
  await page.click("#bindCsvButton");
  await expect(page.locator("#csvBindingSummary")).toContainText("已綁定 0/2");
  await page.selectOption('[data-csv-field="TargetName"]', "新名");
  await page.click("#applyCsvMappingButton"); await page.click("#bindCsvButton");
  await expect(page.locator("#csvErrorReport")).toContainText("第 3 筆");
  await page.check("#controlledWritesInput"); await page.click("#executeButton");
  await expect.poll(() => page.evaluate(() => window.__fakeDir.contents())).toEqual({ "out.txt": "AAA", "b.txt": "BBB" });
});

test("raw and spreadsheet exports are visibly distinct and raw names round-trip", async ({ page }) => {
  await folder(page);
  await page.evaluate(() => { window.showSaveFilePicker = async () => { throw new DOMException("Unavailable", "NotSupportedError"); }; });
  await page.selectOption("#targetSelect", "Affix");
  await page.fill("#affixTextInput", "z"); await page.click("#addRuleButton");
  const input = page.locator("#previewBody input[type=text]").first();
  await input.fill("=formula.txt"); await input.press("Tab");
  const [rawDownload] = await Promise.all([page.waitForEvent("download"), page.click("#exportCsvButton")]);
  const [viewDownload] = await Promise.all([page.waitForEvent("download"), page.click("#exportSpreadsheetButton")]);
  const raw = await readFile(await rawDownload.path(), "utf8");
  const view = await readFile(await viewDownload.path(), "utf8");
  expect(raw).toContain("2,raw-plan"); expect(raw).toContain(",=formula.txt,");
  expect(view).toContain("2,spreadsheet-view"); expect(view).toContain(",'=formula.txt,");
  await page.setInputFiles("#csvInput", { name: "raw.csv", mimeType: "text/csv", buffer: Buffer.from(raw) });
  await expect(input).toHaveValue("=formula.txt");
  await expect(page.locator("#previewBody .status-pill")).toHaveText("需綁定實際檔案");
  await page.setInputFiles("#csvInput", { name: "view.csv", mimeType: "text/csv", buffer: Buffer.from(view) });
  await expect(page.locator("#statusText")).toContainText("Spreadsheet view cannot be imported");
});

test("case-only rename is explicitly blocked without touching source bytes", async ({ page }) => {
  await folder(page, { files: { "a.txt": "AAA" }, caseInsensitive: true });
  await page.selectOption("#targetSelect", "Case");
  await page.selectOption("#caseModeSelect", "upper");
  await page.click("#addRuleButton"); await page.click("#previewButton");
  await expect(page.locator("#previewBody .status-pill")).toHaveText("暫不支援僅變更大小寫");
  await page.check("#controlledWritesInput"); await page.click("#executeButton");
  expect(await page.evaluate(() => window.__fakeDir.contents())).toEqual({ "a.txt": "AAA" });
});
