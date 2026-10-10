/* ═══════════ International Morse tables ═══════════ */

const LETTERS = {
  A: ".-",    B: "-...",  C: "-.-.",  D: "-..",   E: ".",
  F: "..-.",  G: "--.",   H: "....",  I: "..",    J: ".---",
  K: "-.-",   L: ".-..",  M: "--",    N: "-.",    O: "---",
  P: ".--.",  Q: "--.-",  R: ".-.",   S: "...",   T: "-",
  U: "..-",   V: "...-",  W: ".--",   X: "-..-",  Y: "-.--",
  Z: "--.."
};

const DIGITS = {
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----."
};

const PUNCT = {
  ".": ".-.-.-",  ",": "--..--",  "?": "..--..",  "'": ".----.",
  "!": "-.-.--",  "/": "-..-.",    "(": "-.--.",   ")": "-.--.-",
  "&": ".-...",   ":": "---...",   ";": "-.-.-.",  "=": "-...-",
  "+": ".-.-.",   "-": "-....-",   "_": "..--.-",  '"': ".-..-.",
  "$": "...-..",  "@": ".--.-."
};

const PROSIGNS = {
  "<AR>": ".-.-.", "<AS>": ".-...", "<BT>": "-...-", "<SK>": "...-.-",
  "<SN>": "...-.", "<BK>": "-...-.-", "<HH>": "........", "<HM>": "........",
  "<INT>": "..-.-", "<KA>": ".-.-.", "<ATTN>": "-.-.-", "<SOS>": "...---..."
};

const ACCENTED = {
  "é": "..-..-",  "è": ".-..-",   "à": ".-.-",    "ç": "-.-..",
  "ñ": "--.--",   "ö": "---.",    "ü": "..--",    "â": ".-.-",
  "ê": "..-..",   "î": "..--.",   "ô": "---.",    "û": "..--"
};

/* reverse lookup: morse -> character */
const FROM_MORSE = {};
for (const [ch, code] of Object.entries(LETTERS)) FROM_MORSE[code] = ch;
for (const [ch, code] of Object.entries(DIGITS)) FROM_MORSE[code] = ch;
for (const [ch, code] of Object.entries(PUNCT))   FROM_MORSE[code] = ch;
for (const [ch, code] of Object.entries(ACCENTED)) FROM_MORSE[code] = ch;

const FROM_PROSIGN = {};
for (const [name, code] of Object.entries(PROSIGNS)) FROM_PROSIGN[code] = name;

/* whole-word prosigns: typing one of these words sends the compact prosign */
const PROSIGN_WORD = { "ATTN": "-.-.-", "INT": "..-.-", "KA": ".-.-.", "SOS": "...---..." };

const VALID_CODES = new Set(Object.values(LETTERS).concat(
  Object.values(DIGITS), Object.values(PUNCT), Object.values(PROSIGNS), Object.values(ACCENTED)
));

const QUICK_MESSAGES = {
  SOS: "... --- ...",
  OK: "--- -.-",
  YES: "-.-- . ...",
  NO: "-. ---",
  HELP: ".... . .-.. .--.",
  CQ: "-.-. --.-",
  ATTENTION: "-.-.-"
};

const CHART_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

/* ────────── learning lessons: pairs build up ────────── */
const LESSONS = [
  { id: "et", title: "E / T",  pairs: ["E", "T"],               hint: "E is one dot, T is one dash — the building blocks." },
  { id: "an", title: "A / N",  pairs: ["A", "N"],               hint: "A = ·−, N = −·" },
  { id: "im", title: "I / M",  pairs: ["I", "M"],               hint: "I = ··, M = −− — dots vs dashes." },
  { id: "so", title: "S / O",  pairs: ["S", "O"],               hint: "S = ··· (SOS starts here), O = −−−." },
  { id: "ud", title: "U / D",  pairs: ["U", "D"],               hint: "U = ··−, D = −··" },
  { id: "rk", title: "R / K",  pairs: ["R", "K"],               hint: "R = ·−·, K = −·−" },
  { id: "gw", title: "G / W",  pairs: ["G", "W"],               hint: "G = −−·, W = ·−−" },
  { id: "hv", title: "H / V",  pairs: ["H", "V"],               hint: "H = ····, V = ···−" },
  { id: "fl", title: "F / L",  pairs: ["F", "L"],               hint: "F = ··−·, L = ·−··" },
  { id: "pj", title: "P / J",  pairs: ["P", "J"],               hint: "P = ·−−·, J = ·−−−" },
  { id: "bx", title: "B / X",  pairs: ["B", "X"],               hint: "B = −···, X = −··−" },
  { id: "cy", title: "C / Y",  pairs: ["C", "Y"],               hint: "C = −·−·, Y = −·−−" },
  { id: "zq", title: "Z / Q",  pairs: ["Z", "Q"],               hint: "Z = −−··, Q = −−·−" },
  { id: "num", title: "Numbers", pairs: ["0","1","2","3","4","5","6","7","8","9"], hint: "Digits are 5 units long." },
  { id: "full", title: "Full alphabet", pairs: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), hint: "Everything, mixed." }
];

