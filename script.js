// =============================================================
// script.js — 每日背单词 · 主逻辑
// 顶部 CONFIG 集中管理所有可改文案
// 数据源：./words.json（预先生成的 4400+ 词 JSON）
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
  toastEmptyHard:   "生词本是空的～",
  toastNavEdge:     "已经是最后一张啦～",
  tabHardTitle:     "生词本",
  tabKnownTitle:    "已掌握",
  tabAllTitle:      "全部词汇",
  emptyHard:        "还没有生词，遇到不会的词点\u201c不认识\u201d会自动收入这里。",
  emptyKnown:       "还没有掌握任何单词哦～ 试试点\u201c认识啦\u201d积累你的战利品！",
  emptyAll:         "没有匹配的单词",
  searchPH:         "搜索单词或释义…",
  dailyTarget:      10,            // 每天目标词数
  // 数据源（预先生成的 JSON 词库，4400+ 词）
  wordsUrl:         "./words.json",
  // 音乐
  musicFile:        "music.mp3",
  // 颜色（同步 style.css）
  starColors:       ["#FFD194", "#FFB088", "#FFC9D2", "#E8C39E", "#F2E2C2", "#FFFFFF"]
};

// =============================================================
// State（localStorage 持久化）
// =============================================================
const STORAGE_KEY = "beidanci_v2";
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
    // 兼容 v1 旧数据（只有 beidanci_v1 才迁移，新用户直接用 v2）
    const s = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("beidanci_v1");
    if (s) {
      const obj = JSON.parse(s);
      state = Object.assign(state, obj);
    }
  } catch(e) {}
  // 防御：旧版本数据迁移
  if (!Array.isArray(state.knownWords)) {
    state.knownWords = state.known && typeof state.known === "object"
      ? Object.keys(state.known) : [];
  }
  if (!Array.isArray(state.hardWords)) {
    state.hardWords = Array.isArray(state.hardList) ? state.hardList : [];
  }
  if (!Array.isArray(state.history)) state.history = [];
}

// =============================================================
// 词库加载（fetch ./words.json）— 异步、容错
// =============================================================
let wordList = [];            // 已加载的词库
let wordListReady = false;    // 是否就绪
let wordListError = null;     // 加载错误

