/* ═══════════ MORSELAB — core: router, settings, dashboard, translator ═══════════ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ────────── persistent state ────────── */
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem("morse." + k); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(k, v) { try { localStorage.setItem("morse." + k, JSON.stringify(v)); } catch (e) {} }
};

let settings = Object.assign({
  theme: "dark", font: "mono", large: "0", reduced: "0",
  autodetect: "1", autospace: "1", symbols: ".−", caps: "upper",
  letterSpace: 1, wordSpace: 3, shortcuts: "1", hc: "0",
  wpm: 15, tone: 600, volume: 70, vibration: false, flashing: true
}, store.get("settings", {}));

let stats = Object.assign({
  correct: 0, wrong: 0, learned: [], bestWpm: 0, practiceMs: 0,
  lastDay: "", streak: 0, lessonsDone: [], bestScore: 0,
  speedRounds: 0, speedRight: 0, speedBest: 0, speedWpm: 15,
  achievements: [], rounds: 0, bestStreak: 0, perfect: 0,
  modeStats: {}, charStats: {}, recentScores: [],
  radioCopy: 0, radioRight: 0, puzzles: 0, puzzleRight: 0, puzzleBest: 0,
  secret: 0
}, store.get("stats", {}));

const saveSettings = () => store.set("settings", settings);
const saveStats = () => { store.set("stats", stats); if (typeof refreshBadges === "function") refreshBadges(); };

/* ────────── translation core ────────── */
function textToMorse(text) {
  const out = [];
  const unknown = [];
  const sep = settings.autospace === "1" ? " / " : " ";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (PROSIGN_WORD[word.toUpperCase()]) { out.push(PROSIGN_WORD[word.toUpperCase()]); continue; }
    const codes = [];
    for (const raw of word.toLowerCase()) {
      const ch = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const code = LETTERS[raw.toUpperCase()] || DIGITS[raw] || PUNCT[raw] || ACCENTED[ch] || ACCENTED[raw];
      if (!code) { unknown.push(raw); continue; }
      codes.push(code);
    }
    if (codes.length) out.push(codes.join(" "));
  }
  return { morse: out.join(sep), unknown };
}

function morseToText(morse) {
  const cleaned = morse.replace(/·/g, ".").replace(/[−–—]/g, "-");
  const words = cleaned.trim().split(/\s*\/\s*|\s{2,}/).filter(w => w.length);
  const text = [];
  const invalid = [];
  for (const w of words) {
    const codes = w.trim().split(/\s+/).filter(Boolean);
    const letters = [];
    for (const c of codes) {
      if (FROM_MORSE[c]) letters.push(FROM_MORSE[c]);
      else if (FROM_PROSIGN[c]) letters.push(FROM_PROSIGN[c].replace(/[<>]/g, ""));
      else { letters.push(null); invalid.push(c); }
    }
    text.push(letters.map(l => l === null ? "¿" : l).join(""));
  }
  return { text: text.join(" "), invalid };
}

const looksLikeMorse = s => /^[.\-·−/\s]+$/.test(s.trim()) && /[.\-·−]/.test(s.trim()) && !/[a-zA-Z0-9]/.test(s);

function esc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function pretty(code) {
  return settings.symbols === "·−" ? String(code).replace(/\./g, "·").replace(/-/g, "−") : String(code);
}

/* ────────── toast ────────── */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 1600);
}

/* ═══════════ ROUTER ═══════════ */
const PAGES = ["home", "translator", "learn", "practice", "achievements", "stats",
               "speed", "radio", "audio", "flash", "keyboard", "dictionary",
               "signals", "puzzles", "secret", "lab", "history"];
const pageHooks = { enter: {}, leave: {} };
let currentPage = "home";

