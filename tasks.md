# Tasks

Use this file as the lightweight task board for this project unless the project explicitly uses GitHub Issues, Linear, Notion, or another tracker.

## Next

## In Progress

## Backlog

> T037-T042 come from the 2026-07-25 usability review of the shipped PWA. They are ordered
> for implementation: each one is independently shippable, and later tasks assume the earlier
> ones landed. T035/T036 predate the review and are sequenced last because T041 delivers part
> of what T036 asks for.

- [ ] T038 - Make preview-only vs executable file sources obvious before the user builds rules.
  - Files added via "Select files" or drag-and-drop can never execute, but nothing says so until every preview row is blocked.
  - Add a source-capability badge and disable "Execute OK rows" while no row can actually be written.
- [ ] T039 - Add a "processing scope" filter strip so users can see and control which files are in scope.
  - Extension chips derived from the loaded files (each showing its match count), plus name include/exclude text filters.
  - Show a plain-language summary of the active filter; render filtered-out files as dimmed rather than hiding them.
- [ ] T040 - Make the preview live and make each rule card show its own before/after.
  - Debounced auto-preview so editing a rule updates the table without pressing "Check preview".
  - Each rule card shows before -> after for the first in-scope file, chained through the preceding rules.
- [ ] T041 - Make the preview table show what changed and how to fix blocked rows.
  - Highlight the changed span between current and target name.
  - Make the status legend chips filter the table; give each blocked status a plain-language reason and, where possible, a one-click fix.
- [ ] T042 - Add beginner rule presets that do not require understanding Segment/Character.
  - Add prefix / add suffix, change extension, and cleanup (collapse whitespace, strip special characters).
  - "Change extension" needs rule-engine support: `applyRulesToName` currently always preserves the extension.
- [ ] T035 - Add named rule presets and remember the last-used rules/settings via localStorage.
- [ ] T036 - Add preview-row search and batch exclusion of selected rows from execution.
  - Narrowed from the original wording: status-chip filtering moved to T041, so this task covers free-text search and explicit per-row exclusion only.

## Done

- [x] T037 - Fix untranslated UI leaks: rule-card titles, rule-engine error messages, hardcoded folder labels.
  - Added `codedError` / `errorDetail` to `pwa/assets/rules.js`: every engine and execution failure now carries a stable `code` plus `params`. The English `message` is deliberately kept because it is what lands in CSV exports and execution logs, which must not change with the interface language.
  - Rows carry a new `statusDetail` field; `validateRows` clears it whenever a plain validation state replaces a rule error, so a stale reason cannot be shown.
  - `app.js` `translateStatus(row)` renders `error.<code>` from the catalog, falling back to the raw message for errors thrown by the browser (which have no code). Rule cards read the existing `option.*` labels via a new `ruleTargetLabel`.
  - Placeholder folder labels are now injected by the caller (`sourceFolderFallback` on `buildPreviewRows`, `importedFolderLabel` on `parsePreviewCsv`) so `rules.js` stays language-agnostic; the engine keeps English defaults.
  - Error wording is actionable rather than literal, e.g. "Segment 2 out of range. Parts=1" now reads "這個檔名用「-」切不出第 2 段（只有 1 段）。"
  - 18 new keys localized across all four languages. Added rule-engine unit tests for every error code, a static check that no `throw new Error(` remains in `rules.js`/`app.js`, and `tests/e2e/localized-errors.spec.mjs` verifying the rule card, the error status, and the folder label in zh-TW, en, and ja. `npm run test` 23 passing, `npm run test:e2e` 16 passing.
  - Known limitation: folder labels are resolved when files are loaded, so switching language does not relabel already-loaded sources. Rows re-render correctly on the next preview.
- [x] T000 - Initialize project context and initial task board from the project brief.
- [x] T001 - Extract and audit `batch_file_renamer_v4.zip` to document legacy PowerShell behavior, screens, rules, and file operations.
- [x] T002 - Confirm the PWA stack, supported browsers, and local file access strategy before implementation.
- [x] T003 - Write the refactor plan for the rule engine, preview grid, execution flow, CSV import/export, and redesigned UI.
- [x] T004 - Scaffold the PWA project after plan approval.
- [x] T005 - Port the rename/copy rule engine with focused unit tests.
- [x] T006 - Build the responsive preview/edit UI with validation states.
- [x] T007 - Implement local file selection, copy/rename execution, and permission handling.
- [x] T008 - Add CSV import/export compatible with the legacy columns.
- [x] T009 - Add PWA manifest, service worker, and cache update behavior.
- [x] T010 - Run visual polish and usability checks against the original pain point that the app is currently ugly.
- [x] T011 - Add settings page with language, template, and theme switching.
- [x] T012 - Generate and integrate visual background assets for distinct templates/themes.
- [x] T013 - Expand automated tests for i18n, settings, templates, CSV, and rule behavior.
- [x] T014 - Add GitHub Pages deployment workflow and publish the PWA.
  - Deployed by `Deploy PWA to GitHub Pages` run `28207461653`.
  - Published URL verified: `https://yoyocadence.github.io/Batch-file-renamer/`.
  - Verified deployed homepage, `assets/app.js`, `assets/settings.js`, and generated background assets return `200 OK`.
