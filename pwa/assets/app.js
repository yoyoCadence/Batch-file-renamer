import {
  buildPreviewRows,
  getFileName,
  parsePreviewCsv,
  rowsToCsv,
  validateRows
} from "./rules.js";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  PET_DIALOGUES,
  PETS,
  TEMPLATES,
  THEMES,
  applyAppearance,
  applyTranslations,
  loadSettings,
  normalizeSettings,
  saveSettings,
  t
} from "./settings.js";

const state = {
  mode: "rename",
  sources: [],
  template: null,
  outputDirectory: null,
  rules: [],
  rows: [],
  selectedRows: new Set(),
  showFullPath: false,
  sourceDirectoryHandle: null,
  installPrompt: null,
  settings: loadSettings(),
  pet: {
    x: 32,
    y: 120,
    vx: 0.035,
    vy: 0.026,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    frame: null,
    bubbleTimer: null,
    nextDialogueAt: 0,
    lastDialogue: "",
    lastTime: 0,
    justDragged: false,
    action: "idle",
    actionUntil: 0,
    nextActionAt: 0,
    lastRandomAction: "idle"
  }
};

const hasFileSystemAccess = "showDirectoryPicker" in window && "showOpenFilePicker" in window;
const PET_RANDOM_ACTIONS = ["hop", "cheer", "stretch", "spin", "idle"];
const PET_ACTION_DURATIONS = {
  idle: 900,
  hop: 920,
  cheer: 1100,
  stretch: 1250,
  spin: 860,
  "panic-held": 520
};
const SYSTEM_FILE_NAMES = new Set(["desktop.ini", "thumbs.db", "ehthumbs.db", ".ds_store", ".localized"]);
const $ = (id) => document.getElementById(id);

const els = {
  supportBadge: $("supportBadge"),
  supportDetail: $("supportDetail"),
  installButton: $("installButton"),
  openSettingsButton: $("openSettingsButton"),
  settingsPanel: $("settingsPanel"),
  closeSettingsButton: $("closeSettingsButton"),
  resetSettingsButton: $("resetSettingsButton"),
  languageSelect: $("languageSelect"),
  templateSelect: $("templateSelect"),
  themeSelect: $("themeSelect"),
  petEnabledInput: $("petEnabledInput"),
  petTypeSelect: $("petTypeSelect"),
  templateCards: $("templateCards"),
  currentLookText: $("currentLookText"),
  petLayer: $("petLayer"),
  petCompanion: $("petCompanion"),
  petBubble: $("petBubble"),
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
  clearCopySetupButton: $("clearCopySetupButton"),
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
  executionSummary: $("executionSummary"),
  resetTargetNamesButton: $("resetTargetNamesButton"),
  exportCsvButton: $("exportCsvButton"),
  importCsvButton: $("importCsvButton"),
  executeButton: $("executeButton"),
  csvInput: $("csvInput"),
  targetFolderInput: $("targetFolderInput"),
  pickPreviewOutputFolderButton: $("pickPreviewOutputFolderButton"),
  applyFolderSelectedButton: $("applyFolderSelectedButton"),
  applyFolderAllButton: $("applyFolderAllButton"),
  showFullPathInput: $("showFullPathInput"),
  previewBody: $("previewBody"),
  statusText: $("statusText"),
  petImage: $("petImage")
};

init();

