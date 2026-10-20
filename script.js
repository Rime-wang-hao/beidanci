// =============================================================
// script.js — 每日背单词 · 主逻辑
// ★ 版本号：改动后请同步更新这里 + index.html 里的 ?v= 参数
//   APP_VERSION  → 用于检测旧缓存并自动刷新
//   ?v=3         → 强制浏览器重新下载本文件
// =============================================================

const APP_VERSION = "v3.0.0";

// ★ 每日一句：30 句英文鼓励谚语（集中在一个数组里）
const DAILY_QUOTES = [
  "Every day may not be good, but there's something good in every day.",
  "Believe you can and you're halfway there.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Small steps every day lead to big results.",
  "Don't watch the clock; do what it does. Keep going.",
  "Little by little, one travels far.",
  "Mistakes are proof that you are trying.",
  "The expert in anything was once a beginner.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success is the sum of small efforts repeated day in and day out.",
  "It always seems impossible until it's done.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe in yourself and all that you are.",
  "A river cuts through rock, not because of its power, but because of its persistence.",
  "Every word you learn is a step forward.",
  "Learning is a treasure that follows its owner everywhere.",
  "Where there is a will, there is a way.",
  "Practice makes perfect.",
  "Rome was not built in a day.",
  "Actions speak louder than words."
];

// =============================================================
// CONFIG —— 集中管理所有可改文案
// =============================================================
const CONFIG = {
  // 文案
  todayLabel:       "今日进度",
  streakUnit:       "天",
  streakTitle:      "连续打卡",
  cardTapHint:      "轻触卡片 · 查看释义",
  btnUnknown:       "不认识",
  btnKnown:         "认识啦",
  toastKnown:       "已掌握 ✨",
  toastUnknown:     "已加入生词本",
  toastAllDone:     "太棒了，今日任务完成！",
  toastBack:        "已移出生词本",
  toastNavEdge:     "已经是最后一张啦～",
  toastNoTTS:       "您的浏览器暂不支持朗读",
  emptyHard:        "还没有生词，遇到不会的词点\u201c不认识\u201d会自动收入这里。",
  emptyKnown:       "还没有掌握任何单词哦～ 试试点\u201c认识啦\u201d积累你的战利品！",
  emptyAll:         "没有匹配的单词",
  dailyTarget:      10,            // 每天目标词数（顺序抽词）
  // 数据源
  wordsUrl:         "./words.json",
  // 音乐
  musicFile:        "music.mp3",
  // 颜色（同步 style.css）
  starColors:       ["#FFD194", "#FFB088", "#FFC9D2", "#E8C39E", "#F2E2C2", "#FFFFFF"],
  // 每日一句（与 DAILY_QUOTES 同一份数据）
  quotes:           DAILY_QUOTES
};

// =============================================================
// ★ 版本自检：检测到旧版本缓存 → 自动强制刷新一次
//    （解决"HTML 是新的、JS 是旧的"导致的功能错乱）
// =============================================================
function checkAppVersion() {
  try {
    const KEY = "beidanci_app_version";
    const saved = localStorage.getItem(KEY);
    if (saved && saved !== APP_VERSION && !sessionStorage.getItem("beidanci_reloaded")) {
      // 旧缓存 → 记下标记并强制刷新一次
      sessionStorage.setItem("beidanci_reloaded", "1");
      localStorage.setItem(KEY, APP_VERSION);
      location.reload(true);
      return true;   // 正在刷新，调用方应停止继续初始化
    }
    localStorage.setItem(KEY, APP_VERSION);
  } catch (e) {}
  return false;
}

// =============================================================
// State（localStorage 持久化）
// ★ STORAGE_KEY 升到 v3：强制清空一次旧缓存，避免"没学却显示 10 个"
// =============================================================
const STORAGE_KEY = "beidanci_v3";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

