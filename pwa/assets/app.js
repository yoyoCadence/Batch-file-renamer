import {
  buildPreviewRows,
  getFileName,
  parsePreviewCsv,
  rowsToCsv,
  validateRows
} from "./rules.js";

const state = {
  mode: "rename",
  sources: [],
  template: null,
  outputDirectory: null,
  rules: [],
  rows: [],
  selectedRows: new Set(),
  sourceDirectoryHandle: null,
  installPrompt: null
};

const hasFileSystemAccess = "showDirectoryPicker" in window && "showOpenFilePicker" in window;
const $ = (id) => document.getElementById(id);

const els = {
  supportBadge: $("supportBadge"),
  installButton: $("installButton"),
  fileSummary: $("fileSummary"),
  renameSetup: $("renameSetup"),
  copySetup: $("copySetup"),
  pickSourceFolderButton: $("pickSourceFolderButton"),
  addFilesButton: $("addFilesButton"),
  clearSourcesButton: $("clearSourcesButton"),
  fileInput: $("fileInput"),
  sourceList: $("sourceList"),
  templateName: $("templateName"),
  outputFolderName: $("outputFolderName"),
  copyCount: $("copyCount"),
  pickTemplateButton: $("pickTemplateButton"),
  pickOutputFolderButton: $("pickOutputFolderButton"),
  templateInput: $("templateInput"),
  targetSelect: $("targetSelect"),
  directionSelect: $("directionSelect"),
  delimiterInput: $("delimiterInput"),
  segmentInput: $("segmentInput"),
  charStartInput: $("charStartInput"),
  charLengthInput: $("charLengthInput"),
  valueModeSelect: $("valueModeSelect"),
  staticInput: $("staticInput"),
  seqStartInput: $("seqStartInput"),
  seqStepInput: $("seqStepInput"),
  padInput: $("padInput"),
  valueListInput: $("valueListInput"),
  directionField: $("directionField"),
  delimiterField: $("delimiterField"),
  segmentField: $("segmentField"),
  charStartField: $("charStartField"),
  charLengthField: $("charLengthField"),
  staticField: $("staticField"),
  seqStartField: $("seqStartField"),
  seqStepField: $("seqStepField"),
  padField: $("padField"),
  listField: $("listField"),
  sampleOutput: $("sampleOutput"),
  addRuleButton: $("addRuleButton"),
  clearRulesButton: $("clearRulesButton"),
  previewButton: $("previewButton"),
  ruleList: $("ruleList"),
  previewSummary: $("previewSummary"),
  resetTargetNamesButton: $("resetTargetNamesButton"),
  exportCsvButton: $("exportCsvButton"),
  importCsvButton: $("importCsvButton"),
  executeButton: $("executeButton"),
  csvInput: $("csvInput"),
  targetFolderInput: $("targetFolderInput"),
  applyFolderSelectedButton: $("applyFolderSelectedButton"),
  applyFolderAllButton: $("applyFolderAllButton"),
  previewBody: $("previewBody"),
  statusText: $("statusText")
};

init();

