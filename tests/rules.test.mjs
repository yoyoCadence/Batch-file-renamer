import assert from "node:assert/strict";
import {
  EMPTY_SCOPE,
  TARGETS,
  applyRulesToName,
  buildPreviewRows,
  cleanPart,
  diffSpan,
  escapeReservedName,
  executionLogToCsv,
  expandDateTokens,
  fileExtension,
  filterSources,
  hasTrailingDotOrSpace,
  isReservedFilename,
  isScopeActive,
  nextAvailableName,
  parsePreviewCsv,
  planUndoOperations,
  rowsToCsv,
  sanitizeFilename,
  stripTrailingDotOrSpace,
  summarizeExtensions,
  validateRows
} from "../pwa/assets/rules.js";

const staticSegment = [{
  target: "Segment",
  delimiter: "-",
  segmentNo: 2,
  fromEnd: false,
  valueMode: "Static",
  staticValue: "DOC"
}];

assert.equal(applyRulesToName("50-INDS-AT-52602_0.pdf", staticSegment, 0, []), "50-DOC-AT-52602_0.pdf");

const deleteFromEnd = [{
  target: "Segment",
  delimiter: "-",
  segmentNo: 1,
  fromEnd: true,
  valueMode: "Delete"
}];

assert.equal(applyRulesToName("50-INDS-AT-52602_0.pdf", deleteFromEnd, 0, []), "50-INDS-AT.pdf");

const characterInsert = [{
  target: "Character",
  charStart: 3,
  charLength: 0,
  valueMode: "SeqUp",
  seqStart: 7,
  seqStep: 2,
  pad: 3
}];

assert.equal(applyRulesToName("ABCD.txt", characterInsert, 2, []), "AB011CD.txt");

const listRule = [{
  target: "Character",
  charStart: 1,
  charLength: 2,
  valueMode: "List"
}];

assert.equal(applyRulesToName("A1-plan.csv", listRule, 1, ["Q8", "Z9"]), "Z9-plan.csv");
assert.equal(cleanPart("A:B*C"), "A_B_C");

const preview = buildPreviewRows({
  mode: "rename",
  sources: [
    { name: "a-001.txt", path: "Source/a-001.txt", folder: "Source", key: "a" },
    { name: "a-002.txt", path: "Source/a-002.txt", folder: "Source", key: "b" }
  ],
  rules: [{
    target: "Segment",
    delimiter: "-",
    segmentNo: 2,
    valueMode: "Static",
    staticValue: "final"
  }]
});

assert.equal(preview.ok, true);
assert.equal(preview.rows[0].targetName, "a-final.txt");
assert.equal(preview.rows[1].status, "Duplicate target");

const invalidRows = validateRows([
  {
    action: "Rename",
    sourceName: "a.txt",
    sourcePath: "Source/a.txt",
    targetName: "bad:name.txt",
    targetFolder: "Source"
  }
]);

assert.equal(invalidRows[0].status, "Invalid filename");

// Windows reserved device names are unsafe regardless of extension or case.
assert.equal(isReservedFilename("CON.txt"), true);
assert.equal(isReservedFilename("con"), true);
assert.equal(isReservedFilename("COM1.pdf"), true);
assert.equal(isReservedFilename("nul.tar.gz"), true);
assert.equal(isReservedFilename("console.txt"), false);
assert.equal(isReservedFilename("report.txt"), false);

// Windows silently strips a trailing dot or space.
assert.equal(hasTrailingDotOrSpace("report."), true);
assert.equal(hasTrailingDotOrSpace("report "), true);
assert.equal(hasTrailingDotOrSpace("report.txt"), false);

const reservedRow = validateRows([
  {
    action: "Rename",
    sourceName: "a.txt",
    sourcePath: "Source/a.txt",
    targetName: "CON.txt",
    targetFolder: "Source"
  }
]);
assert.equal(reservedRow[0].status, "Reserved name");

const trailingRow = validateRows([
  {
    action: "Rename",
    sourceName: "a.txt",
    sourcePath: "Source/a.txt",
    targetName: "report.",
    targetFolder: "Source"
  }
]);
assert.equal(trailingRow[0].status, "Trailing dot or space");

