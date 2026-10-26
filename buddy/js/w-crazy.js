/* Crazy: piano, anvil, shark, UFO, giant robot, monster hand, giant bouncing
   ball, portal gun, chain explosions, train and the laser from space. */
'use strict';
(() => {
  const G = BD.G, A = BD.art;

  /* something heavy that falls from the ceiling: shared by the anvil and the piano */
  BD.dropHeavy = function (x, o) {
    const e = BD.body(Object.assign({ shape: 'box', x, y: -o.h, mass: o.mass || 12, rest: .05, fr: .9, heavy: o.heavy || 3, life: o.life || 6, grabbable: true, shootable: true, snd: o.snd, z: 1.5,
      hitDummy(part, rel) {
        if (rel < 700 || !G.gate('heavy' + o.id, .4)) return;
        const d = part.dummy; d.flat = Math.max(d.flat || 0, 1.1); BD.fx.stars(part.x, part.y - 30, 8); BD.fx.shake(.6);
        G.damage(o.dmg || 50, part.x, part.y, { src: o.id, cat: 'crazy' }); if (o.onSquash) o.onSquash(part);
      },
      onImpact(rel, X, Y) { if (rel > 900 && G.gate('land' + o.id, .5)) { BD.fx.smoke(X, G.floor, 10, G.arena.dust, 30, 40); BD.fx.shake(rel / 4000); if (o.onLand) o.onLand(e, rel); } } }, o));
    e.setVel(0, 900);
    return e;
  };

  BD.weapon({
    id: 'anvil', cat: 'crazy', name: 'סדן', price: 0, power: 4, chaos: 2,
    desc: 'סדן ברזל נופל מהתקרה בדיוק איפה שלחצתם. קלאנג!', tip: 'כשהבובה שוכבת, זה משטח אותה',
    down(P) { this.drop(P.x); }, fireAt(x) { this.drop(x); },
    drop(x) {
      if (G.ents.filter(e => e.wid === 'anvil' && !e.dead).length >= 4) return;
      const w = this;
      const e = BD.dropHeavy(BD.clamp(x, 70, G.W - 70), { id: 'anvil', w: 110, h: 64, mass: 14, snd: 'clang', dmg: 55,
        draw(c, ww, hh) { w.drawIt(c, ww, hh); },
        onLand() { BD.audio.play('clang'); } });
      e.wid = 'anvil'; BD.audio.play('whoosh');
    },
    drawIt(x, w, h) {
      A.poly(x, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 - 6, -h / 2 + 16], [w * .18, -h / 2 + 22], [w * .22, h / 2 - 12], [w * .38, h / 2], [-w * .38, h / 2], [-w * .22, h / 2 - 12], [-w * .2, -h / 2 + 22], [-w / 2 - 22, -h / 2 + 8]], '#3c434a', 5);
      x.fillStyle = '#6c7680'; x.fillRect(-w / 2 + 4, -h / 2 + 3, w - 10, 6);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(w * .05, -h / 2 + 22, w * .14, h - 34);
    },
    icon(x, s) { x.save(); const k = s / 120; x.scale(k, k); this.drawIt(x, 110, 64); x.restore(); }
  });

  const dum = () => (G.dummy && !G.dummy.gone ? G.dummy : null);
  const TAU = BD.TAU;
  /* hold some body parts still (the physics treats them as infinitely heavy) */
  const holdParts = list => list.forEach(p => { if (p._im == null) { p._im = p.im; p.im = 0; } });
  const freeParts = list => list.forEach(p => { if (p._im != null) { p.im = p._im; p._im = null; } });

  BD.audio.def('pianocrash', ({ tone, noise }) => { [131, 156, 185, 208, 247, 277, 330, 415].forEach((f, i) => tone('triangle', f, f * .97, 1.4, .08, i * .012)); noise(.35, .9, 900, 90, .7); tone('sine', 65, 30, .6, .6); });
  BD.audio.def('splash', ({ tone, noise }) => { noise(.55, .6, 2200, 300, .7, 'bandpass'); noise(.25, .4, 6000, 2000, 1, 'highpass'); tone('sine', 300, 90, .2, .2); });
  BD.audio.def('horn2', ({ tone }) => { tone('sawtooth', 233, 230, .9, .16); tone('sawtooth', 294, 290, .9, .14); tone('square', 175, 172, .9, .06); });
  BD.audio.def('growl', ({ tone, noise }) => { tone('sawtooth', 90, 45, 1, .18); tone('sawtooth', 96, 48, 1, .12); noise(1, .35, 500, 120, 1); });
  BD.audio.def('beamfire', ({ tone, noise }) => { tone('sawtooth', 80, 40, 1.6, .3); noise(1.6, .6, 3000, 400, .6); tone('sine', 40, 25, 1.8, .6); });
  BD.audio.def('eyelaser', ({ tone }) => { tone('square', 1200, 600, .3, .07); tone('sawtooth', 600, 300, .3, .06); });

  /* ---- giant bouncing ball ---- */
  BD.mkThrow({
    id: 'bigball', cat: 'crazy', name: 'כדור קופץ ענק', price: 200, power: 2, chaos: 4, r: 95, mass: 3, max: 2,
    desc: 'כדור גומי ענק שלא מפסיק לקפוץ. עשר שניות של פינבול בחדר.', tip: 'זרקו אותו חזק לכיוון הבובה',
    spawn(x, y) {
      const w = this;
      return BD.body({ shape: 'ball', x, y, r: this.r, mass: 3, rest: .97, fr: .15, heavy: 1.5, life: 10, snd: 'boing', shootable: true, grabbable: true,
        update() {
          if (this.held) return;
          const [vx, vy] = G.ph.vel(this.ball);
          // it never runs out of bounce
          if (this.ball.ground > 0 && vy > -500) G.ph.setVel(this.ball, Math.abs(vx) < 250 ? BD.rand(-600, 600) : vx, -BD.rand(1300, 1750));
        },
        draw(c, r) { w.drawIt(c, r); c.rotate(-this.rot); A.shine(c, 0, 0, r); },
        hitDummy(part, rel) { if (G.gate('bball', .25)) { G.damage(Math.min(30, rel / 150), part.x, part.y, { src: 'bigball', cat: 'crazy' }); BD.fx.text(part.x, part.y - 60, 'בוינג!', '#fff', 54, .6, -60); BD.audio.play('boing'); } } });
    },
    drawIt(x, r) {
      A.circ(x, 0, 0, r, '#e0306f', 6);
      x.save(); x.beginPath(); x.arc(0, 0, r - 3, 0, TAU); x.clip();
      x.fillStyle = BD.YEL; x.fillRect(-r, -r * .22, r * 2, r * .44);
      x.fillStyle = '#2bb5c9'; x.fillRect(-r, -r * .06, r * 2, r * .12);
      x.restore();
      x.lineWidth = 6; x.strokeStyle = '#141414'; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
      BD.draw.star(x, 0, -r * .55, r * .2, 0, '#fff');
    },
    icon(x, s) { x.save(); const k = s / 200; x.scale(k, k); this.drawIt(x, 95); A.shine(x, 0, 0, 95); x.restore(); }
  });

  /* ---- piano from the ceiling ---- */
  BD.weapon({
    id: 'piano', cat: 'crazy', name: 'פסנתר', price: 300, power: 4, chaos: 3,
    desc: 'פסנתר נופל מהתקרה. אקורד אחרון, תווים באוויר וקלידים לכל הכיוונים.', tip: 'תכוונו לראש בשביל ה"פלאנג!" המושלם',
    down(P) { this.drop(P.x); }, fireAt(x) { this.drop(x); },
    drop(x) {
      if (G.ents.filter(e => e.wid === 'piano' && !e.dead).length >= 2) { BD.audio.play('deny'); return; }
      const w = this;
      const e = BD.dropHeavy(BD.clamp(x, 120, G.W - 120), { id: 'piano', w: 200, h: 150, mass: 18, heavy: 3.5, snd: 'thud', dmg: 60, life: 8,
        draw(c, ww, hh) { w.drawIt(c, ww, hh, this.crack || 0); },
        onLand() {
          if (e.landed) return; e.landed = 1; e.crack = 1;
          BD.audio.play('pianocrash');
          const [cx, cy] = e.pos(); BD.fx.note(cx, cy - 60, 10); BD.fx.debris(cx, cy, 12, ['#5a3418', '#7a4a22', '#fff', '#141414'], 900, 10);
          G.later(.45, () => { if (!e.dead) { w.breakUp(e); e.dead = true; } });
        },
        onSquash(part) { BD.fx.text(part.x, part.y - 80, 'פלאנג!', BD.YEL, 72, .9, -50); BD.fx.note(part.x, part.y - 40, 4); } });
      e.wid = 'piano'; BD.audio.play('whoosh');
    },
    breakUp(e) {
      const [cx, cy] = e.pos();
      [[96, 22, '#5a3418'], [84, 18, '#7a4a22'], [70, 16, '#5a3418'], [64, 16, '#fff'], [54, 14, '#fff'], [44, 22, '#141414']].forEach(([w, h, col]) => {
        BD.body({ shape: 'box', x: cx + BD.rand(-60, 60), y: cy + BD.rand(-40, 10), w, h, mass: 1, rest: .3, fr: .7, life: 4, grabbable: true, angle: BD.rand(-1, 1), vx: BD.rand(-900, 900), vy: -BD.rand(400, 1100), snd: 'thud',
          draw(c, ww, hh) {
            A.rect(c, -ww / 2, -hh / 2, ww, hh, col, 2, 3);
            if (col === '#fff') { c.fillStyle = '#141414'; for (let k = -ww / 2 + 8; k < ww / 2 - 4; k += 12) c.fillRect(k, -hh / 2, 5, hh * .55); }
          } });
      });
      BD.fx.note(cx, cy - 40, 8); BD.fx.smoke(cx, cy, 8, '#d9cbb3', 30, 50); BD.audio.play('crack');
      BD.fx.debris(cx, cy, 16, ['#5a3418', '#7a4a22', '#c98c4c'], 1100, 12);
    },
    drawIt(x, w, h, crack) {
      const top = -h / 2, kb = top + h * .58;
      A.rect(x, -w / 2, top, w, h * .58, '#5a3418', 6, 5);
      x.fillStyle = '#7a4a22'; x.fillRect(-w / 2 + 12, top + 12, w * .42 - 12, h * .58 - 24); x.fillRect(4, top + 12, w * .42 - 12, h * .58 - 24);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-w / 2 + 6, top + 4, w - 12, 5);
      A.rect(x, -w * .22, top + 18, w * .44, 20, '#3a2010', 2, 3);
      // keys
      A.rect(x, -w / 2 - 8, kb - 2, w + 16, 24, '#3a2010', 3, 4);
      x.fillStyle = '#fff'; x.fillRect(-w / 2, kb + 2, w, 15);
      x.fillStyle = '#141414';
      for (let k = -w / 2 + 10; k < w / 2; k += 10) x.fillRect(k, kb + 2, 1.5, 15);
      for (let k = -w / 2 + 7, i = 0; k < w / 2 - 6; k += 10, i++) if (i % 7 !== 2 && i % 7 !== 6) x.fillRect(k, kb + 2, 6, 9);
      A.rect(x, -w / 2 + 8, kb + 22, w - 16, h / 2 - kb - 34, '#5a3418', 3, 4);
      A.rect(x, -w / 2 + 6, h / 2 - 14, 18, 14, '#3a2010', 2, 3); A.rect(x, w / 2 - 24, h / 2 - 14, 18, 14, '#3a2010', 2, 3);
      A.rect(x, -14, h / 2 - 26, 10, 14, BD.YEL, 2, 2); A.rect(x, 4, h / 2 - 26, 10, 14, BD.YEL, 2, 2);
      if (crack) { x.strokeStyle = '#141414'; x.lineWidth = 3; x.beginPath(); x.moveTo(-30, top); x.lineTo(-18, top + 30); x.lineTo(-34, top + 52); x.lineTo(-20, kb); x.moveTo(50, h / 2); x.lineTo(40, h / 2 - 30); x.lineTo(56, h / 2 - 44); x.stroke(); }
    },
    icon(x, s) { x.save(); const k = s / 220; x.scale(k, k); this.drawIt(x, 200, 150, 0); x.restore(); }
  });

  /* ---- shark jumps out of the floor ---- */
  BD.weapon({
    id: 'shark', cat: 'crazy', name: 'כריש', price: 600, power: 4, chaos: 4,
    desc: 'נפתחת בריכה ברצפה וכריש קופץ ממנה, נוגס בבובה ומעיף אותה לתקרה.', tip: 'הכי טוב כשהבובה עומדת',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (!G.gate('shark', 1.2)) return;
      const d = dum(), F = G.floor;
      let x0 = tx; if (d && Math.abs(d.j.pelvis.x - tx) < 320) x0 = d.j.pelvis.x;
      x0 = BD.clamp(x0, 180, G.W - 180);
      const dir = Math.random() < .5 ? 1 : -1, apex = d ? BD.clamp(d.j.chest.y, 140, F - 250) : F - 320;
      const path = s => [x0 + dir * (s - .5) * 520, F + 150 - (F + 150 - apex) * 4 * s * (1 - s)];
      const e = { z: 2.5, t: 0 };
      e.update = function (dt) {
        this.t += dt; const t = this.t;
        if (t < .55 && Math.random() < .5) BD.fx.bubbles(x0 + BD.rand(-120, 120), F - 4, 2);
        if (t >= .55 && !this.out) { this.out = 1; BD.audio.play('splash'); BD.fx.drops(x0 - dir * 240, F, 26, '#4fb3ff', 900, 8); BD.fx.ring(x0 - dir * 240, F, 120, '#bfeaff', .4, 8); }
        const s = (t - .55) / .9;
        if (s > 0 && s < 1) {
          const [sx, sy] = path(s), [nx, ny] = path(Math.min(1, s + .02));
          this.sx = sx; this.sy = sy; this.a = Math.atan2(ny - sy, nx - sx);
          const mx = sx + Math.cos(this.a) * 115, my = sy + Math.sin(this.a) * 115;
          if (!this.bit) {
            const dd = dum(), p = dd && G.part(mx, my, 70);
            if (p) {
              this.bit = true; BD.audio.play('bite'); BD.audio.play('chomp');
              G.hit(p, dir * 1500, -3000, { dmg: 45, src: 'shark', cat: 'crazy', mark: 'bite', snd: 'hit' });
              for (const q of dd.parts) G.ph.push(q, dir * 500, -1700);
              dd.talk('scared', true); BD.fx.text(p.x, p.y - 80, 'חאם!', '#fff', 76, .9, -60); BD.fx.shake(.5); BD.fx.drops(p.x, p.y, 10, '#4fb3ff', 500, 6);
            }
          }
        }
        if (s >= 1 && !this.in) { this.in = 1; BD.audio.play('splash'); BD.fx.drops(x0 + dir * 240, F, 32, '#4fb3ff', 1000, 9); BD.fx.ring(x0 + dir * 240, F, 150, '#bfeaff', .45, 8); }
        if (t > 2.2) return false;
      };
      e.draw = function (x) {
        const t = this.t;
        const k = t < .3 ? t / .3 : t > 1.9 ? Math.max(0, (2.2 - t) / .3) : 1;
        if (k > 0) {
          x.save(); x.translate(x0, F + 4); x.scale(1, .16);
          x.fillStyle = '#1f5f99'; x.beginPath(); x.arc(0, 0, 330 * k, 0, TAU); x.fill();
          x.fillStyle = '#2f86c9'; x.beginPath(); x.arc(0, 0, 260 * k, 0, TAU); x.fill();
          x.strokeStyle = '#d8f2ff'; x.lineWidth = 16; x.beginPath(); x.arc(0, 0, 330 * k, 0, TAU); x.stroke();
          x.globalAlpha = .6; x.lineWidth = 10; x.beginPath(); x.arc(0, 0, (150 + (t * 260) % 120) * k, 0, TAU); x.stroke();
          x.restore();
        }
        const s = (t - .55) / .9; if (s <= 0 || s >= 1) return;
        x.save(); x.beginPath(); x.rect(-60, -60, G.W + 120, F + 66); x.clip();
        x.translate(this.sx, this.sy); x.rotate(this.a); if (dir < 0) x.scale(1, -1);
        BD.W.shark.drawShark(x, !this.bit && s < .55);
        x.restore();
      };
      G.add(e); BD.audio.play('water');
    },
    drawShark(x, open) {
      A.poly(x, [[-112, 0], [-178, -58], [-150, 0], [-178, 52]], '#5b7a90', 5);
      x.beginPath(); x.moveTo(142, 4); x.quadraticCurveTo(84, -60, -40, -46); x.quadraticCurveTo(-112, -32, -126, 0); x.quadraticCurveTo(-100, 28, -30, 38); x.quadraticCurveTo(84, 48, 142, 4); x.closePath();
      x.fillStyle = '#6f93ab'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.lineJoin = 'round'; x.stroke();
      x.beginPath(); x.moveTo(132, 14); x.quadraticCurveTo(60, 46, -44, 34); x.quadraticCurveTo(24, 22, 132, 14); x.closePath(); x.fillStyle = '#eef3f6'; x.fill();
      A.poly(x, [[-6, -45], [-48, -108], [-62, -40]], '#5b7a90', 5);
      A.poly(x, [[22, 26], [-24, 72], [-14, 24]], '#5b7a90', 4);
      x.strokeStyle = 'rgba(20,20,20,.6)'; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(52 - i * 10, -14); x.quadraticCurveTo(46 - i * 10, 2, 52 - i * 10, 16); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(30, -32, 40, 7, -.1, 0, TAU); x.fill();
      A.circ(x, 92, -16, 8, '#fff', 3); x.fillStyle = '#141414'; x.beginPath(); x.arc(95, -16, 4, 0, TAU); x.fill();
      if (open) {
        A.poly(x, [[146, 2], [74, 14], [138, 40]], '#5a1515', 4);
        x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const u = 82 + i * 15; x.beginPath(); x.moveTo(u, 13 - i * 2); x.lineTo(u + 6, 22 - i * 2); x.lineTo(u + 11, 12 - i * 2); x.fill(); x.beginPath(); x.moveTo(u + 4, 30 + i * 2.5); x.lineTo(u + 9, 22 + i * 2); x.lineTo(u + 14, 31 + i * 2.5); x.fill(); }
      } else {
        x.strokeStyle = '#141414'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(140, 8); x.quadraticCurveTo(100, 26, 72, 14); x.stroke();
        x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const u = 82 + i * 13; x.beginPath(); x.moveTo(u, 15 + i * 1.6); x.lineTo(u + 5, 22 + i * 1.6); x.lineTo(u + 10, 16 + i * 1.6); x.fill(); }
      }
    },
    icon(x, s) { x.save(); const k = s / 330; x.scale(k, k); x.rotate(-.35); this.drawShark(x, true); x.restore(); }
  });

  /* ---- portal gun: two linked portals, everything keeps its speed ---- */
  const PORT = { list: [null, null], next: 0, cd: -9 };
  const PCOL = ['#2f8cff', '#ff8a1c'];
  function warp(pts, p0, Ain, B) {
    const ph = G.ph;
    const th = Math.atan2(B.ny, B.nx) - Math.atan2(-Ain.ny, -Ain.nx), c = Math.cos(th), s = Math.sin(th);
    const vs = pts.map(q => ph.vel(q));
    const ax = B.x + B.nx * (p0.r + 16), ay = B.y + B.ny * (p0.r + 16);
    const np = pts.map(q => { const rx = q.x - p0.x, ry = q.y - p0.y; return [ax + rx * c - ry * s, ay + rx * s + ry * c]; });
    // push the whole body out so nothing is left inside the wall
    let min = 1e9; pts.forEach((q, i) => { min = Math.min(min, (np[i][0] - B.x) * B.nx + (np[i][1] - B.y) * B.ny - q.r); });
    const sh = Math.max(0, 14 - min);
    pts.forEach((q, i) => {
      const nx = BD.clamp(np[i][0] + B.nx * sh, q.r, G.W - q.r), ny = BD.clamp(np[i][1] + B.ny * sh, q.r, G.floor - q.r);
      let vx = vs[i][0] * c - vs[i][1] * s, vy = vs[i][0] * s + vs[i][1] * c;
      const vn = vx * B.nx + vy * B.ny; if (vn < 380) { vx += (380 - vn) * B.nx; vy += (380 - vn) * B.ny; }
      q.x = nx; q.y = ny; ph.setVel(q, vx, vy);
    });
    BD.audio.play('portal'); BD.fx.ring(Ain.x, Ain.y, 120, Ain.col, .35, 8); BD.fx.ring(B.x, B.y, 120, B.col, .35, 8);
    BD.fx.spark(B.x, B.y, 12, B.col, 600);
  }
  function makePortal(x, y, slot, life) {
    const F = G.floor, W = G.W;
    let px = x, py = y, nx = x < W / 2 ? 1 : -1, ny = 0;
    const cand = [];
    if (y > F - 130) cand.push([F - y, x, F, 0, -1]);
    if (y < 130) cand.push([y, x, 0, 0, 1]);
    if (x < 130) cand.push([x, 0, y, 1, 0]);
    if (x > W - 130) cand.push([W - x, W, y, -1, 0]);
    if (cand.length) { cand.sort((a, b) => a[0] - b[0]); [, px, py, nx, ny] = cand[0]; }
    if (ny !== 0) px = BD.clamp(px, 100, W - 100); else py = BD.clamp(py, 100, F - 100);
    const old = PORT.list[slot]; if (old) old.dead = true;
    const e = { z: .5, x: px, y: py, nx, ny, col: PCOL[slot], slot, t: 0, R: 74, life: life || Infinity };
    e.update = function (dt) {
      this.t += dt;
      if (Math.random() < .25) { const a = Math.random() * TAU; BD.fx.spark(this.x - this.ny * Math.sin(a) * this.R, this.y + this.nx * Math.sin(a) * this.R, 1, this.col, 160); }
      if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) return false; }
    };
    e.kill = function () { this.dead = true; if (PORT.list[this.slot] === this) PORT.list[this.slot] = null; };
    // is this point flying into the portal's mouth?
    e.enters = function (p) {
      const rx = p.x - this.x, ry = p.y - this.y, dn = rx * this.nx + ry * this.ny, dt2 = -rx * this.ny + ry * this.nx;
      if (Math.abs(dt2) > this.R - 8 || dn < -p.r - 30) return false;
      const [vx, vy] = G.ph.vel(p), vn = vx * this.nx + vy * this.ny;
      if (vn > -150) return false;
      return dn - p.r < Math.max(12, -vn * G.ph.dt * 3);
    };
    e.sub = function () {
      const o = PORT.list[1 - this.slot]; if (!o || o.dead || this.t < .15) return;
      const d = dum();
      if (d && !d.grabbed && G.rt - PORT.cd > .35) for (const p of d.parts) if (this.enters(p)) { warp(d.parts, p, this, o); PORT.cd = G.rt; G.special('portal'); break; }
      for (const en of G.ents) {
        if (en.dead || en.held || en.wrecking || !(en.ball || en.box) || G.rt - (en._pcd || -9) < .35) continue;
        const pts = en.ball ? [en.ball] : en.box.ps;
        const hit = pts.find(q => q.im && this.enters(q));
        if (hit) { warp(pts, hit, this, o); en._pcd = G.rt; }
      }
    };
    e.draw = function (x) {
      const a = Math.atan2(this.ny, this.nx), R = this.R * Math.min(1, this.t * 5), w = 20;
      x.save(); x.translate(this.x, this.y); x.rotate(a);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = .8; x.drawImage(BD.fx.glow(this.col), -70, -R - 50, 140, 2 * R + 100); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#07070f'; x.beginPath(); x.ellipse(0, 0, w, R, 0, 0, TAU); x.fill();
      x.strokeStyle = this.col; x.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const k = 1 - i * .2, s0 = this.t * (5 + i) + i * 1.7; x.beginPath(); x.ellipse(0, 0, w * k, R * k, 0, s0, s0 + 3.6); x.stroke(); }
      x.lineWidth = 8; x.beginPath(); x.ellipse(0, 0, w + 4, R + 4, 0, 0, TAU); x.stroke();
      x.lineWidth = 2.5; x.strokeStyle = '#fff'; x.stroke();
      x.restore();
    };
    PORT.list[slot] = e; G.add(e);
    BD.audio.play('portal'); BD.fx.ring(px, py, 110, e.col, .4, 10); BD.fx.spark(px, py, 14, e.col, 700);
    return e;
  }
  BD.weapon({
    id: 'portal', cat: 'crazy', name: 'אקדח פורטלים', price: 700, power: 1, chaos: 5,
    desc: 'לחיצה ראשונה פותחת פורטל כחול, השנייה כתום. מה שנכנס לאחד יוצא מהשני באותה מהירות.', tip: 'פורטל ברצפה ופורטל בתקרה = נפילה אינסופית',
    down(P) { makePortal(P.x, P.y, PORT.next); PORT.next = 1 - PORT.next; },
    fireAt(x) { const d = dum(); makePortal(d ? d.j.pelvis.x : x, G.floor, 0, 8); makePortal(BD.rand(150, G.W - 150), 0, 1, 8); },
    draw(x, P) {
      if (!P.over || (P.touch && !P.down)) return;
      x.strokeStyle = PCOL[PORT.next]; x.lineWidth = 4; x.beginPath(); x.ellipse(P.x, P.y, 12, 26, 0, 0, TAU); x.stroke();
      x.fillStyle = PCOL[PORT.next]; x.beginPath(); x.arc(P.x, P.y, 4, 0, TAU); x.fill();
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 150; x.scale(k, k); x.rotate(-.3); x.translate(-10, 0);
      A.rect(x, -70, -18, 100, 36, '#f1efeb', 14, 4);
      A.rect(x, -50, 14, 26, 40, '#3b4148', 6, 4);
      A.rect(x, 26, -26, 34, 52, '#3b4148', 8, 4);
      x.fillStyle = '#141414'; x.fillRect(-30, -18, 6, 36);
      A.circ(x, 70, 0, 16, PCOL[Math.floor(t * 1.5) % 2], 4);
      x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(66, -5, 5, 0, TAU); x.fill();
      x.fillStyle = PCOL[0]; x.fillRect(-62, -8, 40, 6); x.fillStyle = PCOL[1]; x.fillRect(-62, 2, 40, 6);
      x.restore();
    }
  });

  /* ---- monster hand from under the floor ---- */
  BD.weapon({
    id: 'monster', cat: 'crazy', name: 'יד מפלצת', price: 900, power: 4, chaos: 4,
    desc: 'יד ירוקה ענקית פורצת מהרצפה, תופסת את הבובה, מנערת אותה וחובטת בה ברצפה פעמיים.', tip: 'לחצו ליד הבובה כדי שהיד תצא בדיוק מתחתיה',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.monster && !e.dead)) return;
      const d = dum(), F = G.floor;
      let x0 = tx; if (d && Math.abs(d.j.pelvis.x - tx) < 320) x0 = d.j.pelvis.x;
      x0 = BD.clamp(x0, 140, G.W - 140);
      const e = { z: 2.4, monster: true, t: 0, hx: x0, hy: F + 260, grip: null, open: 1, slams: 0, gy: F - 330 };
      const let_go = () => {
        if (!e.grip) return; const g = e.grip; e.grip = null; freeParts(g.parts);
        if (g.d) { g.d.held = false; for (const p of g.d.parts) G.ph.setVel(p, BD.rand(-700, 700), -BD.rand(700, 1100)); }
      };
      e.kill = function () { let_go(); };
      e.update = function (dt) {
        this.t += dt; const t = this.t;
        if (t < .4) { BD.fx.shake(.03); if (Math.random() < .4) BD.fx.debris(x0 + BD.rand(-80, 80), F, 1, G.arena.chips, 300, 6); this.crack = t / .4; }
        else if (!this.burst) { this.burst = 1; this.crack = 1; BD.audio.play('crack'); BD.audio.play('stomp'); BD.fx.shake(.6); BD.fx.debris(x0, F, 18, G.arena.chips, 1000, 12); BD.fx.smoke(x0, F, 12, G.arena.dust, 40, 80); this.ty = d && !d.gone ? BD.clamp(d.j.chest.y, F - 420, F - 160) : F - 300; }
        if (t >= .4 && t < .75) { const k = (t - .4) / .35, e2 = 1 - Math.pow(1 - k, 3); this.hy = BD.lerp(F + 260, this.ty, e2); }
        if (t >= .75 && !this.tried) {
          this.tried = 1;
          const dd = dum();
          if (dd && !dd.grabbed && Math.hypot(dd.j.chest.x - this.hx, dd.j.chest.y - this.hy) < 340) {
            const parts = [dd.j.chest, dd.j.pelvis]; holdParts(parts); this.grip = { d: dd, parts };
            dd.held = true; dd.setMood('scared', 3); dd.talk('scared', true); BD.audio.play('grab'); BD.audio.play('growl');
          } else BD.audio.play('growl');
          this.open = 0;
        }
        if (this.grip && (this.grip.d.gone || !this.grip.d.parts[0].alive)) { this.grip = null; }
        if (t >= .75 && t < 1.7) { this.hx = BD.lerp(this.hx, x0 + Math.sin(t * 30) * 55, .5); this.hy = BD.lerp(this.hy, this.gy + Math.cos(t * 24) * 22, .2); if (this.grip && G.gate('mshake', .3)) { G.damage(4, this.hx, this.hy - 60, { src: 'monster', cat: 'crazy' }); this.grip.d.dizzy = Math.min(4, this.grip.d.dizzy + .6); } }
        if (t >= 1.7 && t < 2.7) {
          const u = ((t - 1.7) % .5) / .5, n = Math.floor((t - 1.7) / .5);
          this.hx = BD.lerp(this.hx, x0, .3);
          if (u < .35) this.hy = BD.lerp(this.gy, F - 110, Math.pow(u / .35, 2));
          else this.hy = BD.lerp(F - 110, this.gy, (u - .35) / .65);
          if (u >= .35 && this.slams <= n) {
            this.slams = n + 1;
            BD.audio.play('stomp'); BD.audio.play('thud', 1); BD.fx.shake(.8); BD.fx.smoke(this.hx, F, 10, G.arena.dust, 40, 60); BD.fx.ring(this.hx, F, 220, '#fff', .35, 12);
            if (this.grip) { const dd = this.grip.d; G.damage(42, this.hx, F - 120, { src: 'monster', cat: 'crazy' }); dd.react(1.1, this.hx, F - 80); dd.flat = .7; BD.fx.stars(this.hx, F - 140, 7); BD.fx.text(this.hx, F - 250, n ? 'ועוד פעם!' : 'בום!', BD.YEL, 70, .8, -50); }
          }
        }
        if (t >= 2.7 && !this.rel) { this.rel = 1; this.open = 1; let_go(); }
        if (t >= 2.75) this.hy = BD.lerp(this.hy, F + 300, .08);
        if (t > 3.5) { let_go(); return false; }
      };
      e.sub = function () {
        if (!this.grip) return;
        const [c, p] = this.grip.parts;
        c.x = this.hx; c.y = this.hy - 34; p.x = this.hx + Math.sin(this.t * 30) * 6; p.y = this.hy + 44;
      };
      e.draw = function (x) {
        const F = G.floor, k = this.crack || 0;
        // the hole in the floor
        x.fillStyle = '#141414'; x.beginPath(); x.ellipse(x0, F + 6, 40 + 120 * k, 10 + 18 * k, 0, 0, TAU); x.fill();
        x.strokeStyle = '#141414'; x.lineWidth = 4; x.beginPath();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI, L = 90 + 110 * k; x.moveTo(x0 + Math.cos(a) * 40, F + 4); x.lineTo(x0 + Math.cos(a) * L * .6, F + 4 + Math.sin(i * 2) * 10); x.lineTo(x0 + Math.cos(a) * L, F + 4 + Math.cos(i) * 14); }
        x.stroke();
        x.save(); x.beginPath(); x.rect(-50, -50, G.W + 100, F + 56); x.clip();
        const hx = this.hx, hy = this.hy;
        // arm
        x.lineCap = 'butt'; x.strokeStyle = '#141414'; x.lineWidth = 128; x.beginPath(); x.moveTo(x0, F + 300); x.quadraticCurveTo(x0, F, hx, hy + 70); x.stroke();
        x.strokeStyle = '#4d9a3a'; x.lineWidth = 116; x.stroke();
        x.strokeStyle = '#3d7f2d'; x.lineWidth = 30; x.beginPath(); x.moveTo(x0 + 34, F + 300); x.quadraticCurveTo(x0 + 34, F, hx + 34, hy + 70); x.stroke();
        x.fillStyle = '#356f27'; for (let i = 0; i < 5; i++) { const yy = hy + 120 + i * 70; if (yy < F + 10) { x.beginPath(); x.arc(BD.lerp(hx, x0, (yy - hy) / Math.max(1, F + 300 - hy)) - 20 + (i % 2) * 34, yy, 9 + (i % 3) * 3, 0, TAU); x.fill(); } }
        BD.W.monster.drawHand(x, hx, hy, this.open, this.t);
        x.restore();
      };
      G.add(e); BD.audio.play('rumble', 1);
    },
    drawHand(x, hx, hy, open, t) {
      x.save(); x.translate(hx, hy);
      x.beginPath(); BD.draw.rr(x, -78, -40, 156, 130, 46); x.fillStyle = '#58ad43'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#141414'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(-30, -16, 34, 12, -.3, 0, TAU); x.fill();
      for (let i = 0; i < 4; i++) {
        const fx = -60 + i * 40, wig = Math.sin(t * 9 + i) * 4;
        x.save(); x.translate(fx, -34);
        x.rotate(open ? -.18 + i * .12 + wig * .01 : .2);
        const L = open ? 96 : 66;
        x.beginPath(); BD.draw.rr(x, -17, -L, 34, L + 10, 16); x.fillStyle = '#58ad43'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
        x.strokeStyle = 'rgba(20,20,20,.45)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-10, -L * .45); x.lineTo(10, -L * .45); x.stroke();
        A.poly(x, open ? [[-12, -L + 4], [0, -L - 30], [12, -L + 4]] : [[-12, -L + 2], [18, -L - 6], [6, -L + 14]], '#f1efeb', 4);
        x.restore();
      }
      x.save(); x.translate(76, 26); x.rotate(open ? .7 : -.2);
      x.beginPath(); BD.draw.rr(x, -14, -60, 30, 74, 14); x.fillStyle = '#58ad43'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
      A.poly(x, [[-10, -56], [2, -84], [12, -56]], '#f1efeb', 4); x.restore();
      x.restore();
    },
    icon(x, s, t = 0) { x.save(); const k = s / 230; x.scale(k, k); x.translate(0, 30); this.drawHand(x, 0, 0, 1, t); x.restore(); }
  });

  /* ---- UFO abduction ---- */
  BD.weapon({
    id: 'ufo', cat: 'crazy', name: 'עב״ם', price: 1300, power: 3, chaos: 4,
    desc: 'צלחת מעופפת מגיעה, קרן משיכה מרימה את הבובה ומסובבת אותה, ואז החייזרים מתחרטים ומפילים אותה מלמעלה.', tip: 'חכו לרגע הנפילה וזרקו עליו משהו באוויר',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.ufo && !e.dead)) return;
      const e = { z: 2.6, ufo: true, t: 0, x: tx < G.W / 2 ? G.W + 220 : -220, y: 120, tx, state: 'in', bt: 0, lp: null, held: null };
      const drop = () => {
        if (e.lp) { e.lp.stop(); e.lp = null; }
        if (e.held) { e.held.held = false; e.held = null; }
      };
      e.kill = drop;
      e.update = function (dt) {
        this.t += dt; const dd = dum(), tgt = dd ? dd.j.chest.x : this.tx;
        if (this.state === 'in') {
          const dx = tgt - this.x; this.x += Math.sign(dx) * Math.min(Math.abs(dx), 1000 * dt); this.y = 120 + Math.sin(this.t * 3) * 8;
          if (Math.abs(dx) < 10 || this.t > 2.2) { this.state = 'beam'; this.bt = 0; BD.audio.play('ufo'); this.lp = BD.audio.loop('hum'); if (dd) { dd.talk('scared', true); } }
        } else if (this.state === 'beam') {
          this.bt += dt; this.y = 120 + Math.sin(this.t * 3) * 6; this.x += (tgt - this.x) * dt * .3;
          if (Math.random() < .6) BD.fx.glowAt(this.x + BD.rand(-120, 120) * (1 - Math.random() * .5), BD.rand(this.y + 60, G.floor), 16, '#9dffb0', .3);
          if (dd && G.gate('ufoDmg', .3)) { G.damage(3, dd.j.chest.x, dd.j.chest.y, { src: 'ufo', cat: 'crazy', comboGap: .5 }); dd.held = true; this.held = dd; if (Math.random() < .3) dd.talk('fly'); }
          if (this.bt > 2.6) { this.state = 'zip'; drop(); BD.audio.play('whoosh'); BD.audio.play('portal'); this.vx = (Math.random() < .5 ? -1 : 1) * 1700; if (dd) BD.fx.text(this.x, this.y + 80, 'אופס!', '#9dffb0', 60, .9, -40); }
        } else {
          this.x += this.vx * dt; this.y -= 500 * dt;
          if (this.x < -300 || this.x > G.W + 300) return false;
        }
        if (this.t > 9) { drop(); return false; }
      };
      e.sub = function () {
        if (this.state !== 'beam') return; const dd = dum(); if (!dd || dd.grabbed) return;
        const ph = G.ph, g = ph.g * ph.gScale, ramp = Math.min(1, this.bt / .5), ty = this.y + 240, c = dd.j.chest;
        for (const p of dd.parts) {
          const [vx, vy] = ph.vel(p);
          p.ay += (-g + (ty - p.y) * 7 - vy * 2.6) * ramp + (p.x - c.x) * 10 * ramp;
          p.ax += ((this.x - p.x) * 5 - vx * 2) * ramp - (p.y - c.y) * 10 * ramp;
        }
      };
      e.draw = function (x) {
        const F = G.floor;
        if (this.state === 'beam') {
          const a = Math.min(1, this.bt * 3) * (.75 + Math.sin(this.t * 30) * .08);
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .28 * a;
          const g = x.createLinearGradient(0, this.y, 0, F); g.addColorStop(0, '#b9ffc8'); g.addColorStop(1, 'rgba(120,255,160,.15)');
          x.fillStyle = g; x.beginPath(); x.moveTo(this.x - 50, this.y + 30); x.lineTo(this.x + 50, this.y + 30); x.lineTo(this.x + 170, F); x.lineTo(this.x - 170, F); x.closePath(); x.fill();
          x.globalAlpha = .5 * a; x.strokeStyle = '#d9ffe0'; x.lineWidth = 3;
          for (let i = 0; i < 4; i++) { const k = ((this.t * .8 + i / 4) % 1), yy = BD.lerp(F, this.y + 40, k), hw = BD.lerp(170, 50, k); x.beginPath(); x.ellipse(this.x, yy, hw, hw * .12, 0, 0, TAU); x.stroke(); }
          x.restore();
        }
        x.save(); x.translate(this.x, this.y); x.rotate(this.state === 'zip' ? -.2 * Math.sign(this.vx) : Math.sin(this.t * 2) * .05);
        BD.W.ufo.drawSaucer(x, this.t, this.state === 'beam');
        x.restore();
      };
      G.add(e); BD.audio.play('ufo');
    },
    drawSaucer(x, t, beam) {
      // glass dome with a little pilot
      x.beginPath(); x.ellipse(0, -18, 62, 56, 0, Math.PI, 0); x.fillStyle = 'rgba(170,225,255,.55)'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
      A.circ(x, 0, -34, 20, '#7fd36a', 3);
      x.fillStyle = '#141414'; x.beginPath(); x.ellipse(-8, -36, 6, 9, -.3, 0, TAU); x.ellipse(8, -36, 6, 9, .3, 0, TAU); x.fill();
      x.strokeStyle = '#141414'; x.lineWidth = 3; x.beginPath(); x.moveTo(-6, -52); x.lineTo(-12, -66); x.moveTo(6, -52); x.lineTo(12, -66); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(-30, -46, 14, 6, -.6, 0, TAU); x.fill();
      // the disc
      x.beginPath(); x.ellipse(0, 0, 150, 36, 0, 0, TAU); x.fillStyle = '#b8c2cb'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#141414'; x.stroke();
      x.beginPath(); x.ellipse(0, 10, 128, 22, 0, 0, Math.PI); x.fillStyle = '#7d8a96'; x.fill();
      x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.ellipse(-40, -14, 70, 8, 0, 0, TAU); x.fill();
      const cols = ['#ff4d4d', BD.YEL, '#4dd0e1', '#7cff6b'];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, lx = Math.cos(a) * 118, ly = Math.sin(a) * 22 + 4; if (ly < -6) continue; const on = (Math.floor(t * 8) + i) % 3 === 0; A.circ(x, lx, ly, 8, on ? cols[i % 4] : '#555', 3); }
      A.rect(x, -40, 26, 80, 16, beam ? '#c9ffd4' : '#6c7680', 6, 4);
    },
    icon(x, s, t = 0) { x.save(); const k = s / 320; x.scale(k, k); x.translate(0, 20); this.drawSaucer(x, t * 2, false); x.restore(); }
  });

  /* ---- a chain of explosions across the floor ---- */
  BD.weapon({
    id: 'chain', cat: 'crazy', name: 'שרשרת פיצוצים', price: 1100, power: 4, chaos: 5,
    desc: 'פתיל נדלק בצד אחד של החדר ושורה של פיצוצים רצה לאורך כל הרצפה עד הקיר השני.', tip: 'כל מה שעל הרצפה עף. כולל הבובה, פעמיים',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.chainEx && !e.dead)) return;
      const n = 10, xs = []; for (let i = 0; i < n; i++) xs.push(BD.lerp(70, G.W - 70, i / (n - 1)));
      if (tx < G.W / 2) xs.reverse();
      const gap = .16, t0 = .55;
      const e = { z: 1.2, chainEx: true, t: 0, i: 0 };
      e.update = function (dt) {
        this.t += dt;
        while (this.i < n && this.t >= t0 + this.i * gap) {
          const x = xs[this.i++];
          G.explode(x, G.floor - 26, 82, { src: 'chain', cat: 'crazy', dmg: 26, fire: false });
          BD.fx.debris(x, G.floor, 6, G.arena.chips, 700, 8);
        }
        if (this.t < t0) BD.fuseFx(xs[0], G.floor - 6);
        if (this.i >= n && this.t > t0 + n * gap + .4) return false;
      };
      e.draw = function (x) {
        const F = G.floor - 6, k = BD.clamp((this.t - t0) / gap, 0, n - 1), hi = Math.floor(k);
        const hx = this.i >= n ? xs[n - 1] : BD.lerp(xs[hi], xs[Math.min(n - 1, hi + 1)], this.t < t0 ? 0 : k - hi);
        // the fuse still waiting to burn
        x.strokeStyle = '#141414'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx, F); x.lineTo(xs[n - 1], F); x.stroke();
        x.strokeStyle = '#d8c39a'; x.lineWidth = 3.5; x.stroke();
        for (let i = Math.max(this.i, 1); i < n; i++) { A.rect(x, xs[i] - 14, F - 22, 28, 22, BD.RED, 3, 3); x.fillStyle = '#141414'; x.fillRect(xs[i] - 14, F - 14, 28, 5); }
        if (this.i < n) { const f = 9 + Math.sin(G.rt * 50) * 3; x.fillStyle = '#ffd54a'; x.beginPath(); x.arc(hx, F, f, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(hx, F, f * .45, 0, TAU); x.fill(); }
      };
      G.add(e); BD.audio.play('fuse'); BD.fx.text(xs[0], G.floor - 160, 'שרשרת!', BD.YEL, 64, 1, -40);
    },
    icon(x, s) {
      x.save(); const k = s / 160; x.scale(k, k);
      x.strokeStyle = '#141414'; x.lineWidth = 7; x.beginPath(); x.moveTo(-80, 40); x.lineTo(80, 40); x.stroke(); x.strokeStyle = '#d8c39a'; x.lineWidth = 3; x.stroke();
      [[-50, 0, 30], [0, -10, 40], [52, 4, 32]].forEach(([cx, cy, r], i) => {
        x.fillStyle = '#ff6a00'; x.beginPath(); for (let j = 0; j < 16; j++) { const a = j / 16 * TAU, rr = j % 2 ? r * .55 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
        x.fillStyle = BD.YEL; x.beginPath(); x.arc(cx, cy, r * .38, 0, TAU); x.fill();
      });
      x.restore();
    }
  });

  /* ---- a train through the room ---- */
  BD.weapon({
    id: 'train', cat: 'crazy', name: 'רכבת', price: 1800, power: 5, chaos: 5, big: true,
    desc: 'צופר, פנס מסנוור, ו"הנשיא אקספרס" עובר דרך החדר במהירות מלאה. כל מה שבדרך עף.', tip: 'זה עובר לאורך כל הרצפה, אין לאן לברוח',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.train && !e.dead)) return;
      const d = dum(), ref = d ? d.j.chest.x : tx, dir = ref > G.W / 2 ? 1 : -1, TL = 420 + 2 * 354;
      const e = { z: 3, train: true, t: 0, dir, front: dir > 0 ? -80 : G.W + 80, hit: false, rot: 0, lp: null };
      e.kill = function () { if (this.lp) { this.lp.stop(); this.lp = null; } };
      e.update = function (dt) {
        this.t += dt; const t = this.t, F = G.floor;
        if (t < .05 && !this.h1) { this.h1 = 1; BD.audio.play('horn2'); this.lp = BD.audio.loop('engine'); }
        if (t > .65 && !this.h2) { this.h2 = 1; BD.audio.play('horn2'); }
        if (this.lp) this.lp.set(.4 + Math.min(1, t) * .6, 55 + Math.min(1, t) * 30);
        if (t < 1.3) { BD.fx.shake(.01 + t * .02); return; }
        if (!this.go2) { this.go2 = 1; BD.audio.play('whoosh'); BD.audio.play('rumble', 2); }
        const sp = 2900; this.front += dir * sp * dt; this.rot += sp * dt / 40;
        const rear = this.front - dir * TL, lo = Math.min(this.front, rear), hi = Math.max(this.front, rear);
        BD.fx.shake(.05);
        if (Math.random() < .6) BD.fx.smoke(this.front - dir * 120, F - 330, 1, '#eee', 26, 120);
        if (Math.random() < .5) BD.fx.spark(BD.rand(lo, hi), F - 4, 2, '#ffd54a', 500);
        const dd = dum();
        if (dd) for (const p of dd.parts) {
          if (p.x < lo - p.r || p.x > hi + p.r || p.y < F - 320) continue;
          if (!this.hit) {
            this.hit = true;
            for (const q of dd.parts) G.ph.setVel(q, dir * 3000 + BD.rand(-200, 200), -2300 + BD.rand(-300, 300));
            G.damage(90, p.x, p.y - 60, { src: 'train', cat: 'crazy' }); dd.react(1.4, p.x, p.y, 'crack'); dd.talk('big', true);
            BD.audio.play('crack'); BD.audio.play('boom', .8); BD.fx.shake(1.2); BD.fx.flash(.35, '#fff');
            BD.fx.stars(p.x, p.y, 10); BD.fx.text(p.x, p.y - 140, 'טרררראח!', BD.YEL, 90, 1.1, -50); BD.fx.slowmo(.4, .3); BD.fx.zoom(1.08, .35, p.x, p.y);
            break;
          } else { const [vx, vy] = G.ph.vel(p); G.ph.setVel(p, dir * Math.max(dir * vx, 2400) , Math.min(vy, -1300)); }
        }
        for (const en of G.ents) {
          if (en.dead || !(en.ball || en.box)) continue; const [cx, cy] = en.pos();
          if (cx > lo - 30 && cx < hi + 30 && cy > F - 330) { en.setVel(dir * 2600, -1100); if (en.hp !== Infinity) en.hp -= 4; }
        }
        if ((dir > 0 && rear > G.W + 120) || (dir < 0 && rear < -120)) { this.kill(); return false; }
      };
      e.draw = function (x) {
        const F = G.floor;
        if (this.t < 1.3) {
          // headlight from the wall and rails on the floor
          const wx = dir > 0 ? 0 : G.W, a = .4 + Math.sin(this.t * 20) * .2;
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * Math.min(1, this.t * 3);
          const g = x.createLinearGradient(wx, 0, wx + dir * 700, 0); g.addColorStop(0, 'rgba(255,245,190,.9)'); g.addColorStop(1, 'rgba(255,245,190,0)');
          x.fillStyle = g; x.beginPath(); x.moveTo(wx, F - 210); x.lineTo(wx + dir * 700, F - 420); x.lineTo(wx + dir * 700, F + 40); x.lineTo(wx, F - 150); x.closePath(); x.fill(); x.restore();
        }
        x.globalAlpha = .7; x.fillStyle = '#3a3a3a'; x.fillRect(0, F + 2, G.W, 6); x.fillStyle = '#6b4a2a'; for (let i = 0; i < G.W; i += 60) x.fillRect(i, F + 6, 30, 8); x.globalAlpha = 1;
        if (this.t < 1.3) return;
        x.save(); x.translate(this.front, F); x.scale(dir, 1);
        BD.W.train.drawTrain(x, this.rot, dir);
        x.restore();
      };
      G.add(e);
    },
    wheel(x, cx, r, rot) {
      A.circ(x, cx, -r, r, '#2b2b2b', 5); A.circ(x, cx, -r, r * .35, '#9aa5ad', 3);
      x.strokeStyle = '#9aa5ad'; x.lineWidth = 4; for (let i = 0; i < 3; i++) { const a = rot + i * Math.PI / 3; x.beginPath(); x.moveTo(cx - Math.cos(a) * r * .8, -r - Math.sin(a) * r * .8); x.lineTo(cx + Math.cos(a) * r * .8, -r + Math.sin(a) * r * .8); x.stroke(); }
    },
    drawTrain(x, rot, dir) {
      // wagons behind the engine
      for (let k = 0; k < 2; k++) {
        const x0 = -420 - 24 - k * 354 - 330;
        A.rect(x, x0, -280, 330, 200, '#2b2b33', 6, 5);
        x.fillStyle = BD.YEL; x.fillRect(x0 + 4, -150, 322, 14);
        for (let i = 0; i < 4; i++) A.rect(x, x0 + 22 + i * 78, -255, 56, 70, '#9ed3ef', 4, 4);
        x.save(); x.scale(dir, 1); x.fillStyle = BD.YEL; x.font = '700 34px Karantina, sans-serif'; x.textAlign = 'center'; x.fillText('הנשיא אקספרס', dir * (x0 + 165), -98); x.restore();
        this.wheel(x, x0 + 70, 36, rot); this.wheel(x, x0 + 260, 36, rot);
        x.fillStyle = '#141414'; x.fillRect(x0 + 330, -110, 24, 12);
      }
      // the engine
      A.rect(x, -420, -320, 130, 240, BD.RED, 6, 5);
      A.rect(x, -440, -340, 170, 26, '#141414', 4, 4);
      A.rect(x, -400, -290, 80, 70, '#9ed3ef', 4, 4);
      A.rect(x, -300, -250, 270, 140, BD.RED, 40, 5);
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(-290, -240, 250, 14);
      x.fillStyle = '#141414'; for (let i = 0; i < 3; i++) x.fillRect(-250 + i * 70, -250, 10, 140);
      A.rect(x, -120, -330, 40, 82, '#2b2b2b', 4, 4); A.rect(x, -130, -342, 60, 18, '#2b2b2b', 3, 4);
      A.rect(x, -40, -206, 30, 50, BD.YEL, 6, 4);
      x.globalCompositeOperation = 'lighter'; x.drawImage(BD.fx.glow('#fff3b0'), -80, -250, 140, 140); x.globalCompositeOperation = 'source-over';
      A.rect(x, -310, -110, 300, 30, '#141414', 3, 3);
      A.poly(x, [[-14, -110], [30, -14], [-60, -14], [-60, -110]], '#3b4148', 4);
      this.wheel(x, -360, 44, rot); this.wheel(x, -240, 54, rot); this.wheel(x, -110, 54, rot);
      x.strokeStyle = '#c7cfd6'; x.lineWidth = 8; x.beginPath(); x.moveTo(-240 + Math.cos(rot) * 30, -54 + Math.sin(rot) * 30); x.lineTo(-110 + Math.cos(rot) * 30, -54 + Math.sin(rot) * 30); x.stroke();
    },
    icon(x, s) { x.save(); const k = s / 470; x.scale(k, k); x.translate(220, 170); this.drawTrain(x, 0, 1); x.restore(); }
  });

  /* ---- giant robot ---- */
  const R1 = 125, R2 = 125;
  function knee(hx, hy, fx, fy) {
    let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy); const L = R1 + R2 - 2; if (d > L) { fx = hx + dx / d * L; fy = hy + dy / d * L; dx = fx - hx; dy = fy - hy; d = L; }
    const h = Math.sqrt(Math.max(0, R1 * R1 - (d / 2) * (d / 2))), mx = hx + dx / 2, my = hy + dy / 2;
    return [mx + (dy / d) * h, my - (dx / d) * h, fx, fy];
  }
  BD.weapon({
    id: 'robot', cat: 'crazy', name: 'רובוט ענק', price: 2000, power: 5, chaos: 4, big: true,
    desc: 'רובוט ענק צועד לחדר, כל צעד מרעיד את הרצפה. אגרוף בוכנה ולייזרים מהעיניים, ואז הוא הולך.', tip: 'אחרי האגרוף הבובה עפה. נצלו את זה',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.robot && !e.dead)) return;
      const d = dum(), ref = d ? d.j.chest.x : tx, dir = ref > G.W / 2 ? 1 : -1;
      const e = { z: 3, robot: true, t: 0, dir, face: dir, x: dir > 0 ? -260 : G.W + 260, phase: 0, step: 0, state: 'walk', st: 0, arm: 0, lp: null };
      e.kill = function () { if (this.lp) { this.lp.stop(); this.lp = null; } };
      e.update = function (dt) {
        this.t += dt; this.st += dt; const dd = dum(), F = G.floor;
        const goal = (dd ? dd.j.chest.x : tx) - this.face * 330;
        if (this.state === 'walk' || this.state === 'leave') {
          const sp = 300; this.x += this.face * sp * dt; this.phase += sp * dt / 75;
          const s = Math.floor(this.phase / Math.PI);
          if (s !== this.step) { this.step = s; BD.audio.play('stomp'); BD.fx.shake(.32); const fx = this.x + this.face * Math.sin(this.phase) * 60; BD.fx.smoke(fx, F, 5, G.arena.dust, 30, 30); for (const en of G.ents) if (en.grabbable && !en.dead) { const [cx] = en.pos(); if (Math.abs(cx - this.x) < 500) en.push(BD.rand(-100, 100), -500); } if (dd && dd.onGround()) { for (const p of dd.parts) G.ph.push(p, 0, -350); } }
          if (this.state === 'walk' && ((this.face > 0 && this.x >= goal) || (this.face < 0 && this.x <= goal) || this.st > 6)) { this.state = 'punch'; this.st = 0; BD.audio.play('servo'); }
          if (this.state === 'leave' && (this.x < -320 || this.x > G.W + 320)) { this.kill(); return false; }
        } else if (this.state === 'punch') {
          this.phase = BD.lerp(this.phase, Math.round(this.phase / Math.PI) * Math.PI, .2);
          this.arm = this.st < .15 ? 0 : this.st < .27 ? (this.st - .15) / .12 : this.st < .55 ? 1 : Math.max(0, 1 - (this.st - .55) / .3);
          // the piston aims at the dummy's height
          const ex = this.x + this.face * 130, ey = F - 360, ty = dd ? BD.clamp(dd.j.chest.y, F - 470, F - 30) : F - 330, tx2 = dd ? dd.j.chest.x : ex + this.face * 400;
          this.aim = BD.lerp(this.aim || 0, BD.clamp(Math.atan2(ty - ey, Math.max(120, Math.abs(tx2 - ex))), -.4, 1.1), .25);
          if (this.st >= .27 && !this.punched) {
            this.punched = 1;
            const L = 400, fx = ex + this.face * Math.cos(this.aim) * L, fy = ey + Math.sin(this.aim) * L;
            BD.audio.play('hit', 1); BD.audio.play('clang'); BD.fx.shake(.8); BD.fx.ring(fx, fy, 200, '#fff', .3, 12); BD.fx.lines(fx, fy, 12, this.face > 0 ? 0 : Math.PI);
            const k = G.hitArea(fx, fy, 170, 4200, { dmg: 60, src: 'robot', cat: 'crazy', vx: this.face * 2600, vy: -700, lift: .1, mark: 'crack' });
            if (k > 0) BD.fx.text(fx, fy - 120, 'בונג!', BD.YEL, 84, .9, -40);
          }
          if (this.st > .9) { this.state = 'laser'; this.st = 0; this.lp = BD.audio.loop('beam'); BD.audio.play('eyelaser'); }
        } else if (this.state === 'laser') {
          const hy = F - 560 + 30;
          const ex = this.x + this.face * 40;
          this.lt = dd ? [dd.j.chest.x, dd.j.chest.y] : [this.x + this.face * 600, F - 20];
          const [lx, ly] = this.lt;
          if (Math.random() < .7) { BD.fx.spark(lx, ly, 3, '#ff6b6b', 600); BD.fx.fire(lx, ly, 1, 80, .7); }
          G.light(lx, ly, 200, .6, .1);
          if (dd && G.gate('roboLaser', .12)) { G.damage(6, lx, ly, { src: 'robot', cat: 'crazy', comboGap: .3 }); dd.soot = Math.min(1, dd.soot + .06); G.ph.push(dd.j.chest, this.face * 500, -200); if (Math.random() < .3) dd.mark(lx, ly, 'soot'); dd.setMood('scream', .5); }
          if (this.st > 1.1) { if (dd) dd.ignite(1.5); this.kill(); this.state = 'leave'; this.face = -this.face; this.st = 0; }
          void hy; void ex;
        }
        if (this.t > 16) { this.kill(); return false; }
      };
      e.draw = function (x) {
        const F = G.floor;
        if (this.state === 'laser' && this.lt) {
          const [lx, ly] = this.lt, by = F - 560 + 6 - Math.abs(Math.sin(this.phase)) * 10;
          x.save(); x.globalCompositeOperation = 'lighter';
          for (const off of [-16, 16]) {
            const ex = this.x + this.face * (38 + off * .6), ey = by;
            for (const [w, c, a] of [[22, '#ff2a2a', .35], [10, '#ff6b6b', .7], [4, '#fff', 1]]) { x.globalAlpha = a; x.strokeStyle = c; x.lineWidth = w + Math.sin(this.t * 60) * 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(ex, ey); x.lineTo(lx + off * .3, ly); x.stroke(); }
          }
          x.globalAlpha = 1; x.drawImage(BD.fx.glow('#ff6b6b'), lx - 60, ly - 60, 120, 120); x.restore();
        }
        x.save(); x.translate(this.x, F); x.scale(this.face, 1);
        BD.W.robot.drawRobot(x, this.phase, this.arm, this.state === 'laser', this.t, this.aim || 0);
        x.restore();
      };
      G.add(e);
    },
    drawRobot(x, ph, arm, eyes, t, aim = 0) {
      const bob = -Math.abs(Math.sin(ph)) * 10, hipY = -250 + bob;
      const leg = (side, front) => {
        const p = ph + (side ? Math.PI : 0), fx = Math.sin(p) * 70, lift = Math.max(0, Math.cos(p)) * 34;
        const hx = side ? -26 : 26, [kx, ky, ffx, ffy] = knee(hx, hipY, fx, -12 - lift);
        const col = front ? '#7d8a96' : '#5e6a75';
        A.bar(x, hx, hipY, kx, ky, 40, col, null); A.bar(x, kx, ky, ffx, ffy, 34, col, null);
        A.circ(x, kx, ky, 22, '#3b4148', 4);
        A.rect(x, ffx - 44, ffy - 6, 96, 30, '#3b4148', 6, 4);
        x.fillStyle = BD.YEL; for (let i = 0; i < 4; i++) x.fillRect(ffx - 38 + i * 22, ffy + 14, 10, 6);
      };
      leg(1, false);
      // back arm
      A.bar(x, -60, hipY - 190, -90, hipY - 90 + Math.sin(ph) * 20, 34, '#5e6a75', null); A.circ(x, -92, hipY - 80 + Math.sin(ph) * 20, 30, '#3b4148', 4);
      // pelvis and torso
      A.rect(x, -70, hipY - 30, 140, 50, '#3b4148', 8, 5);
      A.rect(x, -110, hipY - 260, 220, 230, '#8795a1', 18, 6);
      x.fillStyle = '#6c7680'; x.fillRect(-100, hipY - 70, 200, 30);
      x.fillStyle = BD.YEL; for (let i = 0; i < 6; i++) { x.save(); x.beginPath(); x.rect(-100, hipY - 70, 200, 30); x.clip(); x.fillRect(-110 + i * 40, hipY - 70, 18, 30); x.restore(); }
      A.rect(x, -54, hipY - 220, 108, 90, '#2b2b33', 10, 5);
      A.circ(x, 0, hipY - 175, 26, '#ff4d4d', 4); x.fillStyle = '#ffd0d0'; x.beginPath(); x.arc(-7, hipY - 183, 7, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(-100, hipY - 250, 200, 10);
      for (const [rx, ry] of [[-96, -246], [96, -246], [-96, -44], [96, -44]]) A.circ(x, rx, hipY + ry, 5, '#c7cfd6', 2);
      // head
      A.rect(x, -28, hipY - 290, 56, 34, '#5e6a75', 4, 5);
      A.rect(x, -72, hipY - 380, 144, 96, '#8795a1', 16, 6);
      A.rect(x, -56, hipY - 356, 112, 40, '#141414', 8, 3);
      const eg = eyes ? '#ff3a3a' : '#ff8a8a';
      A.circ(x, 18, hipY - 336, 11, eg, 3); A.circ(x, 48, hipY - 336, 9, eg, 3);
      if (eyes) { x.globalCompositeOperation = 'lighter'; x.drawImage(BD.fx.glow('#ff4040'), -10, hipY - 380, 90, 90); x.globalCompositeOperation = 'source-over'; }
      x.strokeStyle = '#141414'; x.lineWidth = 5; x.beginPath(); x.moveTo(-30, hipY - 380); x.lineTo(-40, hipY - 425); x.stroke();
      A.circ(x, -40, hipY - 430, 10, Math.sin(t * 8) > 0 ? '#ff4d4d' : '#7a2020', 3);
      x.fillStyle = '#141414'; for (let i = 0; i < 5; i++) x.fillRect(-40 + i * 18, hipY - 304, 8, 10);
      leg(0, true);
      // the piston arm
      const sx = 70, sy = hipY - 200, ex = 130, ey = hipY - 110, ext = 40 + arm * 260;
      A.bar(x, sx, sy, ex, ey, 44, '#7d8a96', null); A.circ(x, sx, sy, 34, '#3b4148', 5); A.circ(x, ex, ey, 24, '#3b4148', 4);
      x.save(); x.translate(ex, ey); x.rotate(aim);
      A.rect(x, 0, -22, 60, 44, '#5e6a75', 6, 4);
      A.rect(x, 50, -12, ext, 24, '#c7cfd6', 4, 4);
      A.rect(x, 40 + ext, -46, 76, 92, BD.RED, 16, 6);
      x.fillStyle = '#141414'; for (let i = 0; i < 3; i++) x.fillRect(92 + ext, -36 + i * 26, 18, 14);
      x.restore();
    },
    icon(x, s, t = 0) { x.save(); const k = s / 400; x.scale(k, k); x.translate(-30, 250); this.drawRobot(x, t * 2, (Math.sin(t * 3) + 1) / 2 * .4, false, t); x.restore(); }
  });

  /* ---- the laser from space ---- */
  BD.weapon({
    id: 'spacelaser', cat: 'crazy', name: 'לייזר מהחלל', price: 3500, power: 5, chaos: 5, big: true,
    desc: 'לוויין נועל מטרה, התקרה זוהרת, ואז עמוד אור ענק יורד מהשמיים ושורף כל מה שמתחתיו. הסיום: פיצוץ.', tip: 'הכוונת עוקבת אחרי הבובה עד שהיא ננעלת',
    down(P) { this.go(P.x); }, fireAt(x) { this.go(x); },
    go(tx) {
      if (G.ents.some(e => e.slaser && !e.dead)) return;
      const e = { z: 2.8, slaser: true, t: 0, bx: BD.clamp(tx, 60, G.W - 60), lp: null };
      e.kill = function () { if (this.lp) { this.lp.stop(); this.lp = null; } };
      e.update = function (dt) {
        this.t += dt; const t = this.t, F = G.floor, d = dum();
        if (t < 1.1) {
          if (!this.c) { this.c = 1; BD.audio.play('charge', 1.1); BD.audio.play('siren'); }
          if (t < .8 && d && Math.abs(d.j.chest.x - this.bx) < 380) this.bx = BD.lerp(this.bx, d.j.chest.x, .12);
          this.ty = d && Math.abs(d.j.chest.x - this.bx) < 200 ? d.j.chest.y : F - 120;
          if (Math.random() < .7) BD.fx.glowAt(this.bx + BD.rand(-120, 120), BD.rand(20, 140), 18, '#bff4ff', .3);
          return;
        }
        if (!this.on) {
          this.on = 1; this.lp = BD.audio.loop('beam'); BD.audio.play('beamfire');
          BD.fx.slowmo(.5, .4); BD.fx.zoom(1.08, 1.3, this.bx, F - 220); BD.fx.flash(.5, '#e6fbff');
        }
        if (t < 2.6) {
          BD.fx.shake(.025); G.light(this.bx, F - 100, 600, 1, .1);
          if (this.lp) this.lp.set(1, 180 + Math.sin(t * 30) * 30);
          if (Math.random() < .8) { BD.fx.fire(this.bx + BD.rand(-60, 60), F - 10, 2, 300, 1.2); BD.fx.spark(this.bx, F - 8, 4, '#bff4ff', 1000); }
          if (Math.random() < .2) BD.fx.smoke(this.bx + BD.rand(-90, 90), F - 20, 1, '#333', 30, 160);
          if (G.gate('slaserScar', .25)) BD.fx.stain(this.bx + BD.rand(-40, 40), F - 2, BD.rand(40, 70), '#000', .35);
          if (d) for (const p of d.parts) {
            if (Math.abs(p.x - this.bx) > 100) continue;
            G.ph.push(p, (p.x - this.bx) * 2 + BD.rand(-150, 150), 260);
            if (G.gate('slaser', .1)) { G.damage(9, p.x, p.y, { src: 'spacelaser', cat: 'crazy', comboGap: .3 }); d.soot = Math.min(1, d.soot + .06); d.ignite(2); d.setMood('scream', .5); if (Math.random() < .3) d.mark(p.x, p.y, 'soot'); }
            break;
          }
          for (const en of G.ents) { if (en.dead || !(en.ball || en.box)) continue; const [cx] = en.pos(); if (Math.abs(cx - this.bx) < 100) { en.push(0, 120); if (en.hp !== Infinity) en.hp -= dt * 3; } }
          return;
        }
        if (!this.boom) {
          this.boom = 1; this.kill();
          G.explode(this.bx, F - 40, 230, { src: 'spacelaser', cat: 'crazy', dmg: 120 });
          BD.fx.flash(.8, '#fff'); BD.fx.stain(this.bx, F - 2, 160, '#000', .45); BD.fx.text(this.bx, F - 340, 'זזזאאפ!', '#bff4ff', 96, 1.2, -40);
        }
        if (t > 3.2) return false;
      };
      e.draw = function (x) {
        const t = this.t, F = G.floor, bx = this.bx;
        if (t < 1.1) {
          const k = t / 1.1, R = BD.lerp(140, 46, k), ty = this.ty || F - 120, lock = t > .8;
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .3 + k * .5; x.drawImage(BD.fx.glow('#9fe8ff'), bx - 160 * k - 40, -120, (160 * k + 40) * 2, 260); x.restore();
          x.strokeStyle = lock ? BD.RED : '#ff6b6b'; x.globalAlpha = .5; x.lineWidth = 2; x.setLineDash([10, 10]); x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx, ty - R); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
          x.save(); x.translate(bx, ty); x.rotate(t * (lock ? 0 : 3));
          x.lineWidth = 5; x.strokeStyle = lock ? BD.RED : '#ff6b6b';
          for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(0, 0, R, i * Math.PI / 2 + .25, (i + 1) * Math.PI / 2 - .25); x.stroke(); }
          x.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.moveTo(Math.cos(a) * (R + 22), Math.sin(a) * (R + 22)); x.lineTo(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12)); } x.stroke();
          x.restore();
          if (lock && Math.floor(t * 12) % 2) { x.fillStyle = BD.RED; x.font = '700 34px Karantina, sans-serif'; x.textAlign = 'center'; x.fillText('נעול', bx, ty - R - 20); }
          return;
        }
        if (t >= 2.6) return;
        const k = Math.min(1, (t - 1.1) * 6) * Math.min(1, (2.6 - t) * 5), wob = 1 + Math.sin(t * 50) * .06;
        x.save(); x.globalCompositeOperation = 'lighter';
        for (const [w, c, a] of [[260, '#3fb6ff', .22], [150, '#8fe3ff', .45], [80, '#dff7ff', .8], [34, '#ffffff', 1]]) { x.globalAlpha = a * k; x.fillStyle = c; x.fillRect(bx - w * wob * k / 2, 0, w * wob * k, F); }
        x.globalAlpha = .55 * k; x.strokeStyle = '#ffffff'; x.lineWidth = 4;
        for (let i = 0; i < 4; i++) { const yy = ((t * 1100) + i * F / 4) % F; x.beginPath(); x.ellipse(bx, yy, 150 * k, 18, 0, 0, TAU); x.stroke(); }
        x.globalAlpha = k; x.drawImage(BD.fx.glow('#bff4ff'), bx - 260, F - 200, 520, 300); x.drawImage(BD.fx.glow('#ffffff'), bx - 120, -100, 240, 200);
        x.restore();
      };
      G.add(e);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 160; x.scale(k, k);
      x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(120,220,255,.55)'; x.fillRect(-14, -10, 28, 90); x.fillStyle = '#fff'; x.fillRect(-5, -10, 10, 90); x.globalCompositeOperation = 'source-over';
      x.save(); x.translate(0, -40); x.rotate(Math.sin(t * 2) * .1);
      A.rect(x, -84, -16, 52, 30, '#2a6fdb', 2, 4); A.rect(x, 32, -16, 52, 30, '#2a6fdb', 2, 4);
      x.strokeStyle = '#9fd0ff'; x.lineWidth = 2; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(-84 + i * 13, -16); x.lineTo(-84 + i * 13, 14); x.moveTo(32 + i * 13, -16); x.lineTo(32 + i * 13, 14); x.stroke(); }
      A.rect(x, -32, -26, 64, 46, '#c7cfd6', 8, 4);
      A.circ(x, 0, 24, 14, BD.RED, 4);
      x.restore(); x.restore();
    }
  });

  /* WEAPONS-CRAZY-CONTINUE */
})();
