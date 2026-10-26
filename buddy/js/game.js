/* בובת ריסוק — the game itself: world size, main loop, camera, pointer input,
   the hand tool, damage → score → coins, combos, knock-outs and the four modes. */
'use strict';
BD.W = {};            // weapon registry, filled by the weapons-*.js files
BD.WL = [];           // the same weapons in menu order
BD.CATS = [
  { id: 'melee', name: 'מכות' }, { id: 'boom', name: 'פיצוצים' }, { id: 'guns', name: 'נשקים' },
  { id: 'elem', name: 'איתני הטבע' }, { id: 'crazy', name: 'משוגע' }
];
BD.weapon = def => {
  const w = Object.assign({ price: 0, power: 2, chaos: 2, desc: '', tip: '', st: {} }, def);
  BD.W[w.id] = w; BD.WL.push(w); return w;
};

const G = BD.G = {
  W: 1600, H: 900, floor: 820, scale: 1, dpr: 1, ph: null, dummy: null, ents: [], t: 0, rt: 0,
  wpn: null, mode: 'sandbox', running: false, paused: false, arena: null,
  P: { x: 800, y: 400, px: 800, py: 400, vx: 0, vy: 0, down: false, t0: 0, x0: 0, y0: 0, moved: 0, over: false, touch: false },
  score: 0, coinAcc: 0, combo: { n: 0, t: 0, last: -9, best: 0, cats: [] }, gates: {}, lights: [], surf: [],
  userSlow: false, cam: { k: 1, ox: 0, oy: 0 }, events: {}, onAir: 0
};
BD.COIN_K = 1 / 9;    // coins per point of damage before bonuses (kept small on purpose)

/* ---------- tiny event bus for the UI, missions and achievements ---------- */
G.on = (n, f) => (G.events[n] = G.events[n] || []).push(f);
G.emit = (n, ...a) => (G.events[n] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } });

/* ---------- world size follows the screen so there are never black bars ---------- */
G.resize = function () {
  const cv = G.cv, r = cv.parentElement.getBoundingClientRect();
  const cw = Math.max(200, r.width), ch = Math.max(160, r.height), asp = cw / ch;
  let H = 900, W = H * asp;
  if (W < 760) { W = 760; H = W / asp; }
  if (W > 2100) { W = 2100; H = W / asp; }
  if (H < 640) { H = 640; W = H * asp; }
  G.W = Math.round(W); G.H = Math.round(H); G.floor = G.H - Math.round(Math.min(110, G.H * .09));
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  if (cw * ch * dpr * dpr > 2.1e6) dpr = Math.sqrt(2.1e6 / (cw * ch));
  G.dpr = dpr; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  G.scale = cv.width / G.W; G.cssScale = cw / G.W;
  if (G.ph) {
    Object.assign(G.ph.b, { l: 0, r: G.W, t: 0, b: G.floor });
    G.quiet = .2;
    for (const p of G.ph.ps) { p.x = BD.clamp(p.x, p.r, G.W - p.r); p.y = BD.clamp(p.y, p.r, G.floor - p.r); p.px = p.x; p.py = p.y; }
  }
  if (G.arena) BD.arenaPaint(G.arena);
  G.emit('resize');
};