// Undo reverses each rename (from<->to) and applies them newest-first, keeping extra fields.
const undoOps = planUndoOperations([
  { from: "a.txt", to: "za.txt", directoryHandle: "D" },
  { from: "b.txt", to: "zb.txt", directoryHandle: "D" }
]);
assert.deepEqual(undoOps, [
  { from: "zb.txt", to: "b.txt", directoryHandle: "D" },
  { from: "za.txt", to: "a.txt", directoryHandle: "D" }
]);
assert.deepEqual(planUndoOperations([]), []);

// Find-and-replace rule mode.
assert.equal(
  applyRulesToName("report-draft-v1.pdf", [{ target: "Replace", find: "draft", replaceWith: "final" }], 0, []),
  "report-final-v1.pdf"
);
// Literal find replaces every occurrence and treats regex metacharacters literally.
assert.equal(applyRulesToName("a-a-a.txt", [{ target: "Replace", find: "a", replaceWith: "b" }], 0, []), "b-b-b.txt");
assert.equal(applyRulesToName("a.b.txt", [{ target: "Replace", find: ".", replaceWith: "_" }], 0, []), "a_b.txt");
// Regex mode with case-insensitive flag and a capture group.
assert.equal(
  applyRulesToName("IMG1234.jpg", [{ target: "Replace", find: "img(\\d+)", replaceWith: "photo$1", useRegex: true, caseInsensitive: true }], 0, []),
  "photo1234.jpg"
);
// Replacement is cleaned so it cannot introduce invalid filename characters.
assert.equal(applyRulesToName("a-b.txt", [{ target: "Replace", find: "-", replaceWith: "/" }], 0, []), "a_b.txt");
// Empty find and invalid regex are surfaced as errors.
assert.throws(() => applyRulesToName("x.txt", [{ target: "Replace", find: "" }], 0, []));
assert.throws(() => applyRulesToName("x.txt", [{ target: "Replace", find: "(", useRegex: true }], 0, []));

// Case-transform rule mode (applies to the base name; extension is preserved).
assert.equal(applyRulesToName("My-Report_v2.PDF", [{ target: "Case", caseMode: "upper" }], 0, []), "MY-REPORT_V2.PDF");
assert.equal(applyRulesToName("My-Report_v2.PDF", [{ target: "Case", caseMode: "lower" }], 0, []), "my-report_v2.PDF");
assert.equal(applyRulesToName("my-report_draft.txt", [{ target: "Case", caseMode: "title" }], 0, []), "My-Report_Draft.txt");
assert.equal(applyRulesToName("abc.txt", [{ target: "Case" }], 0, []), "ABC.txt");
assert.throws(() => applyRulesToName("abc.txt", [{ target: "Case", caseMode: "weird" }], 0, []));

// Date/time tokens in Static values (a fixed timestamp keeps a batch consistent).
const fixedNow = new Date(2026, 6, 25, 9, 5, 3); // 2026-07-25 09:05:03 local
assert.equal(expandDateTokens("{yyyy-MM-dd}", fixedNow), "2026-07-25");
assert.equal(expandDateTokens("{yyyy}{MM}{dd}_{HH}{mm}{ss}", fixedNow), "20260725_090503");
assert.equal(expandDateTokens("{yy}", fixedNow), "26");
assert.equal(expandDateTokens("no tokens", fixedNow), "no tokens");
assert.equal(expandDateTokens("{plain}", fixedNow), "{plain}");
assert.equal(
  applyRulesToName("a-x.txt", [{ target: "Segment", delimiter: "-", segmentNo: 2, valueMode: "Static", staticValue: "{yyyy-MM-dd}" }], 0, [], fixedNow),
  "a-2026-07-25.txt"
);
// A token producing an invalid filename character (":" from a time) is cleaned.
assert.equal(
  applyRulesToName("a-x.txt", [{ target: "Segment", delimiter: "-", segmentNo: 2, valueMode: "Static", staticValue: "{HH:mm}" }], 0, [], fixedNow),
  "a-09_05.txt"
);
// The timestamp threads through buildPreviewRows.
const datedPreview = buildPreviewRows({
  mode: "rename",
  sources: [{ name: "doc.txt", path: "S/doc.txt", folder: "S", key: "d" }],
  rules: [{ target: "Character", charStart: 1, charLength: 0, valueMode: "Static", staticValue: "{yyyy}-" }],
  now: fixedNow
});
assert.equal(datedPreview.rows[0].targetName, "2026-doc.txt");

