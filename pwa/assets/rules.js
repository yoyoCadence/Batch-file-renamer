const INVALID_FILENAME_RE = /[<>:"/\\|?*\x00-\x1f]/g;

export const VALUE_MODES = ["Static", "List", "SeqUp", "SeqDown", "Delete"];
export const TARGETS = ["Segment", "Character", "Replace", "Case"];
export const CASE_MODES = ["upper", "lower", "title"];

// Rule and execution failures surface in the preview status column, so each one carries a
// stable `code` plus `params` that the UI can look up in its translation catalog. The
// `message` stays English on purpose: it is what lands in CSV exports and execution logs,
// which must stay stable regardless of the interface language.
export function codedError(code, message, params = {}) {
  const error = new Error(message);
  error.code = code;
  error.params = params;
  return error;
}

// Pull the localizable part off a thrown error, or null for errors raised outside our own
// code (a browser DOMException, for example) that have no code to translate.
export function errorDetail(error) {
  return error?.code ? { code: error.code, params: error.params || {} } : null;
}

export function parseValueLines(text = "") {
  const lines = String(text).split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export function splitFilename(name) {
  const fileName = getFileName(name);
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { base: fileName, ext: "" };
  }
  return {
    base: fileName.slice(0, dot),
    ext: fileName.slice(dot)
  };
}

export function getFileName(path = "") {
  const normalized = String(path).replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

export function getFolderName(path = "") {
  const normalized = String(path).replaceAll("\\", "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : "";
}

export function joinDisplayPath(folder, name) {
  if (!folder) {
    return name || "";
  }
  return `${String(folder).replace(/[\\/]+$/, "")}/${name || ""}`;
}

export function hasInvalidFilenameChars(name) {
  INVALID_FILENAME_RE.lastIndex = 0;
  return INVALID_FILENAME_RE.test(String(name));
}

// Windows reserves these device names regardless of extension (CON, CON.txt, ...).
export const WINDOWS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
]);

export function isReservedFilename(name) {
  const fileName = getFileName(name);
  const beforeDot = fileName.split(".")[0] || "";
  return WINDOWS_RESERVED_NAMES.has(beforeDot.trim().toUpperCase());
}

// Windows silently strips a trailing dot or space, so a target ending in either is unsafe.
export function hasTrailingDotOrSpace(name) {
  return /[ .]$/.test(getFileName(name));
}

export function cleanPart(value) {
  return String(value ?? "").replace(INVALID_FILENAME_RE, "_");
}

const DATE_TOKEN_RE = /\{([^{}]*)\}/g;

// Expand {yyyy-MM-dd HH:mm:ss}-style date tokens using a single timestamp so every row
// in a batch shares the same value. Only `{...}` groups that contain a recognized token
// are expanded; any other braced text is left untouched.
export function expandDateTokens(text, now = new Date()) {
  return String(text ?? "").replace(DATE_TOKEN_RE, (match, pattern) => {
    const replaced = formatDatePattern(pattern, now);
    return replaced === pattern ? match : replaced;
  });
}

function formatDatePattern(pattern, now) {
  const pad = (value, length = 2) => String(value).padStart(length, "0");
  const parts = {
    yyyy: String(now.getFullYear()),
    yy: pad(now.getFullYear() % 100),
    MM: pad(now.getMonth() + 1),
    dd: pad(now.getDate()),
    HH: pad(now.getHours()),
    mm: pad(now.getMinutes()),
    ss: pad(now.getSeconds())
  };
  return pattern.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (token) => parts[token]);
}

export function ruleValue(rule, rowIndex, valueLines = [], now = new Date()) {
  const mode = rule.valueMode || rule.ValueMode || "Static";
  if (mode === "Delete") {
    return "";
  }
  if (mode === "Static") {
    return expandDateTokens(String(rule.staticValue ?? rule.StaticValue ?? ""), now);
  }
  if (mode === "List") {
    if (rowIndex >= valueLines.length) {
      throw codedError("valueListMissingRow", `Value list missing row ${rowIndex + 1}`, {
        row: rowIndex + 1,
        available: valueLines.length
      });
    }
    return String(valueLines[rowIndex]);
  }

  const start = toInteger(rule.seqStart ?? rule.SeqStart, 1);
  const step = toInteger(rule.seqStep ?? rule.SeqStep, 1);
  const pad = toInteger(rule.pad ?? rule.Pad, 0);
  const value = mode === "SeqDown" ? start - step * rowIndex : start + step * rowIndex;
  const text = String(value);
  if (pad > 0 && value >= 0) {
    return text.padStart(pad, "0");
  }
  if (pad > 0 && value < 0) {
    return `-${String(Math.abs(value)).padStart(pad, "0")}`;
  }
  return text;
}