/* ---------- setting up a round ---------- */
G.init = function (cv) {
  G.cv = cv; G.ctx = cv.getContext('2d', { alpha: false });
  G.ph = new BD.Phys();
  G.ph.onImpact = G.impact;
  G.ph.hazard = p => G.arena && G.arena.hazard && G.arena.hazard(p);
  G.resize();
  G.input();
  let last = performance.now();
  const loop = now => {
    const rdt = Math.min(.05, (now - last) / 1000); last = now;
    if (G.running && !G.paused) G.frame(rdt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => { clearTimeout(G._rt); G._rt = setTimeout(G.resize, 80); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { BD.audio.music(false); G.emit('hidden'); } else if (G.running && !G.paused) BD.audio.music(true); });
};
G.start = function (mode, opt = {}) {
  const S = BD.save.d;
  G.mode = mode; G.opt = opt; G.t = 0; G.score = 0; G.coinAcc = 0; G.roundCoins = 0; G.gates = {};
  G.combo = { n: 0, t: 0, last: -9, best: 0, cats: [] }; G.surf = []; G.lights = []; G.stat = { kos: 0, specials: {}, used: {}, fin: 0 };
  G.ents.forEach(e => e.kill && e.kill()); G.ents = [];
  if (G.ph) { G.ph.ps = []; G.ph.links = []; G.ph.boxes = []; }
  BD.fx.clear();
  G.ph.gScale = S.gravity ?? 1; G.ph.gx = 0; G.gravT = 0;
  G.setArena(opt.arena || S.arena);
  G.dummy = new BD.Dummy(G.ph, G.W / 2, G.floor);
  G.dummy.maxHp = 700;
  if (G.arena.props) G.arena.props(G);
  G.running = true; G.paused = false;
  BD.MODES[mode] && BD.MODES[mode].start && BD.MODES[mode].start(opt);
  G.select(opt.weapon || (S.recent[0] && G.canUse(BD.W[S.recent[0]]) ? S.recent[0] : 'hand'));
  BD.audio.music(true, G.arena.music);
  G.emit('start', mode);
};
G.stop = function () {
  G.running = false; BD.audio.music(false); BD.audio.stopLoops();
  if (G.wpn && G.wpn.leave) G.wpn.leave();
  G.flushCoins(true); BD.save.write();
};
G.setArena = function (id) {
  G.arena = BD.ARENAS[id] || BD.ARENAS.padded;
  const A = G.arena;
  G.ph.floorRest = A.floorRest ?? .25; G.ph.floorFric = A.floorFric ?? .55; G.ph.wallRest = A.wallRest ?? .35;
  G.baseGrav = A.grav ?? 1;
  BD.arenaPaint(A);
};
G.gravity = () => G.ph.gScale;

/* ---------- the frame ---------- */
G.frame = function (rdt) {
  const fx = BD.fx, ph = G.ph;
  G.rt += rdt;
  const slow = fx.S.slow * (G.userSlow ? .35 : 1), dt = rdt * slow;
  G.t += dt; G.quiet = Math.max(0, (G.quiet || 0) - rdt);
  // gravity: the player's setting times the arena, unless a weapon is bending it
  if (G.gravT > 0) { G.gravT -= dt; if (G.gravT <= 0) { G.ph.gx = 0; G.gravTarget = null; G.emit('gravity'); } }
  const gWant = (G.gravTarget != null ? G.gravTarget : (BD.save.d.gravity ?? 1) * G.baseGrav);
  ph.gScale = BD.lerp(ph.gScale, gWant, Math.min(1, dt * 4));
  // physics with fixed sub-steps
  G.acc = Math.min((G.acc || 0) + dt, ph.dt * 10);
  const P = G.P;
  let n = 0; const steps = Math.floor(G.acc / ph.dt);
  while (G.acc >= ph.dt) {
    n++; G.acc -= ph.dt;
    if (G.grab) G.holdGrab(n / steps);
    for (const e of G.ents) if (e.sub) e.sub(ph.dt);
    if (G.wpn && G.wpn.sub) G.wpn.sub(ph.dt, P);
    ph.step();
  }
  // pointer velocity, smoothed
  const ivx = (P.x - P.px) / Math.max(rdt, 1e-3), ivy = (P.y - P.py) / Math.max(rdt, 1e-3);
  P.vx = BD.lerp(P.vx, ivx, .5); P.vy = BD.lerp(P.vy, ivy, .5); P.px = P.x; P.py = P.y;
  const d = G.dummy;
  if (d) {
    d.update(dt, P.over || P.down ? P : null);
    if (d.hp <= 0 && !d.ko) G.knockout();
    if (d.ko) { d.ko -= dt; if (d.ko <= 0) G.revive(); }
    if (!d.ko && d.hp < 1 && G.mode === 'survival') d.hp = Math.min(1, d.hp + dt * BD.MODES.survival.regen());
    // flying fast leaves a trail
    for (const p of [d.j.head, d.j.hL, d.j.hR, d.j.fL, d.j.fR]) {
      const [vx, vy] = ph.vel(p), sp = vx * vx + vy * vy;
      if (sp > 2.2e6) fx.trail(p.x, p.y, '#fff8d8', p.r * .8, .22);
    }
    G.trackAir(dt);
  }
  // entities
  for (const e of G.ents) if (!e.dead && e.update && e.update(dt) === false) e.dead = true;
  G.ents = G.ents.filter(e => { if (e.dead) { e.kill && e.kill(); return false; } return true; });
  if (G.wpn && G.wpn.update) G.wpn.update(dt, P);
  // combo timer
  const c = G.combo; if (c.n && G.t - c.last > 2) { if (c.n >= 3) G.emit('comboEnd', c.n); c.n = 0; c.cats = []; G.emit('combo', c); }
  fx.update(dt, G.floor);
  for (let i = G.lights.length - 1; i >= 0; i--) { const L = G.lights[i]; L.life -= dt; if (L.life <= 0) G.lights.splice(i, 1); }
  BD.MODES[G.mode] && BD.MODES[G.mode].update && BD.MODES[G.mode].update(dt, rdt);
  if (G.arena.update) G.arena.update(dt, G);
  G.flushCoins();
  G.draw();
};

/* ---------- drawing ---------- */
G.draw = function () {
  const x = G.ctx, fx = BD.fx, S = fx.S, A = G.arena;
  const s = G.scale, z = S.zoom;
  const sh = S.shake * S.shake * 26;
  const shx = (Math.random() * 2 - 1) * sh, shy = (Math.random() * 2 - 1) * sh;
  const zx = BD.clamp(S.zx, 0, G.W), zy = BD.clamp(S.zy, 0, G.H);
  const k = s * z, ox = s * zx * (1 - z) + shx * s, oy = s * zy * (1 - z) + shy * s;
  G.cam = { k, ox, oy };
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = A.sky || '#111'; x.fillRect(0, 0, G.cv.width, G.cv.height);
  x.setTransform(k, 0, 0, k, ox, oy);
  x.drawImage(A.img, 0, 0, G.W, G.H);
  if (A.back) A.back(x, G.t, G);
  fx.drawStains(x);
  const L = (z0, z1) => { for (const e of G.ents) if (!e.dead && e.draw && (e.z ?? 1) >= z0 && (e.z ?? 1) < z1) e.draw(x); };
  L(-1, 1);
  if (G.dummy) { G.dummy.draw(x, G.rt); }
  L(1, 2);
  fx.draw(x);
  L(2, 9);
  if (G.wpn && G.wpn.draw) G.wpn.draw(x, G.P);
  if (G.grab || G.wpn === BD.W.hand) G.drawHand(x);
  if (A.front) A.front(x, G.t, G);
  if (A.dark) G.drawLight(x, A);
  fx.drawText(x);
  // full-screen flash
  if (S.flash > 0) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = Math.min(1, S.flash); x.fillStyle = S.flashCol; x.fillRect(0, 0, G.cv.width, G.cv.height); x.globalAlpha = 1; }
  if (S.tint) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = S.tint.a; x.fillStyle = S.tint.col; x.fillRect(0, 0, G.cv.width, G.cv.height); x.globalAlpha = 1; }
  if (G.overlay) { x.setTransform(1, 0, 0, 1, 0, 0); G.overlay(x, G.cv.width, G.cv.height); }
};
/* dark arenas: a low-res light map cut by explosions, fire and lamps */
G.light = (x, y, r, a = 1, life = .2) => { if (G.arena.dark && G.lights.length < 90) G.lights.push({ x, y, r, a, life, max: life }); };
G.drawLight = function (x, A) {
  const q = 6, w = Math.ceil(G.W / q), h = Math.ceil(G.H / q);
  let c = G._lc; if (!c || c.width !== w || c.height !== h) { c = G._lc = document.createElement('canvas'); c.width = w; c.height = h; }
  const l = c.getContext('2d');
  l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, w, h);
  l.globalAlpha = A.dark; l.fillStyle = A.darkCol || '#05040a'; l.fillRect(0, 0, w, h);
  l.globalCompositeOperation = 'destination-out';
  const spr = BD.fx.glow('#fff');
  const put = (X, Y, R, a) => { l.globalAlpha = BD.clamp(a, 0, 1); l.drawImage(spr, X / q - R / q, Y / q - R / q, R * 2 / q, R * 2 / q); };
  if (A.lamps) A.lamps(put, G.t, G);
  for (const L of G.lights) put(L.x, L.y, L.r, L.a * L.life / L.max);
  if (G.dummy && G.dummy.burn > 0) put(G.dummy.j.chest.x, G.dummy.j.chest.y, 260, .8);
  // a soft circle around the pointer so you can always see what you aim at
  put(G.P.x, G.P.y, 190, .35);
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
  x.imageSmoothingEnabled = true; x.drawImage(c, 0, 0, w * q, h * q);
};

