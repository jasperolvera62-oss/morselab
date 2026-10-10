/* ═══════════ TOOLS: audio, flash, keyboard, dictionary, signals, lab, history ═══════════ */

/* ────────── AUDIO page ────────── */
$("#audioPlayBtn").addEventListener("click", () => {
  playPause(textToMorse($("#audioInput").value).morse);
});
$("#audioStopBtn2").addEventListener("click", () => MorseAudio.stop());
$("#audioLoop").addEventListener("change", e => {
  AUDIO.loop = e.target.checked;
  const lt = $("#loopToggle"); if (lt) lt.checked = e.target.checked;
  applyAudioSettings();
});
$("#audioFarns").addEventListener("change", e => {
  AUDIO.farnsworth = e.target.checked;
  const ft = $("#farnsworthToggle"); if (ft) ft.checked = e.target.checked;
  applyAudioSettings();
});
$("#toneType").addEventListener("change", e => { AUDIO.toneType = e.target.value; applyAudioSettings(); });
[["#aWpm", "wpm"], ["#aTone", "tone"], ["#aVol", "volume"]].forEach(([id, kind]) =>
  $(id).addEventListener("input", e => audioSetting(kind, e.target.value)));
$("#tonePresets").addEventListener("click", e => {
  const hz = e.target.dataset.hz;
  if (!hz) return;
  audioSetting("tone", hz);
  $$("#tonePresets button").forEach(b => b.classList.toggle("active", b === e.target));
});

/* visualizer */
const vizCanvas = $("#viz");
const vizCtx = vizCanvas.getContext("2d");
let vizRaf = null;
function drawViz() {
  const w = vizCanvas.width, h = vizCanvas.height;
  vizCtx.clearRect(0, 0, w, h);
  vizCtx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--morse") || "#3fb950";
  vizCtx.lineWidth = 2;
  vizCtx.beginPath();
  try {
    const an = MorseAudio.analyser;
    const data = new Uint8Array(an.frequencyBinCount);
    an.getByteTimeDomainData(data);
    const step = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const y = (data[i] / 255) * h;
      i === 0 ? vizCtx.moveTo(0, y) : vizCtx.lineTo(i * step, y);
    }
  } catch (e) {
    vizCtx.moveTo(0, h / 2); vizCtx.lineTo(w, h / 2);
  }
  vizCtx.stroke();
  vizRaf = requestAnimationFrame(drawViz);
}
pageHooks.enter.audio = () => { if (!vizRaf) drawViz(); };
pageHooks.leave.audio = () => { cancelAnimationFrame(vizRaf); vizRaf = null; };

/* ────────── FLASH page ────────── */
const flashInput = $("#flashInput");
function flashPreview() {
  $("#flashPreview").textContent = pretty(textToMorse(flashInput.value).morse);
}
flashInput.addEventListener("input", flashPreview);

$("#flashBtn").addEventListener("click", () => {
  if (!settings.flashing) { toast("flashing disabled in settings"); return; }
  const morse = textToMorse(flashInput.value).morse;
  if (!morse) { toast("nothing to flash"); return; }
  Transmitter.send(morse, {
    flash: true, wpm: +$("#fWpm").value,
    stageId: "flashStage", glyphId: $("#flashGlyphOn").checked ? "flashGlyph" : "___none"
  });
});
$("#flashSosBtn").addEventListener("click", () => {
  if (!settings.flashing) { toast("flashing disabled in settings"); return; }
  Transmitter.send("... --- ...", {
    flash: true, wpm: +$("#fWpm").value,
    stageId: "flashStage", glyphId: $("#flashGlyphOn").checked ? "flashGlyph" : "___none"
  });
});
$("#vibeBtn").addEventListener("click", () => {
  if (!settings.vibration) { toast("vibration disabled in settings"); return; }
  if (!navigator.vibrate) { toast("vibration not supported here"); return; }
  const morse = textToMorse(flashInput.value).morse;
  if (!morse) { toast("nothing to vibrate"); return; }
  Transmitter.send(morse, { flash: false, vibe: true, wpm: +$("#fWpm").value });
});
$("#fWpm").addEventListener("input", e => $("#fWpmOut").textContent = e.target.value);
pageHooks.enter.flash = flashPreview;