function init() {
  populateSettingsControls();
  applyCurrentSettings();

  document.querySelectorAll("input[name='mode']").forEach((input) => {
    input.addEventListener("change", () => {
      state.mode = input.value;
      resetPreviewRows();
      updateMode();
      setStatusKey("status.modeSelected", { mode: tKey(`mode.${state.mode}`) });
    });
  });

  els.pickSourceFolderButton.addEventListener("click", pickSourceFolder);
  els.addFilesButton.addEventListener("click", () => els.fileInput.click());
  els.clearSourcesButton.addEventListener("click", clearSources);
  els.fileInput.addEventListener("change", addPreviewFiles);
  els.pickTemplateButton.addEventListener("click", pickTemplate);
  els.pickOutputFolderButton.addEventListener("click", pickOutputFolder);
  els.clearCopySetupButton.addEventListener("click", clearCopySetup);
  els.templateInput.addEventListener("change", addTemplateFromInput);
  els.copyCount.addEventListener("change", () => {
    resetPreviewRows();
    renderAll();
  });

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
    setStatusKey("status.rulesCleared");
  });
  els.previewButton.addEventListener("click", previewRules);
  els.resetTargetNamesButton.addEventListener("click", resetTargetNames);
  els.exportCsvButton.addEventListener("click", exportCsv);
  els.importCsvButton.addEventListener("click", () => els.csvInput.click());
  els.csvInput.addEventListener("change", importCsv);
  els.executeButton.addEventListener("click", executeRows);
  els.pickPreviewOutputFolderButton.addEventListener("click", pickOutputFolder);
  els.applyFolderSelectedButton.addEventListener("click", () => applyFolderLabel("selected"));
  els.applyFolderAllButton.addEventListener("click", () => applyFolderLabel("all"));
  els.showFullPathInput.addEventListener("change", () => {
    state.showFullPath = els.showFullPathInput.checked;
    renderPreview();
  });
  els.openSettingsButton.addEventListener("click", openSettings);
  els.closeSettingsButton.addEventListener("click", closeSettings);
  els.resetSettingsButton.addEventListener("click", resetSettings);
  els.settingsPanel.addEventListener("click", (event) => {
    if (event.target === els.settingsPanel) {
      closeSettings();
    }
  });
  [els.languageSelect, els.templateSelect, els.themeSelect, els.petTypeSelect].forEach((control) => {
    control.addEventListener("change", applySettingsFromForm);
  });
  els.petEnabledInput.addEventListener("change", () => {
    els.petTypeSelect.disabled = !els.petEnabledInput.checked;
    applySettingsFromForm();
  });
  els.petCompanion.addEventListener("pointerdown", startPetDrag);
  els.petCompanion.addEventListener("click", reactToPet);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    els.installButton.hidden = false;
  });
  window.addEventListener("resize", () => {
    clampPetPosition();
    renderPetPosition();
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
      setStatusKey("status.swFailed");
    });
  }

  updateSupportBadge();
  updateMode();
  updateRuleControls();
  renderAll();
}

function populateSettingsControls() {
  fillSelect(els.languageSelect, LANGUAGES, (item) => item.label);
  fillSelect(els.templateSelect, TEMPLATES, (item) => tKey(item.labelKey));
  fillSelect(els.themeSelect, THEMES, (item) => tKey(item.labelKey));
  fillGroupedSelect(els.petTypeSelect, PETS, (item) => tKey(item.labelKey));
  renderTemplateCards();
}

function fillSelect(select, items, labelFor) {
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelFor(item);
    select.append(option);
  }
}

function fillGroupedSelect(select, items, labelFor) {
  select.innerHTML = "";
  const groups = new Map();
  for (const item of items) {
    const groupKey = item.groupKey || "";
    if (!groups.has(groupKey)) {
      const group = groupKey ? document.createElement("optgroup") : select;
      if (groupKey) {
        group.label = tKey(groupKey);
        select.append(group);
      }
      groups.set(groupKey, group);
    }
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelFor(item);
    groups.get(groupKey).append(option);
  }
}

function applyCurrentSettings() {
  state.settings = normalizeSettings(state.settings);
  applyAppearance(state.settings);
  applyTranslations(document, state.settings.language);
  els.languageSelect.value = state.settings.language;
  els.templateSelect.value = state.settings.template;
  els.themeSelect.value = state.settings.theme;
  els.petEnabledInput.checked = state.settings.petEnabled;
  els.petTypeSelect.value = state.settings.petType;
  els.petTypeSelect.disabled = !state.settings.petEnabled;
  populateSettingsLabels();
  updatePet();
  updateSupportBadge();
  renderAll();
  setStatusKey("status.ready");
}