/* ---------- pointer input ---------- */
G.toWorld = (cx, cy) => {
  const r = G.cv.getBoundingClientRect(), d = G.cv.width / r.width;
  const sx = (cx - r.left) * d, sy = (cy - r.top) * d, c = G.cam;
  return [(sx - c.ox) / c.k, (sy - c.oy) / c.k];
};
G.input = function () {
  const cv = G.cv, P = G.P;
  let pid = null;
  const set = e => { const [x, y] = G.toWorld(e.clientX, e.clientY); P.x = x; P.y = y; };
  cv.addEventListener('pointerdown', e => {
    BD.audio.init();
    if (pid !== null && pid !== e.pointerId) return;
    pid = e.pointerId; try { cv.setPointerCapture(pid); } catch (er) {}
    P.touch = e.pointerType !== 'mouse';
    set(e); P.px = P.x; P.py = P.y; P.vx = P.vy = 0;
    P.down = true; P.t0 = G.rt; P.x0 = P.x; P.y0 = P.y; P.moved = 0; P.over = true;
    if (!G.running || G.paused || G.lock) return;
    G.emit('press');
    const w = G.wpn; if (w && w.down) w.down(P);
    e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if (pid !== null && e.pointerId !== pid) return;
    const ox = P.x, oy = P.y; set(e); P.over = true;
    if (P.down) { P.moved += Math.hypot(P.x - ox, P.y - oy); if (G.running && !G.paused && !G.lock && G.wpn && G.wpn.move) G.wpn.move(P); }
  });
  const up = e => {
    if (e.pointerId !== pid) return; pid = null;
    set(e); const was = P.down; P.down = false;
    if (P.touch) P.over = false;
    if (was && G.running && !G.paused && G.wpn && G.wpn.up) G.wpn.up(P);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', e => { if (!P.down) P.over = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
};

/* ---------- weapons: picking one ---------- */
G.canUse = w => !!w && (w.id === 'hand' || BD.save.d.owned.includes(w.id) || G.mode === 'chaos' || (G.mode === 'challenge' && G.opt && G.opt.allow && G.opt.allow.includes(w.id)));
G.select = function (id) {
  const w = BD.W[id]; if (!w || !G.canUse(w)) return false;
  if (G.wpn && G.wpn !== w && G.wpn.leave) G.wpn.leave();
  if (G.grab) G.release();
  G.wpn = w; w.st = {}; if (w.enter) w.enter();
  if (id !== 'hand') {
    const r = BD.save.d.recent; const i = r.indexOf(id); if (i >= 0) r.splice(i, 1); r.unshift(id); if (r.length > 8) r.pop(); BD.save.write();
  }
  G.emit('select', w); return true;
};

/* ---------- the hand: grab any body part or prop and throw it ---------- */
G.grabTarget = function (x, y) {
  let best = null, bd = 1e9;
  const d = G.dummy;
  if (d && !d.gone) for (const p of d.parts) { const dd = Math.hypot(p.x - x, p.y - y) - p.r; if (dd < bd) { bd = dd; best = p; } }
  if (bd < 36) return best;
  for (const e of G.ents) {
    if (!e.grabbable || e.dead) continue;
    if (e.ball) { const p = e.ball, dd = Math.hypot(p.x - x, p.y - y) - p.r; if (dd < 24) return p; }
    if (e.box) {
      const B = e.box; if (!G.inBox(B, x, y, 22)) continue;
      let c = null, cd = 1e9; for (const p of B.ps) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < cd) { cd = dd; c = p; } }
      return c;
    }
  }
  return null;
};
G.inBox = function (B, x, y, pad = 0) {
  const [cx, cy] = G.ph.boxCenter(B), a = G.ph.boxAngle(B), ca = Math.cos(-a), sa = Math.sin(-a);
  const dx = x - cx, dy = y - cy, u = dx * ca - dy * sa, v = dx * sa + dy * ca;
  return Math.abs(u) <= B.w / 2 + pad && Math.abs(v) <= B.h / 2 + pad;
};
G.grabAt = function (x, y) {
  const p = G.grabTarget(x, y); if (!p) return false;
  G.grab = { p, im: p.im, ox: p.x - x, oy: p.y - y, lx: G.P.x, ly: G.P.y, shake: 0 };
  p.im = 0;
  if (p.dummy) { p.dummy.grabbed = p; p.dummy.setMood('scared', .8); if (Math.random() < .4) p.dummy.talk('scared'); }
  BD.audio.play('grab');
  return true;
};
G.holdGrab = function (k) {
  const g = G.grab, P = G.P, p = g.p;
  if (!p.alive) { G.grab = null; return; }
  const tx = BD.lerp(g.lx, P.x, k) + g.ox * .9, ty = BD.lerp(g.ly, P.y, k) + g.oy * .9;
  g.ox *= .97; g.oy *= .97;
  p.x = BD.clamp(tx, p.r, G.W - p.r); p.y = BD.clamp(ty, p.r, G.floor - p.r);
  if (k >= 1) { g.lx = P.x; g.ly = P.y; }
};
G.release = function () {
  const g = G.grab; if (!g) return; G.grab = null;
  const p = g.p; p.im = g.im;
  const sp = Math.hypot(G.P.vx, G.P.vy), max = 5200, f = sp > max ? max / sp : 1;
  if (p.dummy) {
    const d = p.dummy; d.grabbed = null;
    // throw the whole body, not just the hand that held it
    for (const q of d.parts) { const [vx, vy] = G.ph.vel(q); G.ph.setVel(q, BD.lerp(vx, G.P.vx * f, .55), BD.lerp(vy, G.P.vy * f, .55)); }
    if (sp > 1600) { d.talk('fly'); d.setMood('scream', 1); G.thrown = G.t; BD.audio.play('whoosh'); G.emit('throw', sp); }
  }
  G.ph.setVel(p, G.P.vx * f, G.P.vy * f);
};
BD.weapon({
  id: 'hand', cat: 'hand', name: 'יד', price: 0, power: 1, chaos: 1,
  desc: 'תופסים כל חלק בגוף וזורקים. אפשר גם לסטור בהחלקה.', tip: 'זריקה חזקה לתקרה שווה הרבה',
  down(P) { this.st.hold = G.grabAt(P.x, P.y); this.st.lx = P.x; this.st.ly = P.y; },
  move(P) {
    if (this.st.hold) {
      // shaking him hard makes him dizzy
      const sp = Math.hypot(P.vx, P.vy); if (G.dummy && G.grab && G.grab.p.dummy && sp > 2600) { G.dummy.dizzy = Math.min(4, G.dummy.dizzy + .04); if (G.dummy.dizzy > 1.5) G.dummy.setMood('dizzy', 1); }
      return;
    }
    // swipe through him for a slap
    const d = G.dummy; if (!d) return;
    const sp = Math.hypot(P.vx, P.vy); if (sp < 900) return;
    for (const p of d.parts) {
      if (BD.segDist(p.x, p.y, this.st.lx, this.st.ly, P.x, P.y) < p.r + 14 && G.gate('slap' + p.name, .15)) {
        const f = Math.min(sp, 4000) * .55;
        G.hit(p, P.vx / sp * f, P.vy / sp * f, { dmg: 3 + sp / 700, src: 'hand', cat: 'hand', snd: 'slap', fx: 'slap' });
        break;
      }
    }
    this.st.lx = P.x; this.st.ly = P.y;
  },
  up() { if (G.grab) G.release(); this.st.hold = false; },
  leave() { if (G.grab) G.release(); },
  icon(x, s) { BD.drawGlove(x, 0, 0, s / 70, false); }
});
G.drawHand = function (x) {
  const P = G.P; if (!P.over && !G.grab) return;
  const closed = !!G.grab;
  x.save(); x.translate(P.x, P.y + (closed ? 0 : 6)); BD.drawGlove(x, 0, 0, 1, closed); x.restore();
};
/* a white cartoon glove, used for the hand cursor and its icon */
BD.drawGlove = function (x, X, Y, s, closed) {
  x.save(); x.translate(X, Y); x.scale(s, s);
  x.lineJoin = 'round'; x.lineWidth = 4; x.strokeStyle = '#141414'; x.fillStyle = '#fff';
  if (closed) {
    x.beginPath(); BD.draw.rr(x, -22, -18, 44, 36, 14); x.fill(); x.stroke();
    x.beginPath(); for (let i = 0; i < 3; i++) { x.moveTo(-14 + i * 11, -18); x.lineTo(-14 + i * 11, -6); } x.stroke();
    x.beginPath(); x.ellipse(-22, 4, 9, 12, -.4, 0, BD.TAU); x.fill(); x.stroke();
  } else {
    for (let i = 0; i < 4; i++) { x.beginPath(); BD.draw.rr(x, -20 + i * 10.5, -40 + Math.abs(i - 1.5) * 4, 10, 32, 5); x.fill(); x.stroke(); }
    x.beginPath(); x.ellipse(-25, -2, 8, 15, -.7, 0, BD.TAU); x.fill(); x.stroke();
    x.beginPath(); BD.draw.rr(x, -21, -14, 43, 32, 12); x.fill(); x.stroke();
  }
  x.fillStyle = '#141414'; x.fillRect(-18, 16, 36, 7); x.fillStyle = BD.RED; x.fillRect(-18, 23, 36, 6);
  x.restore();
};
BD.RED = '#FD1D1D'; BD.YEL = '#F3E03B';
BD.segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = BD.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
};