let state = {
  todayQueue: [],         // 今日队列
  todayDone: 0,           // 今日完成数
  lastStudyDate: "",      // 上次学习日期
  streak: 0,              // 连续打卡
  knownWords: [],         // ★ 长期累加：所有"认识"的词
  hardWords: [],          // ★ 长期累加：所有"不认识"的词
  history: []             // ★ 今日所有操作过的词（按日期清空）
};

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const obj = JSON.parse(s);
      state = Object.assign(state, obj);
    }
  } catch(e) {}
  // 防御：脏数据修正
  if (!Array.isArray(state.knownWords)) state.knownWords = [];
  if (!Array.isArray(state.hardWords))  state.hardWords  = [];
  if (!Array.isArray(state.history))     state.history    = [];
  if (!Array.isArray(state.todayQueue))  state.todayQueue = [];
}

// =============================================================
// 词库加载（fetch ./words.json）— 异步、容错、可重试
// =============================================================
let wordList = [];            // 已加载的词库
let wordListReady = false;    // 是否就绪
let wordListError = null;     // 加载错误
let wordListLoading = false;  // 是否正在加载

async function loadWordList() {
  if (wordListLoading) return;
  wordListLoading = true;
  try {
    const r = await fetch(CONFIG.wordsUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("词库为空或格式错误");
    }
    wordList = data;
    wordListReady = true;
    wordListError = null;
  } catch (e) {
    wordListError = e;
    wordListReady = false;
  } finally {
    wordListLoading = false;
  }
}

function getWordList() {
  return wordListReady ? wordList : [];
}

// =============================================================
// 工具
// =============================================================
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ★ 今天是今年的第几天（1 ~ 366）
function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);   // 上一年最后一天
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// ★ 每日任务：按词库顺序抽词（不再随机）
//   startIndex = (年内天数 - 1) * 10，超出总词数则循环
function pickTodayQueue() {
  const list = getWordList();
  if (!list.length) return [];
  const n = Math.min(CONFIG.dailyTarget, list.length);
  const day = dayOfYear();
  const startIndex = ((day - 1) * n) % list.length;
  let q = list.slice(startIndex, startIndex + n);
  if (q.length < n) {                 // 越界时从头部接上，保证每天满 10 词
    q = q.concat(list.slice(0, n - q.length));
  }
  return q;
}

function checkStreak() {
  if (!wordListReady) return;     // 词库未就绪，跳过 streak 检查
  if (state.lastStudyDate !== today()) {
    if (state.lastStudyDate === yesterday()) {
      // 连续
    } else if (state.lastStudyDate) {
      state.streak = 0;
    }
    state.todayQueue = pickTodayQueue();
    state.todayDone = 0;
    state.history = [];        // ★ 新的一天清空今日已学
  }
}
function updateStreak() {
  if (state.lastStudyDate !== today()) {
    if (state.lastStudyDate === yesterday() || state.streak === 0) {
      state.streak += 1;
    } else if (state.lastStudyDate) {
      state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastStudyDate = today();
  }
}
function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// =============================================================
// Toast
// =============================================================
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// =============================================================
// ★★ 每日一句：独立渲染，不依赖任何异步加载
//    （同一天恒定，刷新不变；跨天自动切换）
// =============================================================
function renderQuote() {
  const el = document.getElementById("quoteText");
  if (!el) return;
  const list = (Array.isArray(DAILY_QUOTES) && DAILY_QUOTES.length)
    ? DAILY_QUOTES
    : CONFIG.quotes;
  if (!list || !list.length) return;
  const day = dayOfYear();
  el.textContent = list[day % list.length];
}

// 脚本一加载就渲染（不依赖 DOMContentLoaded，也不会停在 Loading）
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderQuote);
} else {
  renderQuote();
}

