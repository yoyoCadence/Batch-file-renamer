import test from "node:test";
import assert from "node:assert/strict";
import { applyRulesToName, buildPreviewRows, escapeReservedName, isReservedFilename, normalizeRule, parsePreviewCsv, rowsToCsv, traceRulesToName, validateRows, RULE_FIELDS, WINDOWS_RESERVED_NAMES } from "../pwa/assets/rules.js";
import { CSV_MAX_BYTES, parseCsvRecords } from "../pwa/assets/csv.js";
import { loadSettings, loadSession, loadRulePresets, saveSettings, saveSession, saveRulePresets, DEFAULT_SETTINGS } from "../pwa/assets/settings.js";
import { isReady, normalizeRowStatus, statusBucket, statusLabel } from "../pwa/assets/status.js";
import { rowCounts } from "../pwa/assets/preview-state.js";

test("rule schemas discard every unrelated hidden field and preserve older valid values", () => {
  const all = { valueMode: "List", charLength: "9", find: "x", replaceWith: "y", affixText: "z", staticValue: "abc", delimiter: "-", seqStep: "2", pad: "4" };
  for (const target of Object.keys(RULE_FIELDS)) {
    const rule = normalizeRule({ ...all, target });
    assert.deepEqual(Object.keys(rule).sort(), ["target", "enabled", ...RULE_FIELDS[target]].sort());
    if (!["Segment", "Character"].includes(target)) assert.equal(rule.valueMode, undefined);
  }
  assert.equal(normalizeRule({ Target: "Character", ValueMode: "SeqDown", SeqStart: "10" }).seqStart, 10);
  const result = buildPreviewRows({ mode: "rename", sources: [{ name: "a.txt", folder: "S" }], rules: [{ target: "Affix", affixText: "z", valueMode: "List" }] });
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].targetName, "za.txt");
});

test("one trace preserves the entire changed extension and matches full engine results", () => {
  const time = new Date(2026, 9, 19, 10, 11, 12);
  const rules = [
    { target: "Extension", newExtension: "tar.gz" }, { target: "Replace", find: "tar", replaceWith: "zip" },
    { target: "Affix", affixText: "{yyyy-MM-dd}_" }, { target: "Case", caseMode: "upper" },
    { target: "Cleanup", cleanupMode: "trimSpaces" }, { target: "Character", charStart: 1, charLength: 0, staticValue: "x" }
  ];
  for (const filename of ["a.txt", ".env", "a", " a tar .gz", "資料😀.txt"]) {
    for (const first of rules) for (const second of rules) {
      const trace = traceRulesToName(filename, [first, second], 0, [], time);
      assert.equal(trace.error, null);
      assert.equal(trace.steps[1].after, applyRulesToName(filename, [first, second], 0, [], time));
      assert.equal(trace.steps[1].before, trace.steps[0].after);
    }
  }
  assert.equal(traceRulesToName("a.txt", rules.slice(0, 2)).targetName, "a.tar.gz");
});

test("disabled steps keep state and failures block later trace steps", () => {
  const rules = [{ target: "Affix", affixText: "z", enabled: false }, { target: "Segment", delimiter: "-", segmentNo: 99 }, { target: "Case" }];
  const result = traceRulesToName("a.txt", rules);
  assert.equal(result.steps[0].disabled, true);
  assert.equal(result.steps[1].error.code, "segmentOutOfRange");
  assert.equal(result.steps[2].blocked, true);
  assert.throws(() => applyRulesToName("a.txt", rules), { code: "segmentOutOfRange" });
});

test("reserved-name repair fixes the first component of multi-dot names", () => {
  for (const name of WINDOWS_RESERVED_NAMES) for (const suffix of ["", ".txt", ".tar.gz"]) {
    for (const variant of [name, name.toLowerCase()]) assert.equal(isReservedFilename(escapeReservedName(`${variant}${suffix}`)), false);
  }
  assert.equal(escapeReservedName("CON.tar.gz"), "CON_.tar.gz");
  assert.equal(escapeReservedName("normal.tar.gz"), "normal.tar.gz");
});

test("literal replacement preserves dollar tokens while regex retains capture semantics", () => {
  for (const replacement of ["$&", "$$", "$1", "", "中文😀"]) {
    assert.equal(applyRulesToName("aba.txt", [{ target: "Replace", find: "b", replaceWith: replacement }]), `a${replacement}a.txt`);
  }
  assert.equal(applyRulesToName("aba.txt", [{ target: "Replace", find: "(b)", replaceWith: "$1$1", useRegex: true }]), "abba.txt");
  assert.equal(applyRulesToName("aba.txt", [{ target: "Replace", find: "b", replaceWith: "\\" }]), "a_a.txt");
});

const planRow = { action: "Rename", sourceName: "a.txt", sourcePath: "S/a.txt", targetName: "b.txt", targetFolder: "S", status: "OK" };