function init() {
  document.querySelectorAll("input[name='mode']").forEach((input) => {
    input.addEventListener("change", () => {
      state.mode = input.value;
      updateMode();
      setStatus(`${titleCase(state.mode)} mode selected.`);
    });
  });

  els.pickSourceFolderButton.addEventListener("click", pickSourceFolder);
  els.addFilesButton.addEventListener("click", () => els.fileInput.click());
  els.clearSourcesButton.addEventListener("click", clearSources);
  els.fileInput.addEventListener("change", addPreviewFiles);
  els.pickTemplateButton.addEventListener("click", pickTemplate);
  els.pickOutputFolderButton.addEventListener("click", pickOutputFolder);
  els.templateInput.addEventListener("change", addTemplateFromInput);
  els.copyCount.addEventListener("change", renderFileSummary);

  [
    els.targetSelect,
    els.directionSelect,
    els.delimiterInput,
    els.segmentInput,
    els.charStartInput,
    els.charLengthInput,
    els.valueModeSelect,
    els.staticInput,
    els.seqStartInput,
    els.seqStepInput,
    els.padInput
  ].forEach((control) => control.addEventListener("input", updateRuleControls));

  els.addRuleButton.addEventListener("click", addRule);
  els.clearRulesButton.addEventListener("click", () => {
    state.rules = [];
    renderRules();
    setStatus("Rules cleared.");
  });
  els.previewButton.addEventListener("click", previewRules);
  els.resetTargetNamesButton.addEventListener("click", resetTargetNames);
  els.exportCsvButton.addEventListener("click", exportCsv);
  els.importCsvButton.addEventListener("click", () => els.csvInput.click());
  els.csvInput.addEventListener("change", importCsv);
  els.executeButton.addEventListener("click", executeRows);
  els.applyFolderSelectedButton.addEventListener("click", () => applyFolderLabel("selected"));
  els.applyFolderAllButton.addEventListener("click", () => applyFolderLabel("all"));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    els.installButton.hidden = false;
  });
  els.installButton.addEventListener("click", async () => {
    if (!state.installPrompt) {
      return;
    }
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    els.installButton.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setStatus("Service worker registration failed. The app still runs online.");
    });
  }

  updateSupportBadge();
  updateMode();
  updateRuleControls();
  renderAll();
}

function updateSupportBadge() {
  if (hasFileSystemAccess) {
    els.supportBadge.textContent = "Direct file execution available";
    els.supportBadge.dataset.state = "ok";
  } else {
    els.supportBadge.textContent = "Preview and CSV mode";
    els.supportBadge.dataset.state = "limited";
  }
}

function updateMode() {
  els.renameSetup.hidden = state.mode !== "rename";
  els.copySetup.hidden = state.mode !== "copy";
  renderFileSummary();
}

async function pickSourceFolder() {
  if (!hasFileSystemAccess) {
    setStatus("Folder permissions need Chromium. Use Add files for preview on this browser.");
    els.fileInput.click();
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.sourceDirectoryHandle = directoryHandle;
    const sources = [];
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind !== "file") {
        continue;
      }
      sources.push({
        name,
        path: `${directoryHandle.name}/${name}`,
        folder: directoryHandle.name,
        folderKey: "source",
        key: `source:${name}`,
        ref: {
          kind: "directoryFile",
          directoryHandle,
          fileHandle: handle
        }
      });
    }
    state.sources = sources.sort((a, b) => a.name.localeCompare(b.name));
    state.rows = [];
    state.selectedRows.clear();
    renderAll();
    setStatus(`Loaded ${state.sources.length} file(s) from ${directoryHandle.name}.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`Folder selection failed: ${error.message}`);
    }
  }
}

function addPreviewFiles() {
  const files = Array.from(els.fileInput.files || []);
  if (files.length === 0) {
    return;
  }
  state.sourceDirectoryHandle = null;
  state.sources = files.map((file, index) => ({
    name: file.name,
    path: file.webkitRelativePath || file.name,
    folder: "Browser files",
    folderKey: "preview",
    key: `file:${index}:${file.name}`,
    ref: {
      kind: "pickedFile",
      file
    }
  }));
  state.rows = [];
  state.selectedRows.clear();
  els.fileInput.value = "";
  renderAll();
  setStatus(`Loaded ${state.sources.length} preview file(s).`);
}

function clearSources() {
  state.sources = [];
  state.sourceDirectoryHandle = null;
  state.rows = [];
  state.selectedRows.clear();
  renderAll();
  setStatus("Source files cleared.");
}

async function pickTemplate() {
  if (!hasFileSystemAccess) {
    els.templateInput.click();
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({ multiple: false });
    const file = await handle.getFile();
    state.template = {
      name: file.name,
      path: file.name,
      key: `template:${file.name}`,
      ref: {
        kind: "fileHandle",
        fileHandle: handle
      }
    };
    renderAll();
    setStatus(`Template selected: ${file.name}.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`Template selection failed: ${error.message}`);
    }
  }
}