// =============================================================
// 渲染：顶部进度
// =============================================================
function renderTop() {
  const todayText = document.getElementById("todayText");
  if (todayText) {
    todayText.textContent = `${CONFIG.todayLabel}：${state.todayDone} / ${state.todayQueue.length}`;
  }
  const streakNum = document.getElementById("streakNum");
  if (streakNum) streakNum.textContent = state.streak;

  // ★ 今日已学统计（按日期清空）
  const hist = state.history || [];
  const knownN = hist.filter(h => h.status === "known").length;
  const unknownN = hist.length - knownN;
  const setNum = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setNum("studyCount", hist.length);
  setNum("knownCount", knownN);
  setNum("unknownCount", unknownN);

  // ★ 累计掌握（永久累加）
  const totalKnown = (state.knownWords || []).length;
  setNum("knownTotal", totalKnown);
  const totalWords = wordListReady ? wordList.length : 0;
  const cumPct = totalWords > 0 ? Math.round(totalKnown / totalWords * 100) : 0;
  setNum("cumulativePct", cumPct);

  // 进度条
  const fill = document.getElementById("progressFill");
  if (fill) {
    const pct = state.todayQueue.length > 0
      ? Math.round(state.todayDone / state.todayQueue.length * 100) : 0;
    fill.style.width = pct + "%";
  }
}

// =============================================================
// 渲染：单词卡
// =============================================================
let currentIndex = 0;
function renderCard(keepFlipped = false) {
  const cardEl = document.getElementById("flashcard");
  if (!cardEl) return;
  if (state.todayQueue.length === 0) {
    if (!wordListReady) {
      showEmptyCard("词库加载中…");
      renderMission();
      return;
    }
    state.todayQueue = pickTodayQueue();
    state.todayDone = 0;
  }
  if (currentIndex >= state.todayQueue.length) {
    onAllDone();
    return;
  }
  const w = state.todayQueue[currentIndex];
  document.getElementById("wordMain").textContent = w.word;
  const back = document.getElementById("wordMainBack");
  if (back) back.textContent = w.word;
  document.getElementById("phonetic").textContent = w.phonetic || "";
  document.getElementById("posTag").textContent = w.pos || "";
  document.getElementById("meaning").textContent = w.meaning || "";
  document.getElementById("example").textContent = w.example || "";
  // 重置卡片状态
  cardEl.classList.remove("fly-out-left", "fly-out-right");
  if (keepFlipped) cardEl.classList.add("flipped");
  else cardEl.classList.remove("flipped");
  void cardEl.offsetWidth;
  renderTop();
  renderMission();      // ★ 同步今日任务列表高亮
  updateNavButtons();
}

function showEmptyCard(msg) {
  const cardEl = document.getElementById("flashcard");
  if (!cardEl) return;
  document.getElementById("wordMain").textContent = msg;
  const back = document.getElementById("wordMainBack");
  if (back) back.textContent = msg;
  document.getElementById("phonetic").textContent = "";
  document.getElementById("posTag").textContent = "";
  document.getElementById("meaning").textContent = "";
  document.getElementById("example").textContent = "";
  cardEl.classList.remove("fly-out-left", "fly-out-right", "flipped");
  updateNavButtons();
}

function onAllDone() {
  toast(CONFIG.toastAllDone);
  fireConfetti();
  setTimeout(() => {
    // 重新开始新一组（保留 history）
    state.todayQueue = pickTodayQueue();
    currentIndex = 0;
    state.todayDone = 0;
    saveState();
    renderCard();
  }, 2200);
}

// =============================================================
// 翻牌
// =============================================================
function toggleFlip() {
  const card = document.getElementById("flashcard");
  if (card) card.classList.toggle("flipped");
}

// =============================================================
// ★ 左右翻阅
// =============================================================
let navLock = false;   // 平滑过渡锁：避免动画中连点导致错乱
function goPrev() {
  if (navLock) return;
  const card = document.getElementById("flashcard");
  if (card && (card.classList.contains("fly-out-left") || card.classList.contains("fly-out-right"))) return;
  if (currentIndex <= 0) { toast(CONFIG.toastNavEdge); return; }
  navTo(currentIndex - 1);
}
function goNext() {
  if (navLock) return;
  const card = document.getElementById("flashcard");
  if (card && (card.classList.contains("fly-out-left") || card.classList.contains("fly-out-right"))) return;
  if (currentIndex >= state.todayQueue.length - 1) { toast(CONFIG.toastNavEdge); return; }
  navTo(currentIndex + 1);
}

