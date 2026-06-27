# Batch File Renamer PWA

**繁體中文** | [English](README.en.md) | [日本語](README.ja.md)

一個先預覽、再執行的批次檔名工具。  
它把舊版 PowerShell 工具重構成靜態 PWA，保留本機檔案操作能力，同時把風險最高的「直接改檔名」變成可檢查、可理解、可回頭確認的流程。

## 立即使用

Live App: https://yoyocadence.github.io/Batch-file-renamer/

適合這些情境：

- 一次整理大量照片、PDF、掃描檔、輸出報表。
- 依照段落、字元範圍、固定文字、序號或清單重組檔名。
- 先看每一列預覽，再只執行狀態為 OK 的列。
- 複製同一個模板檔案到指定資料夾，並自動產生不同檔名。

## 為什麼用起來比較安心

批次改名最可怕的不是功能不夠，而是按下去之前不知道會發生什麼。這個工具把主要決策放在畫面上：

- **先預覽**：所有目標檔名都在表格中顯示，目標檔名可手動調整。
- **只執行 OK**：警告、錯誤、重複、無變更等列不會被混在同一個按鈕裡偷偷執行。
- **明確模式**：重新命名是在原地改名；複製是把模板檔案複製到輸出資料夾後改名。
- **路徑可查**：預設只顯示目前檔名，滑鼠移上去可看完整路徑，也能切換完整路徑顯示。
- **系統檔過濾**：載入來源時會略過 `desktop.ini`、`Thumbs.db` 等常見系統或暫存檔。

## 核心功能

- 本機資料夾重新命名，支援 Chromium 的 File System Access API。
- 模板複製模式，可選擇模板檔案、輸出資料夾與輸出數量。
- 規則建構器：段落、字元範圍、固定值、清單、遞增、遞減、刪除。
- 預覽表格：狀態檢查、手動編輯目標檔名、套用輸出位置、只執行 OK 列。
- CSV 匯入與匯出，方便人工修表或交叉檢查。
- 介面語言：繁體中文、簡體中文、英文、日文。
- 20+ 高清背景模板與 20+ 主題色，可在設定中即時切換。
- 寵物助手：精緻角色、簡單幾何角色、漫畫泡泡、拖曳反應、合理移動模式。

## 寵物系統

目前包含新的 **任意門文件修補師**。它不是單純亂飄，而是用更合理的方式移動：

- 平常在地面或區塊上緣行走。
- 需要換區域時，會使用任意門、竹蜻蜓或繩索作為過場。
- 被拖曳時會切換到慌張表情。
- 對話改成短句陪伴式語氣，避免突然問使用者不能回答的問題。

仍可在設定中切回舊的自由飄移模式。

## 技術架構

這是一個不需要後端的靜態 PWA：

- `pwa/index.html`：主要 UI 結構。
- `pwa/assets/app.js`：應用狀態、檔案選取、預覽流程、執行流程、設定與寵物行為。
- `pwa/assets/rules.js`：檔名規則引擎、CSV 轉換、預覽列驗證。
- `pwa/assets/settings.js`：語系、模板、主題、寵物設定與翻譯字典。
- `pwa/assets/style.css`：響應式版面、主題變數、背景模板、寵物動畫。
- `pwa/service-worker.js`：PWA runtime cache，部署新素材時會 bump cache 版本。
- `tests/*.test.mjs`：Node test runner 測試規則、i18n、靜態資產、service worker cache 與 UI hook。

檔案操作策略：

- 直接重新命名與複製依賴 File System Access API，因此以 Chromium 系瀏覽器體驗最佳。
- 不支援該 API 的瀏覽器仍可使用規則、預覽、CSV 匯入與匯出。
- 瀏覽器的資料夾選擇器是權限視窗，可能只顯示資料夾而不列出內部檔案；要挑特定檔案時請使用「選取檔案」。

## 本機執行

```powershell
py -m http.server 4173 --directory pwa
```

開啟：

```text
http://127.0.0.1:4173/index.html
```

## 驗證

```powershell
npm run test
npm run build
```

目前測試涵蓋：

- 規則引擎與預覽列驗證。
- 四語翻譯鍵一致性。
- 20+ 背景模板與 20+ 主題設定。
- 高清背景素材大小門檻。
- 寵物素材、合理移動 hook、service worker cache。
- 文字檔無 unresolved merge marker。

## 部署

GitHub Pages 由 `.github/workflows/pages.yml` 在推送到 `main` 時部署。

部署網址：

https://yoyocadence.github.io/Batch-file-renamer/

## 舊版來源

原始 PowerShell 壓縮檔保留在 `legacy/batch_file_renamer_v4/`，行為盤點記錄在 `docs/legacy-audit.md`。
