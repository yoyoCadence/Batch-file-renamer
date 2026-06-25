const INVALID_FILENAME_RE = /[<>:"/\\|?*\x00-\x1f]/g;

export const VALUE_MODES = ["Static", "List", "SeqUp", "SeqDown", "Delete"];
export const TARGETS = ["Segment", "Character"];

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

export function cleanPart(value) {
  return String(value ?? "").replace(INVALID_FILENAME_RE, "_");
}

export function ruleValue(rule, rowIndex, valueLines = []) {
  const mode = rule.valueMode || rule.ValueMode || "Static";
  if (mode === "Delete") {
    return "";
  }
  if (mode === "Static") {
    return String(rule.staticValue ?? rule.StaticValue ?? "");
  }
  if (mode === "List") {
    if (rowIndex >= valueLines.length) {
      throw new Error(`Value list missing row ${rowIndex + 1}`);
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

export function applyRulesToName(fileName, rules = [], rowIndex = 0, valueLines = []) {
  const { base: originalBase, ext } = splitFilename(fileName);
  let base = originalBase;

  for (const rule of rules) {
    const target = rule.target || rule.Target || "Segment";
    let value = cleanPart(ruleValue(rule, rowIndex, valueLines));

    if (target === "Segment") {
      const delimiter = String(rule.delimiter ?? rule.Delimiter ?? "");
      if (!delimiter) {
        throw new Error("Delimiter cannot be empty");
      }
      const parts = base.split(delimiter);
      const segmentNo = toInteger(rule.segmentNo ?? rule.SegmentNo, 1);
      if (segmentNo < 1 || segmentNo > parts.length) {
        throw new Error(`Segment ${segmentNo} out of range. Parts=${parts.length}`);
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
      throw new Error("Char start must be >= 1");
    }
    if (start > base.length + 1) {
      throw new Error(`Char start ${start} beyond length ${base.length}`);
    }
    if (length < 0) {
      throw new Error("Char length cannot be negative");
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

export function buildPreviewRows(options) {
  const {
    mode = "rename",
    sources = [],
    template = null,
    outputFolder = "",
    count = 1,
    rules = [],
    valueListText = "",
    previousRows = []
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
      const result = applyNameResult(template.name, rules, index, valueLines);
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
        status: result.status
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
    const result = applyNameResult(source.name, rules, index, valueLines);
    return makePreviewRow({
      id: `rename-${source.key || source.name}-${index}`,
      action: "Rename",
      sourceName: source.name,
      sourcePath: source.path || source.name,
      sourceKey: source.key || source.name,
      targetName: result.targetName,
      targetFolder: source.folder || "Source folder",
      targetFolderKey: source.folderKey || "source",
      sourceRef: source.ref || null,
      status: result.status
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

    if (!String(next.targetFolder || "").trim()) {
      status = "Target folder empty";
    } else if (!String(next.targetName || "").trim()) {
      status = "Target name empty";
    } else if (hasInvalidFilenameChars(next.targetName)) {
      status = "Invalid filename";
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

export function rowsToCsv(rows) {
  const columns = ["Action", "SourceName", "SourcePath", "TargetName", "TargetFolder", "TargetPath", "Status"];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column[0].toLowerCase() + column.slice(1)] ?? row[column] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

export function parsePreviewCsv(text) {
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
    const targetFolder = data.TargetFolder || getFolderName(targetPath) || getFolderName(sourcePath) || "Imported";
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

function applyNameResult(fileName, rules, index, valueLines) {
  try {
    return {
      targetName: applyRulesToName(fileName, rules, index, valueLines),
      status: "OK"
    };
  } catch (error) {
    return {
      targetName: fileName,
      status: `Error: ${error.message}`
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