function populateSettingsLabels() {
  fillSelect(els.templateSelect, TEMPLATES, (item) => tKey(item.labelKey));
  fillSelect(els.themeSelect, THEMES, (item) => tKey(item.labelKey));
  fillGroupedSelect(els.petTypeSelect, PETS, (item) => tKey(item.labelKey));
  els.languageSelect.value = state.settings.language;
  els.templateSelect.value = state.settings.template;
  els.themeSelect.value = state.settings.theme;
  els.petEnabledInput.checked = state.settings.petEnabled;
  els.petTypeSelect.value = state.settings.petType;
  els.petTypeSelect.disabled = !state.settings.petEnabled;
  renderTemplateCards();
  const template = TEMPLATES.find((item) => item.id === state.settings.template);
  const theme = THEMES.find((item) => item.id === state.settings.theme);
  els.currentLookText.textContent = `${tKey(template?.labelKey || "template.material")} / ${tKey(theme?.labelKey || "theme.sage")}`;
}

function openSettings() {
  els.languageSelect.value = state.settings.language;
  els.templateSelect.value = state.settings.template;
  els.themeSelect.value = state.settings.theme;
  els.petEnabledInput.checked = state.settings.petEnabled;
  els.petTypeSelect.value = state.settings.petType;
  els.petTypeSelect.disabled = !state.settings.petEnabled;
  renderTemplateCards();
  els.settingsPanel.hidden = false;
}

function closeSettings() {
  els.settingsPanel.hidden = true;
}

function applySettingsFromForm() {
  state.settings = saveSettings({
    language: els.languageSelect.value,
    template: els.templateSelect.value,
    theme: els.themeSelect.value,
    petEnabled: els.petEnabledInput.checked,
    petType: els.petTypeSelect.value
  });
  applyCurrentSettings();
  setStatusKey("status.settingsApplied");
}

function resetSettings() {
  state.settings = saveSettings(DEFAULT_SETTINGS);
  applyCurrentSettings();
  setStatusKey("status.settingsReset");
}

function renderTemplateCards() {
  const selectedTemplate = els.templateSelect.value || state.settings.template;
  els.templateCards.innerHTML = "";
  for (const template of TEMPLATES) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "template-card";
    card.dataset.active = String(template.id === selectedTemplate);
    card.style.backgroundImage = `linear-gradient(180deg, rgb(0 0 0 / 0.06), rgb(0 0 0 / 0.38)), url("${template.background}")`;
    card.innerHTML = `<strong>${escapeHtml(tKey(template.labelKey))}</strong><span>${escapeHtml(tKey(template.descriptionKey))}</span>`;
    card.addEventListener("click", () => {
      els.templateSelect.value = template.id;
      applySettingsFromForm();
    });
    els.templateCards.append(card);
  }
}

function updateSupportBadge() {
  if (hasFileSystemAccess) {
    els.supportBadge.textContent = tKey("support.direct");
    els.supportDetail.textContent = tKey("guide.supportDirect");
    els.supportBadge.dataset.state = "ok";
  } else {
    els.supportBadge.textContent = tKey("support.limited");
    els.supportDetail.textContent = tKey("guide.supportLimited");
    els.supportBadge.dataset.state = "limited";
  }
}

function updateMode() {
  els.renameSetup.hidden = state.mode !== "rename";
  els.copySetup.hidden = state.mode !== "copy";
  renderFileSummary();
}

function resetPreviewRows() {
  state.rows = [];
  state.selectedRows.clear();
}

function isIgnorableSystemFile(name) {
  const lower = String(name).trim().toLowerCase();
  return SYSTEM_FILE_NAMES.has(lower) || lower.startsWith("~$") || lower.endsWith(".tmp") || lower.endsWith(".temp");
}

