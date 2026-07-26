import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const textFiles = [
  "pwa/index.html",
  "pwa/assets/app.js",
  "pwa/assets/rules.js",
  "pwa/assets/settings.js",
  "pwa/assets/style.css",
  "pwa/service-worker.js",
  "pwa/manifest.webmanifest"
];

test("PWA files contain the expected settings and appearance hooks", async () => {
  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="settingsPanel"/);
  assert.match(index, /id="languageSelect"/);
  assert.match(index, /id="templateSelect"/);
  assert.match(index, /id="themeSelect"/);
  assert.match(index, /id="petEnabledInput"/);
  assert.match(index, /id="petTypeSelect"/);
  assert.match(index, /id="petMotionSelect"/);
  assert.match(index, /id="petCompanion"/);
  assert.match(index, /id="petImage"/);
  assert.match(index, /id="updateBanner"/);
  assert.match(index, /id="updateNowButton"/);
  assert.match(index, /class="[^"]*\bguide-panel\b[^"]*"/);
  assert.match(index, /id="executionSummary"/);
  assert.match(index, /class="[^"]*\bstatus-legend\b[^"]*"/);
  assert.match(index, /data-i18n="settings.open"/);
  assert.doesNotMatch(index, /id="applySettingsButton"/);
  assert.match(index, /id="pickPreviewOutputFolderButton"/);
  assert.match(index, /id="clearCopySetupButton"/);
  assert.match(index, /id="showFullPathInput"/);
  assert.match(index, /data-i18n-title="tooltip.modeRename"/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /body\[data-template="anime"\]/);
  assert.match(css, /body\[data-template="cyber"\]/);
  assert.match(css, /body\[data-template="sakura-paper"\]/);
  assert.match(css, /body\[data-template="holographic-glass"\]/);
  assert.match(css, /body\[data-theme="sakura"\]/);
  assert.match(css, /body\[data-theme="terminal"\]/);
  assert.match(css, /body\[data-theme="lamp"\]/);
  assert.match(css, /backgrounds\/material\.jpg/);
  assert.match(css, /\.flow-button/);
  assert.match(css, /\.danger-button/);
  assert.match(css, /\.preview-options/);
  assert.match(css, /\.update-banner/);
  assert.match(css, /\.pet-image/);
  assert.match(css, /--pet-facing/);
  assert.doesNotMatch(css, /\.pet-bubble[^{]*\{[^}]*scaleX/s);
  assert.match(css, /\.pet-bubble::after/);
  assert.match(css, /\[data-action="panic-held"\]/);
  assert.match(css, /@keyframes pet-hop/);
  assert.match(css, /@keyframes pet-cheer/);
  assert.match(css, /@keyframes pet-stretch/);
  assert.match(css, /@keyframes pet-spin/);
  assert.match(css, /@keyframes portal-ring/);
  assert.match(css, /@keyframes copter-spin/);
  assert.match(css, /@keyframes rope-sway/);
  assert.match(css, /\[data-travel="portal"\]/);
  assert.match(css, /\.pet-companion\[data-pet="folderling"\]/);
  assert.match(css, /\.pet-companion\[data-pet="pixelplant"\]/);
  assert.match(css, /@keyframes pet-held/);
  assert.match(css, /\.workflow-steps/);
  assert.match(css, /\.safety-strip/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /startPetDrag/);
  assert.match(app, /movePetDrag/);
  assert.match(app, /classList\.add\("is-held"\)/);
  assert.match(app, /PET_RANDOM_ACTIONS/);
  assert.match(app, /panic-held/);
  assert.match(app, /scheduleNextPetAction/);
  assert.match(app, /isIgnorableSystemFile/);
  assert.match(app, /showFullPath/);
  assert.match(app, /showPetDialogue/);
  assert.match(app, /updateSmartPetMotion/);
  assert.match(app, /pickSmartTransition/);
  assert.match(app, /petSurfaces/);
  assert.match(app, /canUseSmartTravel/);
  assert.match(app, /spriteFacingScale/);
  assert.match(app, /portal-file-mender/);
  assert.match(app, /petSurfaces\(allowPanels = canUseSmartTravel\(\)\)/);
  assert.match(app, /state\.settings\.petType === "portal-file-mender"/);
  assert.doesNotMatch(app, /petCompanion\.style\.transform = `translate\(\$\\{state\.pet\.x}px, \$\\{state\.pet\.y}px\) scaleX/);
  assert.match(app, /registerServiceWorker/);
  assert.match(app, /showUpdateAvailable/);
  assert.match(app, /SKIP_WAITING/);
});

test("generated background assets exist and are non-empty", async () => {
  const backgrounds = [
    "material",
    "anime",
    "sakura-paper",
    "cyber",
    "glass-office",
    "blueprint",
    "watercolor",
    "retro-terminal",
    "wood-desk",
    "marble",
    "aurora",
    "rainy-window",
    "synthwave",
    "forest-study",
    "galaxy-archive",
    "linen-notebook",
    "industrial-metal",
    "pastel-cloud",
    "monochrome-ink",
    "holographic-glass",
    "night-lamp"
  ];
  for (const name of backgrounds) {
    const path = `pwa/assets/backgrounds/${name}.jpg`;
    const info = await stat(path);
    assert.ok(info.size > 200_000, `${path} should be a high-detail raster asset`);
  }
});

test("generated pet action assets exist and are transparent pngs", async () => {
  const pets = ["folderling-deluxe", "staplebot-deluxe", "papersprite-deluxe", "archivecube-deluxe", "pixelplant-deluxe", "portal-file-mender"];
  const actions = ["idle", "hop", "cheer", "stretch", "spin", "panic-held"];
  for (const pet of pets) {
    for (const action of actions) {
      const path = `pwa/assets/pets/${pet}-${action}.png`;
      const info = await stat(path);
      assert.ok(info.size > 18_000, `${path} should be a generated raster sprite`);
    }
  }
  for (const action of ["walk", "portal", "copter", "rope"]) {
    const path = `pwa/assets/pets/portal-file-mender-${action}.png`;
    const info = await stat(path);
    assert.ok(info.size > 18_000, `${path} should be a generated smart-movement sprite`);
  }
});

test("service worker caches all project-bound runtime assets", async () => {
  const worker = await readFile("pwa/service-worker.js", "utf8");
  assert.match(worker, /batch-file-renamer-v6/);
  assert.match(worker, /SKIP_WAITING/);
  for (const asset of [
    "./assets/settings.js",
    "./assets/backgrounds/material.jpg",
    "./assets/backgrounds/anime.jpg",
    "./assets/backgrounds/sakura-paper.jpg",
    "./assets/backgrounds/cyber.jpg",
    "./assets/backgrounds/holographic-glass.jpg",
    "./assets/backgrounds/night-lamp.jpg",
    "./assets/pets/portal-file-mender-portal.png",
    "./assets/pets/portal-file-mender-copter.png",
    "./assets/pets/portal-file-mender-rope.png",
    "./assets/pets/folderling-deluxe-panic-held.png",
    "./assets/pets/pixelplant-deluxe-spin.png"
  ]) {
    assert.match(worker, new RegExp(asset.replace(/[./]/g, "\\$&")));
  }
});

test("filename validation exports and localized statuses are present", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function isReservedFilename/);
  assert.match(rules, /export function hasTrailingDotOrSpace/);
  assert.match(rules, /WINDOWS_RESERVED_NAMES/);
  assert.match(rules, /status = "Reserved name"/);
  assert.match(rules, /status = "Trailing dot or space"/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  // Each of the 4 languages (zh-Hant, zh-Hans, en, ja) must localize the new statuses.
  assert.equal((settings.match(/"status\.Reserved name":/g) || []).length, 4);
  assert.equal((settings.match(/"status\.Trailing dot or space":/g) || []).length, 4);
});

test("undo-last-batch wiring and localized labels are present", async () => {
  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="undoButton"/);

  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function planUndoOperations/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /planUndoOperations/);
  assert.match(app, /async function undoLastBatch/);
  assert.match(app, /function updateUndoAvailability/);
  assert.match(app, /state\.lastBatch/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  // Each of the 4 languages must localize the undo button and its confirm prompt.
  assert.equal((settings.match(/"button\.undo":/g) || []).length, 4);
  assert.equal((settings.match(/"status\.undoConfirm":/g) || []).length, 4);
});

test("find-and-replace rule mode is wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /"Segment", "Character", "Replace"/);
  assert.match(rules, /function applyReplace/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /value="Replace"/);
  assert.match(index, /id="findInput"/);
  assert.match(index, /id="replaceInput"/);
  assert.match(index, /id="useRegexInput"/);
  assert.match(index, /id="caseInsensitiveInput"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /useRegex: els\.useRegexInput\.checked/);
  assert.match(app, /rule\.target === "Replace"/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  // Each of the 4 languages must localize the replace option, fields, and description.
  assert.equal((settings.match(/"option\.replace":/g) || []).length, 4);
  assert.equal((settings.match(/"field\.find":/g) || []).length, 4);
  assert.equal((settings.match(/"desc\.replace":/g) || []).length, 4);
});

test("case-transform rule mode is wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /"Segment", "Character", "Replace", "Case"/);
  assert.match(rules, /function applyCaseTransform/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /value="Case"/);
  assert.match(index, /id="caseModeSelect"/);
  assert.match(index, /value="title"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /caseMode: els\.caseModeSelect\.value/);
  assert.match(app, /rule\.target === "Case"/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  // Each of the 4 languages must localize the case option, its modes, and description.
  assert.equal((settings.match(/"option\.case":/g) || []).length, 4);
  assert.equal((settings.match(/"option\.title":/g) || []).length, 4);
  assert.equal((settings.match(/"field\.caseMode":/g) || []).length, 4);
  assert.equal((settings.match(/"desc\.case":/g) || []).length, 4);
});

test("date/time tokens for Static values are wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function expandDateTokens/);
  assert.match(rules, /yyyy\|yy\|MM\|dd\|HH\|mm\|ss/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /data-i18n="hint\.dateTokens"/);
  assert.match(index, /class="field-hint"/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.field-hint/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  assert.equal((settings.match(/"hint\.dateTokens":/g) || []).length, 4);
});

test("rule enable/disable and reorder controls are wired and localized", async () => {
  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function toggleRuleEnabled/);
  assert.match(app, /function moveRule/);
  assert.match(app, /state\.ruleDragIndex/);
  assert.match(app, /rule\.enabled !== false/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.rule-item\.is-disabled/);
  assert.match(css, /\.rule-actions/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  assert.equal((settings.match(/"tooltip\.toggleRule":/g) || []).length, 4);
  assert.equal((settings.match(/"status\.ruleReordered":/g) || []).length, 4);
});

test("execution log export is wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function executionLogToCsv/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="exportLogButton"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function exportExecutionLog/);
  assert.match(app, /state\.lastExecutionReport/);
  assert.match(app, /function updateExecutionLogAvailability/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  assert.equal((settings.match(/"button\.exportLog":/g) || []).length, 4);
  assert.equal((settings.match(/"status\.logExported":/g) || []).length, 4);
});

test("drag-and-drop source loading is wired and localized", async () => {
  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function addSourceFiles/);
  assert.match(app, /function handleSourceDrop/);
  assert.match(app, /els\.renameSetup\.addEventListener\("drop"/);
  assert.match(app, /is-dragover/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /data-i18n="hint\.dropFiles"/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.mode-panel\.is-dragover/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  assert.equal((settings.match(/"hint\.dropFiles":/g) || []).length, 4);
});

test("rule errors and folder labels are localized instead of leaking English", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function codedError/);
  assert.match(rules, /export function errorDetail/);
  assert.match(rules, /sourceFolderFallback/);
  assert.match(rules, /importedFolderLabel/);
  // Every rule-engine failure must go through codedError so the UI has something to translate.
  assert.doesNotMatch(rules, /throw new Error\(/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function ruleTargetLabel/);
  assert.match(app, /ruleTargetLabel\(rule\.target\)/);
  // The rule card must not print the raw target enum any more.
  assert.doesNotMatch(app, /escapeHtml\(rule\.target\)/);
  assert.match(app, /function translateStatus\(row\)/);
  assert.match(app, /tKey\(`error\.\$\{detail\.code}`/);
  assert.match(app, /tKey\("folder\.browserFiles"\)/);
  assert.match(app, /sourceFolderFallback: tKey\("folder\.sourceFolder"\)/);
  assert.doesNotMatch(app, /throw new Error\(/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const localizedKeys = [
    "folder\\.browserFiles",
    "folder\\.sourceFolder",
    "folder\\.imported",
    "error\\.segmentOutOfRange",
    "error\\.delimiterEmpty",
    "error\\.valueListMissingRow",
    "error\\.charStartTooSmall",
    "error\\.charStartBeyondLength",
    "error\\.charLengthNegative",
    "error\\.findEmpty",
    "error\\.invalidRegex",
    "error\\.unknownCaseMode",
    "error\\.outputFolderMissing",
    "error\\.templateMissing",
    "error\\.renameSourceOnly",
    "error\\.renameNeedsFolder",
    "error\\.permissionDenied",
    "error\\.sourceFileMissing"
  ];
  for (const key of localizedKeys) {
    // Each of the 4 languages (zh-Hant, zh-Hans, en, ja) must provide the key.
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("source capability strip is wired and localized", async () => {
  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="sourceCapability"/);
  assert.match(index, /id="capabilityTitle"/);
  assert.match(index, /id="capabilityDetail"/);
  assert.match(index, /class="[^"]*\bcapability-strip\b[^"]*"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function sourceCapability/);
  assert.match(app, /function renderCapability/);
  // The badge must reflect the same handle-based rule that execution itself enforces.
  assert.match(app, /state\.sourceDirectoryHandle/);
  assert.match(app, /els\.executeButton\.disabled = !canExecute/);
  // A browser without the File System Access API cannot act on "pick a folder" advice.
  assert.match(app, /capability\.browserLimitedDetail/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.capability-strip\[data-state="ready"\]/);
  assert.match(css, /\.capability-strip\[data-state="preview"\]/);
  assert.match(css, /#executeButton\[disabled\]/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const keys = [
    "capability\\.renameEmptyTitle",
    "capability\\.renameEmptyDetail",
    "capability\\.renamePreviewTitle",
    "capability\\.renamePreviewDetail",
    "capability\\.renameReadyTitle",
    "capability\\.renameReadyDetail",
    "capability\\.copyEmptyTitle",
    "capability\\.copyEmptyDetail",
    "capability\\.copyPreviewTitle",
    "capability\\.copyPreviewDetail",
    "capability\\.copyReadyTitle",
    "capability\\.copyReadyDetail",
    "capability\\.browserLimitedDetail"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
  // The drop hint has to state the preview-only limit up front, not after every row blocks.
  assert.equal((settings.match(/"hint\.dropFiles": "[^"]*(預覽|预览|preview|プレビュー)/g) || []).length, 4);
});

test("processing scope filter is wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  for (const symbol of ["EMPTY_SCOPE", "fileExtension", "summarizeExtensions", "isScopeActive", "matchesScope", "filterSources"]) {
    assert.match(rules, new RegExp(`export (const|function) ${symbol}\\b`), symbol);
  }

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="scopeStrip"/);
  assert.match(index, /id="extensionChips"/);
  assert.match(index, /id="scopeIncludeInput"/);
  assert.match(index, /id="scopeExcludeInput"/);
  assert.match(index, /id="clearScopeButton"/);
  assert.match(index, /id="scopeSummary"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function scopedSources/);
  assert.match(app, /function renderScope/);
  assert.match(app, /function describeScope/);
  assert.match(app, /function toggleExtension/);
  // Preview rows and the live sample must come from the scoped set, otherwise an
  // out-of-scope file could still be executed.
  assert.match(app, /sources: scopedSources\(\)/);
  assert.match(app, /scopedSources\(\)\[0\]\?\.name/);
  assert.match(app, /is-out-of-scope/);
  // Loading a new source set must not inherit the previous filter.
  assert.equal((app.match(/resetScope\(\);/g) || []).length, 4);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.scope-strip/);
  assert.match(css, /\.extension-chip\[data-active="true"\]/);
  assert.match(css, /\.file-list span\.is-out-of-scope/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const keys = [
    "scope\\.title",
    "scope\\.clear",
    "scope\\.include",
    "scope\\.exclude",
    "scope\\.noExtension",
    "scope\\.outOfScope",
    "scope\\.summaryAll",
    "scope\\.summaryFiltered",
    "scope\\.conditions",
    "scope\\.condExtensions",
    "scope\\.condNoExtensions",
    "scope\\.condInclude",
    "scope\\.condExclude",
    "status\\.scopeCleared",
    "status\\.scopeEmpty"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("live preview and per-rule before/after are wired and localized", async () => {
  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function schedulePreview/);
  assert.match(app, /function runLivePreview/);
  assert.match(app, /function previewOptions/);
  assert.match(app, /function guardMessage/);
  assert.match(app, /function ruleChainPreviews/);
  assert.match(app, /function rulePreviewNode/);
  // `init()` runs at module scope, so anything the first render touches must be declared
  // above it or it is still in its temporal dead zone.
  const initIndex = app.indexOf("\ninit();");
  assert.ok(initIndex > 0);
  for (const name of ["SAMPLE_FALLBACK", "LIVE_PREVIEW_DELAY", "STATUS_REASONS", "ROW_FIXES"]) {
    const declIndex = app.indexOf(`const ${name} =`);
    assert.ok(declIndex > 0 && declIndex < initIndex, `${name} must be declared before init()`);
  }
  // Every input that changes what the preview would produce has to refresh it.
  assert.ok((app.match(/schedulePreview\(\);/g) || []).length >= 12);

  const rules = await readFile("pwa/assets/rules.js", "utf8");
  for (const code of ["noRules", "needTemplate", "needOutputFolder", "valueListEmpty", "needSources", "valueListCountMismatch"]) {
    assert.match(rules, new RegExp(`messageCode: "${code}"`), code);
  }

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.rule-preview/);
  assert.match(css, /\.rule-preview\[data-kind="error"\]/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /data-i18n-title="tooltip\.preview"/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const keys = [
    "rule\\.previewDisabled",
    "rule\\.previewNoChange",
    "tooltip\\.preview",
    "guard\\.noRules",
    "guard\\.needTemplate",
    "guard\\.needOutputFolder",
    "guard\\.valueListEmpty",
    "guard\\.needSources",
    "guard\\.valueListCountMismatch"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("preview diff, status filtering, and row fixes are wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  for (const symbol of ["diffSpan", "sanitizeFilename", "stripTrailingDotOrSpace", "escapeReservedName", "nextAvailableName"]) {
    assert.match(rules, new RegExp(`export function ${symbol}\\b`), symbol);
  }

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="statusLegend"/);
  assert.match(index, /class="legend-chip" data-filter="ok"/);
  assert.match(index, /id="legendCountWarn"/);
  assert.match(index, /data-i18n="table\.change"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function diffCell/);
  assert.match(app, /function renderLegend/);
  assert.match(app, /function toggleStatusFilter/);
  assert.match(app, /function applyRowFix/);
  assert.match(app, /state\.statusFilter/);
  // Filtering must stay a view concern: execution reads state.rows, never the filtered list.
  assert.doesNotMatch(app, /okRows = visibleRows/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.diff-cell del/);
  assert.match(css, /\.diff-cell ins/);
  assert.match(css, /\.legend-chip\[data-active="true"\]/);
  assert.match(css, /\.status-reason/);
  assert.match(css, /\.fix-button/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const keys = [
    "table\\.change",
    "empty\\.filteredRows",
    "reason\\.duplicateTarget",
    "reason\\.targetExists",
    "reason\\.invalidFilename",
    "reason\\.reservedName",
    "reason\\.trailingDotOrSpace",
    "reason\\.noChange",
    "reason\\.targetNameEmpty",
    "reason\\.targetFolderEmpty",
    "fix\\.autoNumber",
    "fix\\.sanitize",
    "fix\\.escapeReserved",
    "fix\\.stripTrailing",
    "status\\.fixApplied",
    "status\\.fixNoChange",
    "status\\.rowFilterOn",
    "status\\.rowFilterOff"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("beginner rule presets are wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /"Segment", "Character", "Replace", "Case", "Affix", "Extension", "Cleanup"/);
  assert.match(rules, /export const AFFIX_POSITIONS/);
  assert.match(rules, /export const CLEANUP_MODES/);
  assert.match(rules, /function applyAffix/);
  assert.match(rules, /function applyExtensionChange/);
  assert.match(rules, /function applyCleanup/);
  // The extension is no longer fixed for the whole pass; the Extension target rebinds it.
  assert.match(rules, /let ext = originalExt/);
  // removeSpecial must keep letters/digits in any script, or CJK filenames would be gutted.
  assert.match(rules, /\\p\{L}\\p\{N}/);

  const index = await readFile("pwa/index.html", "utf8");
  for (const id of ["affixPositionSelect", "affixTextInput", "newExtensionInput", "cleanupModeSelect"]) {
    assert.match(index, new RegExp(`id="${id}"`), id);
  }
  assert.match(index, /value="Affix"/);
  assert.match(index, /value="Extension"/);
  assert.match(index, /value="Cleanup"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /affixText: els\.affixTextInput\.value/);
  assert.match(app, /newExtension: els\.newExtensionInput\.value/);
  assert.match(app, /cleanupMode: els\.cleanupModeSelect\.value/);
  assert.match(app, /rule\.target === "Affix"/);
  assert.match(app, /els\.extensionField\.hidden = !isExtension/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  const keys = [
    "option\\.affix", "option\\.extension", "option\\.cleanup",
    "option\\.prefix", "option\\.suffix",
    "option\\.trimSpaces", "option\\.spacesToUnderscore", "option\\.removeSpecial", "option\\.collapseSeparators",
    "field\\.affixPosition", "field\\.affixText", "field\\.newExtension", "field\\.cleanupMode",
    "placeholder\\.affixText", "placeholder\\.newExtension",
    "desc\\.affix", "desc\\.extension", "desc\\.cleanup",
    "error\\.affixTextEmpty", "error\\.unknownAffixPosition", "error\\.extensionEmpty", "error\\.unknownCleanupMode"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("rule presets and session memory are wired and localized", async () => {
  const rules = await readFile("pwa/assets/rules.js", "utf8");
  assert.match(rules, /export function normalizeRule\b/);
  assert.match(rules, /export function normalizeRules\b/);

  const settings = await readFile("pwa/assets/settings.js", "utf8");
  for (const symbol of ["loadRulePresets", "saveRulePresets", "loadSession", "saveSession"]) {
    assert.match(settings, new RegExp(`export function ${symbol}\\b`), symbol);
  }
  // Separate keys so a corrupt value in one cannot take the others down.
  assert.match(settings, /"batch-file-renamer\.presets"/);
  assert.match(settings, /"batch-file-renamer\.session"/);

  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="presetSelect"/);
  assert.match(index, /id="savePresetButton"/);
  assert.match(index, /id="deletePresetButton"/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /function restoreSession/);
  assert.match(app, /function persistSession/);
  assert.match(app, /function savePreset/);
  assert.match(app, /function loadPreset/);
  assert.match(app, /function deletePreset/);
  // Stored rules must be normalized on the way in, both for the session and for presets.
  assert.equal((app.match(/normalizeRules\(/g) || []).length, 2);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /\.preset-bar/);

  const keys = [
    "preset\\.label", "preset\\.save", "preset\\.delete", "preset\\.choose", "preset\\.none",
    "preset\\.promptName", "preset\\.confirmDelete",
    "status\\.presetSaved", "status\\.presetUpdated", "status\\.presetLoaded",
    "status\\.presetDeleted", "status\\.presetNoRules"
  ];
  for (const key of keys) {
    assert.equal((settings.match(new RegExp(`"${key}":`, "g")) || []).length, 4, key);
  }
});

test("text files do not contain unresolved merge markers", async () => {
  for (const path of textFiles) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, /<<<<<<<|=======|>>>>>>>/);
  }
});