/* ────────── BIG KEYBOARD page ────────── */
let kbMorse = "";
function kbRender() {
  $("#kbMorse").textContent = kbMorse || "…";
  const { text } = morseToText(kbMorse || " ");
  let out = text;
  if (settings.caps === "upper") out = out.toUpperCase(); else out = out.toLowerCase();
  $("#kbText").textContent = kbMorse ? out : "";
}
$(".big-keypad").addEventListener("click", e => {
  const key = e.target.dataset.bk;
  if (key == null) return;
  if (key === "clear") kbMorse = "";
  else if (key === "\\b") kbMorse = kbMorse.replace(/\s*\S*$/, "");
  else if (key === " ") kbMorse = kbMorse.replace(/\s+$/, "") + " ";
  else if (key === "/") kbMorse = kbMorse.replace(/\s*$/, "") + " / ";
  else kbMorse = kbMorse + key;
  kbRender();
  MorseAudio.beep(key === "." ? 700 : key === "-" ? 500 : 600, 0.05, 0.12);
});
$("#kbPlay").addEventListener("click", () => {
  if (!kbMorse.trim()) { toast("press some keys first"); return; }
  playPause(kbMorse);
});
$("#kbCopy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(kbMorse); toast("copied"); } catch (e) { toast("copy failed"); }
});
$("#kbToText").addEventListener("click", () => {
  const { text, invalid } = morseToText(kbMorse);
  toast(invalid.length ? "invalid: " + invalid.join(", ") : text);
});
$("#kbSend").addEventListener("click", () => {
  if (!kbMorse.trim()) { toast("nothing to send"); return; }
  navigate("translator");
  if (mode === "m2t") setMode("auto");
  morseInput.value = kbMorse;
  translateFrom("morse");
  pushHistory();
  toast("sent to translator");
});

/* ────────── DICTIONARY ────────── */
let dictKind = "all";
function renderDict() {
  const q = $("#dictSearch").value.trim().toLowerCase();
  const list = $("#dictList");
  list.innerHTML = "";
  const items = DICTIONARY.filter(d =>
    (dictKind === "all" || d.kind === dictKind) &&
    (!q || d.term.toLowerCase().includes(q) || d.meaning.toLowerCase().includes(q) || d.code.includes(q))
  ).slice(0, 60);
  if (!items.length) { list.innerHTML = `<p class="hint">no matches for “${esc(q)}”</p>`; return; }
  items.forEach(d => {
    const row = document.createElement("div");
    row.className = "dict-item";
    row.innerHTML = `<span class="d-term">${esc(d.term)}</span>
      <span class="d-code">${esc(pretty(d.code))}</span>
      <span class="d-mean">${esc(d.meaning)}</span>
      <span class="d-kind">${esc(d.kind)}</span>`;
    const play = document.createElement("button");
    play.className = "icon-btn";
    play.textContent = "▶";
    play.title = "play";
    play.addEventListener("click", () => {
      applyAudioSettings();
      MorseAudio.stop();
      MorseAudio.play(d.code);
    });
    row.appendChild(play);
    list.appendChild(row);
  });
}
$("#dictSearch").addEventListener("input", renderDict);
$$("#dictFilter button").forEach(b => b.addEventListener("click", () => {
  $$("#dictFilter button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  dictKind = b.dataset.kind;
  renderDict();
}));
pageHooks.enter.dictionary = renderDict;

/* ────────── SIGNALS ────────── */
function renderSignals() {
  const list = $("#signalList");
  list.innerHTML = "";
  SIGNALS.forEach(s => {
    const card = document.createElement("div");
    card.className = "signal-card";
    card.innerHTML = `<div class="s-head"><span class="s-name">${esc(s.name)}</span>
        <button class="icon-btn s-play">▶</button></div>
      <span class="s-code">${esc(pretty(s.code))}</span>
      <span class="s-mean">${esc(s.meaning)}</span>`;
    card.addEventListener("click", () => {
      applyAudioSettings();
      MorseAudio.stop();
      MorseAudio.play(s.code);
    });
    list.appendChild(card);
  });
}

/* ────────── LAB ────────── */
let labMode = "encode";
const LAB_HINTS = {
  encode: "Plain text → Morse. Same engine as the translator.",
  binary: "Text → binary (8-bit) → Morse where 0 = · and 1 = −. Paste the result back to decode.",
  ascii: "Text → ASCII codes (decimal) shown, plus the Morse for each letter.",
  caesar: "Shift the alphabet by N, then encode the result in Morse.",
  b64: "Text → Morse → Base64 of the raw Morse string. Paste a Morse string back to reverse it.",
  reverse: "Reverses the character order of the text, then encodes to Morse.",
  custom: "Random private alphabet: each letter gets its own invented Morse pattern. The key is generated fresh each run.",
  random: "Generates a random message, encoded and ready to transmit."
};

function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ""; } }
function b64dec(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } }

function caesar(text, shift) {
  return text.replace(/[a-zA-Z]/g, c => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + shift + 26) % 26 + base);
  });
}

let customKey = null;
function genCustomKey() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const pool = [];
  const lens = [2, 3, 4];
  for (const L of lens) {
    const combos = [];
    const n = L === 2 ? 4 : L === 3 ? 8 : 16;
    for (let i = 0; i < Math.pow(2, L); i++)
      combos.push(i.toString(2).padStart(L, "0").replace(/0/g, ".").replace(/1/g, "-"));
    combos.forEach(c => pool.push(c));
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  customKey = {};
  alphabet.forEach((a, i) => customKey[a] = pool[i]);
}