async function pickSourceFolder() {
  if (!hasFileSystemAccess) {
    setStatusKey("status.folderNeedsChromium");
    els.fileInput.click();
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.sourceDirectoryHandle = directoryHandle;
    const sources = [];
    let skipped = 0;
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind !== "file") {
        continue;
      }
      if (isIgnorableSystemFile(name)) {
        skipped += 1;
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
    setStatusKey(skipped > 0 ? "status.loadedFromFolderWithSkipped" : "status.loadedFromFolder", {
      count: state.sources.length,
      name: directoryHandle.name,
      skipped
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatusKey("status.folderSelectionFailed", { message: error.message });
    }
  }
}

function addPreviewFiles() {
  const files = Array.from(els.fileInput.files || []);
  if (files.length === 0) {
    return;
  }
  const visibleFiles = files.filter((file) => !isIgnorableSystemFile(file.name));
  const skipped = files.length - visibleFiles.length;
  state.sourceDirectoryHandle = null;
  state.sources = visibleFiles.map((file, index) => ({
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
  setStatusKey(skipped > 0 ? "status.loadedPreviewFilesWithSkipped" : "status.loadedPreviewFiles", {
    count: state.sources.length,
    skipped
  });
}

function clearSources() {
  state.sources = [];
  state.sourceDirectoryHandle = null;
  state.rows = [];
  state.selectedRows.clear();
  renderAll();
  setStatusKey("status.sourceFilesCleared");
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
    resetPreviewRows();
    renderAll();
    setStatusKey("status.templateSelected", { name: file.name });
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatusKey("status.templateSelectionFailed", { message: error.message });
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
  resetPreviewRows();
  renderAll();
  setStatusKey("status.templatePreviewSelected", { name: file.name });
}

async function pickOutputFolder() {
  if (!hasFileSystemAccess) {
    setStatusKey("status.outputNeedsChromium");
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.outputDirectory = {
      name: directoryHandle.name,
      handle: directoryHandle
    };
    els.targetFolderInput.value = directoryHandle.name;
    resetPreviewRows();
    renderAll();
    setStatusKey("status.outputSelected", { name: directoryHandle.name });
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatusKey("status.outputSelectionFailed", { message: error.message });
    }
  }
}

function clearCopySetup() {
  state.template = null;
  state.outputDirectory = null;
  els.templateInput.value = "";
  els.copyCount.value = "5";
  els.targetFolderInput.value = "";
  resetPreviewRows();
  renderAll();
  setStatusKey("status.copySetupCleared");
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
  setStatusKey("status.ruleAdded", { count: state.rules.length });
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
  setStatusKey("status.previewGenerated", { count: state.rows.length });
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
  setStatusKey("status.targetNamesReset");
}

function applyFolderLabel(scope) {
  const label = els.targetFolderInput.value.trim();
  if (!label) {
    setStatusKey("status.targetFolderEmpty");
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
  setStatusKey(scope === "selected" ? "status.folderAppliedSelected" : "status.folderAppliedAll");
}

async function exportCsv() {
  if (state.rows.length === 0) {
    setStatusKey("status.noPreviewExport");
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
      setStatusKey("status.exportedCsv");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  downloadBlob(blob, "rename_preview.csv");
  setStatusKey("status.downloadedCsv");
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
    setStatusKey("status.importedCsv", { count: state.rows.length });
  } catch (error) {
    setStatusKey("status.importFailed", { message: error.message });
  } finally {
    els.csvInput.value = "";
  }
}

async function executeRows() {
  state.rows = await revalidateWithFilesystem(state.rows);
  renderPreview();
  const okRows = state.rows.filter((row) => row.status === "OK");
  if (okRows.length === 0) {
    setStatusKey("status.noOkRows");
    return;
  }
  const confirmed = window.confirm(tKey("status.confirmExecute", { count: okRows.length }));
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
  setStatusKey("status.executionDone", { done, failed });
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
      ? tKey("file.copyReady", { count })
      : tKey("file.copyPrompt");
    return;
  }

  els.fileSummary.textContent = state.sources.length
    ? tKey("file.loaded", { count: state.sources.length })
    : tKey("file.none");

  els.sourceList.innerHTML = "";
  if (state.sources.length === 0) {
    els.sourceList.textContent = tKey("empty.sources");
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
    item.textContent = tKey("file.more", { count: state.sources.length - 18 });
    fragment.append(item);
  }
  els.sourceList.append(fragment);
}

function renderRules() {
  els.ruleList.innerHTML = "";
  if (state.rules.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-list";
    empty.textContent = tKey("empty.rules");
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
    remove.textContent = tKey("button.removeRule");
    remove.addEventListener("click", () => {
      state.rules.splice(index, 1);
      renderRules();
      setStatusKey("status.ruleRemoved");
    });
    item.append(summary, remove);
    els.ruleList.append(item);
  });
}

function renderPreview() {
  els.previewBody.innerHTML = "";
  const counts = summarizeRows();
  renderExecutionSummary(counts);
  els.previewSummary.textContent = state.rows.length
    ? tKey("preview.summary", { total: state.rows.length, ok: counts.ok, blocked: counts.blocked })
    : tKey("preview.none");

  if (state.rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7" class="empty-table">${escapeHtml(tKey("empty.preview"))}</td>`;
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
      textCell(tKey(`action.${row.action}`)),
      textCell(state.showFullPath ? (row.sourcePath || row.sourceName) : row.sourceName, row.sourcePath || row.sourceName),
      cellWith(targetName),
      cellWith(targetFolder),
      statusCell(row.status)
    );
    els.previewBody.append(tr);
  }
}

function renderExecutionSummary(counts = summarizeRows()) {
  els.executionSummary.textContent = state.rows.length
    ? tKey("safety.summary", { ok: counts.ok, blocked: counts.blocked, error: counts.error })
    : tKey("safety.none");
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

function updatePet() {
  const enabled = state.settings.petEnabled;
  const pet = PETS.find((item) => item.id === state.settings.petType);
  els.petLayer.hidden = !enabled;
  els.petCompanion.dataset.pet = state.settings.petType;
  els.petCompanion.classList.toggle("has-image", Boolean(pet?.spriteBase));
  els.petImage.hidden = !pet?.spriteBase;
  state.pet.action = state.pet.dragging ? "panic-held" : "idle";
  renderPetSprite();
  els.petCompanion.setAttribute("aria-label", tKey(state.settings.petType ? `pet.${state.settings.petType}` : "settings.pet"));
  if (enabled) {
    clampPetPosition();
    renderPetPosition();
    scheduleNextPetAction(performance.now(), true);
    scheduleNextPetDialogue(performance.now(), true);
    startPetLoop();
  } else if (state.pet.frame) {
    cancelAnimationFrame(state.pet.frame);
    state.pet.frame = null;
    clearTimeout(state.pet.bubbleTimer);
    els.petBubble.dataset.show = "false";
  }
}

function startPetLoop() {
  if (state.pet.frame) {
    return;
  }
  state.pet.lastTime = performance.now();
  state.pet.frame = requestAnimationFrame(tickPet);
}

function tickPet(time) {
  state.pet.frame = null;
  if (!state.settings.petEnabled) {
    return;
  }
  const delta = Math.min(48, time - state.pet.lastTime);
  state.pet.lastTime = time;
  if (!state.pet.dragging) {
    updatePetAction(time);
    updatePetDialogue(time);
    state.pet.x += state.pet.vx * delta;
    state.pet.y += state.pet.vy * delta;
    bouncePet();
    renderPetPosition();
  }
  state.pet.frame = requestAnimationFrame(tickPet);
}

function updatePetAction(time) {
  if (state.pet.action !== "idle" && time >= state.pet.actionUntil) {
    setPetAction("idle");
    scheduleNextPetAction(time);
  }
  if (state.pet.action === "idle" && time >= state.pet.nextActionAt) {
    const action = pickRandomPetAction();
    setPetAction(action);
    state.pet.actionUntil = time + PET_ACTION_DURATIONS[action];
    if (action === "idle") {
      scheduleNextPetAction(state.pet.actionUntil);
    }
  }
}

function pickRandomPetAction() {
  const options = PET_RANDOM_ACTIONS.filter((action) => action !== state.pet.lastRandomAction);
  const action = options[Math.floor(Math.random() * options.length)] || "hop";
  state.pet.lastRandomAction = action;
  return action;
}

function scheduleNextPetAction(time, soon = false) {
  state.pet.nextActionAt = time + (soon ? 1200 : 4500 + Math.random() * 4500);
}

function scheduleNextPetDialogue(time, soon = false) {
  state.pet.nextDialogueAt = time + (soon ? 2800 + Math.random() * 2600 : 8500 + Math.random() * 11000);
}

function updatePetDialogue(time) {
  if (time < state.pet.nextDialogueAt || els.petBubble.dataset.show === "true") {
    return;
  }
  showPetDialogue();
  scheduleNextPetDialogue(time);
}

function showPetDialogue() {
  const lines = PET_DIALOGUES[state.settings.petType] || PET_DIALOGUES[DEFAULT_SETTINGS.petType] || [];
  if (lines.length === 0) {
    return;
  }
  const choices = lines.filter((line) => line !== state.pet.lastDialogue);
  const line = choices[Math.floor(Math.random() * choices.length)] || lines[0];
  state.pet.lastDialogue = line;
  els.petBubble.textContent = line;
  els.petBubble.dataset.show = "true";
  clearTimeout(state.pet.bubbleTimer);
  state.pet.bubbleTimer = window.setTimeout(() => {
    els.petBubble.dataset.show = "false";
  }, 4200);
}

function setPetAction(action) {
  if (state.pet.action === action) {
    return;
  }
  state.pet.action = action;
  renderPetSprite();
}

function renderPetSprite() {
  const pet = PETS.find((item) => item.id === state.settings.petType);
  els.petCompanion.dataset.action = state.pet.action;
  if (!pet?.spriteBase) {
    els.petImage.removeAttribute("src");
    return;
  }
  els.petImage.src = `${pet.spriteBase}-${state.pet.action}.png`;
}

function bouncePet() {
  const bounds = petBounds();
  if (state.pet.x <= bounds.minX || state.pet.x >= bounds.maxX) {
    state.pet.vx *= -1;
  }
  if (state.pet.y <= bounds.minY || state.pet.y >= bounds.maxY) {
    state.pet.vy *= -1;
  }
  clampPetPosition();
}

function clampPetPosition() {
  const bounds = petBounds();
  state.pet.x = Math.max(bounds.minX, Math.min(bounds.maxX, state.pet.x));
  state.pet.y = Math.max(bounds.minY, Math.min(bounds.maxY, state.pet.y));
}

function petBounds() {
  const size = 92;
  return {
    minX: 10,
    minY: 92,
    maxX: Math.max(10, window.innerWidth - size - 10),
    maxY: Math.max(110, window.innerHeight - size - 52)
  };
}

function renderPetPosition() {
  const direction = state.pet.vx < 0 ? -1 : 1;
  els.petCompanion.style.transform = `translate(${state.pet.x}px, ${state.pet.y}px) scaleX(${direction})`;
  els.petBubble.style.transform = `scaleX(${direction})`;
}

function startPetDrag(event) {
  if (!state.settings.petEnabled) {
    return;
  }
  event.preventDefault();
  state.pet.dragging = true;
  state.pet.justDragged = false;
  setPetAction("panic-held");
  const rect = els.petCompanion.getBoundingClientRect();
  state.pet.dragOffsetX = event.clientX - rect.left;
  state.pet.dragOffsetY = event.clientY - rect.top;
  els.petCompanion.classList.add("is-held");
  els.petCompanion.setPointerCapture(event.pointerId);
  els.petCompanion.addEventListener("pointermove", movePetDrag);
  els.petCompanion.addEventListener("pointerup", endPetDrag, { once: true });
  els.petCompanion.addEventListener("pointercancel", endPetDrag, { once: true });
}

function movePetDrag(event) {
  if (!state.pet.dragging) {
    return;
  }
  state.pet.justDragged = true;
  state.pet.x = event.clientX - state.pet.dragOffsetX;
  state.pet.y = event.clientY - state.pet.dragOffsetY;
  clampPetPosition();
  renderPetPosition();
}

function endPetDrag(event) {
  state.pet.dragging = false;
  state.pet.vx = (Math.random() > 0.5 ? 1 : -1) * (0.025 + Math.random() * 0.025);
  state.pet.vy = (Math.random() > 0.5 ? 1 : -1) * (0.018 + Math.random() * 0.02);
  els.petCompanion.classList.remove("is-held");
  setPetAction("idle");
  scheduleNextPetAction(performance.now(), true);
  els.petCompanion.removeEventListener("pointermove", movePetDrag);
  try {
    els.petCompanion.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }
  window.setTimeout(() => {
    state.pet.justDragged = false;
  }, 120);
}

function reactToPet() {
  if (!state.settings.petEnabled || state.pet.justDragged) {
    return;
  }
  els.petCompanion.classList.remove("is-reacting");
  void els.petCompanion.offsetWidth;
  els.petCompanion.classList.add("is-reacting");
  setPetAction("cheer");
  state.pet.actionUntil = performance.now() + PET_ACTION_DURATIONS.cheer;
  els.petBubble.textContent = tKey(`pet.reaction.${state.settings.petType}`);
  els.petBubble.dataset.show = "true";
  clearTimeout(state.pet.bubbleTimer);
  state.pet.bubbleTimer = window.setTimeout(() => {
    els.petBubble.dataset.show = "false";
    els.petCompanion.classList.remove("is-reacting");
  }, 1800);
  scheduleNextPetDialogue(performance.now());
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
    } else if (String(row.status || "").startsWith("Error:")) {
      summary.error += 1;
      summary.blocked += 1;
    } else {
      summary.blocked += 1;
    }
    return summary;
  }, { ok: 0, blocked: 0, error: 0 });
}

