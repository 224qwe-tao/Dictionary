# NovelAI Prompt Tag 字典網站

這是一個可以直接部署到 GitHub Pages 的靜態網站，用來整理 NovelAI / NAI Prompt Tag。

## 功能

- Tag 搜尋：支援中文標題、分類、英文 tag、備註搜尋
- 分類篩選：畫風 / 畫師、角色 / 人設、構圖 / 視角、場景 / 光影、服飾 / 道具、表情 / 動作、品質 / 修正、Prompt 模板
- Prompt Builder：點擊「加入」後自動合併 Prompt 與 Negative / UC
- 一鍵複製 Prompt
- 收藏常用條目
- 權重工具：`{tag}`、`{{tag}}`、`[tag]`、`1.2::tag::`
- 自訂 tag：儲存在瀏覽器 localStorage
- 匯入 / 匯出 JSON
- 無需打包工具，純 HTML + CSS + JavaScript

## 檔案結構

```txt
novelai-prompt-tag-dictionary/
├─ index.html
├─ assets/
│  ├─ styles.css
│  └─ app.js
├─ data/
│  └─ tags.json
├─ tools/
│  └─ sanitize-tags.py
├─ README.md
└─ LICENSE
```

## 如何部署到 GitHub Pages

1. 在 GitHub 建立新的 repository，例如 `novelai-prompt-tag-dictionary`。
2. 上傳本資料夾內所有檔案。
3. 進入 repository 的 **Settings**。
4. 左側選 **Pages**。
5. Source 選 **Deploy from a branch**。
6. Branch 選 `main`，資料夾選 `/root`。
7. 儲存後等待 GitHub Pages 生成網址。

## 如何新增 tag

方法一：直接編輯 `data/tags.json`：

```json
{
  "id": "your-id",
  "title": "條目名稱",
  "category": "服飾 / 道具",
  "tags": "tag1,tag2,tag3",
  "negative": "lowres,bad anatomy,bad hands",
  "note": "使用說明",
  "model": "通用",
  "stability": "高",
  "source": "custom",
  "safe": true
}
```

方法二：在網站中的「新增自訂 Tag」表單加入。這種方式只會保存在目前瀏覽器。

## 內容安全說明

本專案的內建資料是「公開版 starter tags」。為了適合上傳到 GitHub，已排除涉及未成年、強迫、暴力、獸交、重口等不適合公開整理的內容。

如果你想把自己的大型 tag 文檔轉成 JSON，請先在本地確認內容合法、合規，並使用 `tools/sanitize-tags.py` 做初步過濾。自動過濾不能取代人工檢查。

## 本地預覽

直接打開 `index.html` 通常可以看到 fallback 資料。若要完整載入 `data/tags.json`，建議使用本地 server：

```bash
python -m http.server 8000
```

然後瀏覽：

```txt
http://localhost:8000
```


## 2026-04-27 更新

- 移除了首頁大型深色 hero 區塊。
- 色彩改成淺灰背景、白色卡片、藍色主按鈕。
- 根據 `服装.docx` 新增婚紗、女僕裝、OL、競泳、修女服、兔女郎、和服等服飾 Prompt Tag。
