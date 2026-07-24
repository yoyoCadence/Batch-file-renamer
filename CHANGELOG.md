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
- Playwright browser verification (`npm run test:e2e`) covering the app shell load,
  the reserved-name preview flow, and a full execute -> undo round trip in Chromium.