function describeRule(rule) {
  const target = rule.target === "Segment"
    ? tKey("desc.segment", {
      delimiter: rule.delimiter,
      segmentNo: rule.segmentNo,
      direction: tKey(rule.fromEnd ? "desc.fromEnd" : "desc.fromStart")
    })
    : tKey("desc.character", { charStart: rule.charStart, charLength: rule.charLength });
  const value = rule.valueMode === "Static"
    ? tKey("desc.static", { value: rule.staticValue })
    : rule.valueMode === "List"
      ? tKey("desc.list")
      : rule.valueMode === "Delete"
        ? tKey("desc.delete")
        : tKey("desc.sequence", {
          mode: tKey(`option.${rule.valueMode === "SeqUp" ? "seqUp" : "seqDown"}`),
          start: rule.seqStart,
          step: rule.seqStep,
          pad: rule.pad
        });
  return `${target} ${value}`;
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

function textCell(text, title = "") {
  const td = document.createElement("td");
  td.textContent = text ?? "";
  if (title) {
    td.title = title;
  }
  return td;
}

function statusCell(status) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `status-pill ${statusKind(status)}`;
  badge.textContent = translateStatus(status);
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

function setStatusKey(key, params = {}) {
  setStatus(tKey(key, params));
}

function tKey(key, params = {}) {
  return t(state.settings.language, key, params);
}

function translateStatus(status) {
  const text = String(status ?? "");
  if (text.startsWith("Error:")) {
    return `${tKey("status.error")}: ${text.slice("Error:".length).trim()}`;
  }
  return tKey(`status.${text}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
