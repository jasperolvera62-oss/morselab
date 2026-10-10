/* ═══════════ MORSELAB — secret message mode ═══════════ */

/* Vigenère cipher */
function vigenere(text, key, decode) {
  const k = (key.toUpperCase().replace(/[^A-Z]/g, "") || "KEY").split("");
  let i = 0;
  return text.replace(/[A-Za-z]/g, ch => {
    const base = ch <= "Z" ? 65 : 97;
    const shift = k[i++ % k.length].charCodeAt(0) - 65;
    const d = decode ? 26 - shift : shift;
    return String.fromCharCode(((ch.charCodeAt(0) - base + d) % 26 + 26) % 26 + base);
  });
}

function rot13(text) {
  return text.replace(/[A-Za-z]/g, ch => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function caesar(text, shift, decode) {
  const d = (decode ? -1 : 1) * shift;
  return text.replace(/[A-Za-z]/g, ch => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + d + 26) % 26 + 26) % 26 + base);
  });
}

function railEncode(text, r) {
  r = Math.max(2, r);
  const rails = Array.from({ length: r }, () => []);
  let i = 0, dir = 1;
  for (const ch of text) {
    rails[i].push(ch);
    i += dir;
    if (i === 0 || i === r - 1) dir *= -1;
  }
  return rails.map(x => x.join("")).join("");
}

function railDecode(text, r) {
  r = Math.max(2, r);
  const n = text.length, period = (r - 1) * 2;
  const rows = Array.from({ length: r }, () => 0);
  for (let idx = 0; idx < n; idx++) {
    const p = idx % period;
    rows[p < r ? p : period - p]++;
  }
  let k = 0;
  const rails = rows.map(len => { const s = text.slice(k, k + len); k += len; return s; });
  const ptr = rows.map(() => 0);
  let i = 0, dir = 1;
  let out = "";
  for (let x = 0; x < n; x++) {
    out += rails[i][ptr[i]++];
    i += dir;
    if (i === 0 || i === r - 1) dir *= -1;
  }
  return out;
}

const secKeyOf = () => $("#secKey").value;

$$(".seg[data-sec] button").forEach(b =>
  b.addEventListener("click", () => {
    $$(".seg[data-sec] button").forEach(x => x.classList.toggle("active", x === b));
  }));

$("#secGo").addEventListener("click", () => {
  const cipher = $("#secCipher").value;
  const decode = document.querySelector(".seg[data-sec] button.active").dataset.sec === "decode";
  const raw = $("#secIn").value;
  let out = raw;
  if (cipher === "vigenere") out = vigenere(raw, secKeyOf(), decode);
  else if (cipher === "rot13") out = rot13(raw);
  else if (cipher === "caesar") out = caesar(raw, (+secKeyOf()) || 3, decode);
  else out = decode ? railDecode(raw, (+secKeyOf()) || 3) : railEncode(raw, (+secKeyOf()) || 3);
  $("#secOut").textContent = out;
  $("#secMorse").textContent = textToMorse(out).morse;
  stats.secret++;
  saveStats();
  touchStreak();
  toast(decode ? "decoded" : "encoded");
});

$("#secCopyTxt").addEventListener("click", () => {
  const t = $("#secOut").textContent;
  if (!t) return;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(() => toast("copied")).catch(() => toast("select and copy manually"));
});
$("#secCopyMorse").addEventListener("click", () => {
  const t = $("#secMorse").textContent;
  if (!t) return;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(() => toast("morse copied")).catch(() => toast("select and copy manually"));
});
$("#secClear").addEventListener("click", () => {
  $("#secIn").value = ""; $("#secOut").textContent = ""; $("#secMorse").textContent = "";
  MorseAudio.stop();
});
$("#secPlay").addEventListener("click", () => {
  const m = $("#secMorse").textContent;
  if (m) MorseAudio.play(m);
});
pageHooks.leave.secret = () => MorseAudio.stop();