/* ---------- hitting the dummy ---------- */
G.gate = (key, gap) => { const t = G.rt; if ((G.gates[key] || -9) > t - gap) return false; G.gates[key] = t; return true; };
G.part = (x, y, pad = 0) => { const d = G.dummy; if (!d || d.gone) return null; let b = null, bd = 1e9; for (const p of d.parts) { const dd = Math.hypot(p.x - x, p.y - y) - p.r; if (dd < bd) { bd = dd; b = p; } } return bd <= pad ? b : null; };
G.nearest = (x, y) => { const d = G.dummy; if (!d || d.gone) return [null, 1e9]; return d.nearest(x, y); };
/* one blow to one body part. o: dmg, src, cat, snd, fx, mark, spread */
G.hit = function (p, vx, vy, o = {}) {
  const d = p.dummy; if (!d || d.gone) return;
  const up = BD.save.d.up || {}, pw = 1 + (o.cat === 'melee' || o.cat === 'hand' ? .2 * (up.hit || 0) : 0);
  G.ph.push(p, vx * pw, vy * pw);
  // the rest of the body follows a little so blows move him as a whole
  const spread = o.spread ?? .35;
  if (spread) for (const q of d.parts) if (q !== p) { const k = spread / (1 + Math.hypot(q.x - p.x, q.y - p.y) / 60); G.ph.push(q, vx * k * pw, vy * k * pw); }
  const f = BD.clamp((o.dmg || 5) / 40, 0, 1.5);
  if (d.frozen && (o.dmg || 0) >= 10 && o.cat !== 'elem') { d.thaw(true); G.special('ice'); }
  d.react(f, p.x, p.y, o.mark);
  d.squashHit(p, vx, vy, f);
  if (o.snd) BD.audio.play(o.snd, f);
  if (o.fx !== false) G.impactFx(p.x, p.y, vx, vy, f, o.fx);
  G.damage(o.dmg || 5, p.x, p.y, o);
};
/* every body part inside a circle gets pushed away from the centre */
G.hitArea = function (x, y, R, power, o = {}) {
  const d = G.dummy; if (!d || d.gone) return 0;
  let hit = 0, best = 0;
  for (const p of d.parts) {
    const dx = p.x - x, dy = p.y - y, dd = Math.hypot(dx, dy) || 1; if (dd > R + p.r) continue;
    const k = Math.pow(1 - BD.clamp(dd / (R + p.r), 0, 1), .5);
    G.ph.push(p, dx / dd * power * k + (o.vx || 0) * k, dy / dd * power * k - power * k * (o.lift ?? .3) + (o.vy || 0) * k);
    hit++; best = Math.max(best, k);
  }
  if (hit) {
    const dmg = (o.dmg || 20) * best;
    if (d.frozen && dmg > 10) { d.thaw(true); G.special('ice'); }
    d.react(BD.clamp(dmg / 40, 0, 1.6), null, null);
    const [cx, cy] = d.center; if (o.mark) d.mark(BD.lerp(cx, x, .4), BD.lerp(cy, y, .4), o.mark);
    G.damage(dmg, d.j.chest.x, d.j.chest.y - 40, o);
  }
  return best;
};
/* explosions: light, sound, a blast on everything, and damage that falls off with distance */
G.explode = function (x, y, R, o = {}) {
  const up = BD.save.d.up || {}; R *= 1 + .12 * (up.boom || 0);
  const power = (o.power || R * 9) * (1 + .15 * (up.boom || 0));
  BD.fx.explosion(x, y, R, o.col);
  G.light(x, y, R * 4, 1, .5);
  BD.audio.play('boom', BD.clamp(R / 220, .3, 1.4));
  G.ph.blast(x, y, R * 2.2, power * .9, p => !p.dummy);
  const k = G.hitArea(x, y, R * 2, power, Object.assign({ dmg: R * .5, mark: 'soot' }, o));
  if (k > 0 && G.dummy) { G.dummy.soot = Math.min(1, G.dummy.soot + k * .35); if (k > .4 && o.fire !== false && Math.random() < .5) G.dummy.ignite(1.2); }
  for (const e of G.ents) if (e.blasted && !e.dead) e.blasted(x, y, R * 2.2, power);
  if (R > 120) { BD.fx.slowmo(.35, .35); }
  if (R > 160) BD.fx.zoom(1.08, .25, x, y);
  G.emit('explode', R, o);
  G.lastBoom = G.t;
  if (G.tornadoOn && k > 0) G.special('firenado');
  if (G.dummy && G.dummy.air > .5 && k > .2 && (o.src || '').match(/rocket|missile|launcher|barrage/)) G.special('airstrike');
  if (G.ph.gScale < .55 && k > .2 && (o.src || '').match(/rocket|missile|launcher|barrage|firework/)) G.special('space');
  return k;
};
G.impactFx = function (x, y, vx, vy, f, kind) {
  const fx = BD.fx;
  const a = Math.atan2(vy, vx);
  if (kind === 'slap') { fx.ring(x, y, 40, '#fff', .2, 6); fx.spark(x, y, 5, '#fff', 400); return; }
  fx.glowAt(x, y, 50 + f * 90, '#fff6d0', .14);
  fx.ring(x, y, 50 + f * 110, '#fff', .26, 10 * f + 3);
  if (f > .25) fx.stars(x, y, Math.round(2 + f * 5));
  fx.spark(x, y, Math.round(6 + f * 14), '#ffe9a8', 500 + f * 700);
  if (f > .5) { fx.shake(f * .35); fx.hitstop(.04 + f * .03); }
  if (f > .9) { fx.slowmo(.25, .3); fx.text(x + Math.cos(a) * 40, y - 70, BD.pick(['בום!', 'טראח!', 'פאק!', 'בנג!', 'קראש!']), BD.YEL, 64, .8, -60); }
};
G.damage = function (n, x, y, o = {}) {
  const d = G.dummy; if (!d || n <= 0) return;
  const S = BD.save.d, src = o.src || 'x';
  if (G.mode === 'demo') { if (!d.ko) d.hp = Math.max(.2, d.hp - n / 2000); return; }
  if (o.cat && o.cat !== 'hand' && G.gate('cmb' + src, o.comboGap ?? .12)) G.comboHit(src, o.cat);
  else if (o.cat === 'hand' && G.gate('cmbh', .25)) G.comboHit(src, 'hand');
  const mult = G.mult();
  const pts = n * mult * (BD.MODES[G.mode].dmgK ? BD.MODES[G.mode].dmgK() : 1);
  G.score += pts;
  if (!d.ko) d.hp -= n / (d.maxHp || 700) * (G.mode === 'survival' ? BD.MODES.survival.armor() : 1);
  const skin = BD.SKINS[S.skin] || {};
  G.coinAcc += pts * BD.COIN_K * (skin.bonus || 1) * (1 + .2 * ((S.up || {}).coin || 0)) * (BD.MODES[G.mode].coinK ?? 1);
  S.stats.dmg += pts; S.stats.hits++;
  if (pts >= 4 && G.gate('num', .09)) BD.fx.text(x + BD.rand(-20, 20), y - 30, '+' + Math.round(pts), pts > 60 ? BD.YEL : '#fff', Math.min(70, 26 + pts * .25), .8, -110);
  G.emit('damage', pts, o);
};
G.mult = () => 1 + Math.min(G.combo.n, 60) * .05;
G.comboHit = function (src, cat) {
  const c = G.combo;
  if (G.t - c.last > 2) { c.n = 0; c.cats = []; }
  c.n++; c.last = G.t; c.best = Math.max(c.best, c.n);
  c.cats.push({ cat, src, t: G.t }); while (c.cats.length && G.t - c.cats[0].t > 4) c.cats.shift();
  const S = BD.save.d; S.stats.best = Math.max(S.stats.best || 0, c.n);
  S.stats.used[src] = (S.stats.used[src] || 0) + 1; G.stat.used[src] = (G.stat.used[src] || 0) + 1;
  // three different kinds of weapon inside four seconds counts as creative
  const kinds = new Set(c.cats.map(e => e.cat).filter(k => k !== 'hand'));
  if (kinds.size >= 3 && G.gate('creative', 6)) G.special('creative');
  if (G.dummy && G.dummy.zap > 0 && G.dummy.air > .3 && G.gate('zapb', 4)) G.special('zapbounce');
  if (c.n > 0 && c.n % 10 === 0) { BD.audio.play('combo', c.n); BD.fx.shake(.2); }
  G.emit('combo', c);
};
/* named combos: a banner, bonus points and coins */
BD.SPECIALS = {
  ice: { name: 'שובר קרח!', bonus: 120 }, airstrike: { name: 'תקיפה אווירית!', bonus: 150 }, firenado: { name: 'טורנדו של אש!', bonus: 180 },
  zapbounce: { name: 'קפיצה חשמלית!', bonus: 140 }, space: { name: 'תוכנית החלל!', bonus: 160 }, steam: { name: 'אדים!', bonus: 90 },
  creative: { name: 'שילוב יצירתי!', bonus: 100 }, pinball: { name: 'פינבול!', bonus: 130 }, ceiling: { name: 'עד התקרה!', bonus: 60 },
  portal: { name: 'קפיצת פורטל!', bonus: 90 }, juggle: { name: 'ג׳אגלינג באוויר!', bonus: 150 }, blackhole: { name: 'אל האופק!', bonus: 200 },
  ko: { name: 'נוקאאוט!', bonus: 0 }
};
G.special = function (id) {
  const sp = BD.SPECIALS[id]; if (!sp || !G.gate('sp' + id, 1.5)) return;
  G.stat.specials[id] = (G.stat.specials[id] || 0) + 1;
  const S = BD.save.d; S.stats.sp = S.stats.sp || {}; S.stats.sp[id] = (S.stats.sp[id] || 0) + 1;
  if (sp.bonus) { G.score += sp.bonus * G.mult(); G.coinAcc += sp.bonus * BD.COIN_K * 1.5; }
  BD.audio.play('special');
  G.emit('special', id, sp);
};
/* track flights: hitting floor, wall and ceiling in one throw is a pinball */
G.trackAir = function (dt) {
  const d = G.dummy; if (!d) return;
  if (d.air > 1.1 && !d.grabbed && G.combo.n >= 3 && G.t - G.combo.last < .4 && G.gate('juggle', 5)) G.special('juggle');
};
G.surface = function (kind) {
  G.surf.push({ kind, t: G.t }); while (G.surf.length && G.t - G.surf[0].t > 1.6) G.surf.shift();
  const k = new Set(G.surf.map(s => s.kind));
  if (k.has('ceil') && k.has('wall') && k.has('floor') && G.gate('pinball', 3)) G.special('pinball');
  if (kind === 'ceil') { BD.save.d.stats.ceil++; G.emit('ceiling'); if (G.gate('ceilsp', 4)) G.special('ceiling'); }
};
/* the physics engine reports fast contacts here */
G.impact = function (p, q, rel, x, y, kind) {
  if (G.quiet > 0) return;
  const part = p.dummy ? p : (q && q.dummy ? q : null);
  const other = part === p ? q : p;
  if (part) {
    const d = part.dummy; if (d.gone) return;
    let heavy = 1;
    if (other && other.body && other.body.ent) heavy = other.body.ent.heavy || 1;
    else if (other && other.ent) heavy = other.ent.heavy || 1;
    if (other && other.dummy) return;
    const f = (rel - 420) / 2600 * heavy;
    if (f <= 0) return;
    if (!G.gate('imp' + part.name + (kind || ''), .09)) return;
    if (kind) G.surface(kind);
    const big = f > .55;
    BD.audio.play(d.skin.metal ? 'clang' : 'thud', f);
    if (kind === 'floor' || kind === 'wall' || kind === 'ceil') {
      BD.fx.smoke(x, y, big ? 5 : 2, G.arena.dust || '#d9cbb3', 16 + f * 18, 40);
      if (big) BD.fx.debris(x, y, 5, G.arena.chips || ['#bbb', '#888'], 500, 6);
    }
    if (d.frozen && f > .35) { d.thaw(true); G.special('ice'); }
    d.react(BD.clamp(f, 0, 1.4), x, y);
    if (big) G.impactFx(x, y, 0, 0, Math.min(1, f * .8));
    if (big && f > 1) BD.fx.text(x, y - 50, BD.pick(['טראח!', 'בום!', 'אוץ׳!', 'קראנץ׳!']), '#fff', 54, .7, -50);
    G.damage(Math.min(120, f * 30), x, y, { src: other && (other.body || other.ent) ? 'prop' : 'throw', cat: G.thrown && G.t - G.thrown < 2.5 ? 'throw' : null });
    if (other) { const e = other.ent || (other.body && other.body.ent); if (e && e.hitDummy) e.hitDummy(part, rel); }
    return;
  }
  // props hitting things
  const e = (p.ent || (p.body && p.body.ent)), e2 = q && (q.ent || (q.body && q.body.ent));
  if (e && e.impact) e.impact(rel, x, y, kind, e2);
  if (e2 && e2.impact) e2.impact(rel, x, y, kind, e);
};