// 翻阅核心：若当前在背面，先翻回正面再切换文本
function navTo(idx) {
  const card = document.getElementById("flashcard");
  if (card && card.classList.contains("flipped")) {
    navLock = true;
    card.classList.remove("flipped");
    setTimeout(() => {
      currentIndex = idx;
      renderCard();
      renderTop();
      navLock = false;
    }, 400);
  } else {
    currentIndex = idx;
    renderCard();
    renderTop();
  }
}
function updateNavButtons() {
  const card = document.getElementById("flashcard");
  const flying = card && (card.classList.contains("fly-out-left") || card.classList.contains("fly-out-right"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn) prevBtn.disabled = flying || currentIndex <= 0;
  if (nextBtn) nextBtn.disabled = flying || currentIndex >= state.todayQueue.length - 1;
}

// =============================================================
// 左右飞（认识 / 不认识）— 长期累加 + 互斥
// =============================================================
function answer(isKnown) {
  if (!wordListReady) return;     // 词库未就绪，不响应
  const w = state.todayQueue[currentIndex];
  if (!w) return;
  const wordName = w.word;
  const status = isKnown ? "known" : "unknown";

  // ★ 今日已学（按日期清空；可重复覆盖同一天对同一词的操作）
  if (!Array.isArray(state.history)) state.history = [];
  const existingIdx = state.history.findIndex(h => h.word === wordName);
  if (existingIdx >= 0) {
    state.history[existingIdx].status = status;
    state.history[existingIdx].time = Date.now();
  } else {
    state.history.push({ word: wordName, status, time: Date.now() });
  }

  // ★ 核心：长期累加 + 互斥（同一词只在一个列表里）
  if (isKnown) {
    if (!Array.isArray(state.knownWords)) state.knownWords = [];
    if (!Array.isArray(state.hardWords))  state.hardWords  = [];
    if (!state.knownWords.includes(wordName)) state.knownWords.push(wordName);
    state.hardWords = state.hardWords.filter(x => x !== wordName);
  } else {
    if (!Array.isArray(state.knownWords)) state.knownWords = [];
    if (!Array.isArray(state.hardWords))  state.hardWords  = [];
    if (!state.hardWords.includes(wordName)) state.hardWords.push(wordName);
    state.knownWords = state.knownWords.filter(x => x !== wordName);
  }

  // 飞出方向
  const card = document.getElementById("flashcard");
  if (card) card.classList.add(isKnown ? "fly-out-right" : "fly-out-left");
  toast(isKnown ? CONFIG.toastKnown : CONFIG.toastUnknown);
  updateNavButtons();

  // ★ 立即推进 currentIndex（这样 prev 才能回到刚飞出的那个词）
  currentIndex++;
  state.todayDone++;
  updateStreak();
  saveState();

  setTimeout(() => {
    if (currentIndex >= state.todayQueue.length) {
      onAllDone();
    } else {
      renderCard();
    }
  }, 600);
}

// =============================================================
// TTS 语音朗读（兼容 iOS Safari / 微信内置浏览器）
// =============================================================
let ttsVoice = null;        // 缓存英文发音人（避免 speak 时异步查询）

// 预热发音引擎：iOS/微信首次交互前 getVoices() 为空，提前触发加载并缓存
function warmupVoices() {
  try {
    if (!("speechSynthesis" in window)) return;
    const pick = () => {
      const vs = window.speechSynthesis.getVoices() || [];
      if (!vs.length) return;
      ttsVoice = vs.find(v => v.lang === "en-US" && v.localService)
              || vs.find(v => v.lang === "en-US")
              || vs.find(v => /^en[-_]/i.test(v.lang))
              || null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  } catch (_) {}
}

function speakWord(word) {
  if (!word) return;
  // 容错：浏览器不支持
  if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance === "undefined") {
    toast(CONFIG.toastNoTTS);
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.85;
    u.pitch = 1;
    if (ttsVoice) u.voice = ttsVoice;      // 使用预热的英文发音人
    // ★ 必须在用户点击的同步调用栈里直接 speak，异步会触发移动端拦截
    window.speechSynthesis.speak(u);
  } catch (e) {
    toast(CONFIG.toastNoTTS);
  }
}

function speak() {
  const w = state.todayQueue[currentIndex];
  if (w) speakWord(w.word);
}

// =============================================================
// ★ 今日任务板块（顺序抽词列表）
// =============================================================
function renderMission() {
  const list = document.getElementById("missionList");
  if (!list) return;

  // 词库还没加载好 → 给明确状态 + 重试入口（不再空白）
  if (!wordListReady) {
    if (state.todayQueue.length === 0) {
      list.innerHTML = `
        <div class="mission-empty">
          ${wordListLoading ? "今日任务生成中…" : "词库未加载，无法生成今日任务"}
          ${wordListLoading ? "" : '<button class="mission-retry" onclick="retryWordList()">🔄 重新加载词库</button>'}
        </div>`;
      return;
    }
  }

  const q = state.todayQueue || [];
  if (q.length === 0) {
    list.innerHTML = `<div class="mission-empty">今日任务生成中…</div>`;
    return;
  }
  const cur = q[currentIndex];
  list.innerHTML = q.map((w, i) => {
    const isCur = cur && w.word === cur.word;
    const done  = (state.history || []).some(h => h.word === w.word);
    return `
      <button class="mission-item${isCur ? " is-current" : ""}${done ? " is-done" : ""}"
              onclick="jumpToWord('${w.word}')" title="点击查看并朗读">
        <span class="mission-num">${i + 1}</span>
        <span class="mission-word">${w.word}</span>
        <span class="mission-ph">${w.phonetic || ""}</span>
        ${done ? '<span class="mission-check">✓</span>' : ""}
      </button>`;
  }).join("");
}

// 词库加载失败后手动重试
async function retryWordList() {
  toast("正在重新加载词库…");
  await loadWordList();
  if (wordListReady) {
    checkStreak();
    state.todayQueue = pickTodayQueue();
    currentIndex = 0;
    saveState();
    renderCard();
    renderMission();
    renderTop();
    toast("词库加载成功 ✓");
  } else {
    renderMission();
    toast("词库仍无法加载，请检查 words.json 是否存在");
  }
}

// 点击今日任务里的词 → 同步朗读 + 跳到对应卡片
function jumpToWord(word) {
  const idx = (state.todayQueue || []).findIndex(w => w.word === word);
  if (idx < 0) return;
  // ★ 先同步朗读（必须在用户手势的调用栈内，否则 iOS/微信会拦截发音）
  speakWord(word);
  if (idx === currentIndex) return;
  const card = document.getElementById("flashcard");
  if (card && card.classList.contains("flipped")) {
    navLock = true;
    card.classList.remove("flipped");
    setTimeout(() => {
      currentIndex = idx;
      renderCard();
      renderTop();
      navLock = false;
    }, 400);
  } else {
    currentIndex = idx;
    renderCard();
    renderTop();
  }
}

// =============================================================
// ★ 今日任务面板：展开 / 收起
//    折叠本身由原生 <details> 完成（无 JS 依赖）；
//    这里只做增强：记忆展开状态 + 移动端默认折叠
// =============================================================
const MISSION_OPEN_KEY = "beidanci_mission_open";
function setupMissionPanel() {
  const panel = document.getElementById("missionPanel");
  if (!panel) return;

  // 恢复上次展开状态
  try {
    const saved = localStorage.getItem(MISSION_OPEN_KEY);
    if (saved === "1") panel.setAttribute("open", "");
    else if (saved === "0") panel.removeAttribute("open");
  } catch (e) {}

  // 移动端首次访问：默认折叠，避免首屏被遮挡（已有记录则尊重用户选择）
  try {
    if (localStorage.getItem(MISSION_OPEN_KEY) === null && window.innerWidth < 600) {
      panel.removeAttribute("open");
    }
  } catch (e) {}

  // 记录状态
  panel.addEventListener("toggle", () => {
    try {
      localStorage.setItem(MISSION_OPEN_KEY, panel.open ? "1" : "0");
    } catch (e) {}
  });

  // 点击标题也切换（部分浏览器 summary 点击 + toggle 事件会重复，这里做防抖）
  const head = document.getElementById("missionHead");
  if (head) {
    head.addEventListener("click", (e) => {
      if (e.target.closest(".mission-toggle")) {
        e.preventDefault();
        panel.open = !panel.open;
      }
    });
  }
}

// =============================================================
// ★ 已掌握 Tab 渲染（永久累加）
// =============================================================
function renderKnown() {
  const list = document.getElementById("knownList");
  if (!list) return;
  const words = state.knownWords || [];
  const cnt = document.getElementById("knownCountTab");
  if (cnt) cnt.textContent = words.length;
  if (words.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyKnown}</div>`;
    return;
  }
  const ordered = words.slice().reverse();
  const list2 = wordList;
  list.innerHTML = ordered.map(w => {
    const word = list2.find(x => x.word === w);
    const phonetic = word ? (word.phonetic || "") : "";
    const meaning  = word ? (word.meaning || "") : w;
    const pos      = word ? (word.pos || "") : "";
    return `
      <div class="word-item word-item-known">
        <div class="word-item-row">
          <div class="word-item-clickable" onclick="speakWord('${w}')" title="点击朗读">
            <span class="word-mark mark-known" title="已掌握">✓</span>
            <span class="word-item-w">${w}</span>
            <span style="font-size:13px;color:var(--gold);font-family:var(--font-num);">${phonetic}</span>
          </div>
          <button class="word-item-remove" onclick="unmarkKnown('${w}')" title="移出已掌握（回生词本）">忘了</button>
        </div>
        <div class="word-item-m">${meaning}${pos ? " · " + pos : ""}</div>
      </div>`;
  }).join("");
}

// 把"已掌握"的词移回"生词本"
function unmarkKnown(word) {
  state.knownWords = state.knownWords.filter(x => x !== word);
  if (!state.hardWords.includes(word)) state.hardWords.push(word);
  saveState();
  renderTop();
  renderKnown();
  renderHard();
  toast("已移回生词本");
}

// =============================================================
// 生词本 / 全部词汇 渲染
// =============================================================
function renderHard() {
  const list = document.getElementById("hardList");
  if (!list) return;
  const words = state.hardWords || [];
  const cnt = document.getElementById("hardCount");
  if (cnt) cnt.textContent = words.length;
  if (words.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyHard}</div>`;
    return;
  }
  const list2 = wordList;
  list.innerHTML = words.map(w => {
    const word = list2.find(x => x.word === w);
    const phonetic = word ? (word.phonetic || "") : "";
    const meaning  = word ? (word.meaning || "") : w;
    const pos      = word ? (word.pos || "") : "";
    return `
      <div class="word-item">
        <div class="word-item-left" onclick="speakWord('${w}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:4px 6px;margin:-4px -6px;border-radius:8px;" title="点击朗读">
          <span class="word-mark mark-unknown" title="不认识">✗</span>
          <div style="flex:1;min-width:0;">
            <div class="word-item-w">${w}</div>
            <div class="word-item-m">${meaning}${pos ? " · " + pos : ""}</div>
          </div>
        </div>
        <button class="word-item-remove" onclick="removeFromHard('${w}')" title="移出生词本">✕</button>
      </div>`;
  }).join("");
}
function removeFromHard(word) {
  state.hardWords = state.hardWords.filter(x => x !== word);
  saveState();
  renderTop();
  renderHard();
  toast(CONFIG.toastBack);
}