// Execution log CSV: header, plain row, and escaping of commas/quotes.
const logCsv = executionLogToCsv([
  { action: "Rename", sourceName: "a.txt", sourcePath: "S/a.txt", targetName: "b.txt", targetFolder: "S", targetPath: "S/b.txt", result: "Done", message: "", timestamp: "2026-07-25T00:00:00.000Z" },
  { action: "Rename", sourceName: "c,d.txt", sourcePath: "S/c,d.txt", targetName: "e.txt", targetFolder: "S", targetPath: "S/e.txt", result: "Error", message: 'bad "x"', timestamp: "2026-07-25T00:00:00.000Z" }
]);
const logLines = logCsv.split("\r\n");
assert.equal(logLines[0], "Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Result,Message,Timestamp");
assert.equal(logLines[1], "Rename,a.txt,S/a.txt,b.txt,S,S/b.txt,Done,,2026-07-25T00:00:00.000Z");
assert.ok(logLines[2].includes('"c,d.txt"'));
assert.ok(logLines[2].includes('"bad ""x"""'));
assert.equal(executionLogToCsv([]).split("\r\n").length, 1);

const errorPreview = buildPreviewRows({
  mode: "rename",
  sources: [{ name: "short.txt", path: "Source/short.txt", folder: "Source", key: "short" }],
  rules: [{
    target: "Segment",
    delimiter: "-",
    segmentNo: 3,
    valueMode: "Static",
    staticValue: "x"
  }]
});

assert.equal(errorPreview.rows[0].targetName, "short.txt");
assert.match(errorPreview.rows[0].status, /^Error:/);

const csv = rowsToCsv(preview.rows);
const imported = parsePreviewCsv(csv);
assert.equal(imported.length, 2);
assert.equal(imported[0].targetName, "a-final.txt");

// T037: rule failures carry a translatable code + params alongside the English message, so the
// UI can localize them without the engine depending on a translation catalog.
assert.equal(errorPreview.rows[0].statusDetail.code, "segmentOutOfRange");
assert.deepEqual(errorPreview.rows[0].statusDetail.params, { segmentNo: 3, parts: 1, delimiter: "-" });
assert.equal(errorPreview.rows[0].status, "Error: Segment 3 out of range. Parts=1");

const codedCases = [
  [{ target: "Segment", delimiter: "", segmentNo: 1, valueMode: "Static", staticValue: "x" }, "delimiterEmpty"],
  [{ target: "Character", charStart: 0, charLength: 1, valueMode: "Static", staticValue: "x" }, "charStartTooSmall"],
  [{ target: "Character", charStart: 99, charLength: 1, valueMode: "Static", staticValue: "x" }, "charStartBeyondLength"],
  [{ target: "Character", charStart: 1, charLength: -1, valueMode: "Static", staticValue: "x" }, "charLengthNegative"],
  [{ target: "Replace", find: "", replaceWith: "x" }, "findEmpty"],
  [{ target: "Replace", find: "[", replaceWith: "x", useRegex: true }, "invalidRegex"],
  [{ target: "Case", caseMode: "sentence" }, "unknownCaseMode"]
];
for (const [rule, expectedCode] of codedCases) {
  const row = buildPreviewRows({
    mode: "rename",
    sources: [{ name: "a-b.txt", path: "S/a-b.txt", folder: "S", key: "k" }],
    rules: [rule]
  }).rows[0];
  assert.equal(row.statusDetail?.code, expectedCode, `expected ${expectedCode}`);
  assert.ok(row.status.startsWith("Error:"), `${expectedCode} should still carry an English message`);
}

// buildPreviewRows rejects a mismatched value list before any row is built, so this code is
// only reachable by calling the engine directly.
assert.throws(
  () => applyRulesToName("a-b.txt", [{ target: "Segment", delimiter: "-", segmentNo: 1, valueMode: "List" }], 2, ["one"]),
  (error) => error.code === "valueListMissingRow" && error.params.row === 3 && error.params.available === 1
);

