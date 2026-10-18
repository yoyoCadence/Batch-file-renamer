import test from "node:test";
import assert from "node:assert/strict";
import { buildPreviewRows, parsePreviewCsv, rowsToCsv, validateRows } from "../pwa/assets/rules.js";
import { attachBindings, bindImportedRows, mergeOverrides, rowCounts } from "../pwa/assets/preview-state.js";
import { installFakeFileSystem } from "./e2e/fake-fs.mjs";

test("source IDs survive filtering, sorting and a changed visible index", () => {
  const sources = ["a.txt", "b.txt"].map((name) => ({ id: `stable:${name}`, name, path: `S/${name}`, folder: "S" }));
  const options = { mode: "rename", sources, rules: [{ target: "Affix", affixText: "z" }] };
  const full = buildPreviewRows(options).rows;
  const narrowed = buildPreviewRows({ ...options, sources: [sources[1]] }).rows;
  assert.equal(full[1].id, narrowed[0].id);
  const excluded = new Set([full[1].id]);
  assert.equal(validateRows(narrowed, { excludedIds: excluded })[0].status, "Excluded");
});

test("overrides survive rule rebuilds but copy identities change with templates", () => {
  const options = { mode: "copy", template: { name: "a.txt", key: "template-one" }, outputFolder: "S", count: 1, rules: [{ target: "Affix", affixText: "z" }] };
  const original = buildPreviewRows(options).rows;
  const overrides = new Map([[original[0].id, { targetName: "MANUAL.txt" }]]);
  assert.equal(mergeOverrides(buildPreviewRows(options).rows, overrides)[0].targetName, "MANUAL.txt");
  const next = buildPreviewRows({ ...options, template: { name: "a.txt", key: "template-two" } }).rows;
  assert.equal(mergeOverrides(next, overrides)[0].targetName, "za.txt");
});

test("all collisions are visible and excluded rows do not reserve destinations", () => {
  const rows = ["a", "b"].map((id) => ({ id, action: "Copy", targetName: "same.txt", targetFolder: id, targetDirectoryKey: "physical-same-folder" }));
  assert.deepEqual(validateRows(rows).map((row) => row.status), ["Duplicate target", "Duplicate target"]);
  assert.deepEqual(validateRows(rows, { excludedIds: new Set(["a"]) }).map((row) => row.status), ["Excluded", "OK"]);
});

test("CSV OK never grants a binding and different sources/labels cannot substitute a template", async () => {
  const { root, output } = installFakeFileSystem();
  const template = { name: "a.txt", path: "a.txt", ref: { fileHandle: await root.getFileHandle("a.txt") } };
  const source = { action: "Copy", sourceName: "other.txt", sourcePath: "Other/other.txt", targetName: "out.txt", targetFolder: "OtherFolder", status: "OK" };
  const imported = parsePreviewCsv(rowsToCsv([source]));
  const options = { mode: "copy", sources: [], template, outputDirectory: { handle: output } };
  assert.equal(validateRows(imported)[0].status, "Binding required");
  assert.equal(bindImportedRows(imported, options)[0].bound, false);
  const displayed = attachBindings(imported, options)[0];
  assert.equal(displayed.targetDirectory, null);
  assert.equal(displayed.targetFolder, "OtherFolder");
  const good = parsePreviewCsv(rowsToCsv([{ ...source, sourceName: "a.txt", sourcePath: "a.txt", targetFolder: output.name }]));
  assert.equal(bindImportedRows(good, options)[0].sourceRef, template.ref);
});

test("Rename CSV binding requires exact source path and a real selected folder", async () => {
  const { root } = installFakeFileSystem();
  const source = { name: "a.txt", path: "MockFolder/a.txt", ref: { directoryHandle: root, fileHandle: await root.getFileHandle("a.txt") } };
  const rows = parsePreviewCsv(rowsToCsv([{ action: "Rename", sourceName: "a.txt", sourcePath: source.path, targetFolder: root.name, targetName: "out.txt", status: "Done" }]));
  assert.equal(bindImportedRows(rows, { mode: "rename", sources: [source] })[0].bound, true);
  assert.equal(bindImportedRows(rows, { mode: "rename", sources: [{ ...source, path: "Other/a.txt" }] })[0].bound, false);
  assert.equal(bindImportedRows(rows, { mode: "rename", sources: [source, source] })[0].bound, false);
});

test("summary partitions Done, failures, partial, excluded and ready rows", () => {
  const counts = rowCounts(["Done", "Undone", "Excluded", "Partial", "OK", "Target exists", "Error: denied"].map((status) => ({ status })));
  assert.deepEqual(counts, { done: 2, excluded: 1, partial: 1, ok: 1, blocked: 2, error: 1 });
  assert.equal(counts.done + counts.excluded + counts.partial + counts.ok + counts.blocked, 7);
});
