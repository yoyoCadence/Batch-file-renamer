# Legacy Audit

Source: `legacy/batch_file_renamer_v4/BatchFileRenamer_v4.ps1`

## Product Purpose

Batch File Renamer v4 is a preview-first local file utility. It lets users either:

- rename a selected set of source files in place
- copy one template file into many output files

The user builds filename rules, generates a preview grid, edits target names/folders, validates each row, then executes only rows with `OK` status.

## Preserved Workflows

- Rename mode: select multiple source files, build rules from existing names, preview target names, edit target names, execute valid renames.
- Copy mode: select one template file, choose an output folder and count, build output names, preview target rows, execute valid copies.
- Rule preview is non-destructive. Warnings keep the existing preview instead of clearing it.
- The preview table is the source of truth before execution.
- CSV import/export allows external review and manual editing.

## Rule Model

Each rule targets either a filename segment or a character range. Rules operate on the basename and preserve the original extension.

- Segment target:
  - Split basename by a delimiter.
  - Choose segment number from start or end.
  - Replace the selected segment, or delete it entirely.
- Character target:
  - Use 1-based start position and character length.
  - Replace that range, insert when length is `0`, or delete the range.
- Value modes:
  - `Static`: preserve spaces exactly.
  - `List`: one value per preview row.
  - `SeqUp`: start + step per row, optional zero padding.
  - `SeqDown`: start - step per row, optional zero padding.
  - `Delete`: remove the selected segment/range.
- Invalid filename characters are replaced with `_` in generated values.

## Validation Rules

Rows are marked `OK` only when:

- target folder is present
- target filename is present
- target filename has no invalid filename characters
- rename source exists
- rename target differs from source path
- target path does not already exist
- no other preview row has the same target path

Only `OK` rows execute. Warnings and errors are skipped.

## CSV Compatibility

Legacy README documents these columns:

```text
Action, SourcePath, TargetName, TargetFolder, TargetPath
```

The PowerShell export also includes `SourceName` and `Status`. The PWA should import the documented columns and tolerate the extra legacy columns.

## PWA Constraints

Browser-based rename/copy needs local file permissions. The best first target is Chromium's File System Access API for writable local folders. Browsers without this API should still support rule building, preview, CSV import/export, and downloading generated copies when possible, but direct in-place rename will be limited.
