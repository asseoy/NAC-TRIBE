/* Explosives: grenade, dynamite, TNT, C4, rockets, missile barrage, landmine,
   fireworks, giant cartoon bomb and the nuke. */
'use strict';
(() => {
  const G = BD.G, A = BD.art;

  /* a thrown explosive with a fuse: shared by grenade, dynamite, TNT and the cartoon bomb */
  const fused = d => BD.mkThrow(Object.assign({
    fuse: 2, R: 110, beepy: false,
    spawn(x, y) {
      const w = this;
      const e = BD.body({ shape: this.shape || 'ball', x, y, r: this.r, w: this.bw, h: this.bh, mass: this.mass, rest: this.rest ?? .4, fr: .6, grabbable: true, shootable: true, snd: this.snd || 'thud', z: 1.5,
        update(dt) {
          if (this.held) return;
          this.fuse -= dt;
          const [cx, cy] = this.pos(), [fx, fy] = this.fusePt ? this.fusePt() : [cx, cy - w.r];
          BD.fuseFx(fx, fy); if (G.gate('fz' + this.id, .25)) BD.audio.play('fuse');
          if (w.beepy && this.fuse < 1.2 && G.gate('bp' + this.id, .12 + this.fuse * .15)) BD.audio.play('beep');
          if (this.fuse <= 0) { w.blow(this); return false; }
        },
        draw(c, r) { w.drawIt(c, r, G.rt, this.fuse); },
        shot() { this.fuse = Math.min(this.fuse, .05); } });
      e.fuse = this.fuse; e.id = Math.random();
      e.fusePt = function () { const [cx, cy] = this.pos(), a = this.ang(); const o = w.fuseOff ?? w.r * 1.3; return [cx + Math.sin(a) * o, cy - Math.cos(a) * o]; };
      return e;
    },
    blow(e) { const [x, y] = e.pos(); G.explode(x, y, this.R, { src: this.id, cat: 'boom', dmg: this.dmg || this.R * .5 }); if (this.after) this.after(x, y); }
  }, d));

  fused({
    id: 'grenade', name: 'רימון', price: 0, power: 3, chaos: 3, r: 17, mass: 1.2, fuse: 2.2, R: 105,
    desc: 'שולפים את הנצרה וזורקים. מתפוצץ אחרי שתי שניות.', tip: 'אפשר לגרור ולזרוק אותו כמו כדור',
    drawIt(x, r, t, fuse) {
      A.rect(x, -r * .45, -r * 1.35, r * .9, r * .5, '#6b737a', 2, 3);
      x.strokeStyle = '#141414'; x.lineWidth = 3; x.beginPath(); x.arc(r * .55, -r * 1.15, r * .3, 0, BD.TAU); x.stroke();
      A.poly(x, [[-r * .35, -r * 1.1], [r * .9, -r * 1.25], [r * .7, -r * .6]], '#8a949c', 3);
      x.beginPath(); x.ellipse(0, 0, r, r * 1.1, 0, 0, BD.TAU); x.fillStyle = '#4f6b2f'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(-r, i * r * .45); x.lineTo(r, i * r * .45); x.stroke(); x.beginPath(); x.moveTo(i * r * .45, -r * 1.05); x.lineTo(i * r * .45, r * 1.05); x.stroke(); }
      A.shine(x, 0, 0, r);
      if (fuse != null && fuse < .8 && Math.sin(t * 40) > 0) { x.fillStyle = 'rgba(255,60,40,.5)'; x.beginPath(); x.ellipse(0, 0, r, r * 1.1, 0, 0, BD.TAU); x.fill(); }
    }
  });

  /* ---------- sounds only explosives use ---------- */
  BD.audio.def('whistle', ({ tone }, d = .9) => { tone('sine', 2300, 520, d, .11); tone('sine', 2320, 530, d, .05); });
  BD.audio.def('crackle', ({ noise, rand }) => { for (let i = 0; i < 14; i++) noise(.03, .35, 6000, 3000, 1, 'highpass', .25 + rand(0, .7)); });
  BD.audio.def('launch', ({ tone, noise }) => { noise(.55, .45, 400, 3200, 1.2, 'bandpass'); tone('sawtooth', 140, 60, .4, .12); });
  BD.audio.def('arm', ({ tone }) => { tone('square', 1200, 1200, .03, .08); tone('square', 1800, 1800, .04, .08, .07); });
  BD.audio.def('stick', ({ tone, noise }) => { noise(.08, .4, 900, 300, 1); tone('sine', 220, 120, .08, .2); });
  const mix = (a, b, k) => { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A1 = p(a), B1 = p(b); return '#' + A1.map((v, i) => Math.round(v + (B1[i] - v) * BD.clamp(k, 0, 1)).toString(16).padStart(2, '0')).join(''); };

  /* a missile body, pointing along +x: shared by rockets, the barrage and the space bomb fins */
  function drawMissile(x, s, col = '#e8e2d4') {
    x.save(); x.scale(s, s);
    A.poly(x, [[-30, -9], [-44, -22], [-38, 0], [-44, 22], [-30, 9]], BD.RED, 3);
    A.rect(x, -36, -10, 56, 20, col, 6, 3.5);
    x.fillStyle = BD.RED; x.fillRect(-6, -9, 7, 18);
    A.poly(x, [[18, -10], [40, 0], [18, 10]], BD.RED, 3.5);
    x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(-30, -6, 44, 3);
    x.restore();
  }
  /* a small flame + smoke behind something flying */
  function exhaust(px, py, a, big = 1) {
    const bx = px - Math.cos(a) * 40 * big, by = py - Math.sin(a) * 40 * big;
    BD.fx.fire(bx, by, 1, 60, .55 * big);
    if (Math.random() < .55) BD.fx.smoke(bx, by, 1, '#cfc8bd', 12 * big, 20);
    BD.fx.glowAt(bx, by, 26 * big, '#ffb000', .05); G.light(bx, by, 180, .6, .06);
  }

  /* ---------- dynamite ---------- */
  fused({
    id: 'dynamite', name: 'דינמיט', price: 100, power: 3, chaos: 3, r: 20, mass: 1.6, fuse: 2.8, R: 145, dmg: 75, fuseOff: 34, rest: .3,
    desc: 'חבילה של שלושה מקלות עם פתיל ארוך. יותר בום מרימון.', tip: 'זרקו לו בין הרגליים ותברחו',
    drawIt(x, r, t, fuse) {
      const w = r * .62, h = r * 2.1;
      for (const [dx, rot] of [[-w * .95, -.12], [w * .95, .12], [0, 0]]) {
        x.save(); x.translate(dx, 0); x.rotate(rot);
        A.rect(x, -w / 2, -h / 2, w, h, '#d3202a', 5, 3.5);
        x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(-w / 2 + 3, -h / 2 + 5, 3, h - 10);
        x.fillStyle = '#f0e2c0'; x.beginPath(); x.ellipse(0, -h / 2 + 1, w / 2 - 2, 3, 0, 0, BD.TAU); x.fill();
        x.restore();
      }
      x.fillStyle = '#141414'; x.fillRect(-w * 1.6, -h * .2, w * 3.2, 7); x.fillRect(-w * 1.6, h * .18, w * 3.2, 7);
      A.fuse(x, 0, -h / 2, r * .7, t, fuse != null);
      if (fuse != null && fuse < .7 && Math.sin(t * 40) > 0) { x.globalAlpha = .4; x.fillStyle = '#fff'; x.fillRect(-w * 1.5, -h / 2, w * 3, h); x.globalAlpha = 1; }
    },
    after(x, y) { BD.fx.debris(x, y, 8, ['#d3202a', '#f0e2c0'], 900, 9); }
  });

  /* ---------- TNT crate ---------- */
  fused({
    id: 'tnt', name: 'TNT', price: 250, power: 4, chaos: 4, shape: 'box', r: 84, bw: 84, bh: 72, mass: 4, fuse: 3.2, R: 205, dmg: 120, fuseOff: 50, max: 3, rest: .15, snd: 'thud',
    desc: 'ארגז עץ מלא TNT עם פתיל. רדיוס פיצוץ ענקי וקרשים עפים לכל עבר.', tip: 'שימו אותו ליד החבית האדומה בשביל תגובת שרשרת',
    drawIt(x, w, t, fuse) {
      const h = w * .86;
      A.rect(x, -w / 2, -h / 2, w, h, '#b77a3e', 3, 5);
      x.fillStyle = '#9a6430'; for (let i = 0; i < 3; i++) x.fillRect(-w / 2 + 3, -h / 2 + 4 + i * (h - 8) / 3, w - 6, 3);
      x.fillStyle = '#141414'; x.fillRect(-w / 2, -h / 2 + 8, w, 5); x.fillRect(-w / 2, h / 2 - 13, w, 5);
      A.rect(x, -w * .38, -h * .2, w * .76, h * .42, '#f0e2c0', 2, 3);
      x.fillStyle = BD.RED; x.font = `700 ${w * .42}px Karantina, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('TNT', 0, h * .03);
      A.fuse(x, 0, -h / 2, w * .32, t, fuse != null);
      if (fuse != null && fuse < 1 && Math.sin(t * (fuse < .4 ? 60 : 30)) > 0) { x.globalAlpha = .35; x.fillStyle = '#ff3d00'; x.fillRect(-w / 2, -h / 2, w, h); x.globalAlpha = 1; }
    },
    after(x, y) { BD.fx.debris(x, y, 22, ['#b77a3e', '#9a6430', '#c98c4c', '#f0e2c0'], 1400, 18); BD.fx.text(x, y - 160, 'בוווום!', BD.YEL, 96, 1.1, -40); },
    icon(x, s, t = 0) { x.save(); const k = s / 100; x.scale(k, k); x.rotate(Math.sin(t * 2) * .05); this.drawIt(x, 84, t, null); x.restore(); }
  });

  /* ---------- the giant cartoon bomb ---------- */
  fused({
    id: 'bomb', name: 'פצצה מצוירת', price: 800, power: 5, chaos: 4, big: true, r: 46, mass: 6, fuse: 3.6, R: 205, dmg: 130, fuseOff: 56, rest: .55, max: 2, snd: 'thud',
    desc: 'פצצה שחורה ועגולה כמו בסרטים מצוירים. נופלת מהתקרה, קופצת, מתנפחת, מהבהבת באדום ו... בום.', tip: 'כשהיא מתחילה להתנפח, כבר מאוחר מדי',
    spawnAt(x) { const e = this.spawn(BD.clamp(x, 80, G.W - 80), 60); e.wid = this.id; G.ph.setVel(e.ball, BD.rand(-200, 200), 300); BD.audio.play('whoosh'); return e; },
    down(P) {
      if (G.ents.filter(e => e.wid === this.id && !e.dead).length >= this.max) { BD.audio.play('deny'); return; }
      this.spawnAt(P.x);
    },
    draw(x, P) {
      if (!P.over || (P.touch && !P.down)) return;
      x.strokeStyle = BD.RED; x.lineWidth = 3; x.setLineDash([12, 10]); x.beginPath(); x.moveTo(P.x, 0); x.lineTo(P.x, G.floor); x.stroke(); x.setLineDash([]);
      x.globalAlpha = .5; x.save(); x.translate(P.x, 70); this.drawIt(x, this.r * .7, G.rt); x.restore(); x.globalAlpha = 1;
    },
    up() {}, fireAt(x) { if (G.ents.filter(e => e.wid === this.id && !e.dead).length < this.max) this.spawnAt(x); },
    drawIt(x, r, t, fuse) {
      const sw = fuse != null && fuse < 1.2 ? 1 + (1.2 - fuse) * .28 + Math.sin(t * 30) * .03 : 1;
      x.save(); x.scale(sw, sw);
      A.rect(x, -r * .32, -r * 1.12, r * .64, r * .3, '#3a3a3a', 3, 4);
      A.circ(x, 0, 0, r, '#1f1f24', 5);
      x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.ellipse(-r * .38, -r * .42, r * .3, r * .17, -.7, 0, BD.TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(r * .3, r * .3, r * .4, 0, BD.TAU); x.fill();
      if (fuse != null && fuse < 1.6 && Math.sin(t * (fuse < .6 ? 50 : 22)) > 0) { x.globalAlpha = .55; A.circ(x, 0, 0, r, '#ff2a1a', 0); x.globalAlpha = 1; }
      A.fuse(x, 0, -r * 1.05, r * .55, t, fuse != null);
      x.restore();
    },
    after(x, y) { BD.fx.text(x, y - 180, 'קאבוּם!', BD.YEL, 110, 1.2, -40); BD.fx.confetti(x, y, 20); BD.fx.zoom(1.1, .4, x, y); }
  });

  /* ---------- landmine ---------- */
  BD.weapon({
    id: 'mine', cat: 'boom', name: 'מוקש', price: 180, power: 3, chaos: 2,
    desc: 'מניחים על הרצפה, הוא נדרך תוך שנייה, וכשהבובה עולה עליו היא טסה ישר למעלה.', tip: 'זרקו את הבובה על המוקש עם היד',
    down(P) { this.place(P.x); }, fireAt(x) { this.place(x); },
    place(x0) {
      if (G.ents.filter(e => e.wid === 'mine' && !e.dead).length >= 4) { BD.audio.play('deny'); return; }
      const x = BD.clamp(x0, 40, G.W - 40), w = this;
      G.add({ wid: 'mine', z: .8, x, y: G.floor - 120, t: 0, armed: false,
        update(dt) {
          this.t += dt; this.y = Math.min(G.floor, this.y + dt * 1200);
          if (!this.armed && this.t > .6) { this.armed = true; BD.audio.play('arm'); }
          if (!this.armed) return;
          const d = G.dummy; if (!d || d.gone) return;
          for (const p of d.parts) if (Math.abs(p.x - this.x) < p.r + 40 && p.y > G.floor - 60 - p.r) { this.boom(); return false; }
        },
        boom() {
          G.explode(this.x, G.floor - 14, 115, { src: 'mine', cat: 'boom', dmg: 65 });
          const d = G.dummy; if (d && !d.gone) for (const q of d.parts) { const [vx] = G.ph.vel(q); G.ph.setVel(q, vx * .2 + BD.clamp(q.x - this.x, -150, 150) * .6, -3300 - Math.random() * 500); }
          BD.fx.debris(this.x, G.floor, 14, G.arena.chips, 1000, 9); BD.fx.lines(this.x, G.floor - 40, 10, -Math.PI / 2, '#fff');
          d && d.talk('fly', true);
        },
        draw(x) { x.save(); x.translate(this.x, this.y); w.drawIt(x, G.rt, this.armed); x.restore(); }
      });
      BD.audio.play('stick');
    },
    drawIt(x, t, armed) {
      x.beginPath(); x.ellipse(0, -2, 44, 10, 0, 0, BD.TAU); x.fillStyle = '#2d3426'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      x.beginPath(); x.moveTo(-38, -4); x.quadraticCurveTo(0, -36, 38, -4); x.closePath(); x.fillStyle = '#56633f'; x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.ellipse(-12, -18, 12, 4, -.3, 0, BD.TAU); x.fill();
      A.rect(x, -9, -30, 18, 8, '#8a949c', 2, 3);
      const on = armed && Math.sin(t * 10) > 0;
      A.circ(x, 22, -14, 4.5, armed ? (on ? '#ff3020' : '#5a1010') : '#40d040', 2);
    },
    icon(x, s, t = 0) { x.save(); const k = s / 100; x.scale(k, k); x.translate(0, 14); this.drawIt(x, t, true); x.restore(); }
  });

  /* ---------- firework: tape it to him and watch him fly ---------- */
  const FWC = ['#ff4d6d', '#ffd54a', '#4dd0e1', '#7cff6b', '#b388ff', '#ff9a3d', '#ffffff'];
  BD.weapon({
    id: 'firework', cat: 'boom', name: 'זיקוק', price: 300, power: 3, chaos: 5,
    desc: 'לוחצים על חלק בגוף והזיקוק נדבק אליו, נדלק וגורר את הבובה בספירלות בכל החדר עד שהוא מתפוצץ בצבעים.', tip: 'לחיצה על המקום הריק משגרת זיקוק מהרצפה',
    down(P) { this.go(P.x, P.y, 42); }, fireAt(x, y) { this.go(x, y, 400); },
    go(x, y, reach) {
      if (G.ents.filter(e => e.wid === 'firework' && !e.dead).length >= 4) { BD.audio.play('deny'); return; }
      const p = G.part(x, y, reach), w = this;
      const e = G.add({ wid: 'firework', z: 2, t: 0, dur: BD.rand(1.9, 2.4), x: p ? p.x : x, y: p ? p.y : G.floor - 20, a: -Math.PI / 2 + BD.rand(-.15, .15), spin: Math.random() < .5 ? 1 : -1, part: p, free: !p, col: BD.pick(FWC),
        sub(dt) {
          const q = this.part; if (!q) return;
          if (!q.alive) { this.part = null; this.free = true; return; }
          const d = q.dummy, cx = Math.cos(this.a), cy = Math.sin(this.a);
          for (const o of d.parts) G.ph.push(o, cx * 2900 * dt, cy * 2900 * dt);
          G.ph.push(q, cx * 7000 * dt, cy * 7000 * dt);
        },
        update(dt) {
          this.t += dt;
          if (this.part) {
            this.x = this.part.x; this.y = this.part.y;
            this.a += this.spin * (2.4 + Math.sin(this.t * 4) * 2.2) * dt;
            if (G.gate('fwdmg', .3)) G.damage(3, this.x, this.y, { src: 'firework', cat: 'boom', comboGap: .3 });
          } else {
            this.a += Math.sin(this.t * 18) * 3 * dt;
            const v = 1300 + this.t * 600; this.x += Math.cos(this.a) * v * dt; this.y += Math.sin(this.a) * v * dt;
            const hit = G.part(this.x, this.y, 6); if (hit && this.t > .05) { this.part = hit; this.free = false; this.dur = Math.max(this.dur, this.t + 1.4); BD.audio.play('stick'); hit.dummy.talk('fly', true); }
            if (this.y < 50 || this.x < 20 || this.x > G.W - 20) this.dur = Math.min(this.dur, this.t);
          }
          exhaust(this.x, this.y, this.a, .8);
          if (Math.random() < .6) BD.fx.spark(this.x - Math.cos(this.a) * 30, this.y - Math.sin(this.a) * 30, 2, BD.pick(FWC), 300);
          if (G.gate('fwf', .18)) BD.audio.play('fuse');
          if (this.t >= this.dur) { w.burst(this.x, this.y, this.col); return false; }
        },
        draw(x) { x.save(); x.translate(this.x, this.y); x.rotate(this.a); w.drawIt(x, G.rt, true); x.restore(); }
      });
      if (p) { p.dummy.talk('scared', true); p.dummy.setMood('scared', 2); }
      BD.audio.play('launch');
    },
    burst(x, y, col) {
      G.explode(x, y, 80, { src: 'firework', cat: 'boom', dmg: 45, col, fire: false });
      const cols = [col, BD.pick(FWC), '#fff'];
      cols.forEach((c, i) => BD.fx.spark(x, y, 34 - i * 8, c, 900 + i * 350));
      BD.fx.glowAt(x, y, 360, col, .5); BD.fx.ring(x, y, 260, col, .7, 8); BD.fx.ring(x, y, 170, '#fff', .5, 5);
      G.light(x, y, 900, 1, .8);
      for (let i = 0; i < 10; i++) G.later(.25 + Math.random() * .6, () => { const a = Math.random() * BD.TAU, r = BD.rand(80, 240); BD.fx.glowAt(x + Math.cos(a) * r, y + Math.sin(a) * r, 34, BD.pick(FWC), .2); BD.fx.spark(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, '#fff', 200); });
      BD.audio.play('crackle');
    },
    drawIt(x, t, lit) {
      A.bar(x, -70, 0, -26, 0, 4, '#c98c4c', null);
      A.rect(x, -30, -11, 50, 22, BD.RED, 3, 3.5);
      x.fillStyle = BD.YEL; x.fillRect(-20, -9, 6, 18); x.fillRect(-4, -9, 6, 18);
      A.poly(x, [[20, -12], [42, 0], [20, 12]], BD.YEL, 3.5);
      if (!lit) A.fuse(x, -30, 4, 12, t, false);
    },
    icon(x, s, t = 0) { x.save(); const k = s / 120; x.scale(k, k); x.rotate(-.8 + Math.sin(t * 3) * .1); x.translate(14, 0); this.drawIt(x, t, false); x.restore(); }
  });

  /* ---------- C4: stick charges on him, then press the button ---------- */
  const C4L = [];
  const c4emit = () => G.emit('c4', C4L.length);
  BD.weapon({
    id: 'c4', cat: 'boom', name: 'C4', price: 400, power: 4, chaos: 3,
    desc: 'מדביקים עד חמישה מטענים על הגוף ואז לוחצים על "פוצץ". הם מתפוצצים בשרשרת. אחרי 8 שניות הם מתפוצצים לבד.', tip: 'מטען על כל יד ורגל = ריקוד',
    down(P) { this.stick(P.x, P.y, 120); },
    fireAt(x, y) { const c = this.stick(x, y, 1e9); if (c) c.life = c.t + 1.3; },
    stick(x, y, reach) {
      const d = G.dummy; if (!d || d.gone || C4L.length >= 5) { BD.audio.play('deny'); return null; }
      const [p, dist] = d.nearest(x, y); if (!p || dist > reach) { BD.audio.play('deny'); return null; }
      const w = this, ang = Math.atan2(y - p.y, x - p.x) || -Math.PI / 2;
      const c = G.add({ c4: true, z: 2, p, ang, t: 0, life: 8, id: Math.random(), lx: p.x, ly: p.y,
        pos() { return [this.p.x + Math.cos(this.ang) * this.p.r * .8, this.p.y + Math.sin(this.ang) * this.p.r * .8]; },
        update(dt) {
          this.t += dt;
          if (!this.p.alive) { this.drop(); BD.fx.smoke(this.lx, this.ly, 3, '#888', 16, 30); return false; }
          [this.lx, this.ly] = this.pos();
          const left = this.life - this.t;
          if (G.gate('c4b' + this.id, left < 2 ? .25 : .8)) BD.audio.play('beep');
          if (left <= 0) { this.drop(); w.blowOne(this.lx, this.ly); return false; }
        },
        drop() { const i = C4L.indexOf(this); if (i >= 0) { C4L.splice(i, 1); c4emit(); } },
        kill() { this.drop(); },
        draw(x) {
          x.save(); x.translate(this.lx, this.ly); x.rotate(this.ang + Math.PI / 2);
          w.drawIt(x, G.rt * (this.life - this.t < 2 ? 3 : 1));
          x.restore();
        }
      });
      C4L.push(c); c4emit(); BD.audio.play('stick'); d.setMood('scared', 1); if (C4L.length === 3) d.talk('scared', true);
      return c;
    },
    blowOne(x, y) { G.explode(x, y, 92, { src: 'c4', cat: 'boom', dmg: 55 }); BD.fx.debris(x, y, 5, ['#d9cfa3', '#141414'], 700, 6); },
    detonate() {
      const L = C4L.slice(); C4L.length = 0; c4emit();
      if (!L.length) return;
      BD.audio.play('beep'); BD.audio.play('arm');
      L.forEach((c, i) => {
        c.dead = true;
        G.later(.15 + i * .13, () => { const [x, y] = c.p.alive ? c.pos() : [c.lx, c.ly]; this.blowOne(x, y); if (i === L.length - 1 && L.length >= 3) BD.fx.text(x, y - 150, 'שרשרת!', BD.YEL, 80, 1, -40); });
      });
    },
    leave() {},
    drawIt(x, t) {
      A.rect(x, -18, -11, 36, 22, '#d9cfa3', 3, 3);
      x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(-14, 2, 28, 5);
      x.fillStyle = '#141414'; x.fillRect(-4, -11, 8, 22);
      x.strokeStyle = '#d3202a'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-10, -11); x.quadraticCurveTo(-14, -22, 0, -18); x.stroke();
      x.strokeStyle = '#2a6fdb'; x.beginPath(); x.moveTo(10, -11); x.quadraticCurveTo(14, -22, 0, -18); x.stroke();
      A.rect(x, -6, -21, 12, 7, '#2b2b2b', 2, 2);
      const on = Math.sin(t * 9) > 0; x.fillStyle = on ? '#ff2a1a' : '#5a1010'; x.beginPath(); x.arc(0, -17.5, 2.6, 0, BD.TAU); x.fill();
      if (on) { x.globalAlpha = .5; x.fillStyle = '#ff6a50'; x.beginPath(); x.arc(0, -17.5, 6, 0, BD.TAU); x.fill(); x.globalAlpha = 1; }
    },
    icon(x, s, t = 0) { x.save(); const k = s / 50; x.scale(k, k); x.translate(0, 4); this.drawIt(x, t + 1); x.restore(); }
  });

  /* ---------- rocket from the side of the room ---------- */
  BD.weapon({
    id: 'rocket', cat: 'boom', name: 'רקטה', price: 500, power: 4, chaos: 3,
    desc: 'רקטה נכנסת מצד החדר ושועטת למקום שלחצתם, עם עשן ולהבה. מתפוצצת במגע.', tip: 'זרקו אותו לאוויר ואז רקטה = תקיפה אווירית',
    down(P) { this.fire(P.x, P.y); }, fireAt(x, y) { this.fire(x, y); },
    fire(tx, ty) {
      if (G.ents.filter(e => e.wid === 'rocket' && !e.dead).length >= 6) { BD.audio.play('deny'); return; }
      const side = tx < G.W / 2 ? -1 : 1, x0 = side < 0 ? G.W + 30 : -30;
      const top = Math.random() < .35, sx = top ? (side < 0 ? G.W - 60 : 60) : x0, sy = top ? -30 : BD.clamp(ty - BD.rand(120, 260), 60, G.floor - 100);
      const a = Math.atan2(ty - sy, tx - sx), sp = 1300;
      BD.proj({ wid: 'rocket', x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 10, life: 3, fromEdge: true, passTop: true, tx, ty,
        steer(dt) {
          const cur = Math.atan2(this.vy, this.vx), want = Math.atan2(this.ty - this.y, this.tx - this.x);
          let da = want - cur; while (da > Math.PI) da -= BD.TAU; while (da < -Math.PI) da += BD.TAU;
          const na = cur + BD.clamp(da, -2.5 * dt, 2.5 * dt) + Math.sin(this.age * 26) * 1.4 * dt, s = Math.min(2400, Math.hypot(this.vx, this.vy) + 1500 * dt);
          this.vx = Math.cos(na) * s; this.vy = Math.sin(na) * s;
        },
        trail() { exhaust(this.x, this.y, Math.atan2(this.vy, this.vx), 1); },
        onHit(h) { G.explode(h.x, h.y, 120, { src: 'rocket', cat: 'boom', dmg: 65 }); if (h.surface) BD.scar(h.x, h.y, 'scorch'); },
        onExpire() { G.explode(this.x, this.y, 110, { src: 'rocket', cat: 'boom', dmg: 50 }); },
        draw(x) { x.save(); x.translate(this.x, this.y); x.rotate(Math.atan2(this.vy, this.vx)); drawMissile(x, 1.15); x.restore(); }
      });
      BD.audio.play('launch');
    },
    icon(x, s, t = 0) { x.save(); const k = s / 90; x.scale(k, k); x.rotate(-.6); drawMissile(x, 1); x.fillStyle = '#ffb000'; x.beginPath(); x.moveTo(-44, -6); x.lineTo(-62 - Math.sin(t * 30) * 6, 0); x.lineTo(-44, 6); x.fill(); x.restore(); }
  });

  /* ---------- missile barrage from the sky ---------- */
  BD.weapon({
    id: 'barrage', cat: 'boom', name: 'מטח טילים', price: 1400, power: 5, chaos: 5, big: true,
    desc: 'שמונה טילים נופלים מהשמיים אחד אחרי השני סביב המטרה. קודם רואים את הכוונות, אחר כך שומעים את השריקה.', tip: 'בכבידה נמוכה הוא ריחף בין הפיצוצים',
    down(P) { this.call(P.x, P.y); }, fireAt(x, y) { this.call(x, y); },
    call(tx, ty) {
      if (!G.gate('barrage', 2.2)) { BD.audio.play('deny'); return; }
      const T = [];
      for (let i = 0; i < 8; i++) T.push({ x: BD.clamp(tx + BD.rand(-260, 260), 50, G.W - 50), y: G.floor - 4, t: -i * .18, hit: false });
      T.sort(() => Math.random() - .5); T.forEach((p, i) => p.t = -i * .17);
      T[0].x = BD.clamp(tx, 50, G.W - 50);
      G.add({ z: .9, t: 0, T,
        update(dt) {
          this.t += dt;
          for (const p of this.T) {
            if (!p.sent && this.t > .7 + -p.t) {
              p.sent = true;
              const sx = p.x + BD.rand(-160, 160), sy = -60, a = Math.atan2(p.y - sy, p.x - sx);
              BD.audio.play('whistle', .6);
              BD.proj({ x: sx, y: sy, vx: Math.cos(a) * 2100, vy: Math.sin(a) * 2100, r: 9, life: 2, passTop: true,
                trail() { exhaust(this.x, this.y, Math.atan2(this.vy, this.vx), .8); },
                onHit(h) { p.hit = true; G.explode(h.x, h.y, 95, { src: 'barrage', cat: 'boom', dmg: 45 }); if (h.surface === 'floor') BD.scar(h.x, G.floor, 'scorch'); },
                onExpire() { p.hit = true; },
                draw(x) { x.save(); x.translate(this.x, this.y); x.rotate(Math.atan2(this.vy, this.vx)); drawMissile(x, .9, '#7d8a6a'); x.restore(); } });
            }
          }
          return !(this.T.every(p => p.hit) || this.t > 5);
        },
        draw(x) {
          for (const p of this.T) {
            if (p.hit) continue;
            const k = BD.clamp((this.t + p.t + .4) / .4, 0, 1); if (k <= 0) continue;
            const pul = 1 + Math.sin(G.rt * 14) * .08, R = 38 * (2 - k) * pul;
            x.globalAlpha = .9 * k; x.strokeStyle = BD.RED; x.lineWidth = 4;
            x.beginPath(); x.ellipse(p.x, p.y, R, R * .32, 0, 0, BD.TAU); x.stroke();
            x.beginPath(); x.ellipse(p.x, p.y, R * .45, R * .14, 0, 0, BD.TAU); x.stroke();
            x.beginPath(); x.moveTo(p.x - R * 1.3, p.y); x.lineTo(p.x + R * 1.3, p.y); x.stroke();
            x.globalAlpha = .18 * k; x.fillStyle = BD.RED; x.fillRect(p.x - 2, 0, 4, p.y);
            x.globalAlpha = 1;
          }
        } });
      BD.audio.play('siren'); BD.fx.text(tx, 120, 'מטח!', BD.RED, 80, 1, -20);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      for (const [dx, dy] of [[-28, -16], [0, 6], [28, -10]]) { x.save(); x.translate(dx, dy + Math.sin(t * 4 + dx) * 3); x.rotate(Math.PI / 2 - .25); drawMissile(x, .6, '#7d8a6a'); x.restore(); }
      x.strokeStyle = BD.RED; x.lineWidth = 4; x.beginPath(); x.ellipse(0, 46, 34, 9, 0, 0, BD.TAU); x.stroke(); x.restore();
    }
  });

  /* ---------- the nuke: a cinematic in stages ---------- */
  function drawNukeBomb(x, t) {
    A.poly(x, [[-26, -50], [-40, -78], [40, -78], [26, -50]], '#3d4a36', 4);
    x.beginPath(); x.ellipse(0, 0, 34, 58, 0, 0, BD.TAU); x.fillStyle = '#56633f'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(-12, -20, 8, 26, 0, 0, BD.TAU); x.fill();
    A.circ(x, 0, 8, 19, BD.YEL, 3);
    x.fillStyle = '#141414';
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * BD.TAU / 3 + t * 0; x.beginPath(); x.moveTo(0, 8); x.arc(0, 8, 16, a - .5, a + .5); x.closePath(); x.fill(); }
    A.circ(x, 0, 8, 4, BD.YEL, 2);
    x.fillStyle = '#141414'; x.fillRect(-34, 34, 68, 6);
  }
  BD.weapon({
    id: 'nuke', cat: 'boom', name: 'פצצה גרעינית', price: 4000, power: 5, chaos: 5, big: true,
    desc: 'הנשק האחרון. אזעקה, פצצה במצנח, הבזק לבן, גל הדף ופטרייה ענקית שעולה מעל החדר.', tip: 'אחרי זה יש שקט. לזמן קצר.',
    down(P) { this.launch(P.x); }, fireAt(x) { this.launch(x); },
    launch(x0) {
      if (G.ents.some(e => e.nukeFx && !e.dead)) { BD.audio.play('deny'); return; }
      const d = G.dummy, tx = BD.clamp(d && !d.gone ? d.j.chest.x : x0, 140, G.W - 140), F = G.floor;
      let lp = null;
      const e = G.add({ nukeFx: true, z: .5, t: 0, boom: false, by: -200, seed: Array.from({ length: 40 }, () => Math.random()) });
      const ov = function (x, cw, ch) {
        const t = e.t;
        if (!e.boom) {
          const pul = .5 + .5 * Math.sin(t * 9);
          x.fillStyle = `rgba(200,0,0,${.06 + .12 * pul})`; x.fillRect(0, 0, cw, ch);
          const bh = Math.max(26, ch * .06), off = (t * 140) % 80;
          for (const y of [0, ch - bh]) {
            x.fillStyle = BD.YEL; x.fillRect(0, y, cw, bh); x.fillStyle = '#141414';
            for (let i = -2; i < cw / 40 + 2; i++) { const X = i * 80 - off; x.beginPath(); x.moveTo(X, y + bh); x.lineTo(X + 40, y + bh); x.lineTo(X + 40 + bh, y); x.lineTo(X + bh, y); x.closePath(); x.fill(); }
          }
          if (pul > .3) {
            const fs = Math.max(28, ch * .07); x.font = `700 ${fs}px Karantina, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
            const tx2 = 'אזהרה! פצצה גרעינית', w = x.measureText(tx2).width + fs;
            x.fillStyle = '#141414'; x.fillRect(cw / 2 - w / 2, bh + 12, w, fs * 1.2); x.fillStyle = BD.YEL; x.fillText(tx2, cw / 2, bh + 12 + fs * .66);
          }
        } else {
          const a = t - e.tb;
          if (a < 1.8) { x.fillStyle = `rgba(255,255,250,${BD.clamp(1 - a / 1.8, 0, 1)})`; x.fillRect(0, 0, cw, ch); }
          if (a < 6) { x.fillStyle = `rgba(255,120,30,${.22 * BD.clamp(1 - a / 6, 0, 1)})`; x.fillRect(0, 0, cw, ch); }
        }
      };
      G.overlay = ov; G.lock = true;
      BD.audio.play('siren');
      e.kill = function () { if (G.overlay === ov) G.overlay = null; G.lock = false; if (lp) { lp.stop(); lp = null; } };
      e.update = function (dt) {
        this.t += dt; const t = this.t;
        if (t > 1.1 && G.lock && !this.unl) { this.unl = true; G.lock = false; }
        if (!this.boom) {
          if (t > 1.0) { const k = BD.clamp((t - 1) / 1.8, 0, 1); this.by = BD.lerp(-180, F - 70, Math.pow(k, 1.5)); }
          if (t > 1.5 && !this.wh) { this.wh = true; BD.audio.play('whistle', 1.3); }
          if (t >= 2.8) this.detonate();
          return;
        }
        const a = t - this.tb;
        if (a < 4 && Math.random() < .5) BD.fx.ash(BD.rand(0, G.W), BD.rand(0, G.floor * .7), 2);
        if (lp) lp.set(BD.clamp(1 - a / 6, 0, 1) * 1.2);
        if (a > 1.2 && a < 4.5) BD.fx.shake(.08 * (1 - a / 4.5));
        if (a > 6.3) return false;
      };
      e.detonate = function () {
        this.boom = true; this.tb = this.t; G.lock = false;
        BD.fx.flash(1, '#fff'); BD.fx.shake(1.6);
        BD.audio.play('nuke'); BD.audio.play('boom', 1.4); lp = BD.audio.loop('rumble');
        G.explode(tx, F - 30, 260, { src: 'nuke', cat: 'boom', dmg: 320, power: 9000 });
        if (G.dummy && !G.dummy.gone && !G.dummy.ko) G.dummy.hp = 0;   // a nuke always knocks him out
        G.hitArea(tx, F, 1300, 5200, { dmg: 140, src: 'nuke', cat: 'boom', lift: .9, mark: 'soot' });
        G.damage(1, tx, F - 200, { src: 'nuke', cat: 'boom' });
        G.ph.blast(tx, F, 1500, 7000, p => !p.dummy);
        for (const en of G.ents) if (en.blasted && !en.dead && en !== this) en.blasted(tx, F, 1500, 7000);
        const d2 = G.dummy; if (d2 && !d2.gone) { d2.soot = 1; d2.ignite(3); d2.talk('big', true); }
        BD.fx.slowmo(1.5, .3); BD.fx.zoom(1.18, 1.6, tx, F - 220);
        for (let i = 0; i < 4; i++) G.later(i * .14, () => BD.fx.ring(tx, F - 40, 700 + i * 450, i % 2 ? '#ffd27a' : '#fff', 1.3, 34 - i * 6));
        BD.fx.debris(tx, F - 20, 30, ['#3b3b3b', '#6d4c41', '#ff7a00', '#888'], 2200, 12);
        BD.fx.fire(tx, F - 40, 40, 900, 2.2);
        BD.fx.stain(tx, F, 340, '#000', .55);
        G.light(tx, F - 300, 2400, 1, 3);
        BD.fx.text(tx, F * .36, 'בּוּם', '#fff', 150, 1.8, -20);
      };
      e.draw = function (x) {
        const t = this.t;
        if (!this.boom) {
          if (t < 1) return;
          const sw = Math.sin(t * 2.4) * .14, by = this.by;
          x.save(); x.translate(tx, by); x.rotate(sw);
          // parachute
          x.strokeStyle = '#141414'; x.lineWidth = 2;
          for (const s of [-1, -.4, .4, 1]) { x.beginPath(); x.moveTo(s * 18, -70); x.lineTo(s * 110, -210); x.stroke(); }
          x.beginPath(); x.moveTo(-120, -205); x.quadraticCurveTo(0, -330, 120, -205); x.closePath(); x.fillStyle = '#f1efeb'; x.fill(); x.lineWidth = 5; x.stroke();
          x.save(); x.clip(); x.fillStyle = BD.RED; for (let i = -3; i < 3; i += 2) x.fillRect(i * 40, -330, 40, 140); x.restore();
          x.beginPath(); x.moveTo(-120, -205); x.quadraticCurveTo(0, -330, 120, -205); x.closePath(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
          x.beginPath(); for (let i = 0; i < 6; i++) { const X = -120 + i * 48; x.moveTo(X, -205); x.quadraticCurveTo(X + 24, -192, X + 48, -205); } x.stroke();
          drawNukeBomb(x, t);
          x.restore();
          return;
        }
        // the mushroom cloud
        const a = t - this.tb, S = this.seed;
        const fade = BD.clamp((6.3 - a) / 1.6, 0, 1); if (fade <= 0) return;
        const heat = BD.clamp(1 - a / 4.2, 0, 1);
        const e1 = 1 - Math.pow(1 - BD.clamp(a / 3, 0, 1), 3), e2 = 1 - Math.pow(1 - BD.clamp(a / 2.6, 0, 1), 3);
        const top = Math.min(G.floor * .62, F - 140), cy = F - 60 - top * e1, cr = 70 + 240 * e2;
        const col = k => heat > .02 ? mix(mix('#ffd27a', '#ff6a1a', k), mix('#8f8378', '#5f5650', k), 1 - heat) : mix('#8f8378', '#5f5650', k);
        const puff = (px, py, r, k) => { x.fillStyle = col(k); x.beginPath(); x.arc(px, py, r, 0, BD.TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(px - r * .25, py - r * .3, r * .6, 0, BD.TAU); x.fill(); };
        x.save(); x.globalAlpha = fade;
        // ground skirt
        for (let i = 0; i < 9; i++) { const k = i / 8 - .5, R = 60 + 380 * e2; puff(tx + k * R * 2, F - 18 - Math.abs(k) * 10, 40 + 30 * e2 * (1 - Math.abs(k)), .7); }
        // stem, flowing upward
        const N = 13;
        for (let i = 0; i < N; i++) {
          const k = ((i + a * 1.6) % N) / N, y = BD.lerp(F - 30, cy + cr * .2, k), w = BD.lerp(cr * .62, cr * .26, Math.min(1, k * 1.3));
          puff(tx + Math.sin(i * 2.1 + a) * w * .25, y, w * (.75 + S[i] * .3), .3 + k * .4);
        }
        // condensation ring around the stem
        if (a > .6 && a < 5) { const rk = BD.clamp((a - .6) / 3, 0, 1), ry = BD.lerp(F - 30, cy, .55), rr = 120 + 330 * rk; x.globalAlpha = fade * (1 - rk) * .9;
          for (let i = 0; i < 18; i++) { const th = i / 18 * BD.TAU; x.fillStyle = '#f4f1ea'; x.beginPath(); x.arc(tx + Math.cos(th) * rr, ry + Math.sin(th) * rr * .18, 16 + S[i] * 10, 0, BD.TAU); x.fill(); }
          x.globalAlpha = fade; }
        // the cap: a rolling torus, back half then dome then front half
        const M = 22, roll = a * 1.3;
        const capPuff = front => { for (let i = 0; i < M; i++) { const th = i / M * BD.TAU + roll, s = Math.sin(th); if ((s > 0) !== front) continue; puff(tx + Math.cos(th) * cr, cy + s * cr * .32 + cr * .1, cr * (.34 + S[i] * .08), front ? .2 : .55); } };
        capPuff(false);
        for (let i = 0; i < 9; i++) { const th = Math.PI + (i / 8) * Math.PI; puff(tx + Math.cos(th) * cr * .6, cy + Math.sin(th) * cr * .45 - cr * .05, cr * (.36 + S[20 + i] * .1), .1); }
        capPuff(true);
        // hot glow inside
        if (heat > 0) {
          x.globalCompositeOperation = 'lighter'; x.globalAlpha = heat * fade * .8;
          const gl = BD.fx.glow('#ff7a1a'); x.drawImage(gl, tx - cr * 1.6, cy - cr * 1.2, cr * 3.2, cr * 2.4);
          x.drawImage(gl, tx - cr * .7, (cy + F) / 2 - (F - cy) * .5, cr * 1.4, F - cy);
          x.globalCompositeOperation = 'source-over';
        }
        x.restore();
      };
    },
    icon(x, s, t = 0) { x.save(); const k = s / 130; x.scale(k, k); x.translate(0, 8); x.rotate(Math.sin(t * 2) * .1); drawNukeBomb(x, t); x.restore(); }
  });
})();
