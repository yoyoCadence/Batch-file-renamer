import assert from "node:assert/strict";
import {
  applyRulesToName,
  buildPreviewRows,
  cleanPart,
  executionLogToCsv,
  expandDateTokens,
  hasTrailingDotOrSpace,
  isReservedFilename,
  parsePreviewCsv,
  planUndoOperations,
  rowsToCsv,
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

console.log("rules tests passed");
