# Tasks

Use this file as the lightweight task board for this project unless the project explicitly uses GitHub Issues, Linear, Notion, or another tracker.

## Next

## In Progress

## Backlog

## Done

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
