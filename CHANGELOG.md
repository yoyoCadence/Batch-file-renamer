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

- Preview row search and batch exclusion (T036): a search box narrows the preview to rows
  whose current or target name matches, combining with the status-chip filter from T041.
  Because searching only changes the view, the summary says so explicitly while a filter is
  active, so nobody can search, see three rows, and assume only those three will run.
  Separately, checked rows can be explicitly excluded from the batch (and put back); an
  excluded row shows as "Excluded" with its reason, is struck through, and is skipped by
  execute. Exclusions are keyed to stable row ids, so they survive rule edits, and are
  cleared when a different source set is loaded. Localized in all four languages.
- Named rule presets and remembered rules (T035): the rule stack, value list, and mode are
  saved to localStorage and restored on the next visit, so reopening the app no longer
  starts from an empty builder. Rule sets can also be saved under a name, reloaded, and
  deleted; saving under an existing name overwrites it. Stored rules are normalized on load,
  so a preset written by an older version (or corrupt storage) degrades to the rules that
  are still valid instead of breaking the app. Source files and the scope filter are
  deliberately not persisted. Localized in all four languages.
- Beginner rule presets (T042): three new rule targets that do not require working out
  segment or character offsets. "Add prefix/suffix" puts fixed text (with date-token
  support) at the start or end of the name; "Change extension" replaces the extension,
  which the engine previously could not express at all because `applyRulesToName` always
  preserved it; "Clean up" offers tidy whitespace, spaces to underscores, remove special
  characters, and collapse repeated `-`/`_`. Removing special characters keeps letters and
  digits in any script, so CJK filenames survive. Localized in all four languages.
- Preview diff, status filtering, and one-click row repairs (T041): the preview's name
  column now renders an inline diff (replaced span struck through, new span highlighted)
  instead of forcing a character-by-character comparison of two plain columns. The status
  legend became clickable chips that show per-bucket counts and narrow the table to one
  bucket. Every blocked row states its reason in plain language, and the mechanically
  fixable ones (duplicate target, target exists, invalid characters, reserved Windows name,
  trailing dot/space) offer a one-click repair. Localized in all four languages.
- Live preview and per-rule before/after (T040): the preview table now updates on its own
  (200ms debounce) whenever rules, scope, sources, or the value list change, so editing a
  rule shows its effect without pressing a button. Each rule card shows its own
  `before -> after` for the first in-scope file, chained through the preceding rules, so a
  rule stack can be read one contribution at a time; disabled rules say so and broken rules
  show a localized reason. The preview button keeps the filesystem collision check that the
  live pass deliberately skips, and is relabelled "Recheck (with disk)" with a tooltip
  explaining the split. Engine guard messages ("no rules yet", "value list does not match
  the file count", …) now carry a code and are localized instead of surfacing raw English.
  Localized in all four languages.
- Processing scope filter (T039): the source panel now has a scope strip that controls
  which of the loaded files a batch touches, separately from the rules that decide how
  each name changes. Extension chips (each showing its match count) toggle file types in
  and out, and "name contains" / "name excludes" narrow further. A plain-language line
  states the result ("Processing 2 of 8 file(s). Conditions: extensions .jpg only; name
  contains \"2024\"."). Filtered-out files stay listed but dimmed instead of disappearing.
  Preview rows and the live sample come from the scoped set, so an out-of-scope file can
  never be executed. Loading a new source set clears any previous filter. Localized in all
  four languages.
- Source capability strip (T038): the file setup panel now states up front whether the
  loaded sources can actually be written to disk ("Ready to rename" / "Preview only,
  cannot rename" / nothing loaded yet), covering both rename and copy mode. "Execute OK
  rows" is disabled unless a real directory handle exists, with the reason on hover, and
  the drag-and-drop hint says the preview-only limit before files are dropped. Browsers
  without the File System Access API get an accurate message instead of advice they
  cannot act on. Localized in all four languages.

### Fixed
- Untranslated interface text (T037): rule cards showed the internal target enum
  ("Replace", "Segment") instead of the localized label; rule-engine and execution
  failures showed raw English messages ("Segment 2 out of range. Parts=1") in the
  status column; and the placeholder folder labels "Browser files" / "Source folder" /
  "Imported" were hardcoded English. Errors now carry a translatable code plus
  parameters, and their wording explains how to fix the row. The English message is
  retained in CSV exports and execution logs so those stay language-independent.
- Rule-list rows could let their action buttons overflow the clipped rules panel,
  making them unclickable; the row now uses a stable grid layout.
- Playwright browser verification (`npm run test:e2e`) covering the app shell load,
  the reserved-name preview flow, and a full execute -> undo round trip in Chromium.