// A later validation state replaces the rule error, so the stale detail must not linger.
const clearedDetail = validateRows([
  { action: "Rename", sourceName: "a.txt", sourcePath: "S/a.txt", targetName: "b.txt", targetFolder: "S", status: "OK", statusDetail: { code: "segmentOutOfRange", params: {} } }
]);
assert.equal(clearedDetail[0].statusDetail, null);

// Display-only folder labels are injected by the caller so the engine stays language-agnostic.
const localizedFallback = buildPreviewRows({
  mode: "rename",
  sources: [{ name: "a.txt", path: "a.txt", key: "a" }],
  rules: [{ target: "Case", caseMode: "upper" }],
  sourceFolderFallback: "來源資料夾"
});
assert.equal(localizedFallback.rows[0].targetFolder, "來源資料夾");
assert.equal(
  buildPreviewRows({
    mode: "rename",
    sources: [{ name: "a.txt", path: "a.txt", key: "a" }],
    rules: [{ target: "Case", caseMode: "upper" }]
  }).rows[0].targetFolder,
  "Source folder",
  "the engine keeps an English default when no label is supplied"
);
assert.equal(
  parsePreviewCsv("Action,SourceName,TargetName\nRename,a.txt,b.txt\n", { importedFolderLabel: "匯入的資料" })[0].targetFolder,
  "匯入的資料"
);
assert.equal(parsePreviewCsv("Action,SourceName,TargetName\nRename,a.txt,b.txt\n")[0].targetFolder, "Imported");

// T039: scope filtering decides which files a batch touches, independently of the rules.
const scopeSources = [
  { name: "IMG_2024_a.jpg", key: "1" },
  { name: "IMG_2024_b.JPG", key: "2" },
  { name: "report-2023.pdf", key: "3" },
  { name: "backup-2024.pdf", key: "4" },
  { name: "README", key: "5" }
];

assert.equal(fileExtension("a.JPG"), ".jpg", "extensions compare case-insensitively");
assert.equal(fileExtension("README"), "", "a file with no dot has no extension");
assert.equal(fileExtension(".gitignore"), "", "a leading dot is a name, not an extension");

// Counts drive the chip row: most common first, ties broken by name.
assert.deepEqual(summarizeExtensions(scopeSources), [
  { ext: ".jpg", count: 2 },
  { ext: ".pdf", count: 2 },
  { ext: "", count: 1 }
]);

assert.equal(isScopeActive(EMPTY_SCOPE), false);
assert.equal(isScopeActive({ ...EMPTY_SCOPE, include: "   " }), false, "whitespace is not a filter");
assert.equal(isScopeActive({ ...EMPTY_SCOPE, excludedExtensions: [".pdf"] }), true);

// Excluding an extension keeps everything else, including extension-less files.
assert.deepEqual(
  filterSources(scopeSources, { ...EMPTY_SCOPE, excludedExtensions: [".pdf"] }).map((s) => s.key),
  ["1", "2", "5"]
);

// Include/exclude match the whole filename, case-insensitively.
assert.deepEqual(
  filterSources(scopeSources, { ...EMPTY_SCOPE, include: "2024" }).map((s) => s.key),
  ["1", "2", "4"]
);
assert.deepEqual(
  filterSources(scopeSources, { ...EMPTY_SCOPE, include: "img" }).map((s) => s.key),
  ["1", "2"]
);
assert.deepEqual(
  filterSources(scopeSources, { ...EMPTY_SCOPE, include: "2024", exclude: "backup" }).map((s) => s.key),
  ["1", "2"]
);
assert.deepEqual(filterSources(scopeSources, EMPTY_SCOPE).map((s) => s.key), ["1", "2", "3", "4", "5"]);
assert.deepEqual(
  filterSources(scopeSources, { ...EMPTY_SCOPE, include: "nothing-matches" }),
  [],
  "an over-narrow filter yields an empty scope rather than falling back to everything"
);

