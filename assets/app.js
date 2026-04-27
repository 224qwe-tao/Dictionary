const STORAGE_KEYS = {
  customTags: "naiTagDictionary.customTags",
  favorites: "naiTagDictionary.favorites",
  prompt: "naiTagDictionary.prompt",
  negative: "naiTagDictionary.negative",
  notice: "naiTagDictionary.notice.dismissed"
};

const fallbackTags = [
  {
    id: "fallback-quality-base",
    title: "品質增強基礎組",
    category: "品質 / 修正",
    tags: "amazing quality,great quality,highly detailed,detailed face,detailed hair,4k,depth of field",
    negative: "lowres,worst quality,bad anatomy,bad hands,extra fingers,missing fingers,extra limbs,blurry,watermark,text",
    note: "data/tags.json 無法載入時使用的後備資料。",
    model: "通用",
    stability: "高",
    safe: true
  }
];

let tags = [];
let activeCategory = "全部";
let searchTerm = "";
let sortMode = "category";
let favorites = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || "[]"));

const $ = (selector) => document.querySelector(selector);
const cardsEl = $("#cards");
const categoryListEl = $("#categoryList");
const resultMetaEl = $("#resultMeta");
const totalCountEl = $("#totalCount");
const emptyStateEl = $("#emptyState");
const promptBox = $("#promptBox");
const negativeBox = $("#negativeBox");
const toastEl = $("#toast");

init();

async function init() {
  restoreBuilder();
  handleNotice();
  bindEvents();
  tags = await loadTags();
  render();
}

async function loadTags() {
  try {
    const response = await fetch("data/tags.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const baseTags = await response.json();
    return [...baseTags, ...getCustomTags()].map(normalizeTag);
  } catch (error) {
    console.warn("使用 fallbackTags，原因：", error);
    return [...fallbackTags, ...getCustomTags()].map(normalizeTag);
  }
}

function normalizeTag(tag, index = 0) {
  return {
    id: tag.id || `custom-${Date.now()}-${index}`,
    title: tag.title || "未命名 tag",
    category: tag.category || "未分類",
    tags: tag.tags || "",
    negative: tag.negative || "",
    note: tag.note || "",
    model: tag.model || "通用",
    stability: tag.stability || "-",
    source: tag.source || "custom",
    safe: tag.safe !== false
  };
}

function bindEvents() {
  $("#searchInput").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderCards();
  });

  $("#sortSelect").addEventListener("change", (event) => {
    sortMode = event.target.value;
    renderCards();
  });

  const copyPromptBtn = $("#copyPromptBtn");
  if (copyPromptBtn) copyPromptBtn.addEventListener("click", copyBuilderPrompt);
  $("#copyPromptBtn2").addEventListener("click", copyBuilderPrompt);
  $("#clearPromptBtn").addEventListener("click", clearBuilder);

  promptBox.addEventListener("input", saveBuilder);
  negativeBox.addEventListener("input", saveBuilder);

  document.querySelectorAll(".weight-tools button").forEach((button) => {
    button.addEventListener("click", () => applyWeight(button.dataset.wrap));
  });

  $("#customForm").addEventListener("submit", handleCustomSubmit);
  $("#exportBtn").addEventListener("click", exportTags);
  $("#importFile").addEventListener("change", importTags);
}

function render() {
  totalCountEl.textContent = tags.length;
  renderCategories();
  renderCards();
}

