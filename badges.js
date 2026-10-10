/* ═══════════ MORSELAB — achievements + learning statistics ═══════════ */

const ACHIEVEMENTS = [
  { id: "first_letter", icon: "🔤", name: "First Letter", desc: "Learn your first character in a quiz", t: s => s.learned.length >= 1 },
  { id: "lesson_1", icon: "🎓", name: "First Lesson", desc: "Complete one lesson", t: s => s.lessonsDone.length >= 1 },
  { id: "lesson_5", icon: "📚", name: "Study Hall", desc: "Complete 5 lessons", t: s => s.lessonsDone.length >= 5 },
  { id: "alphabet", icon: "🏛️", name: "Full Alphabet", desc: "Learn all 26 letters", t: s => s.learned.filter(c => LETTERS[c]).length >= 26 },
  { id: "digits", icon: "🔟", name: "Digit Reader", desc: "Learn all 10 digits", t: s => s.learned.filter(c => DIGITS[c]).length >= 10 },
  { id: "streak_5", icon: "🔥", name: "On Fire", desc: "Reach a 5-answer streak", t: s => s.bestStreak >= 5 },
  { id: "score_100", icon: "💯", name: "Century", desc: "Score 100+ in one practice round", t: s => s.bestScore >= 100 },
  { id: "perfect_round", icon: "🎯", name: "Bullseye", desc: "Finish a round with 100% accuracy", t: s => s.perfect >= 1 },
  { id: "wpm_25", icon: "⚡", name: "Speed Demon", desc: "Hold 25 WPM in the Speed trainer", t: s => s.speedBest >= 25 },
  { id: "radio_10", icon: "📻", name: "DX Hunter", desc: "Copy 10 radio transmissions", t: s => s.radioCopy >= 10 },
  { id: "puzzle_10", icon: "🧩", name: "Puzzle Addict", desc: "Solve 10 puzzles", t: s => s.puzzles >= 10 },
  { id: "secret_1", icon: "🕵️", name: "Spyware", desc: "Create your first secret message", t: s => s.secret >= 1 },
  { id: "correct_200", icon: "🏆", name: "Talking Machine", desc: "200 correct answers overall", t: s => s.correct >= 200 },
  { id: "day_3", icon: "🗓️", name: "Commuter", desc: "Copy on 3 consecutive days", t: s => s.streak >= 3 }
];

function refreshBadges() {
  if (window.__badgeGuard) return;
  window.__badgeGuard = true;
  try {
    const fresh = ACHIEVEMENTS.filter(a => !stats.achievements.includes(a.id) && a.t(stats));
    if (fresh.length) {
      fresh.forEach(a => stats.achievements.push(a.id));
      saveStats();
      if (currentPage === "achievements") renderAchievements();
      toast("🏆 Achievement: " + fresh[0].name + " " + fresh[0].icon);
    }
  } finally { window.__badgeGuard = false; }
}

function renderAchievements() {
  const got = new Set(stats.achievements);
  const el = $("#achGrid");
  el.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const d = document.createElement("div");
    d.className = "badge" + (got.has(a.id) ? " on" : " off");
    d.title = a.desc;
    d.innerHTML = `<div class="badge-ic">${a.icon}</div><div class="badge-n">${esc(a.name)}</div><div class="badge-d">${esc(a.desc)}</div>`;
    el.appendChild(d);
  }
  const pct = Math.round((got.size / ACHIEVEMENTS.length) * 100);
  $("#achCount").textContent = got.size + " / " + ACHIEVEMENTS.length;
  $("#achPct").textContent = pct + "%";
  $("#achBar").style.width = pct + "%";
  refreshBadges();
}
pageHooks.enter.achievements = renderAchievements;

/* ────────── learning statistics ────────── */

function trackChar(ch, ok) {
  const k = String(ch).toUpperCase();
  const c = stats.charStats[k] || { n: 0, right: 0 };
  c.n++; if (ok) c.right++;
  stats.charStats[k] = c;
}

function trackMode(mode, ok) {
  const c = stats.modeStats[mode] || { n: 0, right: 0 };
  c.n++; if (ok) c.right++;
  stats.modeStats[mode] = c;
}

function renderStats() {
  const acc = stats.correct + stats.wrong ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0;
  $("#stCorrect").textContent = stats.correct;
  $("#stWrong").textContent = stats.wrong;
  $("#stAcc").textContent = acc + "%";
  $("#stRounds").textContent = stats.rounds;
  $("#stLessons").textContent = stats.lessonsDone.length;
  $("#stLetters").textContent = stats.learned.filter(c => LETTERS[c]).length + "/26";
  $("#stBest").textContent = stats.bestScore;
  $("#stSpeed").textContent = stats.speedBest + " wpm";

  const modes = [["hear", "👂 Hear"], ["see", "👀 See"], ["t2m", "⌨️ Type"], ["rand", "🎲 Random"]];
  const mw = $("#stModes");
  mw.innerHTML = "";
  let any = false;
  for (const [m, label] of modes) {
    const c = stats.modeStats[m];
    const pct = c && c.n ? Math.round((c.right / c.n) * 100) : null;
    if (c) any = true;
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `<span>${label}</span>` +
      `<span class="bar"><span class="bar-fill" style="width:${pct == null ? 0 : pct}%"></span></span>` +
      `<span>${c ? c.right + "/" + c.n : "—"}</span>`;
    mw.appendChild(row);
  }
  $("#stNoModes").hidden = any;

  const weak = Object.keys(stats.charStats)
    .map(k => ({ k, ...stats.charStats[k] }))
    .filter(x => x.n >= 3)
    .map(x => ({ k: x.k, r: x.right / x.n }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 8);
  const wl = $("#stWeak");
  wl.innerHTML = "";
  if (!weak.length) {
    const li = document.createElement("li");
    li.textContent = "Complete a few practice items to see weak spots.";
    wl.appendChild(li);
  }
  for (const w of weak) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="wk">${w.k}</span><span class="bar"><span class="bar-fill danger" style="width:${Math.round(w.r * 100)}%"></span></span><span>${Math.round(w.r * 100)}%</span>`;
    wl.appendChild(li);
  }

  const sc = $("#stSpark");
  sc.innerHTML = "";
  const s = stats.recentScores.slice(-14);
  if (!s.length) { sc.innerHTML = "<li class='empty'>Play practice rounds to build a curve.</li>"; }
  else {
    const max = Math.max(...s, 1);
    s.forEach(v => {
      const li = document.createElement("li");
      li.style.height = Math.max(4, Math.round((v / max) * 72)) + "px";
      li.title = v;
      sc.appendChild(li);
    });
  }
}
pageHooks.enter.stats = renderStats;