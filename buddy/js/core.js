/* בובת ריסוק — shared helpers: math, saving, sound */
'use strict';
const BD = window.BD = {};
BD.rand = (a, b) => a + Math.random() * (b - a);
BD.pick = a => a[Math.floor(Math.random() * a.length)];
BD.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
BD.lerp = (a, b, t) => a + (b - a) * t;
BD.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
BD.TAU = Math.PI * 2;

/* ---------- saving: everything lives in one localStorage key ---------- */
BD.save = (() => {
  const KEY = 'bd:save:v1';
  const fresh = () => ({ coins: 120, owned: ['bat', 'glove', 'grenade', 'pistol', 'fire', 'anvil'], fav: [], recent: [],
    arenas: ['padded'], arena: 'padded', skins: ['crash'], skin: 'crash', up: { hit: 0, boom: 0, coin: 0 }, gravity: 1,
    ach: {}, ch: {}, surv: { best: 0 }, stats: { hits: 0, dmg: 0, used: {}, ceil: 0, ko: 0, fin: 0, best: 0, earned: 0, sp: {}, time: 0 },
    vol: { sfx: .8, music: .4 }, muted: false, seen: false });
  let s;
  try { s = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { s = fresh(); }
  s.stats = Object.assign(fresh().stats, s.stats || {});
  s.vol = Object.assign(fresh().vol, s.vol || {});
  s.up = Object.assign(fresh().up, s.up || {});
  let t = 0;
  return {
    get d() { return s; },
    write() { clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }, 250); },
    reset() { s = fresh(); this.write(); }
  };
})();

