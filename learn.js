/* ═══════════ LEARN page: charts + lesson progression ═══════════ */

function renderChartInto(el, items) {
  el.innerHTML = "";
  items.forEach(([ch, code]) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `<b>${esc(ch)}</b><i>${pretty(code)}</i>`;
    cell.title = "click to hear";
    cell.addEventListener("click", () => {
      applyAudioSettings();
      MorseAudio.stop();
      MorseAudio.play(code);
      cell.classList.add("active");
      setTimeout(() => cell.classList.remove("active"), 600);
    });
    el.appendChild(cell);
  });
}

function renderLearnCharts() {
  renderChartInto($("#chartLetters"), Object.entries(LETTERS));
  renderChartInto($("#chartDigits"), Object.entries(DIGITS));
  renderChartInto($("#chartPunct"), Object.entries(PUNCT));
}

/* ────────── lessons ────────── */
const quiz = { lesson: null, order: [], step: 0, streak: 0, answered: false };

function lessonUnlocked(idx) {
  return idx === 0 || stats.lessonsDone.includes(LESSONS[idx - 1].id);
}

function renderLessons() {
  const grid = $("#lessonsGrid");
  grid.innerHTML = "";
  LESSONS.forEach((les, i) => {
    const done = stats.lessonsDone.includes(les.id);
    const unlocked = lessonUnlocked(i);
    const btn = document.createElement("button");
    btn.className = "lesson-btn" + (done ? " done" : "") + (unlocked ? "" : " locked");
    if (quiz.lesson === les.id) btn.classList.add("current");
    btn.innerHTML = `<b>${done ? "✓ " : unlocked ? "" : "🔒 "}${les.title}</b>
      <i>${done ? "completed" : unlocked ? les.hint : "locked"}</i>`;
    btn.disabled = !unlocked;
    btn.addEventListener("click", () => startQuiz(i));
    grid.appendChild(btn);
  });
}

function startQuiz(idx) {
  const les = LESSONS[idx];
  quiz.lesson = les.id;
  quiz.order = makeQuestions(les);
  quiz.step = 0;
  quiz.streak = 0;
  quiz.answered = false;
  $("#lessonQuiz").hidden = false;
  $("#quizTitle").textContent = les.title;
  $("#quizFeedback").textContent = "";
  $("#quizFeedback").className = "learn-feedback";
  renderLessons();
  nextQuizQuestion(les);
}

function makeQuestions(les) {
  const pool = [];
  const n = Math.max(6, Math.min(les.pairs.length * 2, 10));
  for (let i = 0; i < n; i++) pool.push(les.pairs[Math.floor(Math.random() * les.pairs.length)]);
  return pool;
}

function nextQuizQuestion(les) {
  if (quiz.step >= quiz.order.length) return finishQuiz(les);
  const answer = quiz.order[quiz.step];
  quiz.answer = answer;
  quiz.answered = false;
  $("#quizProgress").textContent = `question ${quiz.step + 1}/${quiz.order.length} · streak ${quiz.streak}`;
  $("#quizPrompt").textContent = "🔊 what did you hear?";
  $("#quizFeedback").textContent = "";
  $("#quizFeedback").className = "learn-feedback";

  const choices = $("#quizChoices");
  choices.innerHTML = "";
  const all = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const pool = [...new Set([...les.pairs, ...all])];
  const set = new Set([answer]);
  while (set.size < 4) set.add(pool[Math.floor(Math.random() * pool.length)]);
  [...set].sort(() => Math.random() - 0.5).forEach(opt => {
    const b = document.createElement("button");
    b.textContent = opt;
    b.addEventListener("click", () => answerQuiz(opt));
    choices.appendChild(b);
  });

  applyAudioSettings();
  MorseAudio.stop();
  const code = LETTERS[answer] || DIGITS[answer];
  setTimeout(() => MorseAudio.play(code), 350);
}

function answerQuiz(opt) {
  if (quiz.answered) return;
  quiz.answered = true;
  const ok = opt === quiz.answer;
  const code = LETTERS[quiz.answer] || DIGITS[quiz.answer];
  touchStreak();
  if (ok) {
    quiz.streak++;
    stats.correct++;
    if (!stats.learned.includes(quiz.answer)) stats.learned.push(quiz.answer);
    MorseAudio.beep(880, 0.1, 0.2);
  } else {
    quiz.streak = 0;
    stats.wrong++;
    MorseAudio.beep(220, 0.2, 0.2);
  }
  saveStats();
  const fb = $("#quizFeedback");
  fb.textContent = ok
    ? `✓ ${quiz.answer} = ${pretty(code)}`
    : `✗ it was ${quiz.answer} = ${pretty(code)}`;
  fb.className = "learn-feedback " + (ok ? "ok" : "no");
  $$("#quizChoices button").forEach(b => {
    b.disabled = true;
    const bc = LETTERS[b.textContent] || DIGITS[b.textContent];
    if (b.textContent === quiz.answer) b.classList.add("active");
  });
  quiz.step++;
  setTimeout(() => { if (quiz.lesson) nextQuizQuestion(LESSONS.find(l => l.id === quiz.lesson)); }, 1300);
}

function finishQuiz(les) {
  const total = quiz.order.length;
  const pass = quiz.streak >= Math.min(5, total) || (stats.correct >= total && quiz.streak >= 3);
  const fb = $("#quizFeedback");
  if (!stats.lessonsDone.includes(les.id) && (quiz.streak >= 5 || quiz.step >= total && quiz.streak >= 4)) {
    stats.lessonsDone.push(les.id);
    saveStats();
    toast(`lesson ${les.title} complete!`);
  }
  fb.textContent = `finished — final streak ${quiz.streak}. ${stats.lessonsDone.includes(les.id) ? "✓ lesson passed" : "get 5 in a row to pass"}`;
  fb.className = "learn-feedback " + (stats.lessonsDone.includes(les.id) ? "ok" : "");
  quiz.lesson = null;
  renderLessons();
}

$("#quizClose").addEventListener("click", () => {
  quiz.lesson = null;
  $("#lessonQuiz").hidden = true;
  renderLessons();
});

$("#quizReplay").addEventListener("click", () => {
  if (!quiz.lesson || !quiz.answer) return;
  MorseAudio.stop();
  applyAudioSettings();
  MorseAudio.play(LETTERS[quiz.answer] || DIGITS[quiz.answer]);
});

pageHooks.enter.learn = () => {
  renderLearnCharts();
  renderLessons();
};
