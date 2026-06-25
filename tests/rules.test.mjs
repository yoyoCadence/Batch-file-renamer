import assert from "node:assert/strict";
import {
  applyRulesToName,
  buildPreviewRows,
  cleanPart,
  parsePreviewCsv,
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
