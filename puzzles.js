/* ═══════════ MORSELAB — Morse puzzles ═══════════ */

const pzHard = ["599", "559", "73", "88", "DX", "QRZ", "RST", "OM", "TU", "FB", "QRG", "WPM", "DE"];

function pzPool(diff) {
  if (diff === "easy") return Object.keys(LETTERS);
  if (diff === "hard") return PRACTICE_WORDS.concat(pzHard);
  return [].concat(PRACTICE_WORDS);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pzOptions(ans, pool) {
  const opts = [ans];
  while (opts.length < 4) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!opts.includes(c)) opts.push(c);
  }
  return shuffle(opts);
}

function pzCodeOf(item) { return LETTERS[item] || DIGITS[item] || ""; }

function makePuzzle(pool, diff) {
  const ans = pool[Math.floor(Math.random() * pool.length)];
  const code = pzCodeOf(ans);
  if (!code) return makePuzzle(pool, diff);
  const useType = diff === "hard" ? 0.3 : diff === "medium" ? 0.2 : 0.15;
  const kind = Math.random();
  if (kind < useType) return { kind: "type", ans, code };
  if (kind < useType + 0.4) return { kind: "listen", ans, code, opts: pzOptions(ans, pool) };
  return { kind: "see", ans, code, opts: pzOptions(ans, pool) };
}

let pz = null;

function startPuzzles(diff) {
  const pool = pzPool(diff);
  pz = { pool, queue: [], i: 0, score: 0, streak: 0, right: 0, done: 0 };
  for (let n = 0; n < 10; n++) pz.queue.push(makePuzzle(pool, diff));
  $("#pzStart").hidden = true;
  $("#pzGame").hidden = false;
  $("#pzResult").hidden = true;
  renderPuzzle();
}

function renderPuzzle() {
  if (!pz) return;
  MorseAudio.stop();
  const q = pz.queue[pz.i];
  updatePzHud();
  const prompt = $("#pzPrompt");
  const choices = $("#pzChoices");
  const typed = $("#pzTypeRow");
  const fb = $("#pzFb");
  prompt.innerHTML = "";
  choices.innerHTML = "";
  typed.hidden = true;
  fb.hidden = true;

  const big = document.createElement("div");
  big.className = "code-big" + (q.kind === "type" ? " alpha" : "");
  big.textContent = q.kind === "type" ? q.ans : pretty(q.code);
  prompt.appendChild(big);

  if (q.kind === "listen") setTimeout(() => MorseAudio.play(q.code), 250);

  if (q.kind === "type") {
    typed.hidden = false;
    const inp = $("#pzTypeIn");
    inp.value = "";
    inp.focus();
    return;
  }

  for (const o of q.opts) {
    const b = document.createElement("button");
    b.className = "choice-btn";
    b.textContent = o;
    b.addEventListener("click", () => pzAnswer(o));
    choices.appendChild(b);
  }
}

function pzFinishRound() {
  stats.puzzles += pz.done;
  stats.puzzleRight += pz.right;
  if (pz.score > stats.puzzleBest) stats.puzzleBest = pz.score;
  if (pz.right === 10) stats.perfect = (stats.perfect || 0) + 1;
  saveStats();
  $("#pzGame").hidden = true;
  $("#pzResult").hidden = false;
  $("#pzResultScore").textContent = pz.score;
  $("#pzResultPct").textContent = Math.round((pz.right / 10) * 100) + "%";
  $("#pzResultBest").textContent = stats.puzzleBest;
  pz = null;
}

function showPzFeedback(ok, ptsBonus, ans) {
  const fb = $("#pzFb");
  fb.hidden = false;
  fb.className = "pz-fb" + (ok ? " good" : " bad");
  fb.innerHTML = ok
    ? "✓ correct" + (ptsBonus > 0 ? " · streak bonus +" + ptsBonus : "")
    : "✗ wrong — answer: <b>" + esc(ans) + "</b>";
}

function pzAnswer(guess) {
  if (!pz) return;
  const q = pz.queue[pz.i];
  const ok = guess === q.ans;
  const pts = ok ? 10 + Math.min(pz.streak, 5) * 2 : 0;
  if (ok) { pz.score += pts; pz.streak++; pz.right++; }
  else pz.streak = 0;
  pz.done++;
  showPzFeedback(ok, ok ? pts - 10 : 0, q.ans);
  pz.i++;
  if (pz.i >= 10) { pzFinishRound(); return; }
  renderPuzzle();
}

function pzSubmitType() {
  if (!pz) return;
  const q = pz.queue[pz.i];
  const got = $("#pzTypeIn").value.replace(/\s+/g, "");
  pzAnswer(got === q.code ? q.ans : pz.queue[pz.i].ans + "·justmissed");
}

function updatePzHud() {
  $("#pzHud").innerHTML =
    `<span>Q <b>${pz.i + 1}/10</b></span><span>Score <b>${pz.score}</b></span>` +
    `<span>Streak <b>${pz.streak}</b></span><span>Solved <b>${pz.right}</b></span>`;
}

/* buttons */
$$(".seg[data-pz] button").forEach(b =>
  b.addEventListener("click", () => {
    $$(".seg[data-pz] button").forEach(x => x.classList.toggle("active", x === b));
  }));

$("#pzStartBtn").addEventListener("click", () => {
  const diff = document.querySelector(".seg[data-pz] button.active").dataset.diff;
  startPuzzles(diff);
});
$("#pzGo").addEventListener("click", pzSubmitType);
$("#pzTypeIn").addEventListener("keydown", e => { if (e.key === "Enter") pzSubmitType(); });
$("#pzHint").addEventListener("click", () => { if (pz) MorseAudio.play(pz.queue[pz.i].code); });
$("#pzAgain").addEventListener("click", () => {
  $("#pzResult").hidden = true;
  $("#pzStart").hidden = false;
});
pageHooks.leave.puzzles = () => { MorseAudio.stop(); };