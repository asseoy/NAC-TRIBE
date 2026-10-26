/* The arena: a padded room. The static art is painted once per screen size into
   an offscreen canvas; the lamp, dust and props are drawn live on top. */
'use strict';
BD.ARENAS = {};
BD.arenaPaint = function (A) {
  const G = BD.G, w = G.cv.width, h = G.cv.height;
  if (!A.img) A.img = document.createElement('canvas');
  A.img.width = w; A.img.height = h;
  const x = A.img.getContext('2d');
  x.setTransform(G.scale, 0, 0, G.scale, 0, 0);
  A.paint(x, G.W, G.H, G.floor);
  A.seed = null;
};
/* a light cone sprite, drawn with 'lighter' */
BD.cone = (() => {
  let c = null;
  return () => {
    if (c) return c;
    c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(255,240,200,.32)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(108, 0); x.lineTo(148, 0); x.lineTo(256, 512); x.lineTo(0, 512); x.closePath(); x.fill();
    return c;
  };
})();

/* ---------- props that live in the room ---------- */
BD.PROPS = {
  cube(x, y, col = '#d84a3a') {
    return BD.body({ kind: 'cube', shape: 'box', x, y, w: 86, h: 86, mass: 3, rest: .45, fr: .7, snd: 'thud', shootable: true, angle: BD.rand(-.2, .2),
      draw(c, w, h) {
        BD.art.rect(c, -w / 2, -h / 2, w, h, col, 16, 5);
        c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 10, 0); c.lineTo(w / 2 - 10, 0); c.moveTo(0, -h / 2 + 10); c.lineTo(0, h / 2 - 10); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.28)'; BD.draw.rr(c, -w / 2 + 8, -h / 2 + 7, w - 30, 12, 6); c.fill();
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(a * w / 4, b * h / 4, 4, 0, BD.TAU); c.fill(); }
      } });
  },
  ball(x, y) {
    return BD.body({ kind: 'ball', shape: 'ball', x, y, r: 40, mass: .8, rest: .85, fr: .3, snd: 'boing', shootable: true,
      draw(c, r) {
        const cols = [BD.RED, '#fff', BD.YEL, '#fff', '#2a6fdb', '#fff'];
        for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * BD.TAU / 6, (i + 1) * BD.TAU / 6); c.closePath(); c.fill(); }
        c.lineWidth = 5; c.strokeStyle = '#141414'; c.beginPath(); c.arc(0, 0, r, 0, BD.TAU); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 8, 0, BD.TAU); c.fill(); c.lineWidth = 3; c.stroke();
        c.rotate(-this.rot); BD.art.shine(c, 0, 0, r);
      } });
  },
  crate(x, y) {
    return BD.body({ kind: 'crate', shape: 'box', x, y, w: 92, h: 92, mass: 4, rest: .2, fr: .8, snd: 'thud', hp: 5, tough: 1300, blastHp: 6, shootable: true,
      draw(c, w, h) {
        const dmg = 1 - this.hp / 5;
        BD.art.rect(c, -w / 2, -h / 2, w, h, '#b77a3e', 3, 5);
        c.fillStyle = '#9a6430'; for (let i = 0; i < 4; i++) c.fillRect(-w / 2 + 3, -h / 2 + 4 + i * (h - 8) / 4, w - 6, 3);
        c.strokeStyle = '#141414'; c.lineWidth = 4; c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
        c.lineWidth = 9; c.strokeStyle = '#141414'; c.beginPath(); c.moveTo(-w / 2 + 10, -h / 2 + 10); c.lineTo(w / 2 - 10, h / 2 - 10); c.stroke();
        c.lineWidth = 5; c.strokeStyle = '#c98c4c'; c.stroke();
        if (dmg > .3) { c.strokeStyle = '#141414'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-20, -40); c.lineTo(-8, -18); c.lineTo(-16, 0); c.moveTo(25, 40); c.lineTo(12, 18); c.stroke(); }
      },
      onBreak() { const [cx, cy] = this.pos(); BD.fx.debris(cx, cy, 18, ['#b77a3e', '#9a6430', '#c98c4c'], 800, 16); BD.fx.smoke(cx, cy, 6, '#d9cbb3', 30, 40); BD.audio.play('crack'); BD.G.damage(0, cx, cy); BD.G.emit('prop', 'crate'); } });
  },
  barrel(x, y) {
    return BD.body({ kind: 'barrel', shape: 'box', x, y, w: 70, h: 96, mass: 3, rest: .2, fr: .7, snd: 'clang', hp: 3, tough: 1700, blastHp: 9, shootable: true,
      draw(c, w, h) {
        BD.art.rect(c, -w / 2, -h / 2, w, h, '#c8141c', 10, 5);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(w / 2 - 18, -h / 2 + 4, 12, h - 8);
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-w / 2 + 8, -h / 2 + 4, 8, h - 8);
        for (const yy of [-h / 2 + 18, h / 2 - 18]) { c.fillStyle = '#141414'; c.fillRect(-w / 2, yy - 4, w, 8); }
        c.fillStyle = BD.YEL; c.beginPath(); c.moveTo(0, -20); c.lineTo(20, 16); c.lineTo(-20, 16); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = '#141414'; c.stroke();
        c.fillStyle = '#141414'; c.font = '900 28px Karantina, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, 4);
        if (this.hp < 3) { c.fillStyle = '#ffd54a'; c.globalAlpha = .5 + Math.sin(BD.G.rt * 20) * .5; c.beginPath(); c.arc(0, -h / 2 - 4, 6, 0, BD.TAU); c.fill(); c.globalAlpha = 1; }
      },
      update() { if (this.hp < 3 && Math.random() < .3) { const [cx, cy] = this.pos(); BD.fx.smoke(cx, cy - 50, 1, '#555', 14, 80); } },
      onBreak() { const [cx, cy] = this.pos(); BD.G.explode(cx, cy, 120, { src: 'barrel', cat: 'boom', dmg: 70 }); BD.fx.debris(cx, cy, 10, ['#c8141c', '#141414'], 1100, 14); BD.G.emit('prop', 'barrel'); } });
  }
};

