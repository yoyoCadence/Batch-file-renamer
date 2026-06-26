# Batch File Renamer PWA

Preview-first batch rename and template-copy tool rebuilt from the legacy PowerShell utility as a static PWA.

## Live App

https://yoyocadence.github.io/Batch-file-renamer/

## Features

- Rename files in place from a selected source folder.
- Copy one template file into a selected output folder and rename each copy by rule.
- Build filename rules by segment or character range.
- Preview every target filename before execution.
- Edit preview rows manually, import/export CSV, and execute only OK rows.
- Switch language between Traditional Chinese, Simplified Chinese, English, and Japanese.
- Switch visual templates and themes instantly from Settings.
- Optional animated pet companion system with generated detailed mascots and simple geometric variants.

## Browser Notes

Direct rename/copy execution uses the File System Access API, so it works best in Chromium-based browsers. Other browsers can still use preview, rule building, CSV import, and CSV export.

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

## Deployment

GitHub Pages is deployed by `.github/workflows/pages.yml` on pushes to `main`.

## Legacy Source

The original PowerShell package is preserved under `legacy/batch_file_renamer_v4/`, and the behavior audit is in `docs/legacy-audit.md`.
