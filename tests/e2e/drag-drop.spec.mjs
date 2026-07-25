import { test, expect } from "./fixtures.mjs";

// Concrete browser verification for T034: dropping OS files onto the source area adds
// them as (preview-only) sources. We build a DataTransfer with File objects and dispatch
// a drop event, mirroring a real drag-and-drop.

test("dropping files onto the source area adds them as sources", async ({ page }) => {
  await page.goto("/index.html");

  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["hello"], "dropped-file.txt", { type: "text/plain" }));
    dt.items.add(new File(["x"], "second.txt", { type: "text/plain" }));
    return dt;
  });
  await page.locator("#renameSetup").dispatchEvent("drop", { dataTransfer });

  await expect(page.locator("#sourceList")).toContainText("dropped-file.txt");
  await expect(page.locator("#sourceList")).toContainText("second.txt");

  // The dropped files are usable: a rule produces a preview row.
  await page.selectOption("#targetSelect", "Replace");
  await page.fill("#findInput", "dropped");
  await page.fill("#replaceInput", "renamed");
  await page.click("#addRuleButton");
  await page.click("#previewButton");

  const targetInput = page.locator('#previewBody tr:first-child input[type="text"]').first();
  await expect(targetInput).toHaveValue("renamed-file.txt");
});
