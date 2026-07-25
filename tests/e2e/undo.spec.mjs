import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

// Concrete browser verification for T028: execute a rename batch, then undo it and
// confirm the original filenames are restored. Uses the shared in-memory fake FS.

test("execute a rename batch, then undo it, restoring the original filenames", async ({ page }) => {
  // Accept the execute and undo confirmation dialogs.
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(installFakeFileSystem);
  await page.goto("/index.html");

  // Load the mocked source folder (a.txt, b.txt).
  await page.click("#pickSourceFolderButton");
  await expect(page.locator("#sourceList")).toContainText("a.txt");

  // Character rule: insert "z" at position 1 -> za.txt, zb.txt.
  await page.selectOption("#targetSelect", "Character");
  await page.fill("#charStartInput", "1");
  await page.fill("#charLengthInput", "0");
  await page.selectOption("#valueModeSelect", "Static");
  await page.fill("#staticInput", "z");
  await page.click("#addRuleButton");
  await page.click("#previewButton");
  await expect(page.locator("#previewBody tr")).toHaveCount(2);

  // Execute the rename batch.
  await page.click("#executeButton");
  await expect
    .poll(() => page.evaluate(() => window.__fakeDir.names()))
    .toEqual(["za.txt", "zb.txt"]);

  // The undo button appears; undoing restores the original names.
  await expect(page.locator("#undoButton")).toBeVisible();
  await page.click("#undoButton");
  await expect
    .poll(() => page.evaluate(() => window.__fakeDir.names()))
    .toEqual(["a.txt", "b.txt"]);
});
