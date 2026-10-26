# Chrome 商店隱私權實務填寫稿

適用目前的 1.0.0 程式。以下英文段落可直接貼入後台；中文是填寫提示。

## Single purpose description

Color Picker previews CSS color codes selected by the user on a web page and lets the user copy a selected color code by clicking its swatch. The bundled playground demonstrates the same color-preview feature.

## storage justification

The storage permission saves three user preferences in chrome.storage.local: whether previews are enabled, whether inline color markers are shown, and whether HEX codes without a leading # are recognized. Selected text, color codes, browsing history, and URLs are not saved in extension storage. Chrome sync storage is not used.

## Host permission / website access justification

Content scripts run on HTTP and HTTPS pages and their frames so that selecting a supported CSS color code automatically displays nearby swatches without requiring a toolbar click for each selection. They read the current selection, one adjacent character on each side for code boundaries, and text positions needed to place the preview. Processing stays on the user's device. File URL matching provides the same feature for local HTML only when the user explicitly enables Chrome's file-URL access setting. Related about:blank frames are included because selected text can appear inside those frames. The extension does not send page content, full URLs, or browsing history to any server.

後台可能將 content_scripts 的網站範圍列在網站存取或 host permissions 欄位；即使 manifest 沒有獨立的 host_permissions，仍需說明這項存取。保留 file:///* 是為了現有的本機 HTML 功能；不用另外新增 tabs、history、clipboardRead、clipboardWrite 或 activeTab 權限。

## Remote code

選擇：No, I am not using remote code.

All JavaScript and CSS used by the extension are included in the uploaded package. The extension does not fetch or execute remotely hosted code and contains no analytics or advertising SDKs.

## Data usage

Google 的 FAQ 明確要求：即使僅在裝置上處理或儲存，也要揭露使用者資料處理。不能因為「沒有上傳」就聲明完全不處理使用者資料。

- **Website content / 網站內容：申報。** 本功能讀取使用者選取的文字（包括支援輸入欄位中的選取內容）、邊界字元及定位資訊；用於本機色碼解析。
- 不建立瀏覽歷史、點擊或按鍵活動紀錄；監聽 selectionchange 等事件只為觸發當次預覽，不建立活動分析。
- 不刻意擷取身分、財務、健康、驗證或通訊資料；選取內容可能包含其他文字，因此政策明確揭露讀取的是整個當次選取範圍。
- 後台如詢問用途，填寫核心功能／提供色碼預覽。若詢問分享或傳輸，填寫沒有傳送給開發者或第三方。
- 複製功能只在點擊色票時寫入色碼，不讀取使用者剪貼簿。

可貼入補充說明：

Selected website text, including selections in supported input fields, is processed locally only to recognize CSS color codes. One character on either side and text geometry are accessed for accurate matching and placement. No selection history is saved and no selected content is transmitted to the developer or third parties. Only three preferences are stored locally. The extension writes a color code to the clipboard only when the user clicks its swatch, and does not read clipboard contents.

## Limited Use certifications

目前程式符合以下聲明，可在確認送審版本仍維持相同行為後勾選後台對應項目：

- 不向第三方販售或轉移使用者資料。
- 不為與擴充功能單一用途無關的目的使用或轉移資料。
- 不為信用評估或借貸用途使用或轉移資料。

## Privacy policy URL

https://color-picker-privacy.kevinyaungputragmail-com.chatgpt.site/

以上網址已公開，並通過無登入憑證的 HTTPS 存取檢查。

填入實際公開、免登入且可正常開啟的政策網址。檔案路徑、chrome-extension:// 網址或僅自己可看的預覽網址不能代替。公開內容須與套件中的 privacy.html 一致。

## 官方來源

- [資料處理 FAQ（含本機處理說明）](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [隱私權欄位](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [隱私權政策要求](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [最低權限原則](https://developer.chrome.com/docs/webstore/program-policies/permissions)

規範核對日期：2026-09-11。
