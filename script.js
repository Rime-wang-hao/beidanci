// =============================================================
// script.js — 每日背单词 · 主逻辑  (v4)
// ★ 版本号：改动后请同步更新这里 + index.html 里的 ?v= 参数
// =============================================================

const APP_VERSION = "v4.0.0";

// ★ 每日一句：30 句「坚持 / 努力 / 越努力越幸运」英中双语谚语
const DAILY_QUOTES = [
  { en: "Where there is a will, there is a way.",                      zh: "有志者，事竟成。" },
  { en: "No pain, no gain.",                                          zh: "一分耕耘，一分收获。" },
  { en: "Constant dropping wears the stone.",                         zh: "滴水穿石。" },
  { en: "The harder you work, the luckier you get.",                  zh: "越努力，越幸运。" },
  { en: "Don't watch the clock; do what it does. Keep going.",        zh: "不要盯着时钟看，要像它一样不停前行。" },
  { en: "Little by little, one travels far.",                         zh: "积少成多，终至千里。" },
  { en: "Mistakes are proof that you are trying.",                    zh: "犯错证明你正在努力尝试。" },
  { en: "The expert in anything was once a beginner.",                zh: "任何专家都曾是初学者。" },
  { en: "Push yourself, because no one else is going to do it for you.", zh: "逼自己一把，因为没人会替你努力。" },
  { en: "Great things never come from comfort zones.",                zh: "伟大的成就从不来自舒适区。" },
  { en: "Dream it. Wish it. Do it.",                                  zh: "梦想它，渴望它，然后做到它。" },
  { en: "Success is the sum of small efforts repeated day in and day out.", zh: "成功是日复一日小小努力的累积。" },
  { en: "It always seems impossible until it's done.",                zh: "在完成之前，一切总看似不可能。" },
  { en: "Don't stop when you're tired. Stop when you're done.",       zh: "累了不要停，做完了再停。" },
  { en: "Wake up with determination. Go to bed with satisfaction.",   zh: "带着决心醒来，带着满足入睡。" },
  { en: "Do something today that your future self will thank you for.", zh: "做今天会让未来的自己感激的事。" },
  { en: "Little things make big days.",                               zh: "点滴小事，成就丰盛的一天。" },
  { en: "It's going to be hard, but hard does not mean impossible.",  zh: "这会很难，但难不代表不可能。" },
  { en: "Don't wait for opportunity. Create it.",                     zh: "不要等待机会，去创造机会。" },
  { en: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", zh: "考验不是为了暴露弱点，而是为了发现优势。" },
  { en: "The key to success is to focus on goals, not obstacles.",    zh: "成功的关键是盯着目标，而不是障碍。" },
  { en: "Believe in yourself and all that you are.",                  zh: "相信自己，相信你所拥有的一切。" },
  { en: "A river cuts through rock, not because of its power, but because of its persistence.", zh: "河流穿透岩石，靠的不是力量，而是坚持。" },
  { en: "Every word you learn is a step forward.",                    zh: "每学会一个词，都是向前的一步。" },
  { en: "Learning is a treasure that follows its owner everywhere.",  zh: "知识是随身相伴的宝藏。" },
  { en: "Practice makes perfect.",                                   zh: "熟能生巧。" },
  { en: "Rome was not built in a day.",                              zh: "罗马不是一天建成的。" },
  { en: "Actions speak louder than words.",                          zh: "行动胜于空谈。" },
  { en: "Fall seven times, stand up eight.",                          zh: "跌倒七次，站起来八次。" },
  { en: "The best time to plant a tree was 20 years ago. The second best time is now.", zh: "种树最好的时间是二十年前，其次是现在。" }
];

// =============================================================
// CONFIG —— 集中管理所有可改文案
// =============================================================
const CONFIG = {
  todayLabel:   "今日进度",
  streakUnit:   "天",
  cardTapHint:  "轻触卡片 · 查看释义",
  btnUnknown:   "不认识",
  btnKnown:     "认识啦",
  toastKnown:   "已掌握 ✨",
  toastUnknown: "已加入生词本",
  toastAllDone: "太棒了，今日任务完成！",
  toastBack:    "已移出生词本",
  toastNavEdge: "已经是最后一张啦～",
  toastNoTTS:   "您的浏览器暂不支持朗读",
  emptyHard:    "还没有生词，遇到不会的词点\u201c不认识\u201d会自动收入这里。",
  emptyKnown:   "还没有掌握任何单词哦～ 试试点\u201c认识啦\u201d积累你的战利品！",
  emptyWrong:   "错题集是空的，去\u201c✍️ 去默写\u201d练练手吧！",
  emptyAll:     "没有匹配的单词",
  dailyTarget:  20,             // ★ 每天 20 个词（顺序连贯抽取）
  wordsUrl:     "./words.json",
  musicFile:    "music.mp3",
  starColors:   ["#FFD194", "#FFB088", "#FFC9D2", "#E8C39E", "#F2E2C2", "#FFFFFF"],
  quotes:       DAILY_QUOTES
};

// =============================================================
// ★ 版本自检：旧缓存 → 自动强制刷新一次
// =============================================================
function checkAppVersion() {
  try {
    const KEY = "beidanci_app_version";
    const saved = localStorage.getItem(KEY);
    if (saved && saved !== APP_VERSION && !sessionStorage.getItem("beidanci_reloaded")) {
      sessionStorage.setItem("beidanci_reloaded", "1");
      localStorage.setItem(KEY, APP_VERSION);
      location.reload(true);
      return true;
    }
    localStorage.setItem(KEY, APP_VERSION);
  } catch (e) {}
  return false;
}

// =============================================================
// State（localStorage 持久化）
// ★ STORAGE_KEY 升到 v4：数据结构大改，强制清空一次旧缓存
// =============================================================
const STORAGE_KEY = "beidanci_v4";
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
  knownWords: [],         // 长期累加：所有"认识"的词
  hardWords: [],          // 长期累加：所有"不认识"的词
  wrongWords: [],         // ★ 错题集（默写拼错的词，永久保存）
  history: [],            // 今日所有操作过的词（按日期清空）
  startDay: null,         // ★「从头开始」的锚点（年内第几天）
  dictationLog: {}        // ★ 每日默写成绩 { "2026-10-21": {correct, total} }
};

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) state = Object.assign(state, JSON.parse(s));
  } catch (e) {}
  // 脏数据防御
  if (!Array.isArray(state.knownWords)) state.knownWords = [];
  if (!Array.isArray(state.hardWords))  state.hardWords  = [];
  if (!Array.isArray(state.wrongWords)) state.wrongWords = [];
  if (!Array.isArray(state.history))    state.history    = [];
  if (!Array.isArray(state.todayQueue)) state.todayQueue = [];
  if (typeof state.startDay !== "number" || state.startDay <= 0) state.startDay = null;
  if (!state.dictationLog || typeof state.dictationLog !== "object") state.dictationLog = {};
}