function runLab() {
  const input = $("#labInput").value;
  const out = $("#labOutput");
  let morse = "";
  let text = "";

  switch (labMode) {
    case "encode": {
      const r = textToMorse(input);
      text = input;
      morse = r.morse;
      if (r.unknown.length) toast("skipped: " + [...new Set(r.unknown)].join(" "));
      break;
    }
    case "binary": {
      if (/^[01\s]+$/.test(input.trim()) && /\d/.test(input)) {
        const chars = input.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2)));
        text = chars.join("");
        morse = textToMorse(text).morse;
      } else {
        text = input;
        morse = textToMorse(text).morse.split(" ").map(c =>
          c.split("").map(s => s === "." ? "0" : s === "-" ? "1" : s).join("")
        ).join(" ");
        morse = "0/1 form: " + morse;
      }
      break;
    }
    case "ascii": {
      if (/^[\d\s]+$/.test(input.trim())) {
        text = input.trim().split(/\s+/).map(n => String.fromCharCode(+n)).join("");
        morse = textToMorse(text).morse;
      } else {
        const codes = input.split("").filter(c => c !== " ").map(c => c.charCodeAt(0));
        text = codes.join(" ");
        morse = textToMorse(input).morse;
      }
      break;
    }
    case "caesar": {
      const shift = +( $("#labShift") ? $("#labShift").value : 3 );
      text = caesar(input, shift);
      morse = textToMorse(text).morse;
      out.textContent = `shifted: ${text}\n\n${pretty(morse)}`;
      out.dataset.morse = morse;
      return;
    }
    case "b64": {
      if (/^[.\-\s/]+$/.test(input.trim())) {
        const dec = morseToText(input);
        out.textContent = `decoded: ${dec.text}\nbase64: ${b64enc(dec.text)}`;
        out.dataset.morse = "";
      } else {
        morse = textToMorse(input).morse;
        out.textContent = `morse: ${morse}\n\nbase64: ${b64enc(morse)}`;
        out.dataset.morse = morse;
      }
      return;
    }
    case "reverse": {
      const rev = input.split("").reverse().join("");
      text = rev;
      morse = textToMorse(rev).morse;
      out.textContent = `reversed: ${text}\n\n${pretty(morse)}`;
      out.dataset.morse = morse;
      return;
    }
    case "custom": {
      if (!customKey || input.toLowerCase().includes("new key")) genCustomKey();
      const mapping = Object.entries(customKey).map(([a, c]) => `${a}=${c}`).join("  ");
      const enc = input.toUpperCase().split("").map(c => customKey[c] || "").join(" ");
      out.textContent = `KEY: ${mapping}\n\nENCODED: ${pretty(enc)}`;
      out.dataset.morse = enc;
      return;
    }
    case "random": {
      const msg = LAB_MESSAGES[Math.floor(Math.random() * LAB_MESSAGES.length)];
      $("#labInput").value = msg;
      text = msg;
      morse = textToMorse(msg).morse;
      break;
    }
  }

  out.dataset.morse = morse;
  out.textContent = morse ? pretty(morse) : "";
}

$$("#labSeg button").forEach(b => b.addEventListener("click", () => {
  $$("#labSeg button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  labMode = b.dataset.lab;
  $("#labHint").textContent = LAB_HINTS[labMode] || "";
  const extra = $("#labExtra");
  extra.innerHTML = "";
  if (labMode === "caesar") {
    extra.innerHTML = `<label class="hint">shift:</label><input type="number" id="labShift" value="3" min="0" max="25">`;
  }
  if (labMode === "random") $("#labInput").value = "";
  $("#labOutput").textContent = "";
  $("#labOutput").dataset.morse = "";
}));

$("#labRun").addEventListener("click", runLab);
$("#labCopy").addEventListener("click", async () => {
  const txt = $("#labOutput").textContent;
  if (!txt) { toast("nothing to copy"); return; }
  try { await navigator.clipboard.writeText(txt); toast("copied"); } catch (e) { toast("copy failed"); }
});
$("#labPlay").addEventListener("click", () => {
  const m = $("#labOutput").dataset.morse || "";
  if (!m) { toast("run something first"); return; }
  applyAudioSettings();
  MorseAudio.stop();
  MorseAudio.play(m);
});
pageHooks.enter.lab = () => { if (!$("#labHint").textContent) $("#labHint").textContent = LAB_HINTS.encode; };

/* ────────── HISTORY ────────── */
function renderTimeline() {
  const tl = $("#timeline");
  if (tl.children.length) return;
  HISTORY.forEach(item => {
    const div = document.createElement("div");
    div.className = "tl-item";
    div.innerHTML = `<div class="tl-year">${esc(item.year)}</div>
      <div class="tl-body"><b>${esc(item.title)}</b><p>${esc(item.text)}</p></div>`;
    tl.appendChild(div);
  });
}
pageHooks.enter.history = renderTimeline;

/* ────────── boot extras ────────── */
flashPreview();
renderSignals();
renderDict();
