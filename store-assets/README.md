# Color Picker 1.0.0 上架素材

隱私權政策已公開，可直接貼入 Chrome 後台：

https://color-picker-privacy.kevinyaungputragmail-com.chatgpt.site/

已確認不帶 Cookie 或登入憑證也能讀取，中英文政策內容與套件內版本一致。

## 後台上傳順序

### 2026-09-13 退件後重新送審

目前項目 `bhoeecdhjcnfgadnjajfloeigmlgcccg` 因 Yellow Argon（詳細說明中的密集格式清單）遭退件。中英文 `listing-*.txt` 的詳細說明已改為自然段落，移除支援／不支援格式的名稱清單。

進入同一個項目的「商店資訊」，將繁體中文詳細說明全文替換為 `listing-zh-TW.txt` 中「詳細說明」下方的內容。如果後台也有英文語系，同樣替換為 `listing-en.txt` 的 Detailed description。不要將檔案開頭的名稱、簡短說明或欄位標題一起貼入詳細說明。

儲存草稿後重新提交審查。本次僅修改商店文案，套件內容與版本維持不變；不需為這次詳細說明修改重新上傳 ZIP。本機修正不會自動同步到 Chrome 後台。目前尚未重新送審，最終結果由 Google 審查決定。

[Google 關鍵字垃圾內容說明](https://developer.chrome.com/docs/webstore/program-policies/spam-faq#keyword-spam)

### 首次上架參考

1. 登入 [Chrome Web Store 開發者後台](https://chrome.google.com/webstore/devconsole)，完成開發者注册、付款、聯絡信箱驗證、Google 帳號兩步驟驗證，以及後台要求的其他身分資料。
2. 新增項目，上傳 `../dist/color-picker-1.0.0.zip`。不要上傳整個商店素材包。
3. 主要語言選繁體中文；商店名稱填 `Color Picker`。從 `listing-zh-TW.txt` 貼上簡介與詳細介紹。`listing-en.txt` 可用於額外的英文商店語系；目前擴充功能介面仍是繁體中文。
4. 類別選與設計／開發工具最相符的現有分類；價格免費，發布方式選公開，地區依你的發布需求設定。
5. 上傳下表中的圖示與圖片。
6. 按 `privacy-practices.md` 填寫單一用途、storage 與網站存取理由、遠端程式碼及資料使用；網站內容雖只在本機處理仍需申報。
7. 隱私權政策欄位使用上方網址（也記錄於 `publication.json`）。聯絡信箱可填 `kevinyaungputra@gmail.com`，並在後台完成驗證。
8. Test instructions 可貼入 `reviewer-instructions.txt`；不需要帳號或測試密碼。
9. 確認後台沒有缺漏欄位後送出審查，選擇通過後自動發布或手動發布。

## 圖片對照

| 後台欄位 | 檔案 | 規格 |
| --- | --- | --- |
| 商店圖示 | `../icons/icon128.png` | 128 × 128 PNG；96px 圖案加每側 16px 透明留白 |
| 小型宣傳圖（必填） | `color-picker-promo-440x280.png` | 440 × 280 PNG |
| 螢幕截圖 1（必填） | `color-picker-screenshot-1280x800.png` | 1280 × 800；真實擴充功能 HEX 預覽 |
| 螢幕截圖 2 | `color-picker-modern-1280x800.png` | 1280 × 800；真實現代 CSS 色碼預覽 |
| 大型宣傳圖（選填） | `color-picker-marquee-1400x560.png` | 1400 × 560 PNG |

截圖由實際載入的擴充功能產生，無額外虛構 UI。宣傳圖是品牌素材，不要放進「螢幕截圖」欄位。`promo.html` 是宣傳圖可編輯原稿。

## 隱私權政策

`../privacy.html` 含繁體中文與英文，聯絡信箱為 `kevinyaungputra@gmail.com`。擴充功能 popup 及練習場都有政策連結。公開網站與套件內容透過 `npm run store:sync-policy` 同步。

公開政策需要免登入的 HTTPS 網址；本機路徑、localhost 與私人預覽不能用於送審。公開網站的來源位於 `../store-site/`，它是獨立網站，不會打包進擴充功能 ZIP。

## 已完成的本機驗證

- 11 個解析測試通過。
- 16 組實際 Chromium 擴充功能測試通過，包括剪貼簿、偏好儲存、iframe、密碼欄位排除與 runtime errors。
- 4 張商店 PNG 尺寸檢查通過；套件內政策頁可讀取，兩個語言版本的 Email 正確。
- 網站正式建置通過。

這些檢查不代表 Chrome 商店已核准；付款、身分／聯絡信箱驗證與最後送審需在你的開發者帳號完成。

## 重新產生

在專案根目錄執行：

```powershell
node scripts/icons.cjs
npm run store:sync-policy
npm run store:assets
npm test
npm run test:browser
npm run package
powershell -ExecutionPolicy Bypass -File scripts/package-store.ps1
```

安裝包版本取自 manifest.json。現有版本尚未在本次工作中送審，所以維持 1.0.0；未來更新既有商店項目時，需要遞增版本，並同步更新政策及文案的適用版本。

## 官方規範

- [發布流程](https://developer.chrome.com/docs/webstore/publish)
- [圖片尺寸與要求](https://developer.chrome.com/docs/webstore/images)
- [隱私權欄位](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [本機資料處理也需揭露](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

核對日期：2026-09-11。