- [x] T015 - Add optional pet companion system with five selectable moving companions.
- [x] T016 - Product audit: identify and document the missing essentials for a safer renaming workflow.
  - Missing element found: users need clear browser capability feedback before trusting local file execution.
  - Missing element found: users need a visible workflow path from choosing files to previewing, then executing only valid rows.
  - Missing element found: users need execution-risk counts before irreversible rename/copy operations.
  - Missing element found: users need a status legend so OK / blocked / error rows are understandable at a glance.
  - Missing element found: aesthetic switching should be persistent and test-covered, not just decorative CSS.
- [x] T017 - Implement the audit gaps directly in the PWA UI and automated tests.
  - Implemented workflow guidance, support detail text, execution safety summary, and status legend.
  - Implemented persistent language, visual template, theme, and pet settings.
  - Covered settings, translations, generated backgrounds, service worker cache entries, pet hooks, and audit UI hooks in automated tests.
- [x] T018 - Improve settings, mode, preview, and copy/rename UX based on screenshot review.
  - Settings now apply immediately without a confirmation button and close when clicking outside the drawer.
  - Default appearance is Anime Desk with Sakura Soft.
  - Preview generation moved into the Preview panel and uses the workflow label "Check preview".
  - Rename/copy mode controls now have explanatory tooltips, and switching mode or changing inputs resets stale preview rows.
  - Copy mode now has a clear action and output-location selection from the preview area.
- [x] T019 - Replace simple-only pets with generated animated mascot assets.
  - Added generated detailed mascot sprites for five pets, each with idle, hop, cheer, stretch, spin, and panic-held states.
  - Simple geometric pets remain available as a separate settings category.
  - Pet actions now trigger at random intervals with reasonable durations, and dragging switches to the panic-held sprite.
- [x] T020 - Refresh README for the current deployed PWA.
  - Removed starter-template instructions.
  - Added the deployed GitHub Pages URL, current features, browser notes, local run command, tests, and deployment notes.
- [x] T021 - Improve source loading, preview clarity, theme scale, and pet dialogue UX.
  - Renamed preview-only file selection to "Select files" and reset actions to avoid implying data deletion.
  - Added automatic filtering for common system and temporary files such as `desktop.ini` and `Thumbs.db`.
  - Changed preview source wording to current filename, with hover full-path titles and an optional full-path display toggle.
  - Expanded generated background templates and color themes to 20+ selectable styles.
  - Added comic-style pet thought bubbles with 15 non-question lines per pet.
- [x] T022 - Replace blurry atlas-derived backgrounds with high-detail single-image templates.
  - Regenerated every selectable background as a standalone 16:9 raster image instead of cropping from a 5x4 atlas.
  - Replaced all project-bound background JPGs, including the default Anime Desk and Material Studio templates.
  - Raised static test coverage so backgrounds must remain high-detail assets.
- [x] T023 - Prototype the grounded smart pet movement system.
  - Added the generated Portal File Mender pet with idle, walk, portal, bamboo-copter, rope, and panic-held poses.
  - Added a settings toggle between grounded movement and the legacy free-drift movement.
  - Implemented floor/panel-ledge walking with portal, copter, and rope transitions.
  - Rewrote pet dialogue lines to sound more natural and less like UI/tool explanations.
- [x] T024 - Rewrite README as switchable Traditional Chinese, English, and Japanese documentation.
  - Made `README.md` the Traditional Chinese landing document with language-switch links.
  - Added `README.en.md` and `README.ja.md` with matching structure.
  - Reworked copy to lead with user value, safety cues, and clear workflow before technical architecture.
  - Preserved technical details for PWA structure, File System Access API limits, tests, deployment, and legacy source.
- [x] T025 - Add an in-app PWA update flow so users can leave stale caches.
  - Changed the service worker to wait for an explicit `SKIP_WAITING` message before activating an update.
  - Added an update banner with localized copy and an Update now action.
  - Registered service worker update checks on app startup and hourly while the app is open.
  - Documented the cache update behavior in all README language versions.
- [x] T026 - Fix grounded pet direction, platform eligibility, and speech bubble anchoring.
  - Corrected Portal File Mender's visual facing because its generated walk sprite faces left by default.
  - Limited panel/ledge travel to Portal File Mender; other pets now stay on the floor in grounded mode.
  - Stopped mirroring the full pet container so the speech bubble remains close to the character when walking left.
  - Added static regression checks for smart-travel gating and bubble transform behavior.