function navigate(page) {
  if (!PAGES.includes(page)) page = "home";
  if (page === currentPage && !$("#page-" + page).hidden) return;
  pageHooks.leave[currentPage] && pageHooks.leave[currentPage]();
  $$(".page").forEach(p => p.hidden = true);
  $("#page-" + page).hidden = false;
  currentPage = page;
  $$("#mainNav button").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  location.hash = "#/" + page;
  window.scrollTo(0, 0);
  pageHooks.enter[page] && pageHooks.enter[page]();
}

$("#mainNav").addEventListener("click", e => {
  const b = e.target.closest("button[data-page]");
  if (b) navigate(b.dataset.page);
});
$("#logoBtn").addEventListener("click", () => navigate("home"));
document.addEventListener("click", e => {
  const b = e.target.closest("[data-page]");
  if (b && !b.closest("#mainNav")) navigate(b.dataset.page);
});
window.addEventListener("hashchange", () => {
  const p = location.hash.replace(/^#\//, "");
  if (p && p !== currentPage) navigate(p);
});

/* ═══════════ SETTINGS ═══════════ */
function applySettings() {
  const h = document.documentElement;
  h.dataset.theme = settings.theme;
  h.dataset.font = settings.font;
  h.dataset.large = settings.large;
  h.dataset.reduced = settings.reduced;
  h.dataset.hc = settings.hc;
  h.style.setProperty("--morse-ls", settings.letterSpace + "px");
  h.style.setProperty("--morse-ws", settings.wordSpace + "px");
  $("#themeBtnGlyph") && ($("#themeBtnGlyph").textContent = settings.theme === "light" ? "☾" : "☀");
  syncAudioUI();
}

function loadSettingsForm() {
  $("#setTheme").value = settings.theme;
  $("#setFont").value = settings.font;
  $("#setLarge").value = settings.large;
  $("#setReduced").value = settings.reduced;
  $("#setAutodetect").value = settings.autodetect;
  $("#setAutospace").value = settings.autospace;
  $("#setSymbols").value = settings.symbols;
  $("#setCaps").value = settings.caps;
  $("#setLetterSpace").value = settings.letterSpace;
  $("#lsOut").textContent = settings.letterSpace;
  $("#setWordSpace").value = settings.wordSpace;
  $("#wsOut").textContent = settings.wordSpace;
  $("#setShortcuts").value = settings.shortcuts;
  $("#setHc").value = settings.hc;
  $("#setVibration").checked = settings.vibration;
  $("#setFlashing").checked = settings.flashing;
  $("#setWpm").value = settings.wpm;
  $("#setWpmOut").textContent = settings.wpm;
  $("#setTone").value = settings.tone;
  $("#setToneOut").textContent = settings.tone + " Hz";
  $("#setVol").value = settings.volume;
  $("#setVolOut").textContent = settings.volume + "%";
}

function saveFromForm() {
  const prevAuto = settings.autodetect;
  settings.theme = $("#setTheme").value;
  settings.font = $("#setFont").value;
  settings.large = $("#setLarge").value;
  settings.reduced = $("#setReduced").value;
  settings.autodetect = $("#setAutodetect").value;
  settings.autospace = $("#setAutospace").value;
  settings.symbols = $("#setSymbols").value;
  settings.caps = $("#setCaps").value;
  settings.letterSpace = +$("#setLetterSpace").value;
  settings.wordSpace = +$("#setWordSpace").value;
  settings.shortcuts = $("#setShortcuts").value;
  settings.hc = $("#setHc").value;
  settings.vibration = $("#setVibration").checked;
  settings.flashing = $("#setFlashing").checked;
  settings.wpm = +$("#setWpm").value;
  settings.tone = +$("#setTone").value;
  settings.volume = +$("#setVol").value;
  saveSettings();
  applySettings();
  if (prevAuto !== settings.autodetect && settings.autodetect !== "1") setMode("t2m");
}

["#setTheme", "#setFont", "#setLarge", "#setReduced", "#setAutodetect", "#setAutospace",
 "#setSymbols", "#setCaps", "#setShortcuts", "#setHc", "#setVibration", "#setFlashing"]
  .forEach(id => $(id).addEventListener("change", saveFromForm));
[["#setLetterSpace", "#lsOut", ""], ["#setWordSpace", "#wsOut", ""],
 ["#setWpm", "#setWpmOut", ""], ["#setTone", "#setToneOut", " Hz"], ["#setVol", "#setVolOut", "%"]]
  .forEach(([id, out, suf]) => $(id).addEventListener("input", () => {
    $(out).textContent = $(id).value + suf;
    saveFromForm();
  }));

const modal = $("#settingsModal");
$("#settingsBtn").addEventListener("click", () => { loadSettingsForm(); modal.hidden = false; });
$("#settingsClose").addEventListener("click", () => modal.hidden = true);
$("#settingsDone").addEventListener("click", () => modal.hidden = true);
modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });

