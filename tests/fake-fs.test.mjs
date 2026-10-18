import test from "node:test";
import assert from "node:assert/strict";
import { installFakeFileSystem } from "./e2e/fake-fs.mjs";

test("fake FS rejects missing reads/removes and tracks entry identity", async () => {
  const { root } = installFakeFileSystem();
  await assert.rejects(root.getFileHandle("missing"), { name: "NotFoundError" });
  await assert.rejects(root.removeEntry("missing"), { name: "NotFoundError" });
  const handle = await root.getFileHandle("a.txt");
  assert.equal(await handle.isSameEntry(await root.getFileHandle("a.txt")), true);
  root.put("a.txt", "EXTERNAL");
  await assert.rejects(handle.getFile(), { name: "NotFoundError" });
});

for (const stage of ["open", "write", "close", "remove", "lookup", "permission", "read"]) {
  test(`fake FS injects ${stage} failure`, async () => {
    const { root } = installFakeFileSystem();
    const handle = await root.getFileHandle("a.txt");
    root.failNext(stage, stage === "permission" ? "" : "a.txt", "NotReadableError");
    const action = stage === "open" ? () => handle.createWritable()
      : stage === "lookup" ? () => root.getFileHandle("a.txt")
      : stage === "remove" ? () => root.removeEntry("a.txt")
      : stage === "permission" ? () => root.queryPermission()
      : stage === "read" ? () => handle.getFile()
      : async () => { const stream = await handle.createWritable(); await stream[stage]("new"); };
    await assert.rejects(action(), { name: "NotReadableError" });
  });
}

test("fake FS supports Windows case-insensitive names", async () => {
  const { root } = installFakeFileSystem({ files: { "a.txt": "AAA" }, caseInsensitive: true });
  assert.equal(await (await root.getFileHandle("A.TXT")).getFile().then((file) => file.text()), "AAA");
  await root.removeEntry("A.TXT");
  assert.deepEqual(root.names(), []);
});