let allSearchQ = "";
function renderAll() {
  const list = document.getElementById("allList");
  if (!list) return;
  const source = getWordList();
  const cnt = document.getElementById("allCount");
  if (cnt) cnt.textContent = source.length;
  if (!wordListReady) {
    list.innerHTML = `<div class="empty-hint">词库加载中…</div>`;
    return;
  }
  const q = allSearchQ.trim().toLowerCase();
  const filtered = q
    ? source.filter(w =>
        w.word.toLowerCase().includes(q) ||
        (w.phonetic || "").toLowerCase().includes(q) ||
        (w.meaning || "").toLowerCase().includes(q) ||
        (w.example || "").toLowerCase().includes(q))
    : source;
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyAll}</div>`;
    return;
  }
  // ★ 性能优化：超过 500 词时分段渲染
  const MAX = 500;
  const show = filtered.slice(0, MAX);
  const more = filtered.length - show.length;
  list.innerHTML = show.map(w => `
    <div class="word-item">
      <div class="word-item-left" onclick="speakWord('${w.word}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:4px 6px;margin:-4px -6px;border-radius:8px;" title="点击朗读">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:var(--gold-bg);color:var(--gold);font-size:12px;font-weight:800;font-family:var(--font-num);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${w.word.charAt(0).toUpperCase()}</span>
        <div style="flex:1;min-width:0;">
          <div class="word-item-w">${w.word} <span style="font-size:13px;color:var(--gold);font-family:var(--font-num);">${w.phonetic || ""}</span></div>
          <div class="word-item-m">${w.meaning || ""}${w.pos ? " · " + w.pos : ""}</div>
        </div>
      </div>
    </div>`).join("") + (more > 0
      ? `<div class="empty-hint" style="text-align:center;color:var(--ink-soft);">+ 还有 ${more} 个匹配结果，请输入关键字缩小范围</div>`
      : "");
}

function switchTab(name) {
  document.querySelectorAll(".tab-header").forEach(h => h.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  const header = document.querySelector(`.tab-header[data-tab="${name}"]`);
  if (header) header.classList.add("active");
  const pane = document.getElementById(`pane-${name}`);
  if (pane) pane.classList.add("active");
  if (name === "hard")  renderHard();
  if (name === "known") renderKnown();
  if (name === "all")   renderAll();
}

// =============================================================
// 音乐
// =============================================================
let music = null;
let musicStarted = false;
function setupMusic() {
  music = new Audio(CONFIG.musicFile);
  music.loop = true;
  music.volume = 0.4;
  const btn = document.getElementById("musicBtn");
  function startOnce() {
    if (musicStarted) return;
    musicStarted = true;
    music.play().then(() => btn.classList.add("playing")).catch(() => {
      musicStarted = false;
    });
    document.removeEventListener("click", startOnce);
    document.removeEventListener("touchstart", startOnce);
  }
  document.addEventListener("click", startOnce, { once: true });
  document.addEventListener("touchstart", startOnce, { once: true });
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!music) return;
    if (music.paused) { music.play(); btn.classList.add("playing"); }
    else { music.pause(); btn.classList.remove("playing"); }
  });
}

// =============================================================
// 星空粒子（Canvas）
// =============================================================
function setupStarfield() {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  const isMobile = window.innerWidth < 600;
  const COUNT = isMobile ? 30 : 80;
  const stars = [];
  for (let i = 0; i < COUNT; i++) {
    stars.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15 - 0.05,
      a: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      color: CONFIG.starColors[Math.floor(Math.random() * CONFIG.starColors.length)]
    });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      const a = s.a * (0.6 + 0.4 * Math.sin(Date.now() / 1000 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = a;
      ctx.fill();
      if (s.r > 1.2) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = a * 0.15;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener("resize", () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

// =============================================================
// 彩带粒子（完成时）
// =============================================================
function fireConfetti() {
  const canvas = document.getElementById("confetti");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const N = 90;
  const pieces = [];
  for (let i = 0; i < N; i++) {
    pieces.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 4,
      g: 0.4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 12 + 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: CONFIG.starColors[Math.floor(Math.random() * CONFIG.starColors.length)],
      life: 0,
      maxLife: 120 + Math.random() * 60
    });
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.life++;
      if (p.life > p.maxLife) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr;
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

// =============================================================
// 触摸滑动（手机端）
// =============================================================
function setupSwipe() {
  const card = document.getElementById("flashcard");
  if (!card) return;
  let sx = 0, sy = 0, dx = 0, dy = 0, active = false;
  const TH = 80;
  card.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    dx = dy = 0; active = true;
  }, { passive: true });
  card.addEventListener("touchmove", (e) => {
    if (!active) return;
    dx = e.touches[0].clientX - sx;
    dy = e.touches[0].clientY - sy;
    const rot = Math.max(-15, Math.min(15, dx / 20));
    card.style.transform = `translateX(${dx*0.4}px) rotate(${rot}deg)`;
    card.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 400));
  }, { passive: true });
  card.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    card.style.transform = "";
    card.style.opacity = "";
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
      if (dx < 0) answer(true);
      else answer(false);
    }
  });
}

// =============================================================
// 软提示（fetch 失败）— 大 Toast + 顶部 banner，不隐藏主区
// =============================================================
function showSoftHint(e) {
  const isFile = location.protocol === "file:";
  const msg = isFile
    ? "本地直接打开无法读取词库，请用 VS Code 的 Live Server 插件，或上传到 GitHub Pages 查看 ✨"
    : `词库加载失败：${(e && e.message) || "未知错误"}。请检查 words.json 是否与 index.html 在同目录。`;

  // 1) 顶部持久 banner
  const banner = document.createElement("div");
  banner.className = "soft-banner";
  banner.innerHTML = `
    <span class="soft-banner-icon">⚠️</span>
    <span class="soft-banner-text">${msg}</span>
    <button class="soft-banner-close" onclick="this.parentNode.remove()" title="知道了">✕</button>`;
  document.body.appendChild(banner);

  // 2) 大 Toast（停留更久）
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = msg;
    t.classList.add("show", "toast-big");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show", "toast-big"), 6000);
  }
}

// =============================================================
// 启动（async：等词库就绪再渲染主交互区）
// =============================================================
async function init() {
  // ★ 版本自检：旧缓存 → 强制刷新一次
  if (checkAppVersion()) return;

  loadState();
  // 启动装饰（不依赖词库）
  setupStarfield();
  setupMusic();
  setupSwipe();
  setupMissionPanel();     // ★ 今日任务面板（原生 details + 状态记忆）
  warmupVoices();         // ★ TTS 引擎预热（iOS/微信兼容）

  // ★ 每日一句：立即渲染（不依赖词库，绝不卡 Loading）
  renderQuote();

  // 事件绑定
  const card = document.getElementById("flashcard");
  if (card) {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".speaker")) return;
      if (e.target.closest(".nav-btn")) return;
      toggleFlip();
    });
  }
  const speakBtn = document.getElementById("speakBtn");
  if (speakBtn) {
    speakBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      speak();
    });
  }
  const btnUnknown = document.getElementById("btnUnknown");
  if (btnUnknown) btnUnknown.addEventListener("click", () => answer(false));
  const btnKnown = document.getElementById("btnKnown");
  if (btnKnown) btnKnown.addEventListener("click", () => answer(true));
  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); goPrev(); });
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); goNext(); });
  document.querySelectorAll(".tab-header").forEach(h => {
    h.addEventListener("click", () => switchTab(h.dataset.tab));
  });
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", (e) => {
      allSearchQ = e.target.value;
      renderAll();
    });
  }

  // ★ 今日任务列表：先占位，随后渲染
  renderMission();

  // ★ 异步加载词库
  await loadWordList();

  // 加载失败 → 软提示（不隐藏主区，今日任务给出重试入口）
  if (!wordListReady) {
    showSoftHint(wordListError);
    showEmptyCard("词库加载中…");
    renderTop();
    renderMission();
    return;
  }

  // 加载成功 → 检查 streak + 渲染首屏
  checkStreak();
  if (state.todayQueue.length === 0) {
    state.todayQueue = pickTodayQueue();
    state.todayDone = 0;
  }
  saveState();

  // 调试：URL 含 #flip 时首屏直接显示背面
  const startFlipped = location.hash === "#flip" || location.search.includes("flip=1");
  // 调试：URL 含 ?tab=xxx 时默认显示指定 Tab
  const tabParam = new URLSearchParams(location.search).get("tab");

  renderCard(startFlipped);
  renderTop();
  renderHard();
  renderKnown();
  renderAll();
  renderMission();
  if (tabParam) switchTab(tabParam);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