export function applyRulesToName(fileName, rules = [], rowIndex = 0, valueLines = [], now = new Date()) {
  const { base: originalBase, ext } = splitFilename(fileName);
  let base = originalBase;

  for (const rule of rules) {
    const target = rule.target || rule.Target || "Segment";

    if (target === "Replace") {
      base = applyReplace(base, rule);
      continue;
    }

    if (target === "Case") {
      base = applyCaseTransform(base, rule);
      continue;
    }

    let value = cleanPart(ruleValue(rule, rowIndex, valueLines, now));

    if (target === "Segment") {
      const delimiter = String(rule.delimiter ?? rule.Delimiter ?? "");
      if (!delimiter) {
        throw codedError("delimiterEmpty", "Delimiter cannot be empty");
      }
      const parts = base.split(delimiter);
      const segmentNo = toInteger(rule.segmentNo ?? rule.SegmentNo, 1);
      if (segmentNo < 1 || segmentNo > parts.length) {
        throw codedError("segmentOutOfRange", `Segment ${segmentNo} out of range. Parts=${parts.length}`, {
          segmentNo,
          parts: parts.length,
          delimiter
        });
      }
      const fromEnd = Boolean(rule.fromEnd ?? rule.FromEnd);
      const index = fromEnd ? parts.length - segmentNo : segmentNo - 1;
      const mode = rule.valueMode || rule.ValueMode || "Static";
      if (mode === "Delete") {
        parts.splice(index, 1);
      } else {
        parts[index] = value;
      }
      base = parts.join(delimiter);
      continue;
    }

    const start = toInteger(rule.charStart ?? rule.CharStart, 1);
    let length = toInteger(rule.charLength ?? rule.CharLength, 0);
    if (start < 1) {
      throw codedError("charStartTooSmall", "Char start must be >= 1", { charStart: start });
    }
    if (start > base.length + 1) {
      throw codedError("charStartBeyondLength", `Char start ${start} beyond length ${base.length}`, {
        charStart: start,
        length: base.length
      });
    }
    if (length < 0) {
      throw codedError("charLengthNegative", "Char length cannot be negative", { charLength: length });
    }

    const zeroIndex = start - 1;
    if (zeroIndex + length > base.length) {
      length = base.length - zeroIndex;
    }
    if ((rule.valueMode || rule.ValueMode) === "Delete") {
      value = "";
    }
    base = `${base.slice(0, zeroIndex)}${value}${base.slice(zeroIndex + length)}`;
  }

  return `${base}${ext}`;
}

// Find-and-replace on the base name. `find` is treated literally unless `useRegex`
// is set; replacement always applies to every match (global) and is cleaned so it
// cannot introduce invalid filename characters.
function applyReplace(base, rule) {
  const find = String(rule.find ?? rule.Find ?? "");
  if (find === "") {
    throw codedError("findEmpty", "Find text cannot be empty");
  }
  const replacement = cleanPart(String(rule.replaceWith ?? rule.ReplaceWith ?? ""));
  const useRegex = Boolean(rule.useRegex ?? rule.UseRegex);
  const flags = `g${(rule.caseInsensitive ?? rule.CaseInsensitive) ? "i" : ""}`;
  const source = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern;
  try {
    pattern = new RegExp(source, flags);
  } catch (error) {
    throw codedError("invalidRegex", `Invalid regular expression: ${error.message}`, { message: error.message });
  }
  return base.replace(pattern, replacement);
}