// =============================================================
// 词库加载（fetch ./words.json）— 异步、容错、可重试
// =============================================================
let wordList = [];
let wordListReady = false;
let wordListError = null;
let wordListLoading = false;

async function loadWordList() {
  if (wordListLoading) return;
  wordListLoading = true;
  try {
    const r = await fetch(CONFIG.wordsUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("词库为空或格式错误");
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
function getWordList() { return wordListReady ? wordList : []; }

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

// ★ 某日期是今年的第几天（1 ~ 366）；不传参则取今天
function dayOfYear(d) {
  const now = d instanceof Date ? d : new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}
function dateFromDayOffset(offset) {   // offset = 0 今天，1 昨天 …
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d;
}

// ★ 锚点：默认以"今天"为第 1 组（从词库开头 A 连贯背）
//   用户点「🔁 从头开始」可重设锚点
function getAnchorDay() {
  return (typeof state.startDay === "number" && state.startDay > 0) ? state.startDay : dayOfYear();
}

// ★ 核心：按"组"连贯截取词库
//   offsetDays = 距基准日的天数（可为负 → 空）
//   超出总词数时 → 从词库末尾往前取 n 个（仍是连贯的一段，不跳词）
function sliceQueue(offsetDays) {
  const list = getWordList();
  if (!list.length) return [];
  const n = Math.min(CONFIG.dailyTarget, list.length);
  const startIndex = offsetDays * n;
  if (startIndex < 0) return [];
  if (startIndex + n <= list.length) return list.slice(startIndex, startIndex + n);
  const endStart = Math.max(0, list.length - n);
  return list.slice(endStart, endStart + n);
}

// ★ 今日任务（以锚点为基准）
function pickTodayQueue() {
  return sliceQueue(dayOfYear() - getAnchorDay());
}

// ★ 历史任务（以元旦为基准的年度绝对日序，用于历史回顾）
function pickHistoryQueue(dateObj) {
  return sliceQueue(dayOfYear(dateObj) - 1);
}

// 今天背到第几组（用于展示进度）
function missionGroupInfo() {
  const list = getWordList();
  if (!list.length) return { group: 0, total: 0 };
  const n = Math.min(CONFIG.dailyTarget, list.length);
  const offset = dayOfYear() - getAnchorDay();
  const total = Math.ceil(list.length / n);
  if (offset < 0) return { group: 0, total };
  if (offset * n + n <= list.length) return { group: Math.floor(offset) + 1, total };
  return { group: total, total };
}

function checkStreak() {
  if (!wordListReady) return;
  if (state.lastStudyDate !== today()) {
    if (state.lastStudyDate === yesterday()) {
      // 连续
    } else if (state.lastStudyDate) {
      state.streak = 0;
    }
    state.todayQueue = pickTodayQueue();
    state.todayDone = 0;
    state.history = [];        // 新的一天清空今日已学
  }
}
function updateStreak() {
  if (state.lastStudyDate !== today()) {
    if (state.lastStudyDate === yesterday() || state.streak === 0) state.streak += 1;
    else if (state.lastStudyDate) state.streak = 1;
    else state.streak = 1;
    state.lastStudyDate = today();
  }
}
function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function fmtDateCn(d) {
  const week = ["日","一","二","三","四","五","六"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${week}`;
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
// ★★ 每日一句（英中双语，不依赖任何异步加载）
// =============================================================
function renderQuote() {
  const el = document.getElementById("quoteText");
  const zh = document.getElementById("quoteZh");
  if (!el) return;
  const list = (Array.isArray(DAILY_QUOTES) && DAILY_QUOTES.length) ? DAILY_QUOTES : CONFIG.quotes;
  if (!list || !list.length) return;
  const item = list[dayOfYear() % list.length];
  el.textContent = item.en;
  if (zh) zh.textContent = item.zh;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderQuote);
} else {
  renderQuote();
}

// =============================================================
// ★ 日期显示
// =============================================================
function renderDate() {
  const el = document.getElementById("dateText");
  if (el) el.textContent = "今天是 " + fmtDateCn(new Date());
}

// =============================================================
// 渲染：顶部进度
// =============================================================
function renderTop() {
  const setNum = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setNum("todayText", `${CONFIG.todayLabel}：${state.todayDone} / ${state.todayQueue.length}`);
  setNum("streakNum", state.streak);

  const hist = state.history || [];
  const knownN = hist.filter(h => h.status === "known").length;
  const unknownN = hist.length - knownN;
  setNum("studyCount", hist.length);
  setNum("knownCount", knownN);
  setNum("unknownCount", unknownN);

  const totalKnown = (state.knownWords || []).length;
  setNum("knownTotal", totalKnown);
  const totalWords = wordListReady ? wordList.length : 0;
  setNum("cumulativePct", totalWords > 0 ? Math.round(totalKnown / totalWords * 100) : 0);

  // Tab 计数
  setNum("hardCount", (state.hardWords || []).length);
  setNum("knownCountTab", totalKnown);
  setNum("wrongCount", (state.wrongWords || []).length);
  setNum("allCount", totalWords);

  const fill = document.getElementById("progressFill");
  if (fill) {
    const pct = state.todayQueue.length > 0
      ? Math.round(state.todayDone / state.todayQueue.length * 100) : 0;
    fill.style.width = pct + "%";
  }

  // 今日任务副标题：第几组 / 共几组
  const sub = document.getElementById("missionSub");
  if (sub && wordListReady) {
    const g = missionGroupInfo();
    sub.textContent = g.total > 0 ? `第 ${g.group} / ${g.total} 组 · 每天 20 词` : "每天 20 词";
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
  if (currentIndex >= state.todayQueue.length) { onAllDone(); return; }
  const w = state.todayQueue[currentIndex];
  document.getElementById("wordMain").textContent = w.word;
  const back = document.getElementById("wordMainBack");
  if (back) back.textContent = w.word;
  document.getElementById("phonetic").textContent = w.phonetic || "";
  document.getElementById("posTag").textContent = w.pos || "";
  document.getElementById("meaning").textContent = w.meaning || "";
  document.getElementById("example").textContent = w.example || "";
  cardEl.classList.remove("fly-out-left", "fly-out-right");
  if (keepFlipped) cardEl.classList.add("flipped");
  else cardEl.classList.remove("flipped");
  void cardEl.offsetWidth;
  renderTop();
  renderMission();
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
let navLock = false;
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
  if (!wordListReady) return;
  const w = state.todayQueue[currentIndex];
  if (!w) return;
  const wordName = w.word;
  const status = isKnown ? "known" : "unknown";

  if (!Array.isArray(state.history)) state.history = [];
  const existingIdx = state.history.findIndex(h => h.word === wordName);
  if (existingIdx >= 0) {
    state.history[existingIdx].status = status;
    state.history[existingIdx].time = Date.now();
  } else {
    state.history.push({ word: wordName, status, time: Date.now() });
  }

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

  const card = document.getElementById("flashcard");
  if (card) card.classList.add(isKnown ? "fly-out-right" : "fly-out-left");
  toast(isKnown ? CONFIG.toastKnown : CONFIG.toastUnknown);
  updateNavButtons();

  currentIndex++;
  state.todayDone++;
  updateStreak();
  saveState();

  setTimeout(() => {
    if (currentIndex >= state.todayQueue.length) onAllDone();
    else renderCard();
  }, 600);
}

// =============================================================
// TTS 语音朗读（兼容 iOS Safari / 微信内置浏览器）
// =============================================================
let ttsVoice = null;
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
    if (ttsVoice) u.voice = ttsVoice;
    // ★ 必须在用户点击的同步调用栈里直接 speak
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

  if (!wordListReady && state.todayQueue.length === 0) {
    list.innerHTML = `
      <div class="mission-empty">
        ${wordListLoading ? "今日任务生成中…" : "词库未加载，无法生成今日任务"}
        ${wordListLoading ? "" : '<button class="mission-retry" onclick="retryWordList()">🔄 重新加载词库</button>'}
      </div>`;
    return;
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

function jumpToWord(word) {
  const idx = (state.todayQueue || []).findIndex(w => w.word === word);
  if (idx < 0) return;
  speakWord(word);            // ★ 同步朗读
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

async function retryWordList() {
  toast("正在重新加载词库…");
  await loadWordList();
  if (wordListReady) {
    checkStreak();
    if (state.todayQueue.length === 0) state.todayQueue = pickTodayQueue();
    currentIndex = 0;
    saveState();
    renderCard();
    renderMission();
    renderTop();
    renderAll();
    renderWrong();
    setupHistorySelect();
    toast("词库加载成功 ✓");
  } else {
    renderMission();
    toast("词库仍无法加载，请检查 words.json 是否存在");
  }
}

// =============================================================
// ★ 今日任务面板：原生 <details> + 状态记忆
// =============================================================
const MISSION_OPEN_KEY = "beidanci_mission_open";
function setupMissionPanel() {
  const panel = document.getElementById("missionPanel");
  if (!panel) return;
  try {
    const saved = localStorage.getItem(MISSION_OPEN_KEY);
    if (saved === "1") panel.setAttribute("open", "");
    else if (saved === "0") panel.removeAttribute("open");
    else if (window.innerWidth < 600) panel.removeAttribute("open");
  } catch (e) {}
  panel.addEventListener("toggle", () => {
    try { localStorage.setItem(MISSION_OPEN_KEY, panel.open ? "1" : "0"); } catch (e) {}
  });
}

// =============================================================
// ★★ 历史回顾（只读查看过去某天的任务）
// =============================================================
function setupHistorySelect() {
  const sel = document.getElementById("historySelect");
  if (!sel) return;
  const opts = [];
  for (let i = 0; i < 14; i++) {
    const d = dateFromDayOffset(i);
    const label = i === 0 ? "今天" : (i === 1 ? "昨天" : `${d.getMonth()+1}/${d.getDate()}`);
    opts.push(`<option value="${i}">${label}</option>`);
  }
  sel.innerHTML = opts.join("");
  sel.value = "0";
  sel.onchange = () => renderHistory(parseInt(sel.value, 10) || 0);
  renderHistory(0);
}

function renderHistory(offset) {
  const box = document.getElementById("historyList");
  if (!box) return;
  if (!wordListReady) { box.innerHTML = ""; return; }
  const d = dateFromDayOffset(offset);
  // ★ 今天 → 与上方「今日任务」完全一致；历史日期 → 按年度日序（1月1日起 每天20词）推算
  const q = (offset === 0) ? pickTodayQueue() : pickHistoryQueue(d);
  if (!q.length) {
    box.innerHTML = `<div class="history-empty">这一天还没有分配任务</div>`;
    return;
  }
  const log = state.dictationLog[today()] || null;
  const tag = offset === 0 ? "今天" : `${d.getMonth()+1}月${d.getDate()}日`;
  const note = offset === 0 ? "（与上方今日任务一致）" : "（按年度日序推算）";
  box.innerHTML = `
    <div class="history-title">${tag}的任务${note}
      ${offset === 0 && log ? `<span class="history-log">默写 ${log.correct}/${log.total}</span>` : ""}
    </div>
    <div class="history-words">${q.map(w => `
      <span class="history-word" onclick="speakWord('${w.word}')" title="点击朗读">${w.word}</span>
    `).join("")}</div>`;
}

// =============================================================
// ★★ 默写模式（全屏遮罩）
// =============================================================
const dictation = {
  queue: [],        // 今日 20 词
  index: 0,
  correct: 0,
  wrong: [],        // 本次默写错的词
  locked: false     // 判定后短暂锁定，防止连点
};

function openDictation() {
  if (!wordListReady) { toast("词库还没加载好，请稍候…"); return; }
  if (!state.todayQueue.length) { toast("今日任务还没生成"); return; }
  dictation.queue = state.todayQueue.slice();
  dictation.index = 0;
  dictation.correct = 0;
  dictation.wrong = [];
  dictation.locked = false;

  const ov = document.getElementById("dictationOverlay");
  const stage = document.getElementById("dictationStage");
  const result = document.getElementById("dictationResult");
  if (stage) stage.style.display = "";
  if (result) result.style.display = "none";
  if (ov) { ov.classList.add("show"); ov.setAttribute("aria-hidden", "false"); }
  document.body.classList.add("dictation-open");
  renderDictationItem();
}

function closeDictation() {
  const ov = document.getElementById("dictationOverlay");
  if (ov) { ov.classList.remove("show"); ov.setAttribute("aria-hidden", "true"); }
  document.body.classList.remove("dictation-open");
  dictation.locked = false;
}

function renderDictationItem() {
  const w = dictation.queue[dictation.index];
  if (!w) { finishDictation(); return; }
  const prog = document.getElementById("dictationProgress");
  if (prog) prog.textContent = `${dictation.index + 1} / ${dictation.queue.length}`;
  const mean = document.getElementById("dictationMeaning");
  if (mean) mean.textContent = w.meaning || w.word;
  const input = document.getElementById("dictationInput");
  if (input) { input.value = ""; input.disabled = false; setTimeout(() => input.focus(), 60); }
  const fb = document.getElementById("dictationFeedback");
  if (fb) { fb.textContent = ""; fb.className = "dictation-feedback"; }
  const btn = document.getElementById("dictationSubmit");
  if (btn) { btn.disabled = false; btn.textContent = "提交"; }
  dictation.locked = false;
}

function submitDictation() {
  if (dictation.locked) return;
  const w = dictation.queue[dictation.index];
  if (!w) return;
  const input = document.getElementById("dictationInput");
  const val = (input.value || "").trim().toLowerCase();
  if (!val) { toast("请先输入英文单词"); return; }

  const fb = document.getElementById("dictationFeedback");
  const btn = document.getElementById("dictationSubmit");
  dictation.locked = true;
  input.disabled = true;
  if (btn) btn.disabled = true;

  const right = val === w.word.toLowerCase();
  if (right) {
    dictation.correct++;
    if (fb) { fb.className = "dictation-feedback ok"; fb.textContent = "✓ 拼写正确"; }
  } else {
    dictation.wrong.push(w);
    addWrongWord(w.word);                      // ★ 加入错题集（永久保存）
    if (fb) {
      fb.className = "dictation-feedback err";
      fb.innerHTML = `✗ 拼写错误，正确拼写：<strong class="dictation-answer">${w.word}</strong>`;
    }
  }

  setTimeout(() => {
    dictation.index++;
    if (dictation.index >= dictation.queue.length) finishDictation();
    else renderDictationItem();
  }, right ? 900 : 1900);
}

function finishDictation() {
  const total = dictation.queue.length;
  const correct = dictation.correct;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  // 记录今日默写成绩
  state.dictationLog[today()] = { correct, total };
  saveState();

  const stage = document.getElementById("dictationStage");
  const result = document.getElementById("dictationResult");
  if (stage) stage.style.display = "none";
  if (result) result.style.display = "";

  const emoji = document.getElementById("dictationResultEmoji");
  const score = document.getElementById("dictationScore");
  const detail = document.getElementById("dictationDetail");
  if (emoji) emoji.textContent = pct === 100 ? "🏆" : (pct >= 80 ? "🎉" : (pct >= 60 ? "💪" : "📖"));
  if (score) score.textContent = `正确率 ${pct}%`;
  if (detail) {
    const wrongList = dictation.wrong.length
      ? `<div class="dictation-wrong-list">${dictation.wrong.map(w =>
          `<span class="dictation-wrong-item" onclick="speakWord('${w.word}')">${w.word}</span>`).join("")}</div>`
      : `<div class="dictation-perfect">全对！太棒了 ✨</div>`;
    detail.innerHTML = `答对 ${correct} / ${total} 题${dictation.wrong.length ? "，错词已收入错题集：" : ""}${wrongList}`;
  }
  renderWrong();
  renderTop();
  renderHistory(parseInt((document.getElementById("historySelect") || {}).value, 10) || 0);
}

// =============================================================
// ★ 错题集 Tab
// =============================================================
function addWrongWord(word) {
  if (!Array.isArray(state.wrongWords)) state.wrongWords = [];
  if (!state.wrongWords.includes(word)) state.wrongWords.push(word);
  saveState();
  renderTop();        // ★ 刷新「错题集」Tab 计数
}
function removeFromWrong(word) {
  state.wrongWords = state.wrongWords.filter(x => x !== word);
  saveState();
  renderTop();
  renderWrong();
  toast("已移出错题集");
}
function renderWrong() {
  const list = document.getElementById("wrongList");
  if (!list) return;
  const words = state.wrongWords || [];
  const cnt = document.getElementById("wrongCount");
  if (cnt) cnt.textContent = words.length;
  if (words.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyWrong}</div>`;
    return;
  }
  const ordered = words.slice().reverse();
  const src = wordList;
  list.innerHTML = ordered.map(w => {
    const word = src.find(x => x.word === w);
    const phonetic = word ? (word.phonetic || "") : "";
    const meaning  = word ? (word.meaning || "") : "";
    const pos      = word ? (word.pos || "") : "";
    return `
      <div class="word-item word-item-wrong">
        <div class="word-item-row">
          <div class="word-item-clickable" onclick="speakWord('${w}')" title="点击朗读">
            <span class="word-mark mark-wrong" title="错题">✗</span>
            <span class="word-item-w">${w}</span>
            <span style="font-size:13px;color:var(--gold);font-family:var(--font-num);">${phonetic}</span>
          </div>
          <button class="word-item-remove" onclick="removeFromWrong('${w}')" title="移出错题集">✕</button>
        </div>
        <div class="word-item-m">${meaning}${pos ? " · " + pos : ""}</div>
      </div>`;
  }).join("");
}

// =============================================================
// ★ 已掌握 Tab 渲染（永久累加）
// =============================================================
function renderKnown() {
  const list = document.getElementById("knownList");
  if (!list) return;
  const words = state.knownWords || [];
  if (words.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyKnown}</div>`;
    return;
  }
  const ordered = words.slice().reverse();
  const src = wordList;
  list.innerHTML = ordered.map(w => {
    const word = src.find(x => x.word === w);
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
  if (words.length === 0) {
    list.innerHTML = `<div class="empty-hint">${CONFIG.emptyHard}</div>`;
    return;
  }
  const src = wordList;
  list.innerHTML = words.map(w => {
    const word = src.find(x => x.word === w);
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
  const MAX = 500;
  const show = filtered.slice(0, MAX);
  const more = filtered.length - show.length;
  list.innerHTML = show.map(w => `
    <div class="word-item">
      <div class="word-item-left" onclick="speakWord('${w.word}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:4px 6px;margin:-4px -6px;border-radius:8px;" title="点击朗读">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:var(--gold-light);color:var(--gold);font-size:12px;font-weight:800;font-family:var(--font-num);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${w.word.charAt(0).toUpperCase()}</span>
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
  if (name === "wrong") renderWrong();
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
    music.play().then(() => btn.classList.add("playing")).catch(() => { musicStarted = false; });
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
  const COUNT = window.innerWidth < 600 ? 30 : 80;
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
  const pieces = [];
  for (let i = 0; i < 90; i++) {
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
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 1 - p.life / p.maxLife;
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
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
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
      if (dx < 0) answer(true); else answer(false);
    }
  });
}

// =============================================================
// 软提示（fetch 失败）
// =============================================================
function showSoftHint(e) {
  const isFile = location.protocol === "file:";
  const msg = isFile
    ? "本地直接打开无法读取词库，请用 VS Code 的 Live Server 插件，或上传到 GitHub Pages 查看 ✨"
    : `词库加载失败：${(e && e.message) || "未知错误"}。请检查 words.json 是否与 index.html 在同目录。`;
  const banner = document.createElement("div");
  banner.className = "soft-banner";
  banner.innerHTML = `
    <span class="soft-banner-icon">⚠️</span>
    <span class="soft-banner-text">${msg}</span>
    <button class="soft-banner-close" onclick="this.parentNode.remove()" title="知道了">✕</button>`;
  document.body.appendChild(banner);
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = msg;
    t.classList.add("show", "toast-big");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show", "toast-big"), 6000);
  }
}