$("#resetStats").addEventListener("click", () => {
  stats = { correct: 0, wrong: 0, learned: [], bestWpm: 0, practiceMs: 0,
            lastDay: "", streak: 0, lessonsDone: [], bestScore: 0,
            speedRounds: 0, speedRight: 0, speedBest: 0, speedWpm: 15,
            achievements: [], rounds: 0, bestStreak: 0, perfect: 0,
            modeStats: {}, charStats: {}, recentScores: [],
            radioCopy: 0, radioRight: 0, puzzles: 0, puzzleRight: 0, puzzleBest: 0,
            secret: 0 };
  saveStats(); renderDashboard(); toast("progress reset");
});

function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastDay === today) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  stats.streak = stats.lastDay === y ? stats.streak + 1 : 1;
  stats.lastDay = today;
  saveStats();
}

/* ═══════════ DASHBOARD ═══════════ */
function renderDashboard() {
  const letters = stats.learned.filter(c => LETTERS[c]).length;
  const pct = Math.round((stats.lessonsDone.length / LESSONS.length) * 60 + (letters / 26) * 40);
  $("#dashPct").textContent = pct + "%";
  $("#dashWpm").textContent = settings.wpm;
  $("#dashStreak").textContent = stats.streak;
  $("#dashLetters").textContent = letters + "/26";
  $("#dashBest").textContent = stats.bestScore;
  $("#dashBadges").textContent = stats.achievements.length;
}
pageHooks.enter.home = renderDashboard;

/* ═══════════ SHARED AUDIO CONTROLS ═══════════ */
const AUDIO = { loop: false, farnsworth: false, toneType: "sine" };

function applyAudioSettings() {
  MorseAudio.setOptions({
    wpm: settings.wpm, freq: settings.tone,
    volume: settings.volume / 100,
    loop: AUDIO.loop, farnsworth: AUDIO.farnsworth, tone: AUDIO.toneType
  });
}

function syncAudioUI() {
  const bind = (id, val) => { const el = $(id); if (el && el.value != val) el.value = val; };
  bind("#wpmSlider", settings.wpm); bind("#aWpm", settings.wpm);
  bind("#toneSlider", settings.tone); bind("#aTone", settings.tone);
  bind("#volSlider", settings.volume); bind("#aVol", settings.volume);
  bind("#fWpm", settings.wpm);
  const txt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  txt("#wpmOut", settings.wpm); txt("#aWpmOut", settings.wpm); txt("#fWpmOut", settings.wpm);
  txt("#toneOut", settings.tone + " Hz"); txt("#aToneOut", settings.tone + " Hz");
  txt("#volOut", settings.volume + "%"); txt("#aVolOut", settings.volume + "%");
  applyAudioSettings();
}

function audioSetting(kind, val) {
  if (kind === "wpm") settings.wpm = +val;
  if (kind === "tone") settings.tone = +val;
  if (kind === "volume") settings.volume = +val;
  saveSettings();
  syncAudioUI();
}

/* play from text-or-morse source */
function currentMorse(fromText, fromMorse) {
  if (fromMorse && fromMorse.trim()) return fromMorse.trim();
  return textToMorse(fromText || "").morse;
}

