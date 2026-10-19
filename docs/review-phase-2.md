# Review Plan V1.0.0：Phase 2

基準：PR #20 的 `fe12d31`；本次範圍為 RV-10～13（T048～T051）。Phase 3、4 保留在待辦。本階段不改變 strict preview、受控資料夾寫入與記憶體內復原記錄的界線，詳見 [Phase 0/1](review-phase-0-1.md)。

## 規則與狀態

- `rules.js` 以各類型 schema 正規化規則；切換類型後不保留無關欄位，例如 Affix 不會受隱藏 List 模式影響。舊 preset 的大寫欄位名稱仍可讀取。
- 卡片、草稿與完整預覽共用 `traceRulesToName`，同一輪共用時間戳。引擎只拆解一次副檔名，讓 `tar.gz` 等新副檔名不會在下一步被當作檔名主體。停用步驟不改結果，失敗後標記後續步驟為阻擋。
- 保留名稱修正在第一個點之前加底線，例如 `CON.tar.gz` → `CON_.tar.gz`。純文字取代將 `$&`、`$$`、`$1` 視為字面值；正規表達式模式保留 JavaScript capture replacement 語意。
- `status.js` 提供穩定的狀態代碼，摘要、篩選、修正與執行判斷使用代碼。舊英文 status 欄位仍保留供記錄／CSV 相容使用，介面由代碼翻譯。
- `storage.js` 包住 localStorage getter、讀寫及 quota 錯誤；儲存不可用時設定仍在記憶體套用，介面持續顯示本次工作不會被記住的提示。格式損毀的 JSON 使用預設值。

## CSV 契約與綁定

原始計畫 CSV schema 2 欄位為 `SchemaVersion,Format,Action,SourceName,SourcePath,TargetName,TargetFolder,TargetPath,Status`，Format 為 `raw-plan`。原始輸出保留字元，不會為了試算表而更動檔名；試算表檢視另用 `spreadsheet-view`，為可能的公式前綴加單引號，並禁止重新匯入，避免將顯示保護當作實際名稱。

舊版無版本 CSV 仍可讀取。匯入只建立待綁定列，不採信 Status，也不授權寫入。非標準表頭可明確指定欄位；改變欄位對應會撤銷先前綁定。接著選擇來源／範本與真正的輸出資料夾，明確綁定並重新驗證，才能進入既有的執行流程。畫面列出來源、目錄、已綁定／總列數、未使用來源及逐筆錯誤。

欄位數、操作、名稱／路徑不一致的列會獨立阻擋；相同操作或同一來源被 Rename 多次時，相關列全部阻擋。相同範本 Copy 到不同目標仍允許。來源比對沿用真實 handle 與精確顯示路徑，輸出目錄不能靠 CSV 字串取得授權。

解析上限為 5 MiB、10,000 筆資料、32 欄。支援 BOM、逗號、跳脫引號、欄內 CRLF、中文與 emoji。未閉合／不合法引號、重複表頭、不支援的版本與試算表檢視格式拒絕整份匯入。原始計畫的公式開頭字元可精確往返；若要在試算表開啟請使用專用檢視輸出。

## 只改大小寫的支援決策

只改大小寫現在顯示明確的「尚不支援」狀態，不再顯示 No change。Windows 暫存目錄測試確認此工作機的檔案系統不區分大小寫，並驗證此類計畫完全不進入寫入步驟。這是 Node adapter 試驗，沒有證明原生瀏覽器 picker、sharing／lock-file 或兩階段大小寫變更的安全性，因此本版維持阻擋，不啟用 case-only rename。

## 驗證與剩餘工作

- 本機 89 項 Node 測試與 85 項 Chromium 測試通過。欄位對應撤銷綁定等最後調整另重跑 Phase 2 的 7 項瀏覽器測試通過；PR CI 重新執行完整兩套。
- 新測試覆蓋所有規則 schema、兩兩 trace 組合、保留名、多種 replacement、CSV 特殊字元／錯誤／重複來源、拒絕儲存與狀態代碼；瀏覽器驗證下載往返、欄位對應、失敗列隔離、重新綁定與 case-only 不寫入。
- 檢視 1280／1024／768／390／360 寬度與四語系的 CSV 流程，未出現頁面溢位、未翻譯鍵或 console/page errors。桌面與手機截圖存於工作機暫存目錄，未加入產品素材。
- shell cache 升到 v9，加入新模組。完整 SW 離線／更新矩陣仍是 RV-18；病態 regex 的 Worker deadline 與大批次效能仍是 RV-19；版面與完整無障礙檢查留待 Phase 3。

本次 PR 合併後依使用者指示停止，不自動開始後續階段。
