import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";
import { readFile } from "node:fs/promises";

// Concrete browser verification for T033: after running a rename batch, the export-log
// button downloads a per-row CSV of what happened. Uses the shared in-memory fake FS.

test("export a per-row execution log after running a rename batch", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept()); // accept the execute confirm
  await page.addInitScript(installFakeFileSystem);
  await page.goto("/index.html");

  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText("a.txt");

  // Character insert "z" at position 1 -> za.txt, zb.txt.
  await page.selectOption("#targetSelect", "Character");
  await page.fill("#charStartInput", "1");
  await page.fill("#charLengthInput", "0");
  await page.selectOption("#valueModeSelect", "Static");
  await page.fill("#staticInput", "z");
  await page.click("#addRuleButton");
  await page.click("#previewButton");
  await page.click("#executeButton");

  // The export-log button appears once a batch has run; clicking it downloads the CSV.
  await expect(page.locator("#exportLogButton")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#exportLogButton")
  ]);
  const content = await readFile(await download.path(), "utf8");

  expect(content).toContain(
    "Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Result,Message,Timestamp"
  );
  expect(content).toContain("Rename");
  expect(content).toContain("za.txt");
  expect(content).toContain("zb.txt");
  expect(content).toContain("Done");
});
