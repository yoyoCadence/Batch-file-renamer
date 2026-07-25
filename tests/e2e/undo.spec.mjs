import { test, expect } from "./fixtures.mjs";

// Concrete browser verification for T028: execute a rename batch, then undo it and
// confirm the original filenames are restored. The real File System Access API needs
// a native picker, so we inject an in-memory fake directory handle and assert against it.

function installFakeFileSystem() {
  const makeFakeDir = (name, initial) => {
    const files = new Map(Object.entries(initial));
    const makeFileHandle = (fileName) => ({
      kind: "file",
      name: fileName,
      async getFile() {
        return new File([files.get(fileName) ?? ""], fileName, { type: "text/plain" });
      },
      async createWritable() {
        let buffer = "";
        return {
          async write(data) {
            buffer = typeof data === "string" ? data : await data.text();
          },
          async close() {
            files.set(fileName, buffer);
          }
        };
      }
    });
    return {
      kind: "directory",
      name,
      async queryPermission() {
        return "granted";
      },
      async requestPermission() {
        return "granted";
      },
      async *entries() {
        for (const key of [...files.keys()]) {
          yield [key, makeFileHandle(key)];
        }
      },
      async getFileHandle(fileName, options = {}) {
        if (!files.has(fileName)) {
          if (options.create) {
            files.set(fileName, "");
          } else {
            const error = new Error("Not found");
            error.name = "NotFoundError";
            throw error;
          }
        }
        return makeFileHandle(fileName);
      },
      async removeEntry(fileName) {
        files.delete(fileName);
      },
      names() {
        return [...files.keys()].sort();
      }
    };
  };

  window.showDirectoryPicker = async () => {
    window.__fakeDir = makeFakeDir("MockFolder", { "a.txt": "AAA", "b.txt": "BBB" });
    return window.__fakeDir;
  };
  // The app only feature-detects this; it is not exercised by this test.
  window.showOpenFilePicker = async () => {
    throw new Error("showOpenFilePicker is not used in this test");
  };
}

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
