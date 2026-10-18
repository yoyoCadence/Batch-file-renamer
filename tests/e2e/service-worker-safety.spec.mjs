import { test, expect } from "./fixtures.mjs";
import { installFakeFileSystem } from "./fake-fs.mjs";

test.use({ serviceWorkers: "allow" });

test("first SW control and a later controller event preserve working files and edits", async ({ page }) => {
  await page.addInitScript(installFakeFileSystem);
  await page.goto("/index.html");
  await page.click("#pickSourceFolderButton");
  await page.selectOption("#targetSelect", "Affix");
  await page.fill("#affixTextInput", "z");
  await page.click("#addRuleButton");
  await page.click("#previewButton");
  const input = page.locator("#previewBody input[type=text]").first();
  await input.fill("MANUAL.txt"); await input.press("Tab");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange"));
  });
  await expect(input).toHaveValue("MANUAL.txt");
  await expect(page.locator("#sourceList")).toContainText("a.txt");
});
