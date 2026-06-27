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

- **Preview first**: every target filename appears in the table and can be edited manually.
- **Execute OK only**: warnings, errors, duplicates, and no-change rows are separated from executable rows.
- **Clear modes**: Rename changes filenames in place. Copy duplicates the template into the output folder and renames each copy.
- **Inspectable paths**: rows show the current filename by default; hover to see the full path or enable full-path display.
- **System-file filtering**: common system and temporary files such as `desktop.ini` and `Thumbs.db` are skipped while loading sources.

## Features

- Local folder rename through Chromium's File System Access API.
- Template-copy mode with template file, output folder, and output count.
- Rule builder for segments, character ranges, static values, lists, ascending and descending sequences, and deletion.
- Preview table with row status, editable target names, output-location tools, and OK-only execution.
- CSV import/export for manual review or spreadsheet workflows.
- Interface languages: Traditional Chinese, Simplified Chinese, English, and Japanese.
- 20+ high-detail generated background templates and 20+ color themes.
- Pet companion system with detailed mascots, simple geometric variants, comic-style thought bubbles, drag reactions, and grounded movement.

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
- `pwa/assets/app.js`: app state, file selection, preview flow, execution flow, settings, and pet behavior.
- `pwa/assets/rules.js`: filename rule engine, CSV conversion, and preview-row validation.
- `pwa/assets/settings.js`: languages, templates, themes, pets, settings normalization, and translation dictionaries.
- `pwa/assets/style.css`: responsive layout, theme variables, background templates, and pet animations.
- `pwa/service-worker.js`: runtime cache for the PWA; cache version is bumped when assets change, and the app prompts users to switch to the new version.
- `tests/*.test.mjs`: Node test runner coverage for rules, i18n, static assets, service worker cache, and UI hooks.

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
npm run test
npm run build
```

Current tests cover:

- Rule engine and preview-row validation.
- Translation-key parity across four languages.
- 20+ background templates and 20+ themes.
- High-detail background asset thresholds.
- Pet assets, grounded movement hooks, and service worker cache entries.
- Unresolved merge marker checks for text files.

## Deployment

GitHub Pages is deployed by `.github/workflows/pages.yml` on pushes to `main`.

The PWA checks for a newer service worker in the background. When an update is ready, a bottom banner appears; choosing **Update now** activates the latest cache and reloads the page.

Live URL:

https://yoyocadence.github.io/Batch-file-renamer/

## Legacy Source

The original PowerShell package is preserved under `legacy/batch_file_renamer_v4/`, and the behavior audit is in `docs/legacy-audit.md`.
