import test from "node:test";
import assert from "node:assert/strict";
import { installFakeFileSystem } from "./e2e/fake-fs.mjs";
import { createBatch, createExecutionPlan, reconcileRecoveryDependencies, recoverableEntries, recoveryReport, runBatch, undoBatch } from "../pwa/assets/execution.js";
import { createDirectoryRegistry, fileExists } from "../pwa/assets/filesystem.js";

async function setup(options = {}) {
  const fs = installFakeFileSystem(options.files ? options : { files: { "a.txt": "AAA", "b.txt": "BBB" }, ...options });
  const rows = [];
  for (const name of fs.root.names()) rows.push({
    id: name, action: "Rename", sourceName: name, sourcePath: `MockFolder/${name}`,
    targetName: `z${name}`, targetFolder: "MockFolder", targetDirectory: fs.root,
    sourceRef: { directoryHandle: fs.root, fileHandle: await fs.root.getFileHandle(name) }, status: "OK"
  });
  const plan = await createExecutionPlan(rows, { controlled: true });
  return { ...fs, rows, plan };
}

test("rename/undo verifies bytes, retains immutable plans and skips completed undo rows", async () => {
  const { root, plan } = await setup();
  assert.equal(Object.isFrozen(plan.items[0].sourceRef), true);
  const batch = await runBatch(plan);
  assert.equal(batch.state, "completed");
  assert.deepEqual(await root.contents(), { "za.txt": "AAA", "zb.txt": "BBB" });
  root.put("a.txt", "NEW_EXTERNAL");
  await undoBatch(batch, { controlled: true });
  assert.deepEqual(await root.contents(), { "a.txt": "NEW_EXTERNAL", "za.txt": "AAA", "b.txt": "BBB" });
  assert.equal(recoverableEntries(batch).length, 1);
  const reads = root.history.filter((event) => event.name === "zb.txt").length;
  await root.removeEntry("a.txt");
  await undoBatch(batch, { controlled: true });
  assert.deepEqual(await root.contents(), { "a.txt": "AAA", "b.txt": "BBB" });
  assert.equal(root.history.filter((event) => event.name === "zb.txt").length, reads);
});

test("strict mode never creates or deletes files", async () => {
  const { root, rows } = await setup();
  const plan = await createExecutionPlan(rows);
  const batch = await runBatch(plan);
  assert.equal(batch.state, "failed");
  assert.equal(root.history.some((event) => ["create", "open", "remove"].includes(event.stage)), false);
  assert.deepEqual(await root.contents(), { "a.txt": "AAA", "b.txt": "BBB" });
});

for (const errorName of ["NotAllowedError", "NotReadableError", "TypeMismatchError"]) {
  test(`target lookup ${errorName} fails closed`, async () => {
    const { root, rows } = await setup();
    root.failNext("lookup", "za.txt", errorName);
    await assert.rejects(createExecutionPlan(rows), { name: errorName });
    root.failNext("lookup", "za.txt", errorName);
    await assert.rejects(fileExists(root, "za.txt"), { name: errorName });
  });
}

test("target created after plan is never overwritten", async () => {
  const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
  root.put("za.txt", "EXTERNAL");
  const batch = await runBatch(plan);
  assert.equal(batch.entries[0].state, "failed");
  assert.deepEqual(await root.contents(), { "a.txt": "AAA", "za.txt": "EXTERNAL" });
});

for (const stage of ["read", "permission", "create", "open", "write", "close", "remove"]) {
  test(`${stage} failure preserves source and records a truthful recovery journal`, async () => {
    const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
    const name = ["read", "remove"].includes(stage) ? "a.txt" : stage === "permission" ? "" : "za.txt";
    root.failNext(stage, name, "NotAllowedError");
    const batch = await runBatch(plan);
    assert.equal((await root.contents())["a.txt"], "AAA");
    assert.notEqual(batch.entries[0].state, "completed");
    assert.equal(batch.entries[0].error.code, "NotAllowedError");
    const report = recoveryReport([batch]);
    assert.ok(report.batches[0].entries[0].events.length);
    assert.equal(JSON.stringify(report).includes("directoryHandle"), false);
    if (["open", "write", "close", "remove"].includes(stage)) {
      assert.equal(recoverableEntries(batch).length, 1);
      await undoBatch(batch, { controlled: true });
      assert.deepEqual(await root.contents(), { "a.txt": "AAA" });
    }
  });
}