/* ---------- sound: all synthesized with WebAudio, started on the first tap ---------- */
BD.audio = (() => {
  let ctx = null, master, sfx, music, noiseBuf, musicOn = false, musicT = 0, beat = 0;
  const S = () => BD.save.d;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(master);
    sfx = ctx.createGain(); sfx.connect(comp); music = ctx.createGain(); music.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
  }
  function apply() {
    if (!ctx) return;
    master.gain.value = S().muted ? 0 : 1; sfx.gain.value = S().vol.sfx; music.gain.value = S().vol.music * .5;
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, dur, vol, at = 0, dest) {
    if (!ctx) return; const t = now() + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, .005, vol, dur); o.connect(g).connect(dest || sfx); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, f0, f1, q = 1, type = 'lowpass', at = 0, dest) {
    if (!ctx) return; const t = now() + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    env(g, t, .004, vol, dur); s.connect(f).connect(g).connect(dest || sfx); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  const lib = {
    hit(f) { f = BD.clamp(f, 0, 1); noise(.12 + f * .1, .25 + f * .5, 900 + f * 1500, 120, 1.5); tone('sine', 140 + f * 60, 50, .16, .4 + f * .4); },
    thud(f) { f = BD.clamp(f, 0, 1); tone('sine', 90, 40, .2, .25 + f * .5); noise(.08, .15 + f * .3, 500, 100, 1); },
    slap() { noise(.07, .7, 4000, 1500, .7, 'highpass'); tone('triangle', 600, 300, .05, .2); },
    clang() { [520, 780, 1170, 1630].forEach((f, i) => tone('triangle', f, f * .98, .5 - i * .08, .18)); noise(.05, .4, 6000, 3000, 1, 'highpass'); },
    swoosh() { noise(.22, .25, 600, 3000, 1.2, 'bandpass'); },
    crack() { noise(.09, .9, 3000, 400, .8); tone('square', 180, 60, .08, .3); },
    gun(big) { noise(big ? .35 : .18, big ? 1 : .8, big ? 2200 : 4000, 200, .9); tone('square', big ? 120 : 220, 40, big ? .2 : .1, big ? .5 : .35); },
    laser() { tone('sawtooth', 1800, 300, .18, .18); tone('square', 900, 200, .18, .08); },
    zap() { for (let i = 0; i < 6; i++) tone('sawtooth', BD.rand(200, 1400), BD.rand(80, 400), .05, .12, i * .03); noise(.3, .3, 6000, 2000, 2, 'bandpass'); },
    boom(f = 1) { noise(.6 + f * .9, .9 + f * .3, 1200 + f * 600, 40, .7); tone('sine', 70, 25, .5 + f * .8, .9); tone('sine', 45, 20, .8 + f, .7); },
    nuke() { noise(4, 1, 2500, 25, .6); tone('sine', 50, 18, 4, 1); tone('sine', 32, 18, 5, .9); },
    fuse() { noise(.5, .12, 5000, 6000, 3, 'bandpass'); },
    fire() { noise(.25, .18, 900, 400, .6, 'bandpass'); },
    freeze() { for (let i = 0; i < 8; i++) tone('sine', BD.rand(1500, 3500), BD.rand(2500, 5000), .2, .05, i * .03); noise(.4, .2, 8000, 3000, 3, 'highpass'); },
    shatter() { for (let i = 0; i < 12; i++) tone('triangle', BD.rand(1800, 4200), BD.rand(800, 2000), .25, .06, i * .015); noise(.25, .6, 7000, 2500, 1, 'highpass'); },
    spring() { tone('sine', 220, 900, .25, .3); },
    boing() { tone('sine', 180, 520, .12, .35); tone('sine', 520, 260, .2, .25, .12); },
    coin() { tone('square', 988, 988, .07, .07); tone('square', 1319, 1319, .2, .07, .07); },
    buy() { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, .12, .08, i * .07)); },
    click() { tone('triangle', 900, 700, .04, .12); },
    whoosh() { noise(.5, .3, 300, 2500, 1, 'bandpass'); },
    water() { noise(.3, .25, 1200, 600, .5, 'bandpass'); },
    rumble(d = 1.5) { noise(d, .7, 160, 60, .5); },
    wind(d = 4) { noise(d, .35, 400, 900, 2, 'bandpass'); },
    horn() { tone('sawtooth', 220, 220, .6, .2); tone('sawtooth', 277, 277, .6, .2); },
    chomp() { noise(.08, .6, 1200, 300, 1); tone('square', 120, 70, .1, .3); },
    piano() { [262, 330, 392, 466, 523].forEach(f => tone('triangle', f, f, 1.2, .1)); noise(.15, .8, 800, 100, .7); },
    ufo() { for (let i = 0; i < 10; i++) tone('sine', 700 + Math.sin(i) * 300, 900, .12, .1, i * .1); },
    grab() { tone('sine', 260, 420, .07, .14); },
    combo(n) { const b = Math.min(n, 60) / 10; [0, 4, 7, 12].forEach((v, i) => { const f = 440 * Math.pow(2, (v + b * 2) / 12); tone('square', f, f, .09, .07, i * .05); }); },
    special() { [0, 3, 7, 10, 12, 15].forEach((v, i) => { const f = 392 * Math.pow(2, v / 12); tone('square', f, f, .12, .08, i * .045); tone('triangle', f * 2, f * 2, .12, .05, i * .045); }); noise(.5, .25, 800, 6000, 1.5, 'bandpass'); },
    ko() { tone('sawtooth', 440, 110, .9, .14); tone('square', 220, 55, .9, .08); [1046, 1318, 1568].forEach((f, i) => tone('triangle', f, f, .6, .08, .3 + i * .12)); },
    unlock() { [523, 659, 784, 1046, 1318].forEach((f, i) => { tone('square', f, f, .16, .08, i * .08); tone('triangle', f / 2, f / 2, .16, .06, i * .08); }); noise(.6, .2, 3000, 9000, 1, 'highpass', .3); },
    deny() { tone('square', 200, 140, .14, .1); tone('square', 150, 100, .16, .1, .12); },
    beep() { tone('square', 1760, 1760, .06, .08); },
    pop() { tone('sine', 600, 1200, .06, .2); noise(.04, .2, 4000, 2000, 1); },
    splat() { noise(.18, .5, 1400, 300, .8); tone('sine', 180, 60, .12, .25); },
    sizzle() { noise(.6, .2, 7000, 4000, 2, 'highpass'); },
    bite() { noise(.06, .7, 2000, 500, 1); tone('square', 140, 60, .12, .35); noise(.06, .6, 2000, 500, 1, 'lowpass', .1); },
    stomp() { tone('sine', 70, 28, .5, .9); noise(.3, .6, 400, 60, .8); },
    servo() { tone('sawtooth', 300, 600, .2, .06); tone('sawtooth', 600, 300, .2, .06, .2); },
    portal() { tone('sine', 200, 1400, .3, .2); tone('triangle', 1400, 300, .3, .1, .05); },
    ghost() { tone('sine', 300, 420, 1.2, .08); tone('sine', 310, 400, 1.2, .06, .1); },
    tick() { tone('square', 2400, 2400, .02, .05); },
    charge(d = 1) { tone('sawtooth', 120, 1400, d, .1); tone('sine', 240, 2800, d, .08); },
    siren() { for (let i = 0; i < 3; i++) { tone('sawtooth', 500, 900, .45, .08, i * .9); tone('sawtooth', 900, 500, .45, .08, i * .9 + .45); } },
    saw() { tone('sawtooth', 110, 130, .12, .12); noise(.12, .15, 2000, 2500, 2, 'bandpass'); },
    // a cartoon voice: a pitched squeak through a vowel filter
    voice(kind) {
      if (!ctx) return; const t = now(), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      const p = { ow: [520, 260, .28], scream: [700, 1100, .6], laugh: [400, 380, .5], hmm: [220, 200, .4], wee: [500, 1300, .7], brr: [300, 280, .5] }[kind] || [400, 300, .3];
      o.type = 'sawtooth'; o.frequency.setValueAtTime(p[0], t); o.frequency.exponentialRampToValueAtTime(p[1], t + p[2]);
      if (kind === 'laugh' || kind === 'brr') { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = kind === 'laugh' ? 8 : 22; lg.gain.value = kind === 'laugh' ? 120 : 30; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + p[2] + .05); }
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; env(g, t, .02, .22, p[2]);
      o.connect(f).connect(g).connect(sfx); o.start(t); o.stop(t + p[2] + .05);
    }
  };
  /* continuous sounds (chainsaw, beams, water, wind...) that weapons switch on and off */
  const loops = new Set();
  function loop(kind) {
    if (!ctx) return { set() {}, stop() {} };
    const t = now(), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + .06);
    const nodes = [], out = ctx.createGain(); out.gain.value = .2; out.connect(g).connect(sfx);
    const osc = (type, f, v) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f; og.gain.value = v; o.connect(og).connect(out); o.start(); nodes.push(o); return o; };
    const nz = (type, f, q, v) => { const n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; ng.gain.value = v; n.connect(fl).connect(ng).connect(out); n.start(0, Math.random()); nodes.push(n); return fl; };
    const lfo = (target, f, depth) => { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = f; lg.gain.value = depth; l.connect(lg).connect(target); l.start(); nodes.push(l); };
    let main = null, filt = null;
    switch (kind) {
      case 'saw': main = osc('sawtooth', 95, .7); lfo(main.frequency, 32, 18); filt = nz('bandpass', 2400, 2, .5); break;
      case 'beam': main = osc('sawtooth', 220, .35); osc('square', 331, .15); lfo(main.frequency, 9, 30); filt = nz('bandpass', 3000, 4, .3); break;
      case 'water': filt = nz('bandpass', 1200, .6, 1.2); nz('highpass', 5000, .5, .4); break;
      case 'wind': filt = nz('bandpass', 500, 1.5, 1.6); lfo(filt.frequency, .7, 260); break;
      case 'fire': filt = nz('bandpass', 900, .7, 1); nz('lowpass', 300, .5, .6); break;
      case 'minigun': main = osc('square', 40, .4); filt = nz('bandpass', 1800, 3, .4); break;
      case 'hum': main = osc('sine', 110, .6); osc('sine', 165, .3); lfo(main.frequency, 4, 12); break;
      case 'rumble': filt = nz('lowpass', 120, .7, 2.5); break;
      case 'engine': main = osc('sawtooth', 60, .5); lfo(main.frequency, 12, 6); filt = nz('lowpass', 500, .7, .6); break;
      case 'suck': main = osc('sine', 60, .7); lfo(main.frequency, .5, 25); filt = nz('bandpass', 300, 2, 1); lfo(filt.frequency, .3, 200); break;
      case 'rain': filt = nz('highpass', 4000, .5, .8); nz('bandpass', 1500, 1, .5); break;
      default: main = osc('sine', 200, .3);
    }
    const h = { kind, set(v, f) { if (!ctx) return; out.gain.setTargetAtTime(.2 * v, now(), .05); if (f && main) main.frequency.setTargetAtTime(f, now(), .05); if (f && filt && !main) filt.frequency.setTargetAtTime(f, now(), .08); },
      stop() { if (!loops.has(h)) return; loops.delete(h); const t2 = now(); g.gain.setTargetAtTime(0.0001, t2, .05); nodes.forEach(n => { try { n.stop(t2 + .3); } catch (e) {} }); } };
    loops.add(h); return h;
  }
  /* music: a short looping groove; every arena passes its own key, tempo and sound */
  let M = { bpm: 116, root: 55, bass: [0, 0, 3, 0, 5, 0, 3, -2], wave: 'square', lead: null, swing: 0 };
  function tick() {
    if (!ctx || !musicOn) return;
    const step = 60 / M.bpm / 4;
    while (musicT < now() + .2) {
      const st = beat % 16, at = musicT - now(), bar = Math.floor(beat / 16) % 4;
      if (st % 4 === 0) tone('sine', 120, 40, .18, .5, at, music);
      if (st % 8 === 4) noise(.12, .3, 3000, 1200, .8, 'bandpass', at, music);
      if (st % 2 === 1) noise(.03, .1, 9000, 7000, 1, 'highpass', at, music);
      if (st % 2 === 0) { const f = M.root * Math.pow(2, M.bass[(st >> 1) % 8] / 12); tone(M.wave, f, f, step * 1.6, .08, at, music); }
      if (M.lead && (st === 0 || st === 6 || st === 10) && bar % 2 === 1) { const f = M.root * 4 * Math.pow(2, M.lead[(st + bar * 3) % M.lead.length] / 12); tone('triangle', f, f, step * 2.5, .045, at, music); }
      musicT += step; beat++;
    }
  }
  setInterval(tick, 60);
  return {
    init, apply, get ready() { return !!ctx; },
    play(name, ...a) { if (ctx && lib[name] && ctx.state === 'running') try { lib[name](...a); } catch (e) {} },
    music(on, cfg) { if (cfg) M = Object.assign({ bpm: 116, root: 55, bass: [0, 0, 3, 0, 5, 0, 3, -2], wave: 'square', lead: null }, cfg); musicOn = on; if (on && ctx) musicT = Math.max(musicT, now() + .05); },
    /* weapon files add their own one-shot sounds: f({ tone, noise, rand }, ...args) */
    def(name, f) { lib[name] = (...a) => f({ tone, noise, rand: BD.rand }, ...a); },
    /* pausing the game silences everything that is still sounding */
    hold(on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); },
    loop, stopLoops() { [...loops].forEach(h => h.stop()); }
  };
})();
