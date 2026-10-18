/* All sound is synthesised with WebAudio — no audio files, no licensing issues. */
'use strict';
NF.audio = (() => {
  let ctx = null, master, sfxBus, musBus, noiseBuf, comp;
  const vol = { sfx: NF.store.get('vol:sfx', 0.8), music: NF.store.get('vol:music', 0.55) };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = vol.music * 0.5; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function setVol(k, v) {
    vol[k] = v; NF.store.set('vol:' + k, v);
    if (!ctx) return;
    if (k === 'sfx') sfxBus.gain.value = v; else musBus.gain.value = v * 0.5;
  }

  /* --- building blocks --- */
  function env(g, t, a, peak, d, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d);
  }
  function tone(type, f0, f1, dur, peak, bus = sfxBus, t = ctx.currentTime, a = 0.004) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, a, peak, dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function noise(dur, peak, ftype, f0, f1, q = 1, bus = sfxBus, t = ctx.currentTime, a = 0.003) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 1;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
  }

  /* --- sound effects --- */
  const S = {
    whoosh(p = 1) { noise(0.16, 0.25, 'bandpass', 900 * p, 3500 * p, 1.2); },
    whooshBig() { noise(0.32, 0.35, 'bandpass', 500, 2600, 0.9); },
    hitL() { tone('sine', 190, 60, 0.12, 0.7); noise(0.07, 0.6, 'lowpass', 3000, 600); },
    hitH() { tone('sine', 140, 38, 0.22, 0.95); noise(0.14, 0.8, 'lowpass', 2500, 300); tone('square', 90, 40, 0.08, 0.15); },
    block() { tone('square', 820, 600, 0.06, 0.12); tone('triangle', 1400, 1100, 0.08, 0.15); noise(0.05, 0.35, 'highpass', 3000, 1500); },
    jump() { tone('triangle', 260, 520, 0.12, 0.12); },
    land() { noise(0.08, 0.3, 'lowpass', 600, 120); },
    fire() { noise(0.6, 0.55, 'lowpass', 2400, 280, 0.7); tone('sawtooth', 110, 55, 0.5, 0.12); },
    fireball() { noise(0.35, 0.45, 'bandpass', 1500, 400, 0.8); tone('sawtooth', 300, 80, 0.3, 0.1); },
    magic() { tone('sine', 880, 220, 0.4, 0.25); tone('triangle', 1320, 330, 0.35, 0.12); noise(0.3, 0.15, 'highpass', 5000, 2000); },
    teleport() { tone('sine', 200, 1600, 0.18, 0.25); noise(0.2, 0.2, 'bandpass', 4000, 800, 3); },
    zap() { tone('sawtooth', 1800, 200, 0.12, 0.18); noise(0.1, 0.25, 'highpass', 6000, 2000); },
    boom() { tone('sine', 90, 25, 0.9, 1); noise(1.1, 0.9, 'lowpass', 1800, 60, 0.5); },
    ultStart() { tone('sawtooth', 55, 110, 0.9, 0.25); tone('sine', 110, 880, 0.7, 0.35); noise(0.8, 0.35, 'bandpass', 300, 3000, 0.6); },
    ko() { tone('sine', 70, 30, 1.6, 1); noise(1.4, 0.7, 'lowpass', 1200, 50); tone('square', 220, 55, 0.9, 0.12); },
    bell() { [880, 1320, 1760].forEach((f, i) => tone('sine', f, f * 0.995, 1.2 - i * 0.2, 0.25 - i * 0.05)); },
    fight() { tone('sawtooth', 110, 220, 0.25, 0.25); noise(0.4, 0.4, 'bandpass', 600, 2400, 0.8); tone('sine', 55, 40, 0.6, 0.6); },
    blip() { tone('square', 660, 660, 0.05, 0.08); },
    confirm() { tone('square', 523, 523, 0.07, 0.1); setTimeout(() => ctx && tone('square', 784, 784, 0.12, 0.1), 70); },
    meter() { tone('triangle', 660, 1320, 0.25, 0.2); setTimeout(() => ctx && tone('triangle', 990, 1980, 0.3, 0.2), 110); },
    step() { noise(0.03, 0.08, 'lowpass', 400, 200); },
  };
  function play(name, ...a) { if (!ctx || !S[name]) return; try { S[name](...a); } catch (e) { } }

  /* --- music: a tiny step sequencer --- */
  const SONGS = {
    menu: { bpm: 84, root: 45, bass: [0, 0, -2, -2, -4, -4, -5, -5], lead: [12, null, 15, null, 17, 15, null, 12, 10, null, 12, null, 8, null, 7, null], drums: 'K...S...K.K.S...', pad: true },
    select: { bpm: 120, root: 45, bass: [0, 0, 3, 3, -2, -2, -4, -5], lead: [12, 15, 19, 15, 12, 15, 19, 22, 10, 14, 17, 14, 7, 10, 14, 17], drums: 'K.h.S.h.K.hKS.hh' },
    battle: { bpm: 148, root: 40, bass: [0, 0, 0, 12, 0, 0, 10, 12, 3, 3, 3, 15, 5, 5, 7, 10], lead: [null, null, 12, null, 15, 12, null, 10, null, 12, null, 7, null, null, 10, 12], drums: 'K.hhS.hhK.KhS.hS' },
    victory: { bpm: 132, root: 48, bass: [0, 0, 5, 5, 7, 7, 12, 12], lead: [12, 16, 19, 24, null, 19, 24, null, 22, 19, 17, 19, 24, null, null, null], drums: 'K.h.S.h.K.h.SSSS' },
  };
  let cur = null, timer = null, step = 0, nextT = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function music(name) {
    if (cur === name) return; cur = name; step = 0;
    if (timer) clearInterval(timer); timer = null;
    if (!name || !ctx) return;
    nextT = ctx.currentTime + 0.05;
    timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const s = SONGS[cur]; if (!s) return;
      const sp = 60 / s.bpm / 4;
      while (nextT < ctx.currentTime + 0.25) {
        const i = step % 16, t = nextT;
        const dch = s.drums[i];
        if (dch === 'K') { tone('sine', 120, 38, 0.18, 0.55, musBus, t); }
        if (dch === 'S') { noise(0.14, 0.3, 'bandpass', 1800, 900, 0.7, musBus, t); tone('triangle', 190, 160, 0.08, 0.12, musBus, t); }
        if (dch === 'h') noise(0.03, 0.08, 'highpass', 8000, 6000, 1, musBus, t);
        if (i % 2 === 0) { const b = s.bass[(step >> 1) % s.bass.length]; if (b != null) tone('sawtooth', midi(s.root + b), null, sp * 1.8, 0.12, musBus, t, 0.01); }
        const l = s.lead[step % s.lead.length]; if (l != null) tone('square', midi(s.root + 12 + l), null, sp * 0.9, 0.045, musBus, t, 0.005);
        if (s.pad && i === 0) { [0, 3, 7].forEach(k => tone('triangle', midi(s.root + 12 + k + s.bass[(step >> 1) % s.bass.length]), null, sp * 15, 0.04, musBus, t, 0.4)); }
        nextT += sp; step++;
      }
    }, 60);
  }
  return { init, play, music, setVol, vol, get ready() { return !!ctx; } };
})();
