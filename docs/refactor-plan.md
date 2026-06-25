# Refactor Plan

## Stack Decision

Build a dependency-free static PWA with HTML, CSS, and JavaScript modules.

Reasons:

- The current project has no package setup and network access may be unavailable.
- The app is a focused local utility, so a framework is optional overhead.
- A static PWA is easy to open, serve locally, inspect, and later migrate to TypeScript or a framework if needed.

## Architecture

- `pwa/index.html`: app shell and controls.
- `pwa/assets/style.css`: responsive utility UI styling.
- `pwa/assets/rules.js`: pure rule engine, CSV helpers, and validation.
- `pwa/assets/app.js`: browser state, DOM rendering, file picker integration, and execution flow.
- `pwa/service-worker.js`: offline app-shell cache.
- `tests/rules.test.mjs`: focused Node tests for the rule engine.

## File Access Strategy

- Prefer `showOpenFilePicker`, `showSaveFilePicker`, and `showDirectoryPicker` when available.
- Keep source file handles separately from display paths because browsers do not expose full local paths.
- For unsupported browsers, keep preview, CSV import/export, and generated copy downloads available where safe.
- Require an explicit confirmation before executing local file changes.

## Implementation Order

1. Scaffold the PWA shell and manifest.
2. Port and test the rule engine.
3. Build file selection, rules, preview grid, manual editing, validation, and CSV import/export.
4. Add execution for supported File System Access API workflows.
5. Verify with unit tests and a local browser smoke check.

## Initial Success Criteria

- The app loads as a PWA-style single page tool.
- Users can add source files, create segment/character rules, preview names, edit rows, and export/import CSV.
- Unit tests cover static, list, sequence, delete, duplicate-target, and invalid-name behavior.
- Direct execution is guarded and only runs `OK` rows.