test("v2 raw CSV preserves commas, quotes, BOM, CRLF, CJK, emoji and formula-leading names", () => {
  for (const targetName of ['=SUM(1,2).txt', '+x.txt', '-x.txt', '@x.txt', '中,"文\r\n😀.txt', "a'.txt"]) {
    const raw = rowsToCsv([{ ...planRow, targetName }]);
    assert.match(raw, /^SchemaVersion,Format,/);
    const imported = parsePreviewCsv(`\uFEFF${raw}`);
    assert.equal(imported[0].targetName, targetName);
    assert.equal(imported[0].sourcePath, planRow.sourcePath);
    assert.equal(imported[0].status, "Binding required");
  }
});

test("spreadsheet view guards formulas and cannot silently round-trip altered names", () => {
  for (const targetName of ["=x.txt", "+x.txt", "-x.txt", "@x.txt", " =x.txt", "\tx.txt"]) {
    const view = rowsToCsv([{ ...planRow, targetName }], { spreadsheet: true });
    assert.equal(parseCsvRecords(view)[1][5], `'${targetName}`);
    assert.throws(() => parsePreviewCsv(view), { code: "csvInvalid" });
    assert.equal(parsePreviewCsv(rowsToCsv([{ ...planRow, targetName }]))[0].targetName, targetName);
  }
});

test("CSV rejects malformed quotes, duplicate headers, oversized data and unknown schema", () => {
  for (const text of ['A,B\n"open,b', 'A,B\n"x"oops,b', 'A,B\nx"y,b']) assert.throws(() => parseCsvRecords(text), { code: "csvInvalid" });
  assert.throws(() => parseCsvRecords("x".repeat(CSV_MAX_BYTES + 1)), { code: "csvInvalid" });
  assert.throws(() => parseCsvRecords("A\n" + "x\n".repeat(10001)), { code: "csvInvalid" });
  assert.throws(() => parseCsvRecords(Array(33).fill("x").join(",")), { code: "csvInvalid" });
  assert.throws(() => parsePreviewCsv("Action,SourceName,TargetName,Action\nRename,a,b,Rename"), { code: "csvInvalid" });
  assert.throws(() => parsePreviewCsv(rowsToCsv([planRow]).replace("2,raw-plan", "999,raw-plan")), { code: "csvInvalid" });
});

test("CSV mapping is explicit; invalid/duplicate records are blocked independently", () => {
  const csv = "操作,原名,來源,新名,資料夾\nRename,a.txt,S/a.txt,b.txt,S\nUnknown,b.txt,S/b.txt,c.txt,S";
  const columnMap = { Action: "操作", SourceName: "原名", SourcePath: "來源", TargetName: "新名", TargetFolder: "資料夾" };
  const imported = parsePreviewCsv(csv, { columnMap, collectErrors: true });
  assert.equal(imported[0].importError, null);
  assert.equal(imported[1].importError.record, 3);
  assert.equal(imported[1].importError.code, "action");
  assert.equal(validateRows(imported)[1].statusCode, "csv");
  const duplicate = parsePreviewCsv(rowsToCsv([planRow, planRow]), { collectErrors: true });
  assert.equal(duplicate.every((row) => row.importError.code === "duplicate"), true);
  const repeatedSource = parsePreviewCsv(rowsToCsv([planRow, { ...planRow, targetName: "c.txt" }]), { collectErrors: true });
  assert.equal(repeatedSource.every((row) => row.importError.code === "duplicate"), true);
  const copies = parsePreviewCsv(rowsToCsv([{ ...planRow, action: "Copy" }, { ...planRow, action: "Copy", targetName: "c.txt" }]), { collectErrors: true });
  assert.equal(copies.every((row) => row.importError === null), true);
  assert.throws(() => parsePreviewCsv(rowsToCsv([planRow, planRow])), { code: "csvInvalid" });
});

test("unavailable localStorage getter and quota failures never prevent session settings", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new DOMException("Denied", "SecurityError"); } });
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    assert.deepEqual(loadSession().rules, []);
    assert.deepEqual(loadRulePresets(), []);
    assert.equal(saveSettings({ language: "ja" }).language, "ja");
    assert.doesNotThrow(() => saveSession({}));
    assert.doesNotThrow(() => saveRulePresets([]));
    assert.equal(saveSettings({ language: "en" }, { setItem() { throw new DOMException("Full", "QuotaExceededError"); } }).language, "en");
    assert.deepEqual(loadSettings({ getItem() { return "null"; } }), DEFAULT_SETTINGS);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});

test("status codes drive decisions and summary buckets independently of display strings", () => {
  const row = normalizeRowStatus({ status: "Done" });
  row.status = "完成";
  assert.equal(statusBucket(row), "done");
  assert.equal(statusLabel(row), "Done");
  assert.equal(isReady(row), false);
  assert.equal(rowCounts([row]).done, 1);
  const caseRow = validateRows([{ ...planRow, targetName: "A.TXT" }])[0];
  assert.equal(caseRow.statusCode, "caseOnly");
  assert.equal(isReady(caseRow), false);
});