BD.ARENAS.padded = {
  id: 'padded', name: 'החדר המרופד', sky: '#2b2620', dust: '#e9dfcb', chips: ['#e9dfcb', '#cbb995', '#a99878'],
  floorRest: .3, floorFric: .6, wallRest: .45, grav: 1,
  music: { bpm: 112, root: 55, bass: [0, 0, 7, 0, 5, 0, 3, 5], wave: 'square', lead: [12, 15, 17, 19, 15, 12, 10, 7] },
  paint(x, W, H, F) {
    // wall: quilted padding, light in the middle, darker toward the corners
    const g = x.createLinearGradient(0, 0, 0, F); g.addColorStop(0, '#d6c9ad'); g.addColorStop(.5, '#efe5cf'); g.addColorStop(1, '#ddd0b4');
    x.fillStyle = g; x.fillRect(0, 0, W, F);
    const cs = 96, rows = Math.ceil(F / (cs / 2)) + 2, cols = Math.ceil(W / cs) + 2;
    for (let r = -1; r < rows; r++) for (let c = -1; c < cols; c++) {
      const cx = c * cs + (r % 2 ? cs / 2 : 0), cy = r * cs / 2;
      const rg = x.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, cs * .62);
      rg.addColorStop(0, 'rgba(255,252,240,.85)'); rg.addColorStop(.6, 'rgba(255,250,235,.15)'); rg.addColorStop(1, 'rgba(120,100,70,.28)');
      x.fillStyle = rg; x.beginPath(); x.moveTo(cx, cy - cs / 2); x.lineTo(cx + cs / 2, cy); x.lineTo(cx, cy + cs / 2); x.lineTo(cx - cs / 2, cy); x.closePath(); x.fill();
    }
    // seams and buttons
    x.strokeStyle = 'rgba(140,118,84,.55)'; x.lineWidth = 2.5;
    for (let k = -F; k < W + F; k += cs) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + F, F); x.moveTo(k + F, 0); x.lineTo(k, F); x.stroke(); }
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
      const bx = c * cs + (r % 2 ? 0 : cs / 2), by = r * cs / 2; if (by > F - 8) continue;
      x.fillStyle = 'rgba(90,72,48,.45)'; x.beginPath(); x.arc(bx, by + 2, 6, 0, BD.TAU); x.fill();
      x.fillStyle = '#b9a37e'; x.beginPath(); x.arc(bx, by, 5, 0, BD.TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(bx - 1.5, by - 1.5, 1.8, 0, BD.TAU); x.fill();
    }
    // the door on one side
    const dw = 170, dx = W - dw - Math.max(60, W * .07), dh = Math.min(380, F * .55), dy = F - dh;
    x.fillStyle = 'rgba(70,55,35,.25)'; x.fillRect(dx + 10, dy + 8, dw, dh);
    BD.art.rect(x, dx - 10, dy - 10, dw + 20, dh + 10, '#8b8478', 2, 4);
    BD.art.rect(x, dx, dy, dw, dh, '#d9d2c2', 2, 4);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(dx + 18 + j * 72, dy + 20 + i * dh * .3, 62, dh * .25); }
    BD.art.rect(x, dx + 45, dy + 30, 80, 70, '#3c4650', 3, 4);
    x.strokeStyle = 'rgba(200,220,235,.5)'; x.lineWidth = 1.5; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(dx + 45 + i * 16, dy + 30); x.lineTo(dx + 45 + i * 16 - 30, dy + 100); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(dx + 50, dy + 35); x.lineTo(dx + 80, dy + 35); x.lineTo(dx + 55, dy + 95); x.lineTo(dx + 50, dy + 95); x.fill();
    BD.art.rect(x, dx + 14, dy + dh * .52, 16, 40, '#6b6559', 4, 3);
    x.fillStyle = '#141414'; x.font = '700 22px "Frank Ruhl Libre", serif'; x.textAlign = 'center'; x.fillText('חדר 7', dx + dw / 2, dy + 130);
    // a tribe sign on the wall
    const sx = Math.max(70, W * .08), sy = F * .2;
    x.save(); x.translate(sx + 150, sy + 46); x.rotate(-.03);
    x.fillStyle = 'rgba(70,55,35,.3)'; x.fillRect(-142, -38, 300, 92);
    BD.art.rect(x, -150, -46, 300, 92, '#141414', 0, 3);
    x.fillStyle = BD.RED; for (let i = 0; i < 5; i++) x.fillRect(-150 + i * 60 + 6, 34, 48, 8);
    x.fillStyle = BD.YEL; x.font = '700 50px Karantina, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('מעבדת הריסוק', 0, -4);
    x.restore();
    // corners and ceiling in shadow
    const lg = x.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(60,45,25,.35)'); lg.addColorStop(.12, 'rgba(60,45,25,0)'); lg.addColorStop(.88, 'rgba(60,45,25,0)'); lg.addColorStop(1, 'rgba(60,45,25,.35)');
    x.fillStyle = lg; x.fillRect(0, 0, W, F);
    const tg = x.createLinearGradient(0, 0, 0, 120); tg.addColorStop(0, 'rgba(60,45,25,.45)'); tg.addColorStop(1, 'rgba(60,45,25,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, 120);
    // skirting board
    x.fillStyle = '#9c8a6a'; x.fillRect(0, F - 26, W, 26); x.fillStyle = '#b8a582'; x.fillRect(0, F - 26, W, 6); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, F - 4, W, 4);
    // floor: blue-grey mats with seams and a soft shine
    const fg = x.createLinearGradient(0, F, 0, H); fg.addColorStop(0, '#7f8b96'); fg.addColorStop(1, '#5c6670');
    x.fillStyle = fg; x.fillRect(0, F, W, H - F);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, F, W, 5);
    x.strokeStyle = 'rgba(30,36,42,.5)'; x.lineWidth = 3;
    for (let i = -1; i < W / 180 + 2; i++) { x.beginPath(); x.moveTo(i * 180, F); x.lineTo(i * 180 - 40, H); x.stroke(); }
    x.beginPath(); x.moveTo(0, F + (H - F) * .5); x.lineTo(W, F + (H - F) * .5); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < W / 180 + 1; i++) x.fillRect(i * 180 + 20, F + 10, 110, 8);
  },
  // the lamp swings when something shakes the room
  lamp: { a: 0, v: 0 },
  update(dt, G) {
    const L = this.lamp, S = BD.fx.S;
    L.v += (-L.a * 9 - L.v * .6) * dt + (S.shake > .2 ? BD.rand(-1, 1) * S.shake * 3 * dt * 10 : 0);
    L.a = BD.clamp(L.a + L.v * dt, -.7, .7);
    // dust motes
    if (Math.random() < dt * 3) BD.fx.S.dust = 1;
    this.keepProps(dt, G);
  },
  back(x, t, G) {
    const L = this.lamp, ax = G.W / 2, cord = Math.min(130, G.floor * .16);
    const lx = ax + Math.sin(L.a) * cord, ly = Math.cos(L.a) * cord;
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .9;
    x.translate(lx, ly); x.rotate(-L.a); const cn = BD.cone(), ch = G.floor - ly + 40;
    x.drawImage(cn, -ch * .55, 10, ch * 1.1, ch); x.restore();
    x.strokeStyle = '#141414'; x.lineWidth = 3; x.beginPath(); x.moveTo(ax, 0); x.lineTo(lx, ly); x.stroke();
    x.save(); x.translate(lx, ly); x.rotate(-L.a);
    BD.art.poly(x, [[-16, 0], [16, 0], [44, 34], [-44, 34]], '#2f3a33', 4);
    x.fillStyle = '#fff6d0'; x.beginPath(); x.ellipse(0, 36, 24, 8, 0, 0, BD.TAU); x.fill();
    x.restore();
    // floating dust in the light
    if (!this.motes) this.motes = Array.from({ length: 26 }, () => [Math.random(), Math.random(), Math.random() * 6]);
    x.fillStyle = 'rgba(255,248,225,.55)';
    for (const m of this.motes) { const mx = ax + (m[0] - .5) * G.W * .35 + Math.sin(t * .4 + m[2]) * 20, my = 120 + m[1] * (G.floor - 160) + Math.cos(t * .3 + m[2]) * 14; x.fillRect(mx, my, 2.5, 2.5); }
  },
  props(G) {
    this.want = [['cube', .16], ['ball', .82], ['crate', .26], ['barrel', .72]];
    this.gone = {};
    for (const [k, fx] of this.want) this.spawn(G, k, fx, G.floor - 60);
  },
  spawn(G, k, fx, y) {
    const e = BD.PROPS[k](G.W * fx, y); e.home = k; e.propHome = fx; return e;
  },
  // broken props come back after a while so the room never runs empty
  keepProps(dt, G) {
    if (!this.want) return;
    for (const [k, fx] of this.want) {
      if (G.ents.some(e => e.home === k && !e.dead)) { this.gone[k] = 0; continue; }
      this.gone[k] = (this.gone[k] || 0) + dt;
      if (this.gone[k] > 7) { this.gone[k] = 0; const e = this.spawn(G, k, fx, 80); BD.fx.smoke(e.pos()[0], 80, 4, '#fff', 20, 20); }
    }
  }
};