function addTemplateFromInput() {
  const [file] = Array.from(els.templateInput.files || []);
  if (!file) {
    return;
  }
  state.template = {
    name: file.name,
    path: file.name,
    key: `template:${file.name}`,
    ref: {
      kind: "pickedFile",
      file
    }
  };
  els.templateInput.value = "";
  renderAll();
  setStatus(`Template selected for preview: ${file.name}.`);
}

async function pickOutputFolder() {
  if (!hasFileSystemAccess) {
    setStatus("Output folder writing needs Chromium's File System Access API.");
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.outputDirectory = {
      name: directoryHandle.name,
      handle: directoryHandle
    };
    renderAll();
    setStatus(`Output folder selected: ${directoryHandle.name}.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`Output folder selection failed: ${error.message}`);
    }
  }
}

function updateRuleControls() {
  const isSegment = els.targetSelect.value === "Segment";
  const mode = els.valueModeSelect.value;
  const isSequence = mode === "SeqUp" || mode === "SeqDown";

  els.directionField.hidden = !isSegment;
  els.delimiterField.hidden = !isSegment;
  els.segmentField.hidden = !isSegment;
  els.charStartField.hidden = isSegment;
  els.charLengthField.hidden = isSegment;
  els.staticField.hidden = mode !== "Static";
  els.listField.hidden = mode !== "List";
  els.seqStartField.hidden = !isSequence;
  els.seqStepField.hidden = !isSequence;
  els.padField.hidden = !isSequence;
  renderSample();
}

function addRule() {
  const rule = readRuleForm();
  state.rules.push(rule);
  renderRules();
  renderSample();
  setStatus(`Rule added. Total rules: ${state.rules.length}.`);
}

function readRuleForm() {
  return {
    target: els.targetSelect.value,
    fromEnd: els.directionSelect.value === "FromEnd",
    delimiter: els.delimiterInput.value,
    segmentNo: Number.parseInt(els.segmentInput.value, 10),
    charStart: Number.parseInt(els.charStartInput.value, 10),
    charLength: Number.parseInt(els.charLengthInput.value, 10),
    valueMode: els.valueModeSelect.value,
    staticValue: els.staticInput.value,
    seqStart: Number.parseInt(els.seqStartInput.value, 10),
    seqStep: Number.parseInt(els.seqStepInput.value, 10),
    pad: Number.parseInt(els.padInput.value, 10)
  };
}

async function previewRules() {
  const result = buildPreviewRows({
    mode: state.mode,
    sources: state.sources,
    template: state.template,
    outputFolder: state.outputDirectory?.name || "",
    count: Number.parseInt(els.copyCount.value, 10),
    rules: state.rules,
    valueListText: els.valueListInput.value,
    previousRows: state.rows
  });

  if (!result.ok) {
    state.rows = result.rows;
    renderPreview();
    setStatus(result.message);
    return;
  }

  state.rows = await revalidateWithFilesystem(result.rows);
  state.selectedRows.clear();
  renderPreview();
  setStatus(`Preview generated: ${state.rows.length} row(s). Target names are editable.`);
}

async function revalidateWithFilesystem(rows) {
  const checkedRows = await Promise.all(rows.map(async (row) => {
    const next = { ...row, targetExists: false };
    if (String(row.status || "").startsWith("Error:")) {
      return next;
    }
    try {
      if (row.action === "Copy" && state.outputDirectory?.handle) {
        next.targetExists = await fileExists(state.outputDirectory.handle, row.targetName);
      } else if (row.action === "Rename" && row.sourceRef?.directoryHandle && row.targetName !== row.sourceName) {
        next.targetExists = await fileExists(row.sourceRef.directoryHandle, row.targetName);
      }
    } catch {
      next.targetExists = false;
    }
    return next;
  }));
  return validateForApp(checkedRows);
}

function resetTargetNames() {
  state.rows = validateForApp(state.rows.map((row) => ({
    ...row,
    targetName: row.sourceName,
    status: "OK"
  })));
  renderPreview();
  setStatus("Target names reset to source names.");
}

function applyFolderLabel(scope) {
  const label = els.targetFolderInput.value.trim();
  if (!label) {
    setStatus("Target folder label is empty.");
    return;
  }

  const ids = state.selectedRows;
  state.rows = validateForApp(state.rows.map((row) => {
    if (scope === "selected" && !ids.has(row.id)) {
      return row;
    }
    return {
      ...row,
      targetFolder: label,
      targetFolderKey: "manual",
      status: "OK"
    };
  }));
  renderPreview();
  setStatus(scope === "selected" ? "Target folder applied to selected rows." : "Target folder applied to all rows.");
}

async function exportCsv() {
  if (state.rows.length === 0) {
    setStatus("No preview to export.");
    return;
  }
  const csv = rowsToCsv(state.rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "rename_preview.csv",
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      setStatus("Exported CSV.");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  downloadBlob(blob, "rename_preview.csv");
  setStatus("Downloaded CSV.");
}

async function importCsv() {
  const [file] = Array.from(els.csvInput.files || []);
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    state.rows = validateForApp(parsePreviewCsv(text));
    state.selectedRows.clear();
    renderPreview();
    setStatus(`Imported ${state.rows.length} CSV row(s).`);
  } catch (error) {
    setStatus(`Import failed: ${error.message}`);
  } finally {
    els.csvInput.value = "";
  }
}

async function executeRows() {
  state.rows = await revalidateWithFilesystem(state.rows);
  renderPreview();
  const okRows = state.rows.filter((row) => row.status === "OK");
  if (okRows.length === 0) {
    setStatus("No OK rows to execute.");
    return;
  }
  const confirmed = window.confirm(`Execute ${okRows.length} OK row(s)? Warning and error rows are skipped.`);
  if (!confirmed) {
    return;
  }

  let done = 0;
  let failed = 0;
  for (const row of okRows) {
    try {
      if (row.action === "Copy") {
        await executeCopyRow(row);
      } else {
        await executeRenameRow(row);
      }
      done += 1;
      updateRowStatus(row.id, "Done");
    } catch (error) {
      failed += 1;
      updateRowStatus(row.id, `Error: ${error.message}`);
    }
    renderPreview();
  }
  setStatus(`Execution done. Success: ${done}, Failed: ${failed}.`);
}

async function executeCopyRow(row) {
  if (!state.outputDirectory?.handle) {
    throw new Error("Pick an output folder before direct copy execution.");
  }
  if (!state.template?.ref) {
    throw new Error("Template file is missing.");
  }
  await ensurePermission(state.outputDirectory.handle, "readwrite");
  const file = await getSourceFile(state.template.ref);
  await writeFileToDirectory(state.outputDirectory.handle, row.targetName, file);
}

async function executeRenameRow(row) {
  if (row.targetFolderKey !== "source") {
    throw new Error("Direct rename only supports the selected source folder.");
  }
  if (!row.sourceRef?.directoryHandle || !row.sourceRef?.fileHandle) {
    throw new Error("Pick a source folder to enable direct rename execution.");
  }
  const directoryHandle = row.sourceRef.directoryHandle;
  await ensurePermission(directoryHandle, "readwrite");
  const file = await row.sourceRef.fileHandle.getFile();
  await writeFileToDirectory(directoryHandle, row.targetName, file);
  await directoryHandle.removeEntry(row.sourceName);
}

async function writeFileToDirectory(directoryHandle, fileName, file) {
  const targetHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await targetHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

async function getSourceFile(ref) {
  if (ref.file) {
    return ref.file;
  }
  if (ref.fileHandle) {
    return ref.fileHandle.getFile();
  }
  throw new Error("Source file handle is missing.");
}

async function fileExists(directoryHandle, fileName) {
  try {
    await directoryHandle.getFileHandle(fileName, { create: false });
    return true;
  } catch (error) {
    if (error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
}

async function ensurePermission(handle, mode) {
  if (!handle.queryPermission || !handle.requestPermission) {
    return;
  }
  const options = { mode };
  if ((await handle.queryPermission(options)) === "granted") {
    return;
  }
  if ((await handle.requestPermission(options)) !== "granted") {
    throw new Error("File permission was not granted.");
  }
}

function updateRowStatus(id, status) {
  state.rows = state.rows.map((row) => row.id === id ? { ...row, status } : row);
}

function renderAll() {
  renderFileSummary();
  renderRules();
  renderPreview();
  renderSample();
}

function renderFileSummary() {
  if (state.mode === "copy") {
    els.templateName.value = state.template?.name || "";
    els.outputFolderName.value = state.outputDirectory?.name || "";
    const count = Number.parseInt(els.copyCount.value, 10) || 0;
    els.fileSummary.textContent = state.template
      ? `Template ready. Output count: ${count}.`
      : "Select a template file and output folder.";
    return;
  }

  els.fileSummary.textContent = state.sources.length
    ? `${state.sources.length} source file(s) loaded.`
    : "No files loaded.";

  els.sourceList.innerHTML = "";
  if (state.sources.length === 0) {
    els.sourceList.textContent = "No source files selected.";
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const source of state.sources.slice(0, 18)) {
    const item = document.createElement("span");
    item.textContent = source.name;
    fragment.append(item);
  }
  if (state.sources.length > 18) {
    const item = document.createElement("span");
    item.textContent = `+${state.sources.length - 18} more`;
    fragment.append(item);
  }
  els.sourceList.append(fragment);
}

function renderRules() {
  els.ruleList.innerHTML = "";
  if (state.rules.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-list";
    empty.textContent = "No rules yet.";
    els.ruleList.append(empty);
    return;
  }

  state.rules.forEach((rule, index) => {
    const item = document.createElement("li");
    const summary = document.createElement("div");
    summary.innerHTML = `<strong>${index + 1}. ${escapeHtml(rule.target)}</strong><span>${escapeHtml(describeRule(rule))}</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      state.rules.splice(index, 1);
      renderRules();
      setStatus("Rule removed.");
    });
    item.append(summary, remove);
    els.ruleList.append(item);
  });
}

