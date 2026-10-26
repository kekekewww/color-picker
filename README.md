# Color Picker

給剛接觸設計、還不熟悉色碼的人使用的 Chrome 擴充功能。反白網頁上的顏色代碼，就能看見對應色票；不需建置、不需註冊，也不會傳送選取內容。

## 安裝到 Chrome

1. 開啟 `chrome://extensions`。
2. 開啟右上角的「開發人員模式」。
3. 點選「載入未封裝項目」。
4. 選擇這個專案資料夾：`D:\Developing\color picker extension`，也就是包含 `manifest.json` 的資料夾。
5. 重新整理原本已開啟的網頁。從 Chrome 工具列的拼圖圖示釘選 **Color Picker**。
6. 點選擴充功能圖示，再點「打開色彩練習場」即可試用。

也可以解壓縮 `dist/color-picker-1.0.0.zip`，然後載入解壓縮後包含 `manifest.json` 的資料夾。不能直接將 ZIP 當成未封裝項目載入。

以上操作可參考 [Chrome 官方載入教學](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)。更新程式碼後，請在擴充功能頁按「重新載入」，再重新整理使用中的網頁。

## 使用方式

- 用滑鼠反白一個色碼：在色碼右側顯示色塊，並提供包含原始代碼的色票清單。
- 反白多個色碼：每個色碼有自己的色彩底線與小色塊，清單依原文順序排列。
- 支援連續 HEX，例如 `#FF0000#00FF00#0000FF`，也可用空白、換行、逗號、中文標點等分隔。
- 點色票或小色塊，複製該色碼；按 `Esc`、點關閉，或在頁面重新點選即可收起。
- 捲動及縮放視窗時會重新定位；右侧空間不足時，清單改放下方或上方。
- 可選取跨 `<b>`、`<span>` 等文字節點的色碼。文字輸入框及 textarea 會在欄位旁顯示清單，不在輸入框內逐字放置色塊。
- 設定中的「在原文旁顯示色塊」可關閉原文標記，保留色票清單。
- 「辨識不含 # 的 HEX」預設關閉。開啟後，`FF0099`、`abc` 等 3、4、6、8 碼十六進位文字也會辨識，因此一般文字或數字可能被誤判。

## 支援格式

| 格式 | 範例 |
| --- | --- |
| HEX（3 / 4 / 6 / 8 碼） | `#F85`、`#38B8`、`#365DCC`、`#365DCC80` |
| RGB / RGBA | `rgb(54, 93, 204)`、`rgb(54 93 204 / 50%)`、`rgba(54, 93, 204, .5)` |
| HSL / HSLA | `hsl(220 65% 50%)`、`hsla(220, 65%, 50%, .5)` |
| HWB | `hwb(220 20% 10%)` |
| Lab / LCH | `lab(70% 35 20)`、`lch(75% 55 145)` |
| OKLab / OKLCH | `oklab(.7 .1 -.1)`、`oklch(65% .2 260)` |
| color() | `color(display-p3 1 .4 .5)`、`color(srgb .2 .4 .8)` |

函式格式由瀏覽器的 `CSS.supports('color', value)` 驗證，再以原始 CSS 色值顯示，不會先轉為 HEX 而損失透明度或廣色域資訊。透明色以棋盤格襯底。色彩定義參考 [MDN CSS 色彩值](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value)。

## 使用範圍

- 以 Chrome 111 以上為基準；可用的色彩語法依實際瀏覽器版本而定。
- 適用於一般 HTTP／HTTPS 網頁及其 iframe。Chrome 系統頁面、Chrome 線上應用程式商店，以及瀏覽器內建 PDF 等受限制頁面無法注入一般內容腳本。
- 如需在本機 HTML 使用，請於擴充功能「詳細資料」開啟「允許存取檔案網址」。練習場建議從擴充功能按鈕開啟。
- Canvas、圖片裡的文字，以及網站封閉 Shadow DOM 內的選取，不在這版支援範圍。
- 不解析命名色（如 `red`）、`var()`、`currentColor` 或依賴網頁環境的色值。未支援 HSV、HSB、CMYK 等非本版 CSS 色碼格式。
- 不含 `#` 且沒有分隔的長字串無法可靠判斷色碼邊界；請保留 `#` 或加入分隔符號。
- 每次最多處理 20,000 個 UTF-16 字元與 200 個色碼，超過會顯示提示。
- 密碼欄位不處理。某些網站或 iframe 的剪貼簿政策可能阻止直接複製，屆時會顯示提示。

## 隱私與權限

只有 `storage` API 權限，用來在本機儲存啟用狀態、原文標記開關、裸 HEX 辨識偏好。內容腳本需要在一般網頁執行，才能偵測選取；不會儲存所選文字、建立瀏覽紀錄或發送網路請求。沒有遠端程式碼、追蹤工具、伺服器或背景服務。

解析器獨立於顯示層；預覽以 Shadow DOM 隔離樣式，原文的文字與排版不會被替換。腳本配置參考 [Chrome 內容腳本文件](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)。

## 開發與驗證

使用時不需要 Node.js；只有執行開發測試時需要。

```powershell
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run package
```

`npm test` 執行 11 個解析測試。`npm run test:browser` 在獨立的無頭 Chromium 設定檔實際載入擴充功能，執行 16 組檢查，涵蓋滑鼠選取、格式驗證、跨節點文字、輸入欄位、密碼排除、捲動對齊、關閉、偏好儲存與即時同步、剪貼簿、iframe、窄視窗，以及擴充功能錯誤。畫面存於 `test-results/`。

可用 `CHROMIUM_PATH` 環境變數指定支援未封裝擴充功能的 Chromium 執行檔。測試不會操作日常使用的 Chrome 設定檔。

`npm run package` 只打包執行所需的 12 個檔案（含隱私權政策），不包含測試、商店素材、網站來源或 `node_modules`。圖示可以用 `node scripts/icons.cjs` 重新產生，128px 商店圖示包含透明留白。

## Chrome 商店上架

完整文案、圖片、權限申報與審查員步驟見 [商店素材指南](store-assets/README.md)。隱私權政策位於 [privacy.html](privacy.html)，公開狀態與網址記錄在 [publication.json](store-assets/publication.json)。聯絡信箱：kevinyaungputra@gmail.com。

`npm run store:assets` 產生宣傳圖與兩張真實擴充功能截圖；`npm run store:sync-policy` 將套件內政策同步到 `store-site/` 網站。執行 `powershell -ExecutionPolicy Bypass -File scripts/package-store.ps1` 可產生完整素材 ZIP；Chrome 後台只需上傳其中的 `color-picker-1.0.0.zip`。

| 檔案 | 用途 |
| --- | --- |
| `manifest.json` | Chrome Manifest V3 設定 |
| `src/parser.js` | 色碼擷取、邊界及語法驗證 |
| `src/content.js` | 選取監聽、定位、色票、複製 |
| `popup.html` / `src/popup.js` | 工具列設定介面 |
| `demo.html` / `ui.css` | 色彩練習場與共用樣式 |
| `tests/` | 解析器與實際擴充功能測試 |
| `scripts/` | 圖示產生與 ZIP 打包 |