/* ---------- knock-out and recovery: the game never stops ---------- */
G.knockout = function () {
  const d = G.dummy; d.ko = 3.2; d.hp = 0; d.stun = 3.2; d.setMood('ko', 3.2); d.dizzy = 3.2;
  G.stat.kos++; BD.save.d.stats.ko = (BD.save.d.stats.ko || 0) + 1;
  const bonus = G.mode === 'survival' ? 0 : 40;
  G.coinAcc += bonus; G.score += 300 * G.mult();
  BD.fx.slowmo(.6, .25); BD.fx.zoom(1.12, .6, d.j.chest.x, d.j.chest.y);
  BD.audio.play('ko');
  G.emit('ko');
};
G.revive = function () {
  const d = G.dummy; d.ko = 0;
  BD.fx.confetti(d.j.head.x, d.j.head.y - 40, 26); BD.fx.ring(d.j.chest.x, d.j.chest.y, 160, BD.YEL, .5, 8);
  d.repair(); d.hp = 1;
  G.emit('revive');
};
/* when a weapon takes him away completely (black hole, UFO) a new one drops in */
G.respawn = function (delay = .8) {
  const old = G.dummy; if (old) { old.remove(); old.gone = true; }
  G.dummy = null;
  G.later(delay, () => {
    const d = G.dummy = new BD.Dummy(G.ph, BD.rand(G.W * .35, G.W * .65), G.floor - G.H * .55);
    d.maxHp = 700; d.setMood('scared', 1.2); d.talk('back', true);
    for (const p of d.parts) G.ph.setVel(p, 0, 300);
    BD.fx.smoke(d.j.chest.x, d.j.chest.y, 10, '#fff', 30, 30);
    G.emit('respawn');
  });
};
/* timers that follow the game clock (slow motion slows them too) */
G.later = (t, f) => G.ents.push({ z: -9, t, update(dt) { this.t -= dt; if (this.t <= 0) { f(); return false; } } });
G.add = e => { G.ents.push(e); return e; };

