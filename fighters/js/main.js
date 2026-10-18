/* Boot, canvas, fixed-step loop, menu background scene, select previews. */
'use strict';
(() => {
  const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
  function resize() {
    dpr = Math.min(1.25, devicePixelRatio || 1); cw = innerWidth; ch = innerHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    scale = Math.min(cw / NF.W, ch / NF.H); ox = (cw - NF.W * scale) / 2; oy = (ch - NF.H * scale) / 2;
  }
  addEventListener('resize', resize); resize();

  const dummy = { get() { return this.inp; }, consume() { }, inp: { held: {}, pressed: {}, buf: {} }, last: { held: {} } };
  const app = NF.app = {
    scene: 'menu', match: null, bg: null, prev: [null, null],
    toMenu() { this.stopMatch(); this.scene = 'menu'; this.makeBg(); document.getElementById('touch').hidden = true; NF.inGame = false; },
    makeBg() {
      const ar = NF.pick(NF.arenas.LIST), a = NF.pick(NF.chars.LIST); let b = NF.pick(NF.chars.LIST); if (b === a) b = NF.chars.LIST[(NF.chars.LIST.indexOf(a) + 1) % 5];
      const fa = new NF.Fighter(a, 0, dummy), fb = new NF.Fighter(b, 1, dummy);
      fa.x = -260; fb.x = 260; fa.face = 1; fb.face = -1;
      this.bg = { ar, f: [fa, fb], fx: new NF.FX(), cam: { x: 0, y: 400, z: 1, sx: 0, sy: 0 }, t: 0 };
    },
    startMatch(opts) {
      this.match = new NF.Match(opts); this.scene = 'game'; NF.inGame = true;
      document.getElementById('touch').hidden = !NF.store.get('touch', NF.input.isTouch);
    },
    stopMatch() { this.match = null; NF.inGame = false; document.getElementById('touch').hidden = true; },
    preview(pl, def) {
      const p = this.prev[pl];
      if (p && p.def === def) return;
      const f = new NF.Fighter(def, pl, dummy); f.x = 0; f.face = pl ? -1 : 1; f.state = 'idle';
      this.prev[pl] = { def, f, fx: new NF.FX(), act: 0 };
    },
    previewAct(pl) { const p = this.prev[pl]; if (p) { p.act = 70; p.f.state = 'win'; p.fx.ring(0, NF.FLOOR - 120, p.def.color, 10, 160, 20, 10); p.fx.burst([0, NF.FLOOR - 120], p.def.color, 24); } },
  };
  const fakeM = { cine: null, fx: new NF.FX() };

  /* ---------- loop ---------- */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(.1, (now - last) / 1000); last = now;
    requestAnimationFrame(frame);
    try { while (acc >= NF.DT) { step(); acc -= NF.DT; } render(); }
    catch (e) { acc = 0; console.error(e); NF.lastError = e; }
  }
  function step() {
    if (app.freeze) return;   // test hook: frames are stepped by hand
    if (app.scene === 'game' && app.match) { app.match.update(); return; }
    const B = app.bg; if (!B) return;
    B.t++; B.fx.update();
    for (const f of B.f) { f.t++; if (f.state !== 'idle') f.state = 'idle'; f.updatePose(fakeM, null); }
    B.cam.x = Math.sin(B.t * .004) * 120; B.cam.z = 1.05 + Math.sin(B.t * .003) * .05;
    for (const p of app.prev) if (p) { p.f.t++; p.fx.update(); if (p.act > 0 && --p.act === 0) p.f.state = 'idle'; p.f.updatePose(fakeM, null); }
  }
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.direction = 'ltr'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.rect(0, 0, NF.W, NF.H); ctx.clip();
    if (app.scene === 'game' && app.match) app.match.render(ctx, NF.W, NF.H);
    else if (app.bg) drawBg(ctx);
    ctx.restore();
    // previews (character select)
    const cvs = document.querySelectorAll('.side canvas');
    cvs.forEach((c, i) => { const p = app.prev[i]; if (p) drawPreview(c, p); });
  }
  function drawBg(ctx) {
    const B = app.bg, cam = B.cam, W = NF.W, H = NF.H;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    B.ar.back(ctx, cam, B.t, B.fx); B.ar.floor(ctx, cam, B.t);
    for (const f of B.f) f.draw(ctx, fakeM);
    B.fx.draw(ctx); B.ar.front(ctx, cam, B.t);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
  }
  function drawPreview(c, p) {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w / 2, h * .6, 10, w / 2, h * .6, h * .6); grd.addColorStop(0, p.def.color + '66'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const s = h / 360;
    g.save(); g.translate(w / 2, h * .92); g.scale(s, s); g.translate(0, -NF.FLOOR);
    p.f.draw(g, fakeM); p.fx.draw(g);
    g.restore();
  }

  /* ---------- boot ---------- */
  NF.input.setupTouch();
  NF.loadImages([...NF.chars.LIST.map(c => [c.img, `assets/${c.img}.webp`]), ['logo', '../assets/nac.webp']]).then(() => {
    NF.ui.mainMenu();
    requestAnimationFrame(t => { last = t; frame(t); });
  });
  // test hook
  if (location.hash === '#test') window.__NF = NF;
})();
