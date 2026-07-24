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
- Playwright browser verification (`npm run test:e2e`) covering the app shell load
  and the reserved-name preview flow in Chromium.