function playPause(morse) {
  applyAudioSettings();
  if (MorseAudio.state === "playing") MorseAudio.pause();
  else MorseAudio.play(MorseAudio.state === "paused" ? null : morse);
}

function updatePlayLabels() {
  const playing = MorseAudio.state === "playing";
  const pb = $("#playBtn");
  if (pb) pb.textContent = playing ? "⏸ PAUSE" : "▶ PLAY MORSE";
  const ap = $("#audioPlayBtn");
  if (ap) ap.textContent = playing ? "⏸" : "▶";
  const kp = $("#kbPlay");
  if (kp) kp.textContent = playing ? "⏸ PAUSE" : "▶ PLAY";
}
MorseAudio.setOnState(updatePlayLabels);

MorseAudio.setOnVisual((on, sym) => {
  if ($("#flashOnPlay") && $("#flashOnPlay").checked && settings.flashing) {
    const stage = $("#flashStage");
    stage.hidden = !on;
    $("#flashGlyph").textContent = on ? (sym === "." ? "•" : "▬") : "";
  }
  if ($("#vibeOnPlay") && $("#vibeOnPlay").checked && settings.vibration && on && navigator.vibrate)
    navigator.vibrate(20);
});

/* ═══════════ TRANSLATOR ═══════════ */
const textInput = $("#textInput");
const morseInput = $("#morseInput");
const validation = $("#validation");
const detectBadge = $("#detectBadge");
let mode = "auto";
let lastSource = "text";
let suppress = false;

const history_ = { stack: [{ t: "", m: "" }], idx: 0 };
function pushHistory() {
  const snap = { t: textInput.value, m: morseInput.value };
  const cur = history_.stack[history_.idx];
  if (cur.t === snap.t && cur.m === snap.m) return;
  history_.stack = history_.stack.slice(0, history_.idx + 1);
  history_.stack.push(snap);
  if (history_.stack.length > 100) history_.stack.shift();
  history_.idx = history_.stack.length - 1;
  updateHistoryBtns();
}
function updateHistoryBtns() {
  $("#undoBtn").disabled = history_.idx <= 0;
  $("#redoBtn").disabled = history_.idx >= history_.stack.length - 1;
}
function applySnapshot(s) {
  suppress = true;
  textInput.value = s.t;
  morseInput.value = s.m;
  suppress = false;
  validateMorse();
}

function showValidation(msg, cls) {
  validation.hidden = false;
  validation.className = "validation" + (cls === "warn" ? " warn" : "");
  validation.innerHTML = (cls === "warn" ? "⚠ " : "⛔ ") + msg;
}
function hideValidation() { validation.hidden = true; }
function setBadge(src) {
  if (mode !== "auto" || settings.autodetect !== "1") { detectBadge.hidden = true; return; }
  detectBadge.hidden = false;
  detectBadge.querySelector("b").textContent = src === "text" ? "TEXT → MORSE" : "MORSE → TEXT";
}

function translateFrom(source) {
  if (suppress) return;
  lastSource = source;

  if (source === "text") {
    const { morse, unknown } = textToMorse(textInput.value);
    suppress = true;
    morseInput.value = morse;
    suppress = false;
    if (unknown.length) showValidation(`unknown characters skipped: ${[...new Set(unknown)].join(" ")}`, "warn");
    else hideValidation();
    setBadge("text");
  } else {
    const { text, invalid } = morseToText(morseInput.value);
    let out = text;
    if (settings.caps === "upper") out = out.toUpperCase();
    else out = out.toLowerCase();
    suppress = true;
    textInput.value = out;
    suppress = false;
    if (invalid.length) showValidation(`invalid Morse sequence: ${invalid.map(c => `<mark class="bad">${esc(c)}</mark>`).join(", ")}`);
    else hideValidation();
    setBadge("morse");
  }
  syncQuickHighlight();
}

function validateMorse() {
  if (morseInput.value.trim() === "") { hideValidation(); return; }
  if (looksLikeMorse(morseInput.value) || mode === "m2t") translateFrom("morse");
  else translateFrom("text");
}