// Filtering composes with the engine: only in-scope files become preview rows, so an
// out-of-scope file can never be executed.
const scopedPreview = buildPreviewRows({
  mode: "rename",
  sources: filterSources(scopeSources, { ...EMPTY_SCOPE, excludedExtensions: [".pdf", ""] }),
  rules: [{ target: "Case", caseMode: "upper" }],
  sourceFolderFallback: "S"
});
assert.equal(scopedPreview.rows.length, 2);
assert.deepEqual(scopedPreview.rows.map((row) => row.sourceName), ["IMG_2024_a.jpg", "IMG_2024_b.JPG"]);

// T040: engine guards identify themselves with a code so the UI can localize them, while the
// English message stays put for logs.
const guardCases = [
  [{ mode: "rename", sources: [{ name: "a.txt", key: "a" }], rules: [] }, "noRules"],
  [{ mode: "rename", sources: [], rules: [{ target: "Case", caseMode: "upper" }] }, "needSources"],
  [{ mode: "copy", template: null, rules: [{ target: "Case", caseMode: "upper" }] }, "needTemplate"],
  [{ mode: "copy", template: { name: "t.txt" }, outputFolder: "", rules: [{ target: "Case", caseMode: "upper" }] }, "needOutputFolder"],
  [{
    mode: "copy",
    template: { name: "t.txt" },
    outputFolder: "Out",
    rules: [{ target: "Segment", delimiter: ".", segmentNo: 1, valueMode: "List" }],
    valueListText: ""
  }, "valueListEmpty"]
];
for (const [options, expectedCode] of guardCases) {
  const result = buildPreviewRows(options);
  assert.equal(result.ok, false, expectedCode);
  assert.equal(result.messageCode, expectedCode);
  assert.ok(typeof result.message === "string" && result.message.length > 0, `${expectedCode} keeps an English message`);
}

const mismatch = buildPreviewRows({
  mode: "rename",
  sources: [{ name: "a.txt", key: "a" }, { name: "b.txt", key: "b" }],
  rules: [{ target: "Segment", delimiter: ".", segmentNo: 1, valueMode: "List" }],
  valueListText: "only-one\n"
});
assert.equal(mismatch.messageCode, "valueListCountMismatch");
assert.deepEqual(mismatch.messageParams, { lines: 1, files: 2 });

// T041: the diff drives the preview table's change column.
assert.deepEqual(diffSpan("50-INDS-AT-1.pdf", "50-PROJ-AT-1.pdf"), {
  prefix: "50-", removed: "INDS", added: "PROJ", suffix: "-AT-1.pdf"
});
assert.deepEqual(diffSpan("a.txt", "a.txt"), { prefix: "a.txt", removed: "", added: "", suffix: "" });
assert.deepEqual(diffSpan("b.txt", "prefix-b.txt"), { prefix: "", removed: "", added: "prefix-", suffix: "b.txt" });
assert.deepEqual(diffSpan("old-b.txt", "b.txt"), { prefix: "", removed: "old-", added: "", suffix: "b.txt" });
// The suffix scan must not reach back past the prefix, or the middle would go negative.
assert.deepEqual(diffSpan("aa", "aaa"), { prefix: "aa", removed: "", added: "a", suffix: "" });
assert.deepEqual(diffSpan("", "new.txt"), { prefix: "", removed: "", added: "new.txt", suffix: "" });
{
  const { prefix, removed, suffix } = diffSpan("x.txt", "y.txt");
  assert.equal(prefix + removed + suffix, "x.txt", "prefix + removed + suffix rebuilds the original");
}

// Row repairs: each fixes exactly the status it is offered for.
assert.equal(sanitizeFilename('a<b>c:d.txt'), "a_b_c_d.txt");
assert.equal(stripTrailingDotOrSpace("report. "), "report");
assert.equal(stripTrailingDotOrSpace("report.txt"), "report.txt", "a real extension is not a trailing dot");
assert.equal(escapeReservedName("CON.txt"), "CON_.txt");
assert.equal(escapeReservedName("NUL"), "NUL_");
assert.equal(isReservedFilename(escapeReservedName("CON.txt")), false, "the repair clears the status it fixes");

