/* Melee: bat, hammer, giant hammer, boxing glove, frying pan, sword, chainsaw,
   giant fist, spiked ball and wrecking ball. */
'use strict';
(() => {
  const G = BD.G, A = BD.art;

  BD.mkSwing({
    id: 'bat', name: 'מחבט בייסבול', price: 0, power: 2, chaos: 2, len: 150, thick: 24, k: 1, dmgK: 1, snd: 'hit',
    desc: 'הקלאסיקה. לחיצה = חבטה אוטומטית, גרירה = אתם מניפים.', tip: 'הניפו מלמטה למעלה כדי להעיף אותו לתקרה',
    drawTool(x, L) {
      A.poly(x, [[0, -6], [L * .45, -9], [L, -15], [L + 4, 0], [L, 15], [L * .45, 9], [0, 6]], '#c98c4c', 4);
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(L * .3, -9, L * .65, 4);
      x.strokeStyle = 'rgba(120,70,30,.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(L * .5, 2); x.lineTo(L * .95, 4); x.stroke();
      A.rect(x, -8, -8, L * .3, 16, '#1f1f1f', 4, 3); x.strokeStyle = '#3a3a3a'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-4 + i * 8, -7); x.lineTo(2 + i * 8, 7); x.stroke(); }
      A.circ(x, -10, 0, 9, '#1f1f1f', 3);
    },
    onHit(p, vx, vy, v) { if (v > 2600) BD.fx.text(p.x, p.y - 60, 'הום ראן!', BD.YEL, 60, .8, -80); }
  });

  BD.mkSwing({
    id: 'hammer', name: 'פטיש', price: 80, power: 3, chaos: 2, len: 112, thick: 30, k: 1.25, dmgK: 1.4, snd: 'thud', heavyHead: true, swingT: .22,
    desc: 'ראש מתכת כבד. כל מכה משאירה כוכבים.', tip: 'הקפיאו אותו קודם ואז פטיש = שובר קרח',
    drawTool(x, L) {
      A.bar(x, 0, 0, L - 18, 0, 11, '#a0612d');
      A.rect(x, L - 30, -30, 34, 60, '#6d7a86', 4, 4);
      x.fillStyle = '#9aa7b3'; x.fillRect(L - 26, -26, 8, 52);
      x.fillStyle = '#4a545d'; x.fillRect(L - 2, -26, 4, 52);
      A.rect(x, -6, -8, 30, 16, '#d3202a', 4, 3);
    },
    onHit(p) { BD.fx.stars(p.x, p.y, 6); BD.fx.shake(.2); }
  });

  BD.mkSwing({
    id: 'pan', name: 'מחבת', price: 120, power: 2, chaos: 2, len: 128, thick: 46, k: 1.05, dmgK: 1.1, snd: 'clang',
    desc: 'דונג! מחבת ברזל יצוק עם צלצול מושלם.', tip: 'הכי מצחיק בפרצוף',
    drawTool(x, L) {
      A.bar(x, 0, 0, L - 52, 0, 12, '#2b2b2b');
      A.rect(x, -6, -7, 30, 14, '#7a4a22', 5, 3);
      x.beginPath(); x.ellipse(L - 28, 0, 32, 30, 0, 0, BD.TAU); x.fillStyle = '#3a3a3a'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
      x.beginPath(); x.ellipse(L - 28, 0, 24, 22, 0, 0, BD.TAU); x.fillStyle = '#272727'; x.fill();
      x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.ellipse(L - 36, -8, 10, 5, -.6, 0, BD.TAU); x.fill();
    },
    onHit(p, vx, vy, v) { if (p.name === 'head' || v > 2200) BD.fx.text(p.x, p.y - 60, 'דונג!', '#fff', 58, .7, -70); BD.fx.ring(p.x, p.y, 70, '#fff', .3, 4); }
  });

  BD.mkSwing({
    id: 'sword', name: 'חרב', price: 200, power: 2, chaos: 3, len: 175, thick: 14, k: .8, dmgK: .9, snd: 'clang', mk: 'scratch', swingT: .13, smear: '#cfeeff',
    desc: 'להב ארוך ומהיר. משאיר שריטות (רק שריטות, זאת בובה).', tip: 'גררו מהר הלוך־חזור לסדרת מכות',
    drawTool(x, L) {
      A.poly(x, [[34, -9], [L - 20, -8], [L + 6, 0], [L - 20, 8], [34, 9]], '#dfe8ee', 3);
      x.fillStyle = '#a9b9c4'; x.fillRect(40, -1.5, L - 64, 3);
      x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(44, -7, L - 80, 2.5);
      A.rect(x, 26, -22, 12, 44, BD.YEL, 3, 3);
      A.rect(x, -8, -6, 36, 12, '#3a2414', 3, 3);
      A.circ(x, -10, 0, 8, BD.YEL, 3);
    },
    onHit(p) { BD.fx.spark(p.x, p.y, 10, '#e9f6ff', 900); BD.audio.play('swoosh'); }
  });

  /* ---- giant hammer: drops from above onto the spot ---- */
  BD.weapon({
    id: 'bighammer', cat: 'melee', name: 'פטיש ענק', price: 450, power: 4, chaos: 3,
    desc: 'פטיש בגודל של דלת נוחת מלמעלה ומשטח את מי שמתחת.', tip: 'הוא משטח, אחר כך הבובה קופצת חזרה',
    down(P) { this.slam(P.x); }, fireAt(x) { this.slam(x); },
    slam(x0) {
      if (!G.gate('bigh', .5)) return;
      const L = 420, w = { z: 2, t: 0, x: x0, a: -1.3, dead: false };
      w.update = function (dt) {
        this.t += dt;
        if (this.t < .28) this.a = BD.lerp(-1.3, -1.75, this.t / .28);           // wind up
        else if (this.t < .38) { this.a = BD.lerp(-1.75, 0, (this.t - .28) / .1); } // slam
        else if (!this.hit) {
          this.hit = 1; this.a = 0; const y = G.floor - 6;
          BD.audio.play('stomp'); BD.audio.play('clang'); BD.fx.shake(.9); BD.fx.flash(.25, '#fff');
          BD.fx.ring(this.x, y, 260, '#fff', .45, 16); BD.fx.smoke(this.x, y, 14, G.arena.dust, 40, 60); BD.fx.debris(this.x, y, 12, G.arena.chips, 900, 8);
          const d = G.dummy;
          if (d && !d.gone) {
            let hit = false;
            for (const p of d.parts) if (Math.abs(p.x - this.x) < 140) { hit = true; G.ph.setVel(p, (p.x - this.x) * 4, 2600); }
            if (hit) { d.flat = 1.2; G.damage(55, this.x, y - 80, { src: 'bighammer', cat: 'melee' }); d.react(1.2, this.x, y - 40); BD.fx.stars(this.x, y - 60, 10); BD.fx.text(this.x, y - 220, 'שטוח!', BD.YEL, 80, 1, -40); BD.fx.zoom(1.1, .25, this.x, y - 100); }
          }
          for (const e of G.ents) if (e.grabbable && !e.dead) { const [cx] = e.pos(); if (Math.abs(cx - this.x) < 150) e.push(0, 1800); }
        } else if (this.t > .9) { this.a = BD.lerp(0, -1.6, BD.clamp((this.t - .9) / .3, 0, 1)); if (this.t > 1.25) return false; }
      };
      w.draw = function (x) {
        const px = this.x + 260, py = G.floor - 70;
        x.save(); x.translate(px, py); x.rotate(Math.PI + this.a);
        if (this.t > .28 && this.t < .4) { x.globalAlpha = .25; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, L, -.6, 0); x.fill(); x.globalAlpha = 1; }
        BD.W.bighammer.drawIt(x, L);
        x.restore();
      };
      G.add(w); BD.audio.play('whoosh');
    },
    drawIt(x, L) {
      A.bar(x, 0, 0, L - 60, 0, 26, '#a0612d');
      A.rect(x, -10, -16, 70, 32, BD.RED, 6, 4);
      A.rect(x, L - 90, -80, 120, 160, '#5e6a75', 10, 6);
      x.fillStyle = '#8795a1'; x.fillRect(L - 84, -74, 20, 148);
      x.fillStyle = '#141414'; x.fillRect(L - 92, -30, 124, 8); x.fillRect(L - 92, 22, 124, 8);
    },
    icon(x, s) { x.save(); const k = s / 330; x.scale(k, k); x.rotate(-.7); x.translate(-200, 30); this.drawIt(x, 300); x.restore(); }
  });

  /* ---- boxing glove on a spring, shoots out from the side ---- */
  BD.weapon({
    id: 'glove', cat: 'melee', name: 'כפפת קפיץ', price: 0, power: 3, chaos: 2,
    desc: 'כפפת אגרוף על קפיץ יוצאת מהקיר ומחטיפה.', tip: 'לחצו על הראש',
    down(P) { this.punch(P.x, P.y); }, fireAt(x, y) { this.punch(x, y); },
    punch(tx, ty) {
      if (!G.gate('glove', .18)) return;
      const side = tx < G.W / 2 ? -1 : 1, sx = side < 0 ? -60 : G.W + 60, sy = ty;
      const e = { z: 2, t: 0, sx, sy, tx, ty, side };
      e.update = function (dt) {
        this.t += dt;
        const out = this.t < .11 ? this.t / .11 : this.t < .2 ? 1 : 1 - (this.t - .2) / .25;
        this.k = BD.clamp(out, 0, 1) * 1.08;
        if (!this.hit && this.t >= .1) {
          this.hit = 1;
          const hx = BD.lerp(sx, tx, 1.05), hy = ty, p = G.part(hx, hy, 50);
          if (p) { const dir = -side; G.hit(p, dir * 3600, -900, { dmg: 28, src: 'glove', cat: 'melee', snd: 'hit' }); BD.fx.text(p.x, p.y - 70, 'פאו!', BD.YEL, 66, .7, -60); }
          else BD.audio.play('boing');
        }
        if (this.t > .45) return false;
      };
      e.draw = function (x) {
        const ex = BD.lerp(this.sx, this.tx, this.k), ey = this.ty, len = Math.abs(ex - this.sx), n = 7;
        x.save(); x.translate(this.sx, this.sy);
        // a scissor spring
        x.strokeStyle = '#141414'; x.lineWidth = 9; x.lineJoin = 'round'; x.beginPath();
        for (let i = 0; i <= n; i++) x.lineTo(-this.side * len * i / n, (i % 2 ? -18 : 18));
        x.stroke(); x.strokeStyle = '#b8c2cb'; x.lineWidth = 4; x.stroke();
        x.translate(-this.side * len, 0); if (this.side > 0) x.scale(-1, 1);
        BD.W.glove.drawIt(x);
        x.restore();
      };
      G.add(e); BD.audio.play('spring');
    },
    drawIt(x) {
      A.rect(x, -34, -20, 26, 40, '#f4f4f4', 4, 4);
      x.beginPath(); x.ellipse(14, 0, 40, 34, 0, 0, BD.TAU); x.fillStyle = '#d3202a'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#141414'; x.stroke();
      x.beginPath(); x.ellipse(-2, 22, 18, 13, -.4, 0, BD.TAU); x.fillStyle = '#b0141c'; x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.ellipse(18, -16, 16, 8, -.2, 0, BD.TAU); x.fill();
    },
    icon(x, s) { x.save(); const k = s / 90; x.scale(k, k); this.drawIt(x); x.restore(); }
  });

  /* ---- chainsaw: hold it on him ---- */
  BD.weapon({
    id: 'chainsaw', cat: 'melee', name: 'מסור שרשרת', price: 600, power: 3, chaos: 3,
    desc: 'מחזיקים על הבובה והמסור רועד, זורק ניצוצות ומשאיר שריטות. בלי דם, זאת בובת ניסוי.', tip: 'החזיקו על הבטן',
    enter() { this.st.rev = 0; this.st.a = 0; },
    down() { this.st.on = true; if (!this.st.lp) this.st.lp = BD.audio.loop('saw'); },
    up() { this.st.on = false; },
    leave() { if (this.st.lp) { this.st.lp.stop(); this.st.lp = null; } },
    update(dt, P) {
      const st = this.st; st.rev = BD.lerp(st.rev, st.on ? 1 : 0, dt * 8); st.t = (st.t || 0) + dt * (2 + st.rev * 30);
      if (st.lp) { st.lp.set(.4 + st.rev * .6, 80 + st.rev * 60 + (st.cut ? -25 : 0)); if (!st.on && st.rev < .05) { st.lp.stop(); st.lp = null; } }
      st.cut = false;
      if (!st.on) return;
      const tipX = P.x + Math.cos(st.a) * 70, tipY = P.y + Math.sin(st.a) * 70;
      const d = G.dummy; if (!d || d.gone) return;
      for (const p of d.parts) {
        if (BD.segDist(p.x, p.y, P.x - 10, P.y, tipX, tipY) > p.r + 14) continue;
        st.cut = true;
        G.ph.push(p, BD.rand(-260, 260) + Math.cos(st.a) * 300, BD.rand(-260, 260) - 120);
        if (Math.random() < .7) BD.fx.spark(p.x, p.y, 3, BD.pick(['#ffd54a', '#fff']), 700);
        if (G.gate('saw', .09)) { G.damage(4, p.x, p.y, { src: 'chainsaw', cat: 'melee', comboGap: .3 }); d.setMood('scream', .5); if (Math.random() < .3) d.mark(p.x, p.y, 'scratch'); if (Math.random() < .08) d.talk('hurt'); }
        BD.fx.shake(.04);
        break;
      }
    },
    sub(dt, P) { const st = this.st; const want = G.dummy && !G.dummy.gone ? Math.atan2(G.dummy.j.chest.y - P.y, G.dummy.j.chest.x - P.x) : 0; st.a = BD.lerp(st.a || 0, P.x < (G.dummy ? G.dummy.j.chest.x : 0) ? 0 : Math.PI, .02); },
    draw(x, P) {
      if (!P.over && !P.down) return; const st = this.st, jit = st.rev * 2;
      x.save(); x.translate(P.x + BD.rand(-jit, jit), P.y + BD.rand(-jit, jit)); if (Math.cos(st.a) < 0) x.scale(-1, 1); this.drawIt(x, st.t || 0); x.restore();
      if (st.rev > .3 && Math.random() < .3) BD.fx.smoke(P.x - (Math.cos(st.a) < 0 ? -50 : 50), P.y - 20, 1, '#777', 10, 60);
    },
    drawIt(x, t) {
      A.rect(x, -70, -26, 72, 50, '#e8a21a', 10, 4);
      A.rect(x, -64, -40, 40, 18, '#2b2b2b', 6, 3);
      x.fillStyle = '#141414'; x.fillRect(-58, -6, 40, 6);
      // the bar with moving teeth
      A.rect(x, 0, -14, 104, 28, '#9aa5ad', 14, 4);
      x.fillStyle = '#141414';
      for (let i = 0; i < 12; i++) { const u = ((i * 9 + t * 40) % 108); if (u < 98) { x.fillRect(u + 2, -18, 5, 4); x.fillRect(102 - u, 14, 5, 4); } }
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(8, -9, 80, 4);
    },
    fireAt(x, y) { const p = G.part(x, y, 400); if (!p) return; for (let i = 0; i < 6; i++) G.later(i * .06, () => { G.ph.push(p, BD.rand(-400, 400), BD.rand(-500, 100)); BD.fx.spark(p.x, p.y, 6, '#ffd54a', 700); G.damage(4, p.x, p.y, { src: 'chainsaw', cat: 'melee' }); }); BD.audio.play('saw'); },
    icon(x, s, t = 0) { x.save(); const k = s / 190; x.scale(k, k); x.translate(-20, 0); this.drawIt(x, t * 3); x.restore(); }
  });

  /* ---- giant fist: punches down from the sky ---- */
  BD.weapon({
    id: 'fist', cat: 'melee', name: 'אגרוף ענק', price: 800, power: 5, chaos: 3,
    desc: 'אגרוף ענק יורד מהשמיים בזווית ומטיח את הבובה לרצפה.', tip: 'אחרי זריקה לאוויר, תפסו אותו באוויר עם האגרוף',
    down(P) { this.punch(P.x, P.y); }, fireAt(x, y) { this.punch(x, y); },
    punch(tx, ty) {
      if (!G.gate('fist', .6)) return;
      const side = tx < G.W / 2 ? 1 : -1, ang = Math.atan2(1, -side * .45), dx = Math.cos(ang), dy = Math.sin(ang);
      const e = { z: 3, t: 0, tx, ty, dx, dy };
      e.update = function (dt) {
        this.t += dt;
        if (!this.hit && this.t > .3) {
          this.hit = 1;
          BD.fx.shake(1); BD.fx.flash(.3, '#fff'); BD.audio.play('boom', .6); BD.audio.play('hit', 1);
          BD.fx.ring(tx, ty, 300, '#fff', .4, 18); BD.fx.lines(tx, ty, 16, Math.atan2(dy, dx), '#fff');
          G.hitArea(tx, ty, 130, 4800, { dmg: 70, src: 'fist', cat: 'melee', vx: dx * 1800, vy: dy * 1800, lift: -.2, mark: 'crack' });
          BD.fx.text(tx, ty - 120, 'קאבום!', BD.YEL, 90, 1, -40); BD.fx.zoom(1.12, .3, tx, ty);
          BD.fx.stars(tx, ty, 8);
        }
        if (this.t > .9) return false;
      };
      e.draw = function (x) {
        // flies in fast, holds, then pulls back up
        const k = this.t < .3 ? 1 - Math.pow(1 - this.t / .3, 3) : this.t < .55 ? 1 : 1 - (this.t - .55) / .35;
        const D = 900 * (1 - k) + 60, X = this.tx - this.dx * D, Y = this.ty - this.dy * D;
        x.save(); x.translate(X, Y); x.rotate(Math.atan2(this.dy, this.dx));
        if (this.t < .3) { x.globalAlpha = .3; for (let i = 1; i < 4; i++) { x.fillStyle = '#fff'; x.fillRect(-120 - i * 60, -60 + i * 25, 80, 6); } x.globalAlpha = 1; }
        BD.W.fist.drawIt(x);
        x.restore();
      };
      G.add(e); BD.audio.play('whoosh');
    },
    drawIt(x) {
      A.rect(x, -900, -66, 820, 132, '#2b2b33', 0, 6);
      x.fillStyle = BD.RED; x.fillRect(-900, -66, 820, 18);
      A.rect(x, -110, -78, 50, 156, '#f4f4f4', 6, 6);
      x.beginPath(); BD.draw.rr(x, -70, -92, 150, 184, 46); x.fillStyle = '#f6c21c'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#141414'; x.stroke();
      for (let i = 0; i < 4; i++) { x.beginPath(); BD.draw.rr(x, 30, -84 + i * 42, 66, 40, 18); x.fillStyle = '#f6c21c'; x.fill(); x.stroke(); }
      x.beginPath(); x.ellipse(-10, 70, 50, 24, -.2, 0, BD.TAU); x.fillStyle = '#e3b018'; x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(-20, -60, 40, 12, 0, 0, BD.TAU); x.fill();
    },
    icon(x, s) { x.save(); const k = s / 220; x.scale(k, k); x.rotate(.6); x.translate(-10, 0); this.drawIt(x); x.restore(); }
  });

  /* ---- spiked ball: heavy, rolls around ---- */
  BD.mkThrow({
    id: 'spikeball', cat: 'melee', name: 'כדור קוצים', price: 350, power: 3, chaos: 3, r: 34, max: 3,
    desc: 'כדור ברזל כבד עם קוצים. זורקים אותו והוא מתגלגל בכל החדר.', tip: 'זרקו אותו חזק מלמעלה',
    spawn(x, y) {
      const w = this;
      return BD.body({ shape: 'ball', x, y, r: this.r, mass: 5, rest: .35, fr: .6, heavy: 2.4, life: 14, snd: 'clang', grabbable: true, shootable: true,
        draw(c, r) { w.drawIt(c, r, 0); },
        hitDummy(part, rel) { G.damage(Math.min(40, rel / 120), part.x, part.y, { src: 'spikeball', cat: 'melee' }); part.dummy.mark(part.x, part.y, 'hole'); BD.fx.spark(part.x, part.y, 8, '#fff', 500); } });
    },
    drawIt(x, r) {
      x.fillStyle = '#141414';
      for (let i = 0; i < 10; i++) { const a = i / 10 * BD.TAU; x.beginPath(); x.moveTo(Math.cos(a - .2) * r * .9, Math.sin(a - .2) * r * .9); x.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); x.lineTo(Math.cos(a + .2) * r * .9, Math.sin(a + .2) * r * .9); x.fill(); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * BD.TAU; x.fillStyle = '#c7cfd6'; x.beginPath(); x.moveTo(Math.cos(a - .12) * r * .95, Math.sin(a - .12) * r * .95); x.lineTo(Math.cos(a) * r * 1.33, Math.sin(a) * r * 1.33); x.lineTo(Math.cos(a + .12) * r * .95, Math.sin(a + .12) * r * .95); x.fill(); }
      A.circ(x, 0, 0, r, '#5e6a75', 5);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-r * .35, -r * .35, r * .3, r * .18, -.7, 0, BD.TAU); x.fill();
    }
  });

  /* ---- wrecking ball on a chain from the ceiling ---- */
  BD.weapon({
    id: 'wrecking', cat: 'melee', name: 'כדור הריסה', price: 900, power: 5, chaos: 4,
    desc: 'כדור הריסה על שרשרת יוצא מהתקרה ומתנדנד לכל הכיוון. אפשר לתפוס אותו עם היד ולהניף.', tip: 'לחצו רחוק מהבובה כדי שהנדנוד יגיע אליה',
    down(P) { this.spawn(P.x, P.y); }, fireAt(x, y) { this.spawn(x, y); },
    spawn(tx, ty) {
      G.ents.filter(e => e.wrecking).forEach(e => e.dead = true);
      const d = G.dummy, cx = d && !d.gone ? d.j.chest.x : G.W / 2;
      const ax = BD.clamp(cx + (tx < cx ? 60 : -60), 80, G.W - 80), ay = 0;
      const len = Math.min(G.floor - 170, Math.max(260, Math.hypot(tx - ax, ty - ay)));
      const ang = Math.atan2(ty - ay, tx - ax);
      const anchor = G.ph.particle(ax, ay, 1, 0, { group: 'wa' });
      const e = BD.body({ shape: 'ball', x: ax + Math.cos(ang) * len, y: ay + Math.sin(ang) * len, r: 58, mass: 14, rest: .2, fr: .3, heavy: 3.2, life: 12, snd: 'clang', grabbable: true,
        draw(c, r) {
          A.circ(c, 0, 0, r, '#2f3439', 6);
          c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .7, 0, BD.TAU); c.stroke();
          c.rotate(-this.rot); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-r * .35, -r * .4, r * .32, r * .16, -.6, 0, BD.TAU); c.fill();
          A.rect(c, -14, -r - 14, 28, 22, '#555', 4, 4);
        },
        hitDummy(part, rel) { if (rel > 900) { BD.fx.text(part.x, part.y - 70, 'בום!', '#fff', 70, .7, -60); BD.fx.shake(.5); } } });
      e.wrecking = true; e.anchor = anchor; e.link = G.ph.link(anchor, e.ball, { len });
      e.onKill = () => { anchor.alive = false; e.link.alive = false; };
      e.z = 1.5;
      const dr = e.draw;
      e.draw = function (x) {
        const [bx, by] = this.pos(), n = Math.ceil(len / 22);
        for (let i = 0; i < n; i++) {
          const k = i / n, X = BD.lerp(ax, bx, k), Y = BD.lerp(ay, by, k);
          x.save(); x.translate(X, Y); x.rotate(Math.atan2(by - ay, bx - ax) + (i % 2 ? Math.PI / 2 : 0));
          x.strokeStyle = '#141414'; x.lineWidth = 7; x.beginPath(); x.ellipse(0, 0, 13, 6, 0, 0, BD.TAU); x.stroke(); x.strokeStyle = '#8a949c'; x.lineWidth = 3; x.stroke(); x.restore();
        }
        dr.call(this, x);
      };
      G.ph.setVel(e.ball, (tx < cx ? 1 : -1) * 600, 0);
      BD.audio.play('clang'); BD.fx.debris(ax, 4, 6, G.arena.chips, 300, 6);
    },
    icon(x, s) {
      x.save(); const k = s / 120; x.scale(k, k);
      x.strokeStyle = '#141414'; x.lineWidth = 6; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(-20 + i * 10, -50 + i * 14, 7, 4, 1, 0, BD.TAU); x.stroke(); }
      A.circ(x, 16, 26, 34, '#2f3439', 5); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(4, 14, 10, 6, -.6, 0, BD.TAU); x.fill(); x.restore();
    }
  });
})();