textInput.addEventListener("input", () => {
  if (mode === "m2t") { flashRO(morseInput); return; }
  translateFrom("text");
  pushHistory();
});
morseInput.addEventListener("input", () => {
  if (mode === "t2m") { flashRO(textInput); return; }
  translateFrom("morse");
  pushHistory();
});
function flashRO(el) {
  el.style.borderColor = "var(--warn)";
  setTimeout(() => el.style.borderColor = "", 300);
}

function setMode(m) {
  mode = m;
  $$("#modeSeg button").forEach(x => x.classList.toggle("active", x.dataset.mode === m));
  textInput.readOnly = m === "m2t";
  morseInput.readOnly = m === "t2m";
  detectBadge.hidden = m !== "auto";
}

$$("#modeSeg button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.mode === "auto" && settings.autodetect !== "1") { toast("auto-detect is off"); return; }
  setMode(b.dataset.mode);
  if (mode === "t2m") translateFrom("text");
  else if (mode === "m2t") translateFrom("morse");
  else validateMorse();
}));

$("#swapBtn").addEventListener("click", () => {
  const t = textInput.value;
  textInput.value = morseInput.value;
  morseInput.value = t;
  if (looksLikeMorse(textInput.value) && !looksLikeMorse(morseInput.value)) setMode("m2t");
  else if (looksLikeMorse(morseInput.value)) setMode("t2m");
  else setMode("auto");
  validateMorse();
  pushHistory();
  toast("swapped");
});