// =============================================================
// 启动
// =============================================================
async function init() {
  if (checkAppVersion()) return;      // 旧缓存 → 强制刷新

  loadState();
  setupStarfield();
  setupMusic();
  setupSwipe();
  setupMissionPanel();
  warmupVoices();

  renderDate();        // ★ 日期
  renderQuote();       // ★ 每日一句（双语）
  renderMission();     // ★ 今日任务占位

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
  if (speakBtn) speakBtn.addEventListener("click", (e) => { e.stopPropagation(); speak(); });
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
    searchBox.addEventListener("input", (e) => { allSearchQ = e.target.value; renderAll(); });
  }

  // ★ 去默写
  const dictationBtn = document.getElementById("dictationBtn");
  if (dictationBtn) dictationBtn.addEventListener("click", openDictation);
  const dictationClose = document.getElementById("dictationClose");
  if (dictationClose) dictationClose.addEventListener("click", closeDictation);
  const dictationSubmit = document.getElementById("dictationSubmit");
  if (dictationSubmit) dictationSubmit.addEventListener("click", submitDictation);
  const dictationAgain = document.getElementById("dictationAgain");
  if (dictationAgain) dictationAgain.addEventListener("click", openDictation);
  const dictationDone = document.getElementById("dictationDone");
  if (dictationDone) dictationDone.addEventListener("click", closeDictation);
  const dictationInput = document.getElementById("dictationInput");
  if (dictationInput) {
    dictationInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitDictation(); }
    });
  }
  const overlay = document.getElementById("dictationOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeDictation(); });
  }

  // ★ 从头开始
  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      if (!wordListReady) { toast("词库还没加载好，请稍候…"); return; }
      state.startDay = dayOfYear();          // 锚点设为今天 → 从 A 开头
      state.todayQueue = pickTodayQueue();
      currentIndex = 0;
      state.todayDone = 0;
      saveState();
      renderCard();
      renderTop();
      setupHistorySelect();
      toast("已从词库开头（A）重新开始 ✓");
    });
  }

  // ★ 异步加载词库
  await loadWordList();

  if (!wordListReady) {
    showSoftHint(wordListError);
    showEmptyCard("词库加载中…");
    renderTop();
    renderMission();
    return;
  }

  checkStreak();
  if (state.todayQueue.length === 0) {
    state.todayQueue = pickTodayQueue();
    state.todayDone = 0;
  }
  saveState();

  const startFlipped = location.hash === "#flip" || location.search.includes("flip=1");
  const tabParam = new URLSearchParams(location.search).get("tab");

  renderCard(startFlipped);
  renderTop();
  renderHard();
  renderKnown();
  renderWrong();
  renderAll();
  renderMission();
  setupHistorySelect();
  if (tabParam) switchTab(tabParam);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
