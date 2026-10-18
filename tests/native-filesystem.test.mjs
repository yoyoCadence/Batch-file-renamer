// Runs the shipped execution engine against a real temporary directory. This
// verifies OS bytes/metadata, NOT native browser picker or sharing semantics.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createExecutionPlan, runBatch, undoBatch } from "../pwa/assets/execution.js";

async function withDirectory(callback) {
  const root = await mkdtemp(join(tmpdir(), "bfr-native-"));
  function directory(path) {
    return {
      name: basename(path),
      async queryPermission() { return "granted"; },
      async requestPermission() { return "granted"; },
      async isSameEntry(other) { return other?.path === path; }, path,
      async getFileHandle(name, { create = false } = {}) {
        const filePath = join(path, name);
        assert.equal(basename(filePath), name, "test adapter never accepts paths");
        try { await stat(filePath); }
        catch (error) {
          if (error.code !== "ENOENT") throw error;
          if (!create) throw new DOMException("Missing", "NotFoundError");
          await writeFile(filePath, "", { flag: "wx" });
        }
        const identity = await stat(filePath);
        return {
          name, filePath, ino: identity.ino,
          async isSameEntry(other) { return other?.filePath === filePath && other?.ino === identity.ino; },
          async getFile() {
            const metadata = await stat(filePath);
            return new File([await readFile(filePath)], name, { lastModified: Math.trunc(metadata.mtimeMs) });
          },
          async createWritable() {
            let data;
            return {
              async write(file) { data = new Uint8Array(await file.arrayBuffer()); },
              async close() { await writeFile(filePath, data); },
              async abort() {}
            };
          }
        };
      },
      async removeEntry(name) { await unlink(join(path, name)); }
    };
  }
  try { await callback(root, directory(root)); }
  finally {
    // Resolve and validate the exact mkdtemp target before recursive cleanup.
    const child = relative(resolve(tmpdir()), resolve(root));
    assert.ok(child && !child.startsWith("..") && basename(root).startsWith("bfr-native-"));
    await rm(root, { recursive: true, force: true });
  }
}

test("real temporary files: Unicode/emoji rename -> bytes -> undo -> bytes", async () => {
  await withDirectory(async (root, directory) => {
    const sourceName = "報告😀.txt";
    const bytes = Uint8Array.from([0, 1, 255, 128, 4, 10, 13]);
    await writeFile(join(root, sourceName), bytes);
    const row = {
      id: "source", action: "Rename", status: "OK", sourceName,
      sourcePath: `${directory.name}/${sourceName}`, targetName: "完成😀.txt",
      targetDirectory: directory, targetFolder: directory.name,
      sourceRef: { directoryHandle: directory, fileHandle: await directory.getFileHandle(sourceName) }
    };
    const batch = await runBatch(await createExecutionPlan([row], { controlled: true }));
    assert.equal(batch.state, "completed");
    assert.deepEqual(new Uint8Array(await readFile(join(root, row.targetName))), bytes);
    assert.deepEqual(await readdir(root), [row.targetName]);
    await undoBatch(batch, { controlled: true });
    assert.deepEqual(new Uint8Array(await readFile(join(root, sourceName))), bytes);
    assert.deepEqual(await readdir(root), [sourceName]);
  });
});

test("real temporary files: Copy preserves source; an external original blocks undo", async () => {
  await withDirectory(async (root, directory) => {
    await writeFile(join(root, "a.txt"), "ORIGINAL");
    const row = { id: "a", action: "Copy", status: "OK", sourceName: "a.txt", sourcePath: `${directory.name}/a.txt`,
      targetName: "copy.txt", targetDirectory: directory, targetFolder: directory.name,
      sourceRef: { directoryHandle: directory, fileHandle: await directory.getFileHandle("a.txt") } };
    const copy = await runBatch(await createExecutionPlan([row], { controlled: true }));
    assert.equal(await readFile(join(root, "copy.txt"), "utf8"), "ORIGINAL");
    assert.equal(await readFile(join(root, "a.txt"), "utf8"), "ORIGINAL");
    await undoBatch(copy, { controlled: true });
    row.action = "Rename"; row.targetName = "renamed.txt";
    const rename = await runBatch(await createExecutionPlan([row], { controlled: true }));
    await writeFile(join(root, "a.txt"), "NEW_EXTERNAL", { flag: "wx" });
    await undoBatch(rename, { controlled: true });
    assert.equal(await readFile(join(root, "a.txt"), "utf8"), "NEW_EXTERNAL");
    assert.equal(await readFile(join(root, "renamed.txt"), "utf8"), "ORIGINAL");
    assert.equal(rename.entries[0].undo, "unresolved");
  });
});