/* ---------- coins ---------- */
G.flushCoins = function (all) {
  const n = Math.floor(G.coinAcc); if (n <= 0) return;
  if (!all && !G.gate('coinflush', .35)) return;
  G.coinAcc -= n; G.roundCoins += n;
  const S = BD.save.d; S.coins += n; S.stats.earned = (S.stats.earned || 0) + n; BD.save.write();
  G.emit('coins', n);
};
G.addCoins = function (n, why) {
  const S = BD.save.d; S.coins += n; S.stats.earned = (S.stats.earned || 0) + n; G.roundCoins = (G.roundCoins || 0) + n; BD.save.write();
  G.emit('coins', n, why);
};

/* ---------- the finishing move: unlocked by a combo of 20 ---------- */
G.finisherReady = () => G.combo.n >= 20 && !G.finishing && G.dummy && !G.dummy.gone;
G.finisher = function () {
  if (!G.finisherReady()) return;
  const d = G.dummy, n = G.combo.n; G.finishing = true; G.lock = true; G.stat.fin++;
  BD.save.d.stats.fin = (BD.save.d.stats.fin || 0) + 1;
  G.emit('finisher', n);
  BD.audio.play('special'); BD.fx.slowmo(2.2, .2);
  const seq = [
    [0, () => { BD.fx.zoom(1.25, 1.4, d.j.chest.x, d.j.chest.y - 60); BD.fx.flash(.5, '#fff'); BD.fx.text(G.W / 2, G.H * .3, 'מכת גמר!', BD.YEL, 120, 1.6, -20); }],
    [.25, () => { for (const p of d.parts) G.ph.setVel(p, 0, -2600); BD.audio.play('whoosh'); }],
    [.8, () => { const c = d.j.chest; for (let i = 0; i < 3; i++) G.later(i * .12, () => { BD.fx.explosion(c.x + BD.rand(-60, 60), c.y + BD.rand(-60, 60), 90, BD.pick(['#ffb000', '#ff3d00', BD.YEL])); BD.audio.play('boom', .7); }); }],
    [1.3, () => { const c = d.j.chest; G.hitArea(c.x, c.y - 200, 400, 4200, { dmg: 0, lift: -1.2 }); BD.audio.play('crack'); }],
    [1.6, () => { BD.fx.shake(1.2); BD.fx.flash(.7, '#fff6d0'); BD.fx.confetti(G.W / 2, G.H * .3, 80); for (let i = 0; i < 12; i++) BD.fx.coin(d.j.chest.x, d.j.chest.y, 2); }],
    [2.1, () => {
      const bonus = Math.round(n * 25); G.score += bonus * 4; G.addCoins(Math.round(10 + n * 1.5), 'finisher');
      BD.fx.text(G.W / 2, G.H * .42, '+' + bonus * 4, BD.YEL, 90, 1.4, -30);
      G.combo.n = 0; G.combo.cats = []; G.emit('combo', G.combo);
      G.finishing = false; G.lock = false;
    }]
  ];
  seq.forEach(([t, f]) => G.later(t, f));
};

/* ---------- gravity helpers used by weapons and the settings ---------- */
G.bendGravity = function (gx, gy, t) {
  G.ph.gx = gx; G.gravTarget = gy; G.gravT = t; G.emit('gravity');
};
