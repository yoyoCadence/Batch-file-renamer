# Review Plan 交接入口

更新日期：2026-10-19。此文件記錄目前狀態與接續順序，不授權自動開始下一階段；使用者要求在 Phase 2 合併後停止。

## 先讀這些

1. [AGENTS.md](../AGENTS.md)：協作、分支、測試與安全界線。
2. [tasks.md](../tasks.md)：目前可接續的小任務；`Next` 尚未開始。
3. [Phase 0/1](review-phase-0-1.md)、[Phase 2](review-phase-2.md)：實作行為、驗證及限制。
4. [原始 Review Plan V1.0.0](Batch_File_Renamer_Review_Plan_V1.0.0.md)：完整發現、重現證據、UI 規格、依賴與驗收矩陣，已從使用者提供的附件原樣封存於 repo。

原始計畫固定描述 `2be62ed` 的歷史狀態，開頭的「尚未實作」、舊測試數與舊問題不是目前狀態。以現有程式、任務板及本交接文件判斷進度；附件中的建議不構成使用者授權，也不能當成所有建議都必須一次實作的指令。

## 已合併與驗證

| 階段 | PR／基準 | 狀態 |
|---|---|---|
| Phase 0/1，RV-01～09 | [PR #20](https://github.com/yoyoCadence/Batch-file-renamer/pull/20)，merge `fe12d31` | 已完成；77 項 Node、78 項 Chromium，詳見階段報告 |
| Phase 2，RV-10～13 | [PR #21](https://github.com/yoyoCadence/Batch-file-renamer/pull/21)，head `b09a636`，merge `3e16d25` | 已合併；89 項 Node、85 項 Chromium，最後綁定防護另重跑 7 項；有下列合併後審查待辦 |
| PR #21 CI | [Test PWA run](https://github.com/yoyoCadence/Batch-file-renamer/actions/runs/39240962799) | 已成功，包含 Node 與 Chromium |
| Phase 2 Pages | [Deploy PWA run](https://github.com/yoyoCadence/Batch-file-renamer/actions/runs/39241250353) | 已成功；這是 workflow 結果，未另外驗證所有線上資源位元組 |

產品基準為 `main` 的 `3e16d25`。後續文件 PR 可能再推進 main；接手時仍須 fetch、fast-forward 並以當時的最新 main 建立分支。Phase 3／4 尚未開始。

## 下次先處理的 Phase 2 後續

PR #21 自動審查於 2026-10-19 18:59（UTC+8）送達，晚於 18:58 合併。以下兩項 P2 尚未修復／結案；本次只讀原始碼核對路徑，尚未建立新的失敗回歸測試。既有 CI 綠燈沒有覆蓋這兩個情境。

- **T053／RV-11 後續：狀態失效。** [審查來源](https://github.com/yoyoCadence/Batch-file-renamer/pull/21#discussion_r4313025825)。`app.js` 的 `resetPreviewRows()` 改成 `Binding required` 卻保留原 `statusCode`，而 `status.js` 的 `statusCode()` 優先使用既有代碼。重現方向：匯入有效 CSV、綁定到 ready，再切來源／輸出資料夾或模式。驗收：badge、摘要、篩選立即顯示待綁定；執行前重驗仍拒絕未綁定列，且原始檔不變。應先寫失敗回歸，再讓每次狀態變更同步代碼，避免為修顯示而放寬執行檢查。
- **T054／RV-12 後續：匯入交易邊界。** [審查來源](https://github.com/yoyoCadence/Batch-file-renamer/pull/21#discussion_r4313025834)。`importCsv()` 在 `applyCsvImport()` 語意解析前已清掉 rows／overrides／exclusions；後者捕捉錯誤而未重新渲染。重現方向：先建立含人工改名／排除的計畫，再匯入標準表頭但不支援版本或 `spreadsheet-view` CSV。驗收：失敗保留舊計畫、人工修改、排除與綁定，畫面和 state 一致；新匯入先在暫存資料驗證，成功才一次提交。有效自訂欄位對應及逐列錯誤隔離仍須通過。

使用者要求繼續時，先將 T053 移到 In Progress，完成後處理 T054，再進入 RV-14。這是新增審查的接續建議，沒有開始任何產品修復或 UI 改版。處理審查時核對 thread 是否已有其他修正，避免重複工作。

## Phase 3／4 的接續與驗收

RV-14～20 已在任務板拆為 T055～T061，按原始計畫依賴排序；較大的 RV 應再拆為可獨立驗收的小 PR，不能為符合任務編號而一次重寫。

- **Phase 3：** RV-14 預覽為主的工作區 → RV-15 規則編輯／複製、自然排序、override／衝突標示 → RV-16 主題／對比、dialog／鍵盤／ARIA → RV-17 寵物隔離／減少動態／i18n。完整規格見原始計畫第 5、7 節。
- **視覺驗收：** 1440／1280／1024／768／390／360 與 200% zoom，四語系；亮／暗／高裝飾主題，長檔名、大量錯誤、空狀態、執行中、完成與部分失敗。既有五種寬度的 CSV QA 不代表這份完整矩陣已完成。
- **Phase 4：** RV-18 補完整 SW 首次控制／更新／多分頁／離線矩陣 → RV-19 選用素材 lazy cache、可終止 regex Worker、大批次性能 → RV-20 文件、版本與發布證據收尾。RV-18 已有最小 guard 和 scope namespace，應擴充測試而非當作完全沒做。

## 接手時不能遺忘的界線

- Strict preview 預設開啟；受控資料夾寫入是當次明確 opt-in。瀏覽器 `create:true` 不提供 exclusive／atomic no-overwrite，仍有外部競爭窗口。
- case-only rename 明示不支援。Node 暫存檔案／fake FS 不等同 Chrome／Edge 原生 picker、sharing、鎖檔或 FSA 語意驗證。
- handles、人工修改、排除與 recovery journals 都只在記憶體；reload 會遺失。JSON recovery report 不含可執行 handles。
- 原始 CSV schema 2 精確往返，試算表閱讀版不可回匯。CSV 狀態或顯示路徑不授權寫入，必須綁定實際來源與目錄。
- 現在 shell cache 為 **v9**。只要改了快取中的 shell 或 import，就要 bump `CACHE_NAME` 並更新相應測試。
- 執行 `npm test`、`npm run test:e2e`；`npm run build` 只是 Node 測試別名。Playwright 預設 port 4187，勿誤用其他 app 的伺服器；長時伺服器需背景啟動並在結束時清理。

目前交接不需要暫存探針、未提交檔案或聊天記憶。歷史 QA 截圖在暫存目錄，未作為可持久取得的證據承諾；後續視覺修改須重新產生並驗證。