// Case transform on the base name. Title case capitalizes the first letter of each
// word and lowercases the rest, treating separators (spaces, "-", "_", ".") as word
// boundaries by matching runs of letters/digits only.
function applyCaseTransform(base, rule) {
  const mode = String(rule.caseMode ?? rule.CaseMode ?? "upper");
  if (mode === "upper") {
    return base.toUpperCase();
  }
  if (mode === "lower") {
    return base.toLowerCase();
  }
  if (mode === "title") {
    return base.replace(/[^\W_]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  throw codedError("unknownCaseMode", `Unknown case mode: ${mode}`, { mode });
}

export function buildPreviewRows(options) {
  const {
    mode = "rename",
    sources = [],
    template = null,
    outputFolder = "",
    count = 1,
    rules = [],
    valueListText = "",
    previousRows = [],
    now = new Date(),
    // Display-only fallback label for sources that carry no folder of their own. The engine
    // stays language-agnostic; the app passes a localized label in.
    sourceFolderFallback = "Source folder"
  } = options;
  const valueLines = parseValueLines(valueListText);
  const usesList = rules.some((rule) => (rule.valueMode || rule.ValueMode) === "List");

  if (rules.length === 0) {
    return {
      ok: false,
      keepExisting: true,
      message: "No rules yet. Existing preview is kept.",
      rows: previousRows
    };
  }

  if (mode === "copy") {
    if (!template) {
      return {
        ok: false,
        keepExisting: true,
        message: "Select a template file first.",
        rows: previousRows
      };
    }
    if (!outputFolder) {
      return {
        ok: false,
        keepExisting: true,
        message: "Select an output folder first.",
        rows: previousRows
      };
    }
    const rowCount = usesList ? valueLines.length : Math.max(1, toInteger(count, 1));
    if (usesList && valueLines.length === 0) {
      return {
        ok: false,
        keepExisting: true,
        message: "A rule uses Value List, but the list is empty. Existing preview is kept.",
        rows: previousRows
      };
    }

    const rows = [];
    for (let index = 0; index < rowCount; index += 1) {
      const result = applyNameResult(template.name, rules, index, valueLines, now);
      rows.push(makePreviewRow({
        id: `copy-${Date.now()}-${index}`,
        action: "Copy",
        sourceName: template.name,
        sourcePath: template.path || template.name,
        sourceKey: template.key || template.name,
        targetName: result.targetName,
        targetFolder: outputFolder,
        targetFolderKey: "output",
        sourceRef: template.ref || null,
        status: result.status,
        statusDetail: result.statusDetail
      }));
    }
    return { ok: true, rows: validateRows(rows) };
  }

  if (sources.length === 0) {
    return {
      ok: false,
      keepExisting: true,
      message: "Add source files first. Existing preview is kept.",
      rows: previousRows
    };
  }

  if (usesList && valueLines.length !== sources.length) {
    return {
      ok: false,
      keepExisting: true,
      message: `Value List row count does not match file count. Value lines: ${valueLines.length}. Files: ${sources.length}.`,
      rows: previousRows
    };
  }

  const rows = sources.map((source, index) => {
    const result = applyNameResult(source.name, rules, index, valueLines, now);
    return makePreviewRow({
      id: `rename-${source.key || source.name}-${index}`,
      action: "Rename",
      sourceName: source.name,
      sourcePath: source.path || source.name,
      sourceKey: source.key || source.name,
      targetName: result.targetName,
      targetFolder: source.folder || sourceFolderFallback,
      targetFolderKey: source.folderKey || "source",
      sourceRef: source.ref || null,
      status: result.status,
      statusDetail: result.statusDetail
    });
  });

  return { ok: true, rows: validateRows(rows) };
}

export function validateRows(rows, options = {}) {
  const seen = new Set();
  const existingTargets = new Set((options.existingTargets || []).map((value) => normalizePathKey(value)));

  return rows.map((row, index) => {
    const next = { ...row, no: index + 1 };
    const targetPath = joinDisplayPath(next.targetFolder, next.targetName);
    next.targetPath = targetPath;
    let status = String(next.status || "").startsWith("Error:") ? next.status : "OK";

    if (String(status).startsWith("Error:")) {
      next.status = status;
      return next;
    }

    // Any status decided below is a plain validation state that the UI localizes from the
    // status string alone, so a detail carried over from an earlier rule error is stale.
    next.statusDetail = null;

    if (!String(next.targetFolder || "").trim()) {
      status = "Target folder empty";
    } else if (!String(next.targetName || "").trim()) {
      status = "Target name empty";
    } else if (hasInvalidFilenameChars(next.targetName)) {
      status = "Invalid filename";
    } else if (isReservedFilename(next.targetName)) {
      status = "Reserved name";
    } else if (hasTrailingDotOrSpace(next.targetName)) {
      status = "Trailing dot or space";
    } else if (next.action === "Rename" && normalizePathKey(next.sourcePath) === normalizePathKey(targetPath)) {
      status = "No change";
    } else if (next.targetExists || existingTargets.has(normalizePathKey(targetPath))) {
      status = "Target exists";
    } else if (seen.has(normalizePathKey(targetPath))) {
      status = "Duplicate target";
    }

    if (status === "OK") {
      seen.add(normalizePathKey(targetPath));
    }
    next.status = status;
    return next;
  });
}

// Given the renames a batch performed ({ from, to } where a file moved from `from` to `to`,
// plus any extra fields such as a directory handle), return the operations that reverse them,
// newest first, so applying them in order restores the original names.
export function planUndoOperations(renames = []) {
  return [...renames].reverse().map((rename) => ({
    ...rename,
    from: rename.to,
    to: rename.from
  }));
}

export function rowsToCsv(rows) {
  const columns = ["Action", "SourceName", "SourcePath", "TargetName", "TargetFolder", "TargetPath", "Status"];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column[0].toLowerCase() + column.slice(1)] ?? row[column] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

// Build a per-row execution log CSV from entries recorded during execute
// ({ action, sourceName, sourcePath, targetName, targetFolder, targetPath, result, message, timestamp }).
export function executionLogToCsv(entries = []) {
  const columns = ["Action", "SourceName", "SourcePath", "TargetName", "TargetFolder", "TargetPath", "Result", "Message", "Timestamp"];
  const lines = [columns.join(",")];
  for (const entry of entries) {
    lines.push([
      entry.action,
      entry.sourceName,
      entry.sourcePath,
      entry.targetName,
      entry.targetFolder,
      entry.targetPath,
      entry.result,
      entry.message,
      entry.timestamp
    ].map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

export function parsePreviewCsv(text, options = {}) {
  const { importedFolderLabel = "Imported" } = options;
  const records = parseCsvRecords(text);
  if (records.length < 2) {
    return [];
  }
  const headers = records[0].map((header) => header.trim());
  return records.slice(1).filter((record) => record.some((cell) => cell !== "")).map((record, index) => {
    const data = {};
    headers.forEach((header, cellIndex) => {
      data[header] = record[cellIndex] ?? "";
    });
    const targetPath = data.TargetPath || "";
    const sourcePath = data.SourcePath || "";
    const targetName = data.TargetName || getFileName(targetPath) || getFileName(sourcePath);
    const targetFolder = data.TargetFolder || getFolderName(targetPath) || getFolderName(sourcePath) || importedFolderLabel;
    const sourceName = data.SourceName || getFileName(sourcePath);

    return makePreviewRow({
      id: `import-${Date.now()}-${index}`,
      action: data.Action || "Rename",
      sourceName,
      sourcePath,
      sourceKey: sourcePath || sourceName,
      targetName,
      targetFolder,
      targetFolderKey: "imported",
      sourceRef: null,
      status: data.Status || "Imported"
    });
  });
}

function applyNameResult(fileName, rules, index, valueLines, now) {
  try {
    return {
      targetName: applyRulesToName(fileName, rules, index, valueLines, now),
      status: "OK",
      statusDetail: null
    };
  } catch (error) {
    return {
      targetName: fileName,
      status: `Error: ${error.message}`,
      statusDetail: errorDetail(error)
    };
  }
}

function makePreviewRow(row) {
  return {
    id: row.id,
    no: 0,
    action: row.action,
    sourceName: row.sourceName,
    sourcePath: row.sourcePath,
    sourceKey: row.sourceKey,
    targetName: row.targetName,
    targetFolder: row.targetFolder,
    targetFolderKey: row.targetFolderKey,
    targetPath: joinDisplayPath(row.targetFolder, row.targetName),
    status: row.status || "OK",
    statusDetail: row.statusDetail || null,
    sourceRef: row.sourceRef || null,
    targetExists: Boolean(row.targetExists)
  };
}

function toInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePathKey(path) {
  return String(path || "").replaceAll("\\", "/").toLowerCase();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function parseCsvRecords(text) {
  const records = [];
  let record = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(cell);
      cell = "";
    } else if (char === "\n") {
      record.push(cell.replace(/\r$/, ""));
      records.push(record);
      record = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  record.push(cell.replace(/\r$/, ""));
  records.push(record);
  return records;
}
