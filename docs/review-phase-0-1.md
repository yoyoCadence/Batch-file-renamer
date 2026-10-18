# Review Plan V1.0.0：Phase 0／1

基準：`2be62ed`；本次範圍為 RV-01～09。Phase 2～4 保留於 `tasks.md`，不重設整個 UI，也不加入後端或原生 bridge。

## 行為與責任邊界

- 預設嚴格預覽模式。選取資料夾只授予檔案權限；瀏覽器寫入需明確勾選本次工作階段的受控模式，再確認非原子複製／刪除的限制。此偏好不持久化。
- 執行完整預覽中通過驗證且未排除的列。搜尋與勾選仍是檢視／批次編輯用途，確認畫面說明此差異。
- 目標資料夾唯讀，顯示真實 handle 綁定的名稱。Copy 第一版僅支援一個真正的輸出目錄。
- CSV 是獨立的未授權計畫。選擇來源／模板與輸出位置後，必須按「綁定 CSV」。Rename 精確匹配名稱及來源顯示路徑；Copy 必須匹配模板名稱／路徑和輸出目錄。不推測路徑、不替換模板、不相信匯入的 Status。缺來源路徑的舊 CSV 仍可預覽，但不能直接綁定；版本化 schema／欄位對應精靈留待 RV-12。
- 人工名稱、快速修正、排除狀態以穩定來源 ID 保存。scope／排序不改身份；規則更新保留人工值，提供明確重設。修改名稱後標示待磁碟檢查；重查不重新生成名稱，過期結果不覆蓋新編輯。
- 所有重名列一起阻擋；排除一列可解開其他列。執行計畫使用 `isSameEntry` 解析實際目錄身份，不拿 `.name` 或標籤當身份。
- 同步重入鎖從驗證開始生效，Web Lock 協調同 origin 分頁。批次輸入凍結，執行只讀不可變計畫。停止要求只在完成目前列後生效。
- 每列記錄讀取、建立、寫入、close、驗證、來源刪除及錯誤。目標內容驗證成功且來源身份／SHA-256／大小／修改時間仍一致後才刪來源；失敗不任意清理未知檔案。
- 復原檢查 handle 與內容指紋。原名占用、外部修改、缺檔、權限失敗都保留 unresolved；重試不處理已成功列。來源刪除失敗留下的副本，可在確認來源未變後移除。JSON 恢復報告包含全部批次與逐步紀錄，CSV 記錄描述最近一次執行或復原。
- 紀錄及 handles 仍只在記憶體。執行／恢復資料存在時提供離開頁面提醒；關閉前應匯出恢復報告。報告是人工恢復依據，不能自動執行。

`filesystem.js` 負責權限、NotFound-only 查詢、身份、雜湊與跨分頁鎖；`execution.js` 負責固定計畫、journal 與復原；`preview-state.js` 負責純狀態轉換與綁定；`review-messages.js` 保存新增流程的四語系文字。原有 ESM／外觀架構保留。

## 平台限制

`getFileHandle({create:true})` 沒有通用的 exclusive-create 選項；stream 鎖也不是對 Explorer／其他程式的整筆交易鎖。外部程式仍可能在最後檢查與寫入／刪除之間改動檔案。本次沒有宣稱消除此競爭窗口：嚴格模式阻擋這類寫入；受控模式是使用者明確選擇的 best-effort 操作，只適用有備份且無其他寫入者的資料夾。

官方參考：[File System Standard](https://fs.spec.whatwg.org/)、[Chrome File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)。不能因為存在 `move` 就假定使用者選取目錄支援不可覆寫的原生 rename。

只改大小寫仍維持 No change；通過 Windows 原生瀏覽器能力試驗前不啟用。雜湊目前讀取完整 File，超大檔案的記憶體與重複驗證成本留待 RV-19。無跨 reload 的 journal 持久化；handle 的底層身份語意也不能偵測所有外部同名替換。

為保護進行中的 journal，本次補必要 SW guard：首次 claim 不重載、有工作時拒絕套用更新、其他分頁 controllerchange 不重載；cache 以應用及 scope 命名，僅清自己的舊版本。舊版未含 scope 的 cache 因無法確認歸屬而保留。完整更新／離線矩陣及選用素材 lazy cache 仍留待 RV-18～19。

## 驗證證據與界線

修復前新增的 7 個瀏覽器回歸案例全部失敗，重現 B01／B02、B03、B04、B05／B15、B07、B08、B09。B06／B20 另有 CSV 綁定與來源／輸出內容比對。

Node 測試覆蓋逐階段失敗、復原重試、目錄別名、外部檔案、固定計畫、排除／人工值、CSV、scope cache 清理；Chromium 覆蓋假 FS 全流程、取消、跨分頁鎖、允許 SW 的首次控制。PR CI 安裝 Chromium，啟動失敗算失敗並上傳 trace／截圖；Pages 部署也須通過 Node 與瀏覽器測試。

Windows 專用暫存目錄用相同引擎驗證中文／emoji、二進位內容 rename → undo、Copy 保留來源、復原保留外部新檔案。此層使用 Node filesystem adapter，**不代表原生瀏覽器 picker、拒絕權限、Windows sharing／鎖檔或所有瀏覽器 FSA 語意已驗證**。仍需 Windows Chrome／Edge 原生流程矩陣；不得以假 FS 或 Node adapter 宣稱「絕不覆寫」。

本機結果：77 項 Node、78 項 Chromium 全過；磁碟檢查微調後針對相關 23 項再驗證通過。以 Playwright 檢查頁面身份、非空白、無錯誤覆蓋層、console 無錯誤、人工改名 → 重查保留值與嚴格模式禁用寫入。1280／1024／768／390／360 無整頁溢出，四語系在 390 寬度無翻譯鍵外洩；桌面與手機截圖存於系統暫存目錄並目視驗證。Browser plugin 不在本次技能清單，故使用專案 Playwright。修正了 grid 隱含最小寬度導致的整頁溢出，表格保留局部水平捲動。

下一步依附件進入 Phase 2（RV-10 規則 schema／trace，再做 RV-11～13）；Phase 3 視覺重整維持獨立任務。
