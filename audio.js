/* ═══════════ Morse audio engine (Web Audio API) ═══════════ */

const MorseAudio = (() => {
  let ctx = null;
  let osc = null;
  let gain = null;
  let analyser = null;
  let state = "stopped";          // stopped | playing | paused
  let segments = [];              // [{on, dur, start, ch}]
  let totalDur = 0;
  let startedAt = 0;
  let pausedAt = 0;
  let endTimer = null;
  let visualTimer = null;
  let opts = { wpm: 15, freq: 600, volume: 0.7, loop: false, farnsworth: false, tone: "sine" };
  let onVisual = null;
  let onState = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = opts.volume;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      gain.connect(analyser);
      analyser.connect(ctx.destination);
    }
  }

  function buildSegments(morse) {
    const unit = 1.2 / opts.wpm;
    const fUnit = opts.farnsworth ? 1.2 / Math.min(40, opts.wpm + 10) : unit;
    const segs = [];
    let t = 0;
    const push = (on, dur, ch) => { if (dur > 0) { segs.push({ on, dur, start: t, ch }); t += dur; } };

    const words = morse.trim().split(/\s*\/\s*|\s{2,}/);
    words.forEach((word, wi) => {
      const letters = word.trim().split(/\s+/).filter(Boolean);
      letters.forEach((code, li) => {
        const syms = code.replace(/[^.\-]/g, "").split("");
        syms.forEach((sym, si) => {
          push(true, (sym === "." ? 1 : 3) * fUnit, sym);
          if (si < syms.length - 1) push(false, fUnit);
        });
        if (li < letters.length - 1) push(false, 3 * unit);
      });
      if (wi < words.length - 1) push(false, 7 * unit);
    });
    return { segs, total: t };
  }

  function scheduleVisuals() {
    clearTimeout(visualTimer);
    if (!onVisual) return;
    const tick = () => {
      if (state !== "playing") return;
      const pos = pausedAt + (ctx.currentTime - startedAt);
      const seg = segments.find(s => s.start + s.dur > pos && s.start <= pos);
      onVisual(!!(seg && seg.on), seg ? seg.ch : "");
      if (pos < totalDur) visualTimer = setTimeout(tick, 60);
    };
    tick();
  }

  function finish() {
    stopOsc();
    if (opts.loop && state === "playing") {
      pausedAt = 0;
      startFrom(0);
    } else {
      state = "stopped";
      pausedAt = 0;
      if (onVisual) onVisual(false, "");
      onState && onState(state);
    }
  }

  function startFrom(offset) {
    ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    stopOsc();

    osc = ctx.createOscillator();
    osc.type = opts.tone || "sine";
    osc.frequency.value = opts.freq;
    osc.connect(gain);

    const t0 = ctx.currentTime + 0.05;
    startedAt = t0;
    pausedAt = offset;

    for (const s of segments) {
      if (s.start + s.dur <= offset) continue;
      const sStart = Math.max(s.start, offset);
      const at = t0 + (sStart - offset);
      const onEnd = t0 + (s.start + s.dur - offset);
      if (s.on) {
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(opts.volume, at + 0.005);
        gain.gain.setValueAtTime(opts.volume, Math.max(at + 0.005, onEnd - 0.005));
        gain.gain.linearRampToValueAtTime(0, onEnd);
      } else {
        gain.gain.setValueAtTime(0, at);
      }
    }
    osc.start(t0);
    osc.stop(t0 + (totalDur - offset) + 0.1);

    state = "playing";
    onState && onState(state);
    scheduleVisuals();

    clearTimeout(endTimer);
    endTimer = setTimeout(finish, (totalDur - offset) * 1000 + 120);
  }

  function stopOsc() {
    if (osc) { try { osc.stop(); } catch (e) {} try { osc.disconnect(); } catch (e) {} osc = null; }
    clearTimeout(endTimer);
    clearTimeout(visualTimer);
    if (gain && ctx) gain.gain.setValueAtTime(0, ctx.currentTime);
  }

  return {
    get state() { return state; },
    get analyser() { ensureCtx(); return analyser; },
    setOptions(o) { Object.assign(opts, o); },
    setOnVisual(fn) { onVisual = fn; },
    setOnState(fn) { onState = fn; },

    load(morse) {
      const built = buildSegments(morse);
      segments = built.segs;
      totalDur = built.total;
      pausedAt = 0;
      return totalDur;
    },

    play(morse) {
      if (morse != null) this.load(morse);
      if (!segments.length) return false;
      startFrom(pausedAt);
      return true;
    },

    pause() {
      if (state !== "playing") return;
      pausedAt = pausedAt + (ctx.currentTime - startedAt);
      stopOsc();
      state = "paused";
      if (onVisual) onVisual(false, "");
      onState && onState(state);
    },

    stop() {
      stopOsc();
      state = "stopped";
      pausedAt = 0;
      if (onVisual) onVisual(false, "");
      onState && onState(state);
    },

    toggle(morse) {
      if (state === "playing") this.pause();
      else this.play(state === "paused" ? null : morse);
    },

    beep(freq, dur, vol) {
      ensureCtx();
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq || 880;
      g.gain.value = 0;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.linearRampToValueAtTime(vol || 0.25, t + 0.01);
      g.gain.setValueAtTime(vol || 0.25, t + (dur || 0.12) - 0.01);
      g.gain.linearRampToValueAtTime(0, t + (dur || 0.12));
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    }
  };
})();

/* ═══════════ Visual / vibration transmitter ═══════════ */
const Transmitter = (() => {
  let timers = [];
  let active = false;

  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
    active = false;
  }

  function send(morse, { flash = true, vibe = false, wpm = 15, on = null, stageId = "flashStage", glyphId = "flashGlyph" } = {}) {
    clear();
    active = true;
    const unit = 1.2 / wpm;
    let t = 0;
    const words = morse.trim().split(/\s*\/\s*|\s{2,}/);
    const schedule = (fn, at) => timers.push(setTimeout(fn, at * 1000));

    words.forEach((word, wi) => {
      const letters = word.trim().split(/\s+/).filter(Boolean);
      letters.forEach((code, li) => {
        const syms = code.replace(/[^.\-]/g, "").split("");
        syms.forEach((sym, si) => {
          const dur = (sym === "." ? 1 : 3) * unit;
          schedule(() => {
            on && on(true, sym);
            if (flash) showStage(true, sym, stageId, glyphId);
            if (vibe && navigator.vibrate) navigator.vibrate(Math.min(dur * 1000, 800));
          }, t);
          schedule(() => { on && on(false, sym); if (flash) showStage(false, "", stageId, glyphId); }, t + dur);
          t += dur;
          if (si < syms.length - 1) t += unit;
        });
        if (li < letters.length - 1) t += 3 * unit;
      });
      if (wi < words.length - 1) t += 7 * unit;
    });
    schedule(() => { active = false; if (flash) showStage(false, "", stageId, glyphId); }, t + 0.1);
    return t;
  }

  function showStage(on, sym, stageId, glyphId) {
    const stage = document.getElementById(stageId);
    const glyph = document.getElementById(glyphId);
    if (!stage) return;
    stage.hidden = !on;
    if (on && glyph) glyph.textContent = sym === "." ? "•" : sym === "-" ? "▬" : "";
  }

  return { send, clear, get active() { return active; } };
})();
