# Batch File Renamer PWA

[繁體中文](README.md) | **English** | [日本語](README.ja.md)

A preview-first batch renaming tool for local files.  
It rebuilds the legacy PowerShell utility as a static PWA, keeping local file workflows while making the riskiest step, changing many filenames at once, visible and reviewable before execution.

## Try It

Live App: https://yoyocadence.github.io/Batch-file-renamer/

Use it when you need to:

- Clean up photos, PDFs, scans, reports, or exported files in bulk.
- Rename by segment, character range, fixed value, sequence, deletion, or a per-row list.
- Preview every result before touching the real files.
- Copy one template file into an output folder and generate many renamed copies.

## Why It Feels Safer

Batch rename tools fail users when they hide the consequence of a click. This app keeps the important decisions in view:

- **Says up front whether it can rename**: as soon as files load, it states "ready to rename" or "preview only", instead of letting you build rules and only then discover nothing can run.
- **Shows what changed**: the preview marks the replaced and inserted spans inline, so you are not comparing two columns of text by eye.
- **Updates as you work**: the preview follows your rule edits, and each rule card shows its own before → after.
- **Execute OK only**: warnings, errors, duplicates, and no-change rows are separated from executable rows.
- **Explains blocked rows**: every blocked row gives a plain-language reason, and the mechanically fixable ones offer a one-click repair.
- **Clear modes**: Rename changes filenames in place. Copy duplicates the template into the output folder and renames each copy.
- **System-file filtering**: common system and temporary files such as `desktop.ini` and `Thumbs.db` are skipped while loading sources.

## Features

**Choose which files to process**

- Local folder rename through Chromium's File System Access API.
- Processing scope filter: extension chips with match counts, plus name contains/excludes, summarized as one plain-language line.
- Filtered-out files stay listed but dimmed, so they read as set aside rather than gone.

**Decide how names change**

- Beginner rules: add prefix/suffix, change extension, and clean up (tidy whitespace, spaces to underscores, remove special characters, collapse repeated separators).
- Advanced rules: segments, character ranges, find and replace (with optional regex), and case transforms.
- Value modes: static values (with `{yyyy-MM-dd}`-style date tokens), lists, ascending/descending sequences, and deletion.
- Rules can be enabled/disabled individually and reordered by drag; each card shows its own before → after.
- Rule sets can be saved under a name, reloaded, and deleted; the last-used rules are remembered.

**Confirm, then execute**

- Preview table with an inline diff, clickable status-count chips that filter the rows, a search box, and editable target names.
- One-click repairs: auto-number, replace invalid characters, escape Windows reserved names, trim trailing dots/spaces.
- Batch exclusion: check rows to leave them out of the run.
- Undo the last rename batch, and export a per-row execution log CSV.
- CSV import/export for manual review or spreadsheet workflows.

**Appearance**

- Interface languages: Traditional Chinese, Simplified Chinese, English, and Japanese.
- 20+ high-detail generated background templates and 20+ color themes.
- Pet companion system with detailed mascots, simple geometric variants, comic-style thought bubbles, drag reactions, and grounded movement.

## Workflow

1. **Pick sources**: only "Pick source folder" grants write access; "Select files" and drag-and-drop are preview-only.
2. **Narrow the scope**: use extension and name filters to keep files you should not touch out of the batch.
3. **Build rules**: they apply top to bottom, and each card shows its effect immediately.
4. **Check the preview**: it updates automatically; "Recheck (with disk)" additionally flags names that already exist in the target folder.
5. **Execute OK rows only**: everything else is left alone.

## Pet System

The current smart-movement prototype is **Portal File Mender**. It does not simply float around the screen:

- It walks on the floor or along panel ledges.
- It uses portal, bamboo-copter, or rope transitions when moving to another area.
- It switches to a flustered held pose while being dragged.
- Dialogue is written as short companion-style lines, not awkward one-way questions.

The older free-drift movement is still available in Settings.

## Technical Details

This is a backend-free static PWA:

- `pwa/index.html`: main UI structure.
- `pwa/assets/app.js`: app state, file selection, processing scope, live preview, execution flow, settings, and pet behavior.
- `pwa/assets/rules.js`: filename rule engine, scope filtering, name diffing, row repairs, CSV conversion, and preview-row validation. Pure logic with no dependency on the interface language.
- `pwa/assets/settings.js`: languages, templates, themes, pets, rule-preset and last-session storage, and translation dictionaries.
- `pwa/assets/style.css`: responsive layout, theme variables, background templates, and pet animations.
- `pwa/service-worker.js`: runtime cache for the PWA. It is cache-first, so **any change touching a cached file must bump `CACHE_NAME`** or returning users will never receive it; once an update is detected the app prompts users to switch.
- `tests/*.test.mjs`: Node test runner coverage for the rule engine, i18n, storage, static assets, and UI wiring.
- `tests/e2e/*.spec.mjs`: Playwright driving the shipped files in Chromium.

Data retention:

- No backend or database. Source files, folder permissions, and preview rows live in memory only and are lost on reload (file handles cannot be persisted).
- `localStorage` holds exactly three things: appearance settings, named rule presets, and the last-used rules / value list / mode.
- The scope filter and excluded rows are deliberately not persisted, so they cannot silently change what runs against a different folder.

File operation strategy:

- Direct rename/copy execution depends on the File System Access API, so Chromium-based browsers provide the best experience.
- Browsers without that API can still build rules, preview, import CSV, and export CSV.
- The browser folder picker is a permission dialog and may show folders rather than file contents. Use **Select files** when you want to choose individual files for preview-only workflows.

## Run Locally

```powershell
py -m http.server 4173 --directory pwa
```

Open:

```text
http://127.0.0.1:4173/index.html
```

## Verification

```powershell
npm run test       # unit and static checks
npm run test:e2e   # Playwright browser verification
```

Current tests cover:

- Rule engine, scope filtering, name diffing, row repairs, and preview-row validation.
- Rule normalization: corrupt or older data read back from storage cannot break the app.
- Settings, rule preset, and session storage round trips (including corrupt data and rejected writes).
- Translation-key parity across four languages.
- 20+ background templates and 20+ themes, plus high-detail background asset thresholds.
- Pet assets, grounded movement hooks, and the service worker cache version.
- Unresolved merge marker checks for text files.
- Playwright: full workflows covering live preview, scope filtering, diff and one-click repairs, rule presets, batch exclusion, execution, and undo.

## Deployment

GitHub Pages is deployed by `.github/workflows/pages.yml` on pushes to `main`.

The PWA checks for a newer service worker in the background. When an update is ready, a bottom banner appears; choosing **Update now** activates the latest cache and reloads the page.

Live URL:

https://yoyocadence.github.io/Batch-file-renamer/

## Legacy Source

The original PowerShell package is preserved under `legacy/batch_file_renamer_v4/`, and the behavior audit is in `docs/legacy-audit.md`.