test("source edits/replacements between plan and execution block deletion", async () => {
  for (const change of ["edit", "put"]) {
    const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
    root[change]("a.txt", "EXTERNAL");
    const batch = await runBatch(plan);
    assert.equal(batch.entries[0].state, "failed");
    assert.deepEqual(await root.contents(), { "a.txt": "EXTERNAL" });
  }
});

test("undo refuses modified target bytes, missing files and denied permission", async () => {
  for (const change of ["edit", "missing", "permission"]) {
    const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
    const batch = await runBatch(plan);
    if (change === "edit") root.edit("za.txt", "EXTERNAL");
    if (change === "missing") await root.removeEntry("za.txt");
    if (change === "permission") root.setPermission("denied");
    const before = await root.contents();
    await undoBatch(batch, { controlled: true });
    assert.deepEqual(await root.contents(), before);
    assert.equal(recoverableEntries(batch).length, 1);
  }
});

for (const stage of ["open", "write", "close", "remove"]) {
  test(`undo ${stage} failure keeps evidence and succeeds on retry`, async () => {
    const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
    const batch = await runBatch(plan);
    root.failNext(stage, stage === "remove" ? "za.txt" : "a.txt");
    await undoBatch(batch, { controlled: true });
    assert.equal(recoverableEntries(batch).length, 1);
    assert.equal((await root.contents())["za.txt"], "AAA");
    await undoBatch(batch, { controlled: true });
    assert.equal(recoverableEntries(batch).length, 0);
    assert.deepEqual(await root.contents(), { "a.txt": "AAA" });
  });
}

test("cancel stops at row boundary and a batch cannot start twice", async () => {
  const { root, plan } = await setup();
  const batch = createBatch(plan);
  await runBatch(plan, batch, () => { batch.cancelRequested = true; });
  assert.deepEqual(await root.contents(), { "za.txt": "AAA", "b.txt": "BBB" });
  assert.equal(batch.entries[1].state, "cancelled");
  await assert.rejects(runBatch(plan, batch), { code: "batchBusy" });
});

test("different handle objects for one directory share a collision identity", async () => {
  const { root, rows } = await setup();
  const alias = { ...root };
  const registry = createDirectoryRegistry();
  assert.equal(await registry(root), await registry(alias));
  rows[0].targetName = rows[1].targetName = "same.txt";
  rows[1].targetDirectory = alias;
  await assert.rejects(createExecutionPlan(rows), { code: "targetOccupied" });
});

test("Copy uses the captured source handle and actual directory, never global template state", async () => {
  const { root, output, rows } = await setup({ files: { "a.txt": "EXPECTED" } });
  rows[0] = { ...rows[0], action: "Copy", targetDirectory: output, targetFolder: output.name };
  const plan = await createExecutionPlan(rows, { controlled: true });
  rows[0].sourceRef = null;
  await runBatch(plan);
  assert.deepEqual(await output.contents(), { "za.txt": "EXPECTED" });
  assert.deepEqual(await root.contents(), { "a.txt": "EXPECTED" });
  rows[0].targetFolder = "FAKE_LABEL";
  await assert.rejects(createExecutionPlan(rows), { code: "bindingRequired" });
});

test("undoing chained batches rebinds proven dependencies without guessing by filename", async () => {
  const { root, plan } = await setup({ files: { "a.txt": "AAA" } });
  const first = await runBatch(plan);
  const nextRow = { ...plan.items[0], sourceName: "za.txt", sourcePath: "MockFolder/za.txt", targetName: "zza.txt",
    sourceRef: { directoryHandle: root, fileHandle: first.entries[0].targetHandle } };
  const second = await runBatch(await createExecutionPlan([nextRow], { controlled: true }));
  await undoBatch(second, { controlled: true });
  reconcileRecoveryDependencies([first, second], second);
  await undoBatch(first, { controlled: true });
  assert.deepEqual(await root.contents(), { "a.txt": "AAA" });
});
