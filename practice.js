/* ═══════════ PRACTICE game + SPEED trainer ═══════════ */

const prac = {
  mode: "hear", diff: "easy",
  running: false, answer: null, score: 0, correct: 0, wrong: 0,
  streak: 0, seconds: 0, timer: null, locked: false
};

const DIFF_POOL = {
  easy: () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  medium: () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
  hard: () => PRACTICE_WORDS
};

function pickPracTarget() {
  const rand = Math.random();
  let mode = prac.mode;
  if (mode === "rand") mode = ["hear", "see", "t2m"][Math.floor(Math.random() * 3)];
  const pool = DIFF_POOL[prac.diff]();
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { mode, item };
}

function pracMorseOf(item) {
  return textToMorse(item).morse;
}

function renderPracPrompt() {
  const { mode, item } = prac.next;
  const prompt = $("#pracPrompt");
  const input = $("#pracInput");
  input.value = "";
  if (mode === "hear") {
    prompt.textContent = "🔊 listen…";
    applyAudioSettings();
    MorseAudio.stop();
    setTimeout(() => MorseAudio.play(pracMorseOf(item)), 300);
    input.placeholder = "what did you hear?";
  } else if (mode === "see") {
    prompt.innerHTML = `<span style="font-size:30px">${esc(pretty(pracMorseOf(item)))}</span>`;
    input.placeholder = "decode it…";
  } else {
    prompt.textContent = `✏️ ${item} → morse?`;
    input.placeholder = "type the Morse (letters separated by spaces)";
  }
  input.focus();
}

function pracStart() {
  prac.running = true;
  prac.score = 0; prac.correct = 0; prac.wrong = 0; prac.streak = 0; prac.seconds = 0;
  stats.rounds++;
  $("#pracStart").textContent = "STOP";
  $("#pracReplay").disabled = false;
  $("#pracFeedback").textContent = "";
  $("#pracFeedback").className = "learn-feedback";
  updatePracHud();
  prac.timer = setInterval(() => {
    prac.seconds++;
    updatePracHud();
    if (prac.seconds >= 120) pracStop(true);
  }, 1000);
  nextPrac();
}

function pracStop(finished) {
  prac.running = false;
  clearInterval(prac.timer);
  $("#pracStart").textContent = "START";
  $("#pracReplay").disabled = true;
  if (prac.score > stats.bestScore) {
    stats.bestScore = prac.score;
    toast(`new personal best: ${prac.score}!`);
  }
  stats.recentScores.push(prac.score);
  stats.recentScores = stats.recentScores.slice(-14);
  if (prac.correct > 0 && prac.wrong === 0) stats.perfect = (stats.perfect || 0) + 1;
  if (prac.correct + prac.wrong > 0) touchStreak();
  saveStats();
  renderDashboard();
  if (finished) {
    $("#pracPrompt").textContent = `⏰ time! final score ${prac.score}`;
    $("#pracFeedback").textContent = `${prac.correct} right / ${prac.wrong} wrong`;
    $("#pracFeedback").className = "learn-feedback " + (prac.correct >= prac.wrong ? "ok" : "no");
  }
}

function nextPrac() {
  prac.locked = false;
  prac.next = pickPracTarget();
  renderPracPrompt();
}

function updatePracHud() {
  const total = prac.correct + prac.wrong;
  $("#hScore").textContent = prac.score;
  $("#hAcc").textContent = total ? Math.round(prac.correct / total * 100) + "%" : "100%";
  $("#hStreak").textContent = prac.streak;
  const m = Math.floor(prac.seconds / 60), s = prac.seconds % 60;
  $("#hTimer").textContent = `${m}:${String(s).padStart(2, "0")}`;
  $("#hBest").textContent = stats.bestScore;
}

function submitPrac() {
  if (!prac.running || prac.locked) return;
  const raw = $("#pracInput").value.trim();
  if (!raw) return;
  const { mode, item } = prac.next;
  let ok = false;
  if (mode === "hear" || mode === "see") {
    ok = raw.toUpperCase() === item.toUpperCase();
  } else {
    const want = pracMorseOf(item).toLowerCase();
    const got = raw.replace(/·/g, ".").replace(/[−–—]/g, "-").replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim().toLowerCase();
    ok = got === want;
  }
  prac.locked = true;
  touchStreak();
  const fb = $("#pracFeedback");
  if (ok) {
    prac.correct++;
    prac.streak++;
    prac.score += 10 + prac.streak * 2;
    if (prac.streak > stats.bestStreak) stats.bestStreak = prac.streak;
    fb.textContent = `✓ +${10 + prac.streak * 2}  streak ${prac.streak}`;
    fb.className = "learn-feedback ok";
    MorseAudio.beep(880, 0.1, 0.2);
    if (mode === "hear" || mode === "see") {
      if (!stats.learned.includes(item) && LETTERS[item]) stats.learned.push(item);
    }
  } else {
    prac.correct >= 0 && prac.wrong++;
    prac.streak = 0;
    fb.textContent = `✗ answer: ${mode === "t2m" ? pretty(pracMorseOf(item)) : item}`;
    fb.className = "learn-feedback no";
    MorseAudio.beep(220, 0.2, 0.2);
  }
  trackMode(mode, ok);
  if (mode === "hear" || mode === "see") trackChar(item, ok);
  else for (const ch of item) trackChar(ch, ok);
  saveStats();
  updatePracHud();
  setTimeout(nextPrac, 1300);
}