/* ────────── dictionary: search entries ────────── */
const DICTIONARY = [];
for (const [ch, code] of Object.entries(LETTERS))
  DICTIONARY.push({ term: ch, code, kind: "letter", meaning: `Letter ${ch}` });
for (const [ch, code] of Object.entries(DIGITS))
  DICTIONARY.push({ term: ch, code, kind: "number", meaning: `Digit ${ch}` });
for (const [ch, code] of Object.entries(PUNCT))
  DICTIONARY.push({ term: ch, code, kind: "punctuation", meaning: `Punctuation "${ch}"` });

DICTIONARY.push(
  { term: "SOS", code: "... --- ...", kind: "prosign", meaning: "International distress signal — help needed immediately" },
  { term: "CQ", code: "-.-. --.-", kind: "prosign", meaning: "General call — calling any station" },
  { term: "AR", code: ".-.-.", kind: "prosign", meaning: "End of message (also written +)" },
  { term: "SK", code: "...-.-", kind: "prosign", meaning: "End of contact / closing down" },
  { term: "K", code: "-.-", kind: "prosign", meaning: "Go ahead — inviting a specific station to transmit" },
  { term: "R", code: ".-.", kind: "prosign", meaning: "Roger — received and understood" },
  { term: "BT", code: "-...-", kind: "prosign", meaning: "Break — separator between sections (also =)" },
  { term: "AS", code: ".-...", kind: "prosign", meaning: "Wait — stand by" },
  { term: "HH", code: "........", kind: "prosign", meaning: "Correction — previous characters in error" },
  { term: "88", code: "---.. ---..", kind: "abbreviation", meaning: "Love and kisses" },
  { term: "73", code: "--... --...", kind: "abbreviation", meaning: "Best regards / greetings" },
  { term: "OM", code: "--- --", kind: "abbreviation", meaning: "Old man — male operator" },
  { term: "YL", code: "-.-- .-..", kind: "abbreviation", meaning: "Young lady — female operator" },
  { term: "XYL", code: "-..- -.-- .-..", kind: "abbreviation", meaning: "Wife of an operator" },
  { term: "ES", code: ". ...", kind: "abbreviation", meaning: "And" },
  { term: "PSE", code: ".--. . ... .", kind: "abbreviation", meaning: "Please" },
  { term: "TNX", code: "- -. -..-", kind: "abbreviation", meaning: "Thanks" },
  { term: "UR", code: "..- .-.", kind: "abbreviation", meaning: "Your / you're" },
  { term: "RST", code: ".-. ... -", kind: "abbreviation", meaning: "Signal report: Readability, Strength, Tone" },
  { term: "5NN", code: "..... -. -.", kind: "abbreviation", meaning: "599 — perfect signal report, sent fast" },
  { term: "WX", code: ".-- -..-", kind: "abbreviation", meaning: "Weather" },
  { term: "QTH", code: "--.- - ....", kind: "abbreviation", meaning: "My location is…" },
  { term: "QRZ", code: "--.- .-. --..-", kind: "abbreviation", meaning: "Who is calling me?" },
  { term: "GM", code: "--. --", kind: "abbreviation", meaning: "Good morning" },
  { term: "GD", code: "--. -..", kind: "abbreviation", meaning: "Good day" },
  { term: "HI", code: ".... ..", kind: "abbreviation", meaning: "Laughter / greeting" },
  { term: "CUL", code: "-.-. ..- .-..", kind: "abbreviation", meaning: "See you later" },
  { term: "FB", code: "..-. -...", kind: "abbreviation", meaning: "Fine business — well done" },
  { term: "AGN", code: ". --. -.", kind: "abbreviation", meaning: "Again" },
  { term: "NW", code: "-. .--", kind: "abbreviation", meaning: "Now" },
  { term: "VY", code: "...- -.--", kind: "abbreviation", meaning: "Very" },
  { term: "DX", code: "-.. -..-", kind: "abbreviation", meaning: "Long-distance contact" }
);