- [x] T027 - Add Windows reserved-name and trailing dot/space validation to the rule engine.
  - Added `isReservedFilename`, `hasTrailingDotOrSpace`, and a `WINDOWS_RESERVED_NAMES` set to `pwa/assets/rules.js`, wired into `validateRows` as new "Reserved name" and "Trailing dot or space" blocked statuses.
  - Localized both statuses across all four languages (zh-TW, zh-CN, en, ja) in `pwa/assets/settings.js`; the shared status legend already buckets unknown statuses as blocked/warn, so no `app.js` change was needed.
  - Added rule-engine unit tests and a static i18n-completeness check (`npm run test`, 15 passing).
  - Added Playwright browser verification (`npm run test:e2e`) that runs the shipped module in Chromium and drives the preview UI to show the reserved-name status for a `CON.*` target; service workers are blocked in tests to avoid the first-load self-reload wiping form state.
- [x] T028 - Add an "undo last batch" action that rolls back the previous rename batch.
  - Added `planUndoOperations` (pure: reverses each rename and applies them newest-first) to `pwa/assets/rules.js`.
  - `executeRows` now records successful renames as `{ from, to, directoryHandle }` in `state.lastBatch`; a new "Undo last batch" button (hidden until a rename batch runs) reverses them behind a confirm dialog. Copy-only batches clear any prior undo.
  - Localized the button label and undo status messages across all four languages.
  - Added a `planUndoOperations` unit test and static wiring checks, plus a Playwright test that injects a fake File System Access API and verifies a real execute -> undo round trip restores the original filenames.
- [x] T029 - Add a find-and-replace rule mode (literal + regex) to the rule engine.
  - Added a "Replace" target with an internal `applyReplace` helper to `pwa/assets/rules.js`: literal matches are regex-escaped, regex mode is opt-in, replacement is always global and cleaned of invalid filename characters, and invalid patterns / empty find surface as row errors.
  - Added Find / Replace with / Use regex / Ignore case fields to the rule builder, wired through `updateRuleControls`, `readRuleForm`, `describeRule`, and the live sample, localized across all four languages.
  - Added rule-engine unit tests (literal, global, escaping, regex + capture group + case-insensitive, cleaned replacement, error cases), static wiring checks, and Playwright tests for literal and regex replacement in the preview.
- [x] T030 - Add a case-transform rule mode (UPPERCASE / lowercase / Title Case).
  - Added a "Case" target with an internal `applyCaseTransform` helper to `pwa/assets/rules.js`; Title Case treats spaces, "-", "_", and "." as word boundaries and preserves the file extension.
  - Added a case-mode selector to the rule builder, wired through `updateRuleControls`, `readRuleForm`, `describeRule`, and the live sample, localized across all four languages.
  - Added rule-engine unit tests (upper / lower / title / default / error) plus static wiring checks and Playwright tests for Title Case and UPPERCASE in the preview.
- [x] T031 - Support date/time tokens (e.g. {yyyy-MM-dd}) inside Static rule values.
  - Added `expandDateTokens` to `pwa/assets/rules.js` (yyyy / yy / MM / dd / HH / mm / ss) and threaded a single `now` timestamp through `ruleValue`, `applyRulesToName`, and `buildPreviewRows` so every row in a batch shares one time; only `{...}` groups containing a recognized token are expanded.
  - Added a localized token hint under the Static value field (`.field-hint`).
  - Added unit tests (token formatting, batch threading, invalid-char cleaning), static wiring checks, and a Playwright test with a fixed clock; pinned Playwright to a single worker so the bundled static server is not starved under parallel load.
- [x] T032 - Allow individual rules to be enabled/disabled and reordered instead of remove-only.
  - Added an enable/disable checkbox, up/down reorder buttons, and HTML5 drag-and-drop to each rule row; disabled rules are excluded from the preview (`rule.enabled !== false`) and reordering changes the application order.
  - Fixed a real layout bug found while testing: the rule row used flex `space-between`, which let the action buttons overflow the `overflow: clip` panel and become unclickable; switched the row to a deterministic CSS grid.
  - Localized the new controls and status messages across all four languages.
  - Added static wiring checks and Playwright tests for reordering and disabling (verified via preview output), plus a shared e2e fixture that disables the floating pet so it cannot intercept clicks.
- [x] T033 - Add a post-execution report / log CSV export capturing per-row success and failure.
  - `executeRows` now records a per-row report ({action, source, target, result, message, timestamp}) into `state.lastExecutionReport`.
  - Added an "Export log" button (hidden until a batch runs) that downloads the report via a new pure `executionLogToCsv` helper in `pwa/assets/rules.js`.
  - Localized the button and status messages across all four languages.
  - Added an `executionLogToCsv` unit test, static wiring checks, and a Playwright test that runs a batch against the shared fake File System Access API and verifies the downloaded CSV; extracted the fake FS into a shared e2e helper reused by the undo spec.
- [x] T034 - Support drag-and-drop of files onto the app to add source files.
  - Extracted a shared `addSourceFiles` path and added dragover / dragleave / drop handlers on the source panel; dropped files become preview-only sources (same as "Select files").
  - Added a localized drop hint and an `is-dragover` highlight.
  - Added static wiring checks and a Playwright test that dispatches a DataTransfer drop and verifies the dropped files become usable sources (preview row produced).
