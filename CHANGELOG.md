# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Windows-safety validation in the rename/copy preview (T027): target names that
  are Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`,
  `LPT1`–`LPT9`) or that end in a dot or space are now flagged as blocked rows
  ("Reserved name" / "Trailing dot or space") and excluded from execution.
  Localized in Traditional Chinese, Simplified Chinese, English, and Japanese.
- Undo last batch (T028): after a rename batch, an "Undo last batch" button reverses
  the renames and restores the original filenames behind a confirmation prompt.
  Available in all four languages; copy-only batches do not create an undo entry.
- Find-and-replace rule mode (T029): a new "Replace" rule target supports literal or
  regex find/replace (with capture groups and an ignore-case option) across the base
  filename; replacements are cleaned to stay filesystem-safe. Localized in all four languages.
- Case-transform rule mode (T030): a new "Case" rule target converts the base filename
  to UPPERCASE, lowercase, or Title Case (spaces, "-", "_", "." treated as word
  boundaries), preserving the extension. Localized in all four languages.
- Date/time tokens in Static values (T031): a Static rule value can include tokens like
  {yyyy-MM-dd} or {HH-mm-ss} (yyyy/yy/MM/dd/HH/mm/ss), expanded once per batch so every
  row shares the same timestamp. A localized hint documents the tokens. Localized in all four languages.
- Rule enable/disable and reordering (T032): each rule row now has an enable/disable
  toggle plus up/down buttons and drag-and-drop reordering; disabled rules are skipped
  and rule order affects how rules apply. Localized in all four languages.
- Execution log export (T033): after running a rename/copy batch, an "Export log" button
  downloads a per-row CSV report (action, source, target, result, error message,
  timestamp). Localized in all four languages.
- Drag-and-drop file loading (T034): drop files from the OS onto the source area to add
  them as sources, with a drop-here hint and a highlight while dragging. Localized in all
  four languages.

### Fixed
- Rule-list rows could let their action buttons overflow the clipped rules panel,
  making them unclickable; the row now uses a stable grid layout.
- Playwright browser verification (`npm run test:e2e`) covering the app shell load,
  the reserved-name preview flow, and a full execute -> undo round trip in Chromium.