$("#mainButtons").addEventListener("click", async e => {
  const act = e.target.dataset.act;
  if (!act) return;
  const src = lastSource === "morse" ? morseInput : textInput;
  const out = lastSource === "morse" ? textInput : morseInput;
  switch (act) {
    case "copy":
      try { await navigator.clipboard.writeText(src.value); toast("copied"); }
      catch (err) { src.select(); document.execCommand("copy"); toast("copied"); }
      break;
    case "paste":
      try {
        const txt = await navigator.clipboard.readText();
        if (looksLikeMorse(txt)) { if (mode === "t2m") setMode("auto"); morseInput.value = txt; translateFrom("morse"); }
        else { if (mode === "m2t") setMode("auto"); textInput.value = txt; translateFrom("text"); }
        pushHistory();
      } catch (err) { toast("clipboard blocked — use Ctrl+V"); }
      break;
    case "clear":
      textInput.value = ""; morseInput.value = "";
      hideValidation(); pushHistory();
      break;
    case "undo":
      if (history_.idx > 0) { history_.idx--; applySnapshot(history_.stack[history_.idx]); updateHistoryBtns(); }
      break;
    case "redo":
      if (history_.idx < history_.stack.length - 1) { history_.idx++; applySnapshot(history_.stack[history_.idx]); updateHistoryBtns(); }
      break;
    case "share":
      if (navigator.share) {
        try { await navigator.share({ title: "Morse", text: `${src.value}\n\n${out.value}` }); } catch (err) {}
      } else { try { await navigator.clipboard.writeText(`${src.value}  ⇄  ${out.value}`); toast("copied for sharing"); } catch (err) { toast("share unavailable"); } }
      break;
    case "download": {
      const blob = new Blob(
        [`MORSELAB translation\n=====================\n\nTEXT:\n${textInput.value}\n\nMORSE:\n${morseInput.value}\n`],
        { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "morse-translation.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("downloaded");
      break;
    }
  }
});

/* play / stop from translator */
$("#playBtn").addEventListener("click", () => {
  playPause(currentMorse(textInput.value, lastSource === "morse" ? morseInput.value : ""));
});
$("#audioStopBtn").addEventListener("click", () => MorseAudio.stop());
$("#loopToggle").addEventListener("change", e => { AUDIO.loop = e.target.checked; const al = $("#audioLoop"); if (al) al.checked = e.target.checked; applyAudioSettings(); });
$("#farnsworthToggle").addEventListener("change", e => { AUDIO.farnsworth = e.target.checked; applyAudioSettings(); });

["#wpmSlider", "#toneSlider", "#volSlider"].forEach((id, i) => {
  const kind = ["wpm", "tone", "volume"][i];
  $(id).addEventListener("input", e => audioSetting(kind, e.target.value));
});

/* keypad */
$("#keypad").addEventListener("click", e => {
  const key = e.target.dataset.key;
  if (key == null) return;
  if (mode === "t2m") setMode("auto");
  if (key === "clear") morseInput.value = "";
  else if (key === "\\b") morseInput.value = morseInput.value.replace(/\s*\S*$/, "");
  else if (key === " ") morseInput.value = morseInput.value.replace(/\s+$/, "") + " ";
  else if (key === "/") morseInput.value = morseInput.value.replace(/\s*$/, "") + " / ";
  else morseInput.value = morseInput.value.replace(/\s*$/, "") + (morseInput.value.trim() ? " " : "") + key;
  translateFrom("morse");
  pushHistory();
});

/* quick messages */
$("#quickMsgs").addEventListener("click", e => {
  const msg = e.target.dataset.msg;
  if (!msg) return;
  textInput.value = msg;
  translateFrom("text");
  pushHistory();
  applyAudioSettings();
  MorseAudio.play(currentMorse(textInput.value, ""));
});
function syncQuickHighlight() {
  $$("#quickMsgs button").forEach(b =>
    b.classList.toggle("active", textInput.value.trim() === b.dataset.msg));
}

/* keyboard mirror */
const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const keysEl = $("#keys");
function buildKeys() {
  keysEl.innerHTML = "";
  keyRows.forEach(row => {
    const div = document.createElement("div");
    div.className = "key-row";
    [...row].forEach(ch => {
      const k = document.createElement("div");
      k.className = "key";
      k.dataset.key = ch;
      k.innerHTML = `<span class="letter">${ch.toUpperCase()}</span><span class="code">${LETTERS[ch.toUpperCase()]}</span>`;
      div.appendChild(k);
    });
    keysEl.appendChild(div);
  });
  const numRow = document.createElement("div");
  numRow.className = "key-row";
  "1234567890".split("").forEach(ch => {
    const k = document.createElement("div");
    k.className = "key";
    k.dataset.key = ch;
    k.innerHTML = `<span class="letter">${ch}</span><span class="code">${DIGITS[ch]}</span>`;
    numRow.appendChild(k);
  });
  keysEl.appendChild(numRow);
}
buildKeys();

function flashKey(ch) {
  const el = keysEl.querySelector(`.key[data-key="${ch}"]`);
  if (!el) return;
  el.classList.add("active");
  setTimeout(() => el.classList.remove("active"), 140);
}

document.addEventListener("keydown", e => {
  if (settings.shortcuts !== "1") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "BUTTON") return;
  if (!modal.hidden) return;
  if (currentPage !== "translator") return;
  const ch = e.key.toLowerCase();
  if (ch === "backspace") {
    if (mode !== "m2t") { textInput.value = textInput.value.slice(0, -1); translateFrom("text"); pushHistory(); }
    e.preventDefault(); return;
  }
  if (ch === " ") {
    if (mode !== "m2t") { textInput.value = textInput.value.replace(/\s+$/, "") + " "; translateFrom("text"); pushHistory(); }
    e.preventDefault(); return;
  }
  if (LETTERS[ch.toUpperCase()] || DIGITS[ch]) {
    if (mode !== "m2t") {
      textInput.value += ch;
      flashKey(ch);
      translateFrom("text");
      pushHistory();
    }
    e.preventDefault();
  }
});

/* ═══════════ BOOT ═══════════ */
applySettings();
updateHistoryBtns();
renderDashboard();

window.addEventListener("load", () => {
  const initialPage = location.hash.replace(/^#\//, "");
  navigate(initialPage && PAGES.includes(initialPage) ? initialPage : "home");
});