function renderPreview() {
  els.previewBody.innerHTML = "";
  const counts = summarizeRows();
  els.previewSummary.textContent = state.rows.length
    ? `${state.rows.length} row(s): ${counts.ok} OK, ${counts.blocked} blocked.`
    : "No preview yet.";

  if (state.rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7" class="empty-table">Build rules, then generate a preview.</td>`;
    els.previewBody.append(row);
    return;
  }

  for (const row of state.rows) {
    const tr = document.createElement("tr");
    tr.dataset.status = statusKind(row.status);

    const selected = document.createElement("input");
    selected.type = "checkbox";
    selected.checked = state.selectedRows.has(row.id);
    selected.addEventListener("change", () => {
      if (selected.checked) {
        state.selectedRows.add(row.id);
        els.targetFolderInput.value = row.targetFolder;
      } else {
        state.selectedRows.delete(row.id);
      }
    });

    const targetName = document.createElement("input");
    targetName.type = "text";
    targetName.value = row.targetName;
    targetName.addEventListener("change", () => {
      updateRow(row.id, {
        targetName: targetName.value,
        status: "OK"
      });
    });

    const targetFolder = document.createElement("input");
    targetFolder.type = "text";
    targetFolder.value = row.targetFolder;
    targetFolder.addEventListener("change", () => {
      updateRow(row.id, {
        targetFolder: targetFolder.value,
        targetFolderKey: row.targetFolderKey === "source" && targetFolder.value === row.targetFolder ? "source" : "manual",
        status: "OK"
      });
    });

    tr.append(
      cellWith(selected),
      textCell(row.no),
      textCell(row.action),
      textCell(row.sourceName),
      cellWith(targetName),
      cellWith(targetFolder),
      statusCell(row.status)
    );
    els.previewBody.append(tr);
  }
}