const taken = new Set(["out/a.txt", "out/a-1.txt"]);
assert.equal(nextAvailableName("a.txt", taken, "Out"), "a-2.txt");
assert.equal(nextAvailableName("free.txt", taken, "Out"), "free.txt", "an unused name is left alone");
assert.equal(nextAvailableName("a.txt", new Set(), "Out"), "a.txt");

// The repaired names must actually pass validation, not just look different.
const repaired = validateRows([
  { action: "Rename", sourceName: "s1.txt", sourcePath: "S/s1.txt", targetName: "dup.txt", targetFolder: "S", status: "OK" },
  { action: "Rename", sourceName: "s2.txt", sourcePath: "S/s2.txt", targetName: nextAvailableName("dup.txt", new Set(["s/dup.txt"]), "S"), targetFolder: "S", status: "OK" }
]);
assert.deepEqual(repaired.map((row) => row.status), ["OK", "OK"]);

// T042: beginner presets that avoid Segment/Character arithmetic.
const affix = (position, text) => [{ target: "Affix", affixPosition: position, affixText: text }];
assert.equal(applyRulesToName("photo.jpg", affix("prefix", "2024_")), "2024_photo.jpg");
assert.equal(applyRulesToName("photo.jpg", affix("suffix", "_final")), "photo_final.jpg");
assert.equal(applyRulesToName("noext", affix("prefix", "x-")), "x-noext");
// Affix text is cleaned like any other rule value, so it cannot inject path separators.
assert.equal(applyRulesToName("a.txt", affix("prefix", "b/c")), "b_ca.txt");
assert.equal(
  applyRulesToName("a.txt", affix("prefix", "{yyyy}-"), 0, [], new Date(2026, 6, 26)),
  "2026-a.txt",
  "affix text expands date tokens like a Static value"
);
assert.throws(() => applyRulesToName("a.txt", affix("prefix", "")), (e) => e.code === "affixTextEmpty");
assert.throws(() => applyRulesToName("a.txt", affix("middle", "x")), (e) => e.code === "unknownAffixPosition");

// Extension: the one transform the engine previously could not express at all.
const ext = (value) => [{ target: "Extension", newExtension: value }];
assert.equal(applyRulesToName("photo.jpeg", ext("jpg")), "photo.jpg");
assert.equal(applyRulesToName("photo.jpeg", ext(".jpg")), "photo.jpg", "a leading dot is optional");
assert.equal(applyRulesToName("noext", ext("txt")), "noext.txt", "a file with no extension gains one");
assert.equal(applyRulesToName("a.b.c", ext("z")), "a.b.z", "only the last extension is replaced");
assert.throws(() => applyRulesToName("a.txt", ext("  ")), (e) => e.code === "extensionEmpty");

// Extension changes compose with rules that act on the base name, in either order.
assert.equal(
  applyRulesToName("photo.jpeg", [...ext("jpg"), ...affix("prefix", "new_")]),
  "new_photo.jpg"
);
assert.equal(
  applyRulesToName("photo.jpeg", [...affix("prefix", "new_"), ...ext("jpg")]),
  "new_photo.jpg"
);

const cleanup = (mode) => [{ target: "Cleanup", cleanupMode: mode }];
assert.equal(applyRulesToName("  a   b  .txt", cleanup("trimSpaces")), "a b.txt");
assert.equal(applyRulesToName("a b c.txt", cleanup("spacesToUnderscore")), "a_b_c.txt");
assert.equal(applyRulesToName("a!@#b.txt", cleanup("removeSpecial")), "ab.txt");
assert.equal(
  applyRulesToName("報表 2024 最終版.xlsx", cleanup("removeSpecial")),
  "報表 2024 最終版.xlsx",
  "CJK letters and digits survive removeSpecial"
);
assert.equal(applyRulesToName("a---b___c.txt", cleanup("collapseSeparators")), "a-b_c.txt");
assert.throws(() => applyRulesToName("a.txt", cleanup("nope")), (e) => e.code === "unknownCleanupMode");

// The new targets are registered so callers enumerating TARGETS see them.
for (const target of ["Affix", "Extension", "Cleanup"]) {
  assert.ok(TARGETS.includes(target), target);
}

console.log("rules tests passed");