/* ────────── signals / prosigns explainer ────────── */
const SIGNALS = [
  { name: "SOS", code: "... --- ...", meaning: "Distress signal. Universal, no language barrier — sent as one unbroken group so it can't be mistaken." },
  { name: "CQ", code: "-.-. --.-", meaning: "General call: 'is anyone listening?' Used to start a contact with any station." },
  { name: "AR", code: ".-.-.", meaning: "End of message. You finished transmitting; the other station may reply." },
  { name: "SK", code: "...-.-", meaning: "End of contact. Conversations are over, closing the QSO." },
  { name: "K", code: "-.-", meaning: "Go ahead — invites a specific station you just addressed to transmit." },
  { name: "R", code: ".-.", meaning: "Roger — 'received and understood'. The oldest acknolwedgement in radio." },
  { name: "BT", code: "-...-", meaning: "Break — a paragraph marker. Splits sections of a message (sent as = on paper)." },
  { name: "AS", code: ".-...", meaning: "Wait / stand by. Also sent as SN (...-.) with the same meaning." },
  { name: "HH", code: "........", meaning: "Correction: everything I just sent was wrong, retransmitting." },
  { name: "ATTN", code: "-.-.-", meaning: "Attention — marks the start of an important message." },
  { name: "BK", code: "-...-.-", meaning: "Break-in — cutting into a conversation informally." },
  { name: "INT", code: "..-.-", meaning: "Interval — separates two parts of a message." }
];

/* ────────── history timeline ────────── */
const HISTORY = [
  { year: "1832", title: "The idea forms", text: "Artist and inventor Samuel F. B. Morse returns from Europe on the ship Sully convinced that information can travel on wires. Alfred Vail, Leonard Gale and Joseph Henry help turn the idea into working hardware." },
  { year: "1837", title: "The telegraph works", text: "Morse, Vail and Gale build the first practical electric telegraph. Vail's mechanical skills produce the register that dots the code onto paper tape." },
  { year: "1838", title: "The code takes shape", text: "Early experiments used numbers ('1 = A'). The dot-dash alphabet as we know it emerges, largely designed by Alfred Vail after studying letter frequencies in printers' type cases." },
  { year: "1844", title: "'What hath God wrought'", text: "The first official message is sent over the Washington–Baltimore line. Telegraphy explodes: news, railroads and finance are about to move at the speed of electricity." },
  { year: "1851", title: "International (Continental) Morse", text: "European nations adopt a modified code with shared characters for accented letters — today's International Morse. Railroad Morse in the US keeps a slightly different set." },
  { year: "1858", title: "Cable under the sea", text: "The first working transatlantic telegraph cable joins the US and Europe. A keypress in Newfoundland now echoes in Ireland — the planet starts to shrink." },
  { year: "1906", title: "SOS is chosen", text: "The Berlin Radio Convention selects SOS (···———···) as the international distress signal — chosen because it's unambiguous, not because it spells anything." },
  { year: "1912", title: "Titanic", text: "Wireless operators Phillips and Bride send CQD and SOS. The disaster proves radio at sea is a matter of life and death; coastal stations begin 24-hour watches." },
  { year: "1921", title: "Amateur radio goes on air", text: "Hams push into shortwave and soon prove they can cross oceans. 'Hams saved the day' becomes a fixture of history as ordinary people build stations in attics." },
  { year: "1957", title: "Beep from orbit", text: "Sputnik circles Earth broadcasting a two-tone signal that thousands of radio listeners copy by ear. The space age is narrated in beeps." },
  { year: "1999", title: "The end of safety traffic", text: "GMDSS satellite systems take over maritime distress. Commercial Morse traffic ends — but no treaty ever banned it." },
  { year: "today", title: "Morse lives on", text: "Amateur radio operators, the ISS (astronauts have sent Morse from orbit), aviation NDBs, time signals, and people learning it as a skill keep the code alive two centuries on." }
];

/* ────────── word lists for practice ────────── */
const PRACTICE_WORDS = [
  "CAT", "DOG", "SUN", "MOON", "STAR", "TREE", "BIRD", "FISH", "BOOK", "CODE",
  "RADIO", "SIGNAL", "WATER", "FIRE", "EARTH", "WIND", "NIGHT", "DAY", "HOME", "ROAD",
  "TRAIN", "PLANE", "SHIP", "CALL", "SEND", "RECV", "KEYER", "KEY", "WAVE", "BAND",
  "ANTENNA", "OPERATOR", "MESSAGE", "DISTRESS", "HELLO", "WORLD", "GOODBYE", "THANKS",
  "PLEASE", "AGAIN", "READY", "STOP", "WAIT", "YES", "NO", "MAYBE", "NOW", "LATER",
  "QTH", "RST", "CQ", "DX", "73", "88"
];

const LAB_MESSAGES = [
  "MEET ME AT THE OLD BRIDGE AT NOON",
  "THE WEATHER IS CLEAR TONIGHT",
  "SEND HELP IMMEDIATELY",
  "WELCOME TO THE MORSE LAB",
  "PRACTICE MAKES PERFECT",
  "EVERY LETTER IS A RHYTHM",
  "THE QUICK BROWN FOX JUMPS",
  "KEEP YOUR KEY RHYTHMIC",
  "BRAVE NEW WORLD OF SIGNALS",
  "TRANSMIT AND LISTEN"
];