function updateRow(id, patch) {
  state.rows = validateForApp(state.rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  renderPreview();
}

function validateForApp(rows) {
  return applyExecutionLimits(validateRows(rows));
}

function applyExecutionLimits(rows) {
  return rows.map((row) => {
    if (row.status !== "OK") {
      return row;
    }
    if (row.action === "Rename" && row.targetFolderKey !== "source") {
      return { ...row, status: "Source folder only" };
    }
    if (row.action === "Rename" && !row.sourceRef?.directoryHandle) {
      return { ...row, status: "Preview only" };
    }
    if (row.action === "Copy" && !state.outputDirectory?.handle) {
      return { ...row, status: "Output permission needed" };
    }
    return row;
  });
}

function renderSample() {
  const sample = state.sources[0]?.name || state.template?.name || "50-INDS-AT-52602_0.pdf";
  const base = sample.replace(/\.[^.]+$/, "");
  const ext = getFileName(sample).slice(base.length);
  const target = els.targetSelect.value;

  if (target === "Segment") {
    const delimiter = els.delimiterInput.value;
    const parts = delimiter ? base.split(delimiter) : [base];
    const segmentNo = Number.parseInt(els.segmentInput.value, 10) || 1;
    const index = els.directionSelect.value === "FromEnd" ? parts.length - segmentNo : segmentNo - 1;
    if (index >= 0 && index < parts.length) {
      els.sampleOutput.innerHTML = parts.map((part, partIndex) => (
        partIndex === index ? `<mark>${escapeHtml(part || "(empty)")}</mark>` : escapeHtml(part)
      )).join(escapeHtml(delimiter)) + escapeHtml(ext);
      return;
    }
  } else {
    const start = Math.max(1, Number.parseInt(els.charStartInput.value, 10) || 1) - 1;
    const length = Math.max(1, Number.parseInt(els.charLengthInput.value, 10) || 1);
    if (start <= base.length) {
      els.sampleOutput.innerHTML = `${escapeHtml(base.slice(0, start))}<mark>${escapeHtml(base.slice(start, start + length) || "(insert)")}</mark>${escapeHtml(base.slice(start + length))}${escapeHtml(ext)}`;
      return;
    }
  }

  els.sampleOutput.textContent = sample;
}

function summarizeRows() {
  return state.rows.reduce((summary, row) => {
    if (row.status === "OK") {
      summary.ok += 1;
    } else {
      summary.blocked += 1;
    }
    return summary;
  }, { ok: 0, blocked: 0 });
}

function describeRule(rule) {
  const target = rule.target === "Segment"
    ? `Delimiter "${rule.delimiter}", segment ${rule.segmentNo}, ${rule.fromEnd ? "from end" : "from start"}`
    : `Char ${rule.charStart}, length ${rule.charLength}`;
  const value = rule.valueMode === "Static"
    ? `Static "${rule.staticValue}"`
    : rule.valueMode === "List"
      ? "Value list"
      : rule.valueMode === "Delete"
        ? "Delete"
        : `${rule.valueMode} start ${rule.seqStart}, step ${rule.seqStep}, pad ${rule.pad}`;
  return `${target}. ${value}.`;
}

function statusKind(status) {
  if (status === "OK") {
    return "ok";
  }
  if (status === "Done") {
    return "done";
  }
  if (String(status).startsWith("Error:")) {
    return "error";
  }
  return "warn";
}

function textCell(text) {
  const td = document.createElement("td");
  td.textContent = text ?? "";
  return td;
}

function statusCell(status) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `status-pill ${statusKind(status)}`;
  badge.textContent = status;
  td.append(badge);
  return td;
}

function cellWith(node) {
  const td = document.createElement("td");
  td.append(node);
  return td;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
