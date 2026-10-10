/* ═══════════ MORSELAB — radio simulator ═══════════ */

const rCalls = (() => {
  const prefixes = ["K", "W", "N", "VE", "VK", "ZL", "G", "JA", "DL", "F", "SM",
                    "HB", "OE", "EA", "I", "SP", "OK", "CE", "LU", "ZS", "VU", "HL", "KC"];
  const make = () => {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const d = Math.floor(Math.random() * 9) + 1;
    const len = 1 + Math.floor(Math.random() * 3);
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return p + d + s;
  };
  return make;
})();

const rCities = ["PARIS", "TOKYO", "LONDON", "BERLIN", "MADRID", "ROME", "OSLO",
                 "HELSINKI", "OTTAWA", "SYDNEY", "AUCKLAND", "DALLAS", "TOPEKA", "QUEBEC"];

function buildTransmission() {
  const tpl = Math.floor(Math.random() * 6);
  let text = "";
  if (tpl === 0) text = "CQ CQ CQ DE " + rCalls() + " " + rCalls() + " K";
  else if (tpl === 1) text = "CQ TEST " + rCalls() + " " + rCalls() + " TEST";
  else if (tpl === 2) {
    const m = ["IC7300", "TS590", "FT991", "KX2"][Math.floor(Math.random() * 4)];
    const a = ["G5RV", "DIPOLE", "YAGI", "LONG WIRE"][Math.floor(Math.random() * 4)];
    const c = rCities[Math.floor(Math.random() * rCities.length)];
    const w = ["CLEAR", "RAIN", "WINDY", "SUNNY"][Math.floor(Math.random() * 4)];
    text = "RIG " + m + " ANT " + a + " QTH " + c + " WEATHER " + w + " HI HI";
  } else if (tpl === 3) {
    const rst = ["599", "559", "579", "449"][Math.floor(Math.random() * 4)];
    text = rCalls() + " UR RST " + rst + " " + rst + " OVER";
  } else if (tpl === 4) {
    text = "NR " + (1 + Math.floor(Math.random() * 40)) + " FROM " + rCalls() + " 73 GL";
  } else {
    text = rCalls() + " DE " + rCalls() + " REPORT " + (3 + Math.floor(Math.random() * 57)) + " QSL";
  }
  const morse = textToMorse(text).morse;
  const freq = ("" + (14 + Math.floor(Math.random() * 40) / 100)).slice(0, 6) + " MHz";
  return { text, morse, freq };
}

function rSchedule(morse, wpm) {
  const unit = 1.2 / wpm;
  const fUnit = AUDIO.farnsworth ? 1.2 / Math.min(40, wpm + 10) : unit;
  const out = [];
  let t = 0;
  const words = morse.trim().split(/\s*\/\s*|\s{2,}/);
  for (const word of words) {
    const codes = word.trim().split(/\s+/).filter(Boolean);
    const start = t;
    for (const code of codes) {
      const syms = code.replace(/[^.\-]/g, "").split("");
      for (let si = 0; si < syms.length; si++) {
        t += (syms[si] === "." ? 1 : 3) * fUnit;
        if (si < syms.length - 1) t += fUnit;
      }
      t += 3 * unit;
    }
    const text = codes
      .map(c => FROM_MORSE[c] || (FROM_PROSIGN[c] || "").replace(/[<>]/g, "") || "…")
      .join("");
    out.push({ txt: text, start });
  }
  return out;
}

let rTransmission = null;
let rTimers = [];
const rClearTimers = () => { rTimers.forEach(clearTimeout); rTimers = []; };

function radioStationTune() {
  rClearTimers();
  MorseAudio.stop();
  rTransmission = buildTransmission();
  $("#rFreq").textContent = rTransmission.freq;
  $("#rState").textContent = "TUNING " + rTransmission.freq + "…";
  $("#rRcv").textContent = "";
  $("#rInput").value = "";
  $("#rResult").hidden = true;
  $("#rMeter").classList.add("on");

  MorseAudio.setOptions({ wpm: rWpm(), freq: settings.tone, volume: settings.volume / 100, loop: false });
  MorseAudio.play(rTransmission.morse);

  const plan = rSchedule(rTransmission.morse, rWpm());
  const total = plan.length ? plan[plan.length - 1].start + 3 : 0;
  plan.forEach(w => {
    rTimers.push(setTimeout(() => {
      $("#rRcv").textContent = ($("#rRcv").textContent + " " + w.txt).trim();
    }, w.start * 1000));
  });
  rTimers.push(setTimeout(() => {
    $("#rState").textContent = "SIGNAL LOST — copy what you copied below";
    $("#rMeter").classList.remove("on");
    $("#rInput").focus();
  }, total * 1000 + 300));
}

const rWpm = () => +$("#rWpm").value;
$("#rWpm").addEventListener("change", () => {
  rClearTimers(); MorseAudio.stop();
  $("#rState").textContent = "RCVR TUNED OFF";
  $("#rMeter").classList.remove("on");
});

$("#rCall").addEventListener("click", radioStationTune);
$("#rAgain").addEventListener("click", () => {
  if (!rTransmission) return;
  MorseAudio.stop();
  rClearTimers();
  $("#rState").textContent = "AGAIN · " + rTransmission.freq + "…";
  $("#rRcv").textContent = "";
  $("#rResult").hidden = true;
  $("#rMeter").classList.add("on");
  MorseAudio.setOptions({ wpm: rWpm(), freq: settings.tone, volume: settings.volume / 100, loop: false });
  MorseAudio.play(rTransmission.morse);
  const plan = rSchedule(rTransmission.morse, rWpm());
  const total = plan.length ? plan[plan.length - 1].start + 3 : 0;
  plan.forEach(w => {
    rTimers.push(setTimeout(() => {
      $("#rRcv").textContent = ($("#rRcv").textContent + " " + w.txt).trim();
    }, w.start * 1000));
  });
  rTimers.push(setTimeout(() => {
    $("#rState").textContent = "SIGNAL LOST";
    $("#rMeter").classList.remove("on");
  }, total * 1000 + 300));
});

$("#rCheck").addEventListener("click", () => {
  if (!rTransmission) return;
  const got = $("#rInput").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const want = rTransmission.text.replace(/[^A-Z0-9]/g, "");
  const ok = got === want;
  stats.radioCopy++;
  if (ok) stats.radioRight++;
  saveStats();
  $("#rResult").hidden = false;
  $("#rResult").className = "r-result" + (ok ? " good" : " bad");
  $("#rState").textContent = ok ? "COPY PERFECT — QSL!" : "PARTIAL — the station sent:";
  $("#rAnswer").textContent = rTransmission.text;
  $("#rCopyTxt").textContent = "copies: " + stats.radioRight + " / " + stats.radioCopy;
  toast(ok ? "Correct copy!" : "Not quite — compare below");
});
pageHooks.leave.radio = () => { rClearTimers(); MorseAudio.stop(); };