async function loadWordList() {
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
function pickTodayQueue() {
  const list = getWordList();
  const n = Math.min(CONFIG.dailyTarget, list.length);
  return shuffle(list).slice(0, n);
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
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// =============================================================
// 渲染：顶部进度
// =============================================================
function renderTop() {
  // 今日进度
  document.getElementById("todayText").textContent =
    `${CONFIG.todayLabel}：${state.todayDone} / ${state.todayQueue.length}`;
  // 连续打卡
  document.getElementById("streakNum").textContent = state.streak;
  // ★ 今日已学统计（按日期清空）
  const hist = state.history || [];
  const knownN = hist.filter(h => h.status === "known").length;
  const unknownN = hist.length - knownN;
  document.getElementById("studyCount").textContent = hist.length;
  document.getElementById("knownCount").textContent = knownN;
  document.getElementById("unknownCount").textContent = unknownN;
  // ★ 累计掌握（永久累加）
  const totalKnown = (state.knownWords || []).length;
  document.getElementById("knownTotal").textContent = totalKnown;
  const totalWords = wordListReady ? wordList.length : 0;
  const cumPct = totalWords > 0 ? Math.round(totalKnown / totalWords * 100) : 0;
  document.getElementById("cumulativePct").textContent = cumPct;
  // 进度条
  const pct = state.todayQueue.length > 0
    ? Math.round(state.todayDone / state.todayQueue.length * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
}

// =============================================================
// 渲染：单词卡
// =============================================================
let currentIndex = 0;
function renderCard(keepFlipped = false) {
  const cardEl = document.getElementById("flashcard");
  if (state.todayQueue.length === 0) {
    // 词库没就绪 或 还没生成队列
    if (!wordListReady) {
      showEmptyCard("词库加载中…");
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
  updateNavButtons();
}

function showEmptyCard(msg) {
  const cardEl = document.getElementById("flashcard");
  document.getElementById("wordMain").textContent = msg;
  document.getElementById("wordMainBack").textContent = msg;
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
  document.getElementById("flashcard").classList.toggle("flipped");
}

// =============================================================
// ★ 左右翻阅（新）
// =============================================================
let navLock = false;   // 平滑过渡锁：避免动画中连点导致错乱
function goPrev() {
  if (navLock) return;
  const card = document.getElementById("flashcard");
  if (card.classList.contains("fly-out-left") || card.classList.contains("fly-out-right")) return;
  if (currentIndex <= 0) { toast(CONFIG.toastNavEdge); return; }
  navTo(currentIndex - 1);
}
function goNext() {
  if (navLock) return;
  const card = document.getElementById("flashcard");
  if (card.classList.contains("fly-out-left") || card.classList.contains("fly-out-right")) return;
  if (currentIndex >= state.todayQueue.length - 1) { toast(CONFIG.toastNavEdge); return; }
  navTo(currentIndex + 1);
}

// 翻阅核心：若当前在背面，先翻回正面再切换文本
function navTo(idx) {
  const card = document.getElementById("flashcard");
  if (card.classList.contains("flipped")) {
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
  card.classList.add(isKnown ? "fly-out-right" : "fly-out-left");
  toast(isKnown ? CONFIG.toastKnown : CONFIG.toastUnknown);
  updateNavButtons();

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
// TTS
// =============================================================
function speakWord(word) {
  if (!word || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US"; u.rate = 0.85; u.pitch = 1;
  window.speechSynthesis.speak(u);
}
function speak() {
  const w = state.todayQueue[currentIndex];
  if (w) speakWord(w.word);
}

// =============================================================
// ★ 已掌握 Tab 渲染（永久累加）
// =============================================================
function renderKnown() {
  const list = document.getElementById("knownList");
  const words = state.knownWords || [];
  document.getElementById("knownCountTab").textContent = words.length;
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
  const words = state.hardWords || [];
  document.getElementById("hardCount").textContent = words.length;
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
  const source = getWordList();
  document.getElementById("allCount").textContent = source.length;
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

  // 1) 顶部持久 banner（浅红柔和背景，不挡内容）
  const banner = document.createElement("div");
  banner.className = "soft-banner";
  banner.innerHTML = `
    <span class="soft-banner-icon">⚠️</span>
    <span class="soft-banner-text">${msg}</span>
    <button class="soft-banner-close" onclick="this.parentNode.remove()" title="知道了">✕</button>`;
  document.body.appendChild(banner);

  // 2) 大 Toast（停留更久）
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show", "toast-big");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show", "toast-big"), 6000);
}

// =============================================================
// 启动（async：等词库就绪再渲染主交互区）
// =============================================================
async function init() {
  loadState();
  // 启动装饰（不依赖词库）
  setupStarfield();
  setupMusic();
  setupSwipe();

  // 事件绑定
  document.getElementById("flashcard").addEventListener("click", (e) => {
    if (e.target.closest(".speaker")) return;
    if (e.target.closest(".nav-btn")) return;
    toggleFlip();
  });
  document.getElementById("speakBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    speak();
  });
  document.getElementById("btnUnknown").addEventListener("click", () => answer(false));
  document.getElementById("btnKnown").addEventListener("click",   () => answer(true));
  document.getElementById("prevBtn").addEventListener("click", (e) => { e.stopPropagation(); goPrev(); });
  document.getElementById("nextBtn").addEventListener("click", (e) => { e.stopPropagation(); goNext(); });
  document.querySelectorAll(".tab-header").forEach(h => {
    h.addEventListener("click", () => switchTab(h.dataset.tab));
  });
  document.getElementById("searchBox").addEventListener("input", (e) => {
    allSearchQ = e.target.value;
    renderAll();
  });

  // ★ 异步加载词库
  await loadWordList();

  // 加载失败 → 软提示（不隐藏主区，累计掌握仍能显示）
  if (!wordListReady) {
    showSoftHint(wordListError);
    showEmptyCard("词库加载中…");
    renderTop();
    return;
  }

  // 加载成功 → 检查 streak + 渲染首屏
  checkStreak();
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
  if (tabParam) switchTab(tabParam);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
