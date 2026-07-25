import { test, expect } from "./fixtures.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T038: the app must say whether the loaded sources can
// actually be written to disk *before* the user builds rules, and must not offer an execute
// button that is guaranteed to do nothing.

async function addPreviewFile(page, fileName) {
  const dir = await mkdtemp(join(tmpdir(), "bfr-e2e-"));
  const filePath = join(dir, fileName);
  await writeFile(filePath, "hello");
  await page.setInputFiles("#fileInput", filePath);
}

test("with no files loaded the strip is neutral and execute is disabled", async ({ page }) => {
  await page.goto("/index.html");

  const strip = page.locator("#sourceCapability");
  await expect(strip).toHaveAttribute("data-state", "empty");
  await expect(page.locator("#capabilityTitle")).toHaveText("尚未載入檔案");
  await expect(page.locator("#executeButton")).toBeDisabled();
});

test("files added via the file input are flagged preview-only and cannot be executed", async ({ page }) => {
  await page.goto("/index.html");
  await addPreviewFile(page, "sample.txt");

  const strip = page.locator("#sourceCapability");
  await expect(strip).toHaveAttribute("data-state", "preview");
  await expect(page.locator("#capabilityTitle")).toHaveText("僅預覽，無法改檔名");
  await expect(page.locator("#capabilityDetail")).toContainText("選擇來源資料夾");

  const execute = page.locator("#executeButton");
  await expect(execute).toBeDisabled();
  // The reason travels with the control, so hovering explains the block.
  await expect(execute).toHaveAttribute("title", /選擇來源資料夾/);
});

test("picking a real source folder switches the strip to ready and enables execute", async ({ page }) => {
  await page.addInitScript(installFakeFileSystem);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText("a.txt");

  const strip = page.locator("#sourceCapability");
  await expect(strip).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#capabilityTitle")).toHaveText("可直接改檔名");
  await expect(page.locator("#capabilityDetail")).toContainText("寫入權限");
  await expect(page.locator("#executeButton")).toBeEnabled();
});

test("switching to copy mode reports its own capability", async ({ page }) => {
  await page.goto("/index.html");
  // The radio itself is visually hidden inside the segmented control; users click the label.
  await page.locator(".mode-switcher label:has(input[value='copy'])").click();
  await expect(page.locator("input[name='mode'][value='copy']")).toBeChecked();

  const strip = page.locator("#sourceCapability");
  await expect(strip).toHaveAttribute("data-state", "empty");
  await expect(page.locator("#capabilityTitle")).toHaveText("尚未選擇模板");
  await expect(page.locator("#executeButton")).toBeDisabled();
});