$$("#modeSeg2 button").forEach(b => b.addEventListener("click", () => {
  $$("#modeSeg2 button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  prac.mode = b.dataset.pmode;
}));
$$("#diffSeg button").forEach(b => b.addEventListener("click", () => {
  $$("#diffSeg button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  prac.diff = b.dataset.diff;
}));

$("#pracStart").addEventListener("click", () => prac.running ? pracStop(false) : pracStart());
$("#pracSubmit").addEventListener("click", submitPrac);
$("#pracInput").addEventListener("keydown", e => { if (e.key === "Enter") submitPrac(); });
$("#pracReplay").addEventListener("click", () => {
  if (!prac.running || !prac.next) return;
  MorseAudio.stop();
  applyAudioSettings();
  MorseAudio.play(pracMorseOf(prac.next.item));
});
pageHooks.leave.practice = () => { if (prac.running) pracStop(false); };
pageHooks.enter.practice = updatePracHud;

/* ═══════════ SPEED TRAINER ═══════════ */
const speed = { wpm: 15, group: [] };

function speedGroup() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const n = speed.wpm >= 25 ? 3 : speed.wpm >= 15 ? 4 : 5;
  const g = [];
  for (let i = 0; i < n; i++) g.push(chars[Math.floor(Math.random() * chars.length)]);
  return g;
}

$$("#speedBtns button").forEach(b => b.addEventListener("click", () => {
  $$("#speedBtns button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  speed.wpm = +b.dataset.wpm;
  $("#spCurrent").textContent = speed.wpm;
  $("#spFeedback").textContent = "";
  $("#spFeedback").className = "learn-feedback";
}));

$("#spPlay").addEventListener("click", () => {
  speed.group = speedGroup();
  playSpeedGroup();
  $("#spFeedback").textContent = "listen and type it…";
  $("#spFeedback").className = "learn-feedback";
  $("#spInput").value = "";
  $("#spInput").focus();
});

function submitSpeed() {
  const raw = $("#spInput").value.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw || !speed.group.length) return;
  const want = speed.group.join("");
  const ok = raw === want;
  stats.speedRounds++;
  if (ok) stats.speedRight++;
  const acc = Math.round(stats.speedRight / stats.speedRounds * 100);
  if (acc >= 90 && stats.speedRounds >= 3 && speed.wpm > stats.speedBest) {
    stats.speedBest = speed.wpm;
    toast(`new best speed: ${speed.wpm} WPM!`);
  }
  stats.speedWpm = speed.wpm;
  saveStats();
  const fb = $("#spFeedback");
  fb.textContent = ok ? `✓ ${want}` : `✗ it was ${want}`;
  fb.className = "learn-feedback " + (ok ? "ok" : "no");
  updateSpeedStats();
  if (ok) MorseAudio.beep(880, 0.1, 0.2); else MorseAudio.beep(220, 0.2, 0.2);
}
function updateSpeedStats() {
  $("#spAcc").textContent = stats.speedRounds ? Math.round(stats.speedRight / stats.speedRounds * 100) + "%" : "—";
  $("#spBest").textContent = stats.speedBest;
  $("#spRounds").textContent = stats.speedRounds;
  $("#spCurrent").textContent = speed.wpm;
}
$("#spSubmit").addEventListener("click", submitSpeed);
$("#spInput").addEventListener("keydown", e => { if (e.key === "Enter") submitSpeed(); });
$("#spPlay").addEventListener("click", () => {
  speed.group = speedGroup();
  playSpeedGroup();
  $("#spFeedback").textContent = "listen and type it…";
  $("#spFeedback").className = "learn-feedback";
  $("#spInput").value = "";
  $("#spInput").focus();
});
$("#spReplay").addEventListener("click", () => {
  if (!speed.group.length) return;
  MorseAudio.stop();
  playSpeedGroup();
});

function playSpeedGroup() {
  const morse = speed.group.map(c => LETTERS[c] || DIGITS[c]).join(" ");
  MorseAudio.setOptions({ wpm: speed.wpm, freq: settings.tone, volume: settings.volume / 100, loop: false });
  MorseAudio.stop();
  MorseAudio.play(morse);
}
pageHooks.enter.speed = updateSpeedStats;