function renderCategories() {
  const categories = ["全部", "收藏", ...new Set(tags.map((tag) => tag.category))].sort((a, b) => {
    if (a === "全部") return -1;
    if (b === "全部") return 1;
    if (a === "收藏") return -1;
    if (b === "收藏") return 1;
    return a.localeCompare(b, "zh-Hant");
  });

  categoryListEl.innerHTML = categories.map((category) => `
    <button type="button" class="${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  categoryListEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderCards();
    });
  });
}

function getFilteredTags() {
  return tags
    .filter((tag) => {
      const inCategory = activeCategory === "全部" ||
        (activeCategory === "收藏" ? favorites.has(tag.id) : tag.category === activeCategory);
      const haystack = [tag.title, tag.category, tag.tags, tag.negative, tag.note, tag.model, tag.stability]
        .join(" ")
        .toLowerCase();
      return inCategory && (!searchTerm || haystack.includes(searchTerm));
    })
    .sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title, "zh-Hant");
      if (sortMode === "model") return a.model.localeCompare(b.model, "zh-Hant");
      if (sortMode === "stability") return b.stability.localeCompare(a.stability, "zh-Hant");
      return `${a.category}${a.title}`.localeCompare(`${b.category}${b.title}`, "zh-Hant");
    });
}

function renderCards() {
  const filtered = getFilteredTags();
  resultMetaEl.textContent = `${filtered.length} / ${tags.length} 條；目前分類：${activeCategory}`;
  emptyStateEl.hidden = filtered.length !== 0;
  cardsEl.innerHTML = filtered.map(renderCard).join("");

  cardsEl.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const tag = tags.find((item) => item.id === button.dataset.id);
      if (!tag) return;
      const action = button.dataset.action;
      if (action === "add") addToBuilder(tag);
      if (action === "copy") copyText(tag.tags, "已複製 tags");
      if (action === "fav") toggleFavorite(tag.id);
    });
  });
}

function renderCard(tag) {
  const isFav = favorites.has(tag.id);
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(tag.title)}</h3>
          <div class="card-meta">
            <span class="badge">${escapeHtml(tag.category)}</span>
            <span class="badge">${escapeHtml(tag.model)}</span>
            <span class="badge">穩定度：${escapeHtml(tag.stability)}</span>
            ${tag.safe ? '<span class="badge safe">Safe</span>' : ''}
          </div>
        </div>
      </div>
      <p class="tag-text">${escapeHtml(tag.tags)}</p>
      ${tag.negative ? `<p class="negative-text">${escapeHtml(tag.negative)}</p>` : ""}
      ${tag.note ? `<p class="note">${escapeHtml(tag.note)}</p>` : ""}
      <div class="card-actions">
        <button data-action="add" data-id="${escapeHtml(tag.id)}" type="button">加入</button>
        <button class="secondary" data-action="copy" data-id="${escapeHtml(tag.id)}" type="button">複製</button>
        <button class="fav ${isFav ? "active" : ""}" data-action="fav" data-id="${escapeHtml(tag.id)}" type="button" aria-label="收藏 ${escapeHtml(tag.title)}">★</button>
      </div>
    </article>
  `;
}

function addToBuilder(tag) {
  promptBox.value = joinPrompt(promptBox.value, tag.tags);
  negativeBox.value = joinPrompt(negativeBox.value, tag.negative);
  saveBuilder();
  showToast(`已加入：${tag.title}`);
}

function joinPrompt(current, next) {
  if (!next) return current;
  const cleanedCurrent = current.trim().replace(/,+$/g, "");
  const cleanedNext = next.trim().replace(/^,+/g, "");
  if (!cleanedCurrent) return cleanedNext;
  return `${cleanedCurrent},${cleanedNext}`;
}

function copyBuilderPrompt() {
  const prompt = promptBox.value.trim();
  const negative = negativeBox.value.trim();
  const text = negative ? `Prompt:\n${prompt}\n\nNegative / UC:\n${negative}` : prompt;
  copyText(text, "已複製組合 Prompt");
}

function copyText(text, message) {
  if (!text.trim()) {
    showToast("沒有可複製內容");
    return;
  }
  navigator.clipboard.writeText(text).then(() => showToast(message));
}

function clearBuilder() {
  promptBox.value = "";
  negativeBox.value = "";
  saveBuilder();
  showToast("已清空 Prompt Builder");
}

function applyWeight(mode) {
  const textarea = document.activeElement === negativeBox ? negativeBox : promptBox;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end).trim();
  if (!selected) {
    showToast("請先選取要加權的 tag");
    return;
  }

  let wrapped = selected;
  if (mode === "{}") wrapped = `{${selected}}`;
  if (mode === "{{}}") wrapped = `{{${selected}}}`;
  if (mode === "[]") wrapped = `[${selected}]`;
  if (mode === "1.2") wrapped = `1.2::${selected}::`;

  textarea.setRangeText(wrapped, start, end, "end");
  saveBuilder();
  showToast("已套用權重");
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...favorites]));
  renderCategories();
  renderCards();
}

function getCustomTags() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.customTags) || "[]");
  } catch {
    return [];
  }
}

function setCustomTags(customTags) {
  localStorage.setItem(STORAGE_KEYS.customTags, JSON.stringify(customTags));
}

function handleCustomSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const customTag = normalizeTag({
    id: `custom-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    title: form.get("title"),
    category: form.get("category"),
    tags: form.get("tags"),
    negative: form.get("negative"),
    note: form.get("note"),
    model: "自訂",
    stability: "自訂",
    source: "custom",
    safe: true
  });
  const customTags = [...getCustomTags(), customTag];
  setCustomTags(customTags);
  tags.push(customTag);
  event.currentTarget.reset();
  render();
  showToast("已新增自訂 tag");
}

function exportTags() {
  const blob = new Blob([JSON.stringify(tags, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "novelai-prompt-tags.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("已匯出 JSON");
}

function importTags(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("JSON 必須是陣列");
      const normalized = imported.map(normalizeTag);
      setCustomTags(normalized);
      tags = normalized;
      activeCategory = "全部";
      render();
      showToast("已匯入 JSON");
    } catch (error) {
      showToast(`匯入失敗：${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function saveBuilder() {
  localStorage.setItem(STORAGE_KEYS.prompt, promptBox.value);
  localStorage.setItem(STORAGE_KEYS.negative, negativeBox.value);
}

function restoreBuilder() {
  promptBox.value = localStorage.getItem(STORAGE_KEYS.prompt) || "";
  negativeBox.value = localStorage.getItem(STORAGE_KEYS.negative) || "";
}

function handleNotice() {
  const notice = $("#safeNotice");
  const dismiss = $("#dismissNotice");
  if (!notice || !dismiss) return;
  if (localStorage.getItem(STORAGE_KEYS.notice) === "yes") {
    notice.remove();
    return;
  }
  dismiss.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEYS.notice, "yes");
    notice.remove();
  });
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
