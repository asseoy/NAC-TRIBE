/* Guns: pistol, machine gun, shotgun, sniper, minigun, laser, plasma cannon,
   rocket launcher, paintball and water cannon. */
'use strict';
(() => {
  const G = BD.G, A = BD.art;

  /* the guns stand low in the corner, below the floor line: start every shot from
     the point where the barrel line rises above the floor so it doesn't hit it */
  function lift() {
    const st = this.st, [px, py] = this.pivot(), L = this.len - (st.kick || 0) * 30, s = Math.sin(st.a), c = Math.cos(st.a);
    let mx = px + c * L, my = py + s * L; const lim = G.floor - 8;
    if (my > lim && s < -.05) { const t = (my - lim) / -s; mx += c * t; my = lim; }
    return [mx, my];
  }
  /* wrap a method of a finished weapon so the factory version still runs */
  const wrap = (w, name, f) => { const base = w[name]; w[name] = function (...a) { return f.call(this, base, ...a); }; };

  /* ---------- sounds ---------- */
  const D = BD.audio.def;
  D('mg', ({ tone, noise }) => { noise(.08, .7, 5200, 700, .9); tone('square', 240, 60, .05, .22); });
  D('mini', ({ tone, noise }) => { noise(.045, .45, 6500, 1500, 1); tone('square', 320, 110, .035, .12); });
  D('shotgun', ({ tone, noise }) => { noise(.5, 1, 2400, 110, .7); tone('sine', 95, 28, .38, .85); noise(.08, .6, 8000, 3000, 1, 'highpass'); });
  D('pump', ({ tone, noise }) => { noise(.05, .5, 2600, 1500, 2, 'bandpass'); tone('square', 300, 200, .04, .1); noise(.05, .5, 1800, 1200, 2, 'bandpass', .14); tone('square', 220, 150, .05, .1, .14); });
  D('sniper', ({ tone, noise }) => { noise(.12, 1, 6500, 800, .8); tone('sawtooth', 420, 40, .25, .4); noise(1.3, .25, 900, 140, .6, 'lowpass', .1); });
  D('pball', ({ tone, noise }) => { tone('sine', 520, 150, .07, .35); noise(.05, .35, 3000, 900, 1); });
  D('splat', ({ tone, noise }) => { noise(.14, .45, 1500, 300, .8); tone('sine', 200, 70, .1, .2); });
  D('lzrOn', ({ tone }) => { tone('sawtooth', 2400, 600, .15, .14); tone('square', 1200, 300, .15, .08); });
  D('rocketl', ({ tone, noise }) => { noise(.8, .7, 500, 3200, 1, 'bandpass'); tone('sawtooth', 95, 40, .3, .3); });
  D('plasma', ({ tone, noise }) => { tone('sawtooth', 1700, 110, .35, .22); tone('sine', 820, 55, .45, .45); noise(.3, .4, 4200, 500, 2, 'bandpass'); });
  D('plasmaHit', ({ tone, noise }) => { tone('sine', 140, 30, .7, .8); noise(.6, .7, 5000, 200, 1.2, 'bandpass'); for (let i = 0; i < 5; i++) tone('sawtooth', 300 + i * 260, 2000, .08, .08, i * .05); });
  D('splash', ({ noise }) => { noise(.25, .3, 2500, 700, .6, 'bandpass'); });

  BD.mkGun({
    id: 'pistol', name: 'אקדח', price: 0, power: 2, chaos: 1, rate: .2, dmg: 9, force: 1500, len: 104, muzzle: lift,
    desc: 'מכוונים ולוחצים. כל כדור דוחף את החלק שהוא פוגע בו.', tip: 'יריות בראש מסובבות אותו',
    drawGun(x) {
      A.rect(x, 0, -14, 104, 22, '#3b4148', 4, 4);
      x.fillStyle = '#596069'; x.fillRect(4, -12, 96, 6);
      x.fillStyle = '#141414'; for (let i = 0; i < 5; i++) x.fillRect(58 + i * 8, -12, 3, 8);
      A.poly(x, [[4, 4], [34, 4], [24, 50], [-6, 50]], '#2b2b2b', 4);
      x.strokeStyle = '#141414'; x.lineWidth = 4; x.beginPath(); x.arc(40, 12, 10, 0, Math.PI); x.stroke();
      A.rect(x, -2, 14, 12, 30, '#6b4a2a', 3, 2);
    }
  });

  /* ---------- paintball: real flying balls, every one a new colour ---------- */
  const PAINT = ['#ff2d55', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f'];
  BD.mkGun({
    id: 'paintball', name: 'פיינטבול', price: 90, power: 1, chaos: 2, rate: .16, len: 116, snd: 'pball', shake: .03, muzzle: lift,
    desc: 'כדורי צבע בכל צבעי הקשת. הבובה (והקירות) נהיים יצירת אמנות.', tip: 'נסו לצבוע אותו כולו',
    fire(mx, my, a) {
      const col = BD.pick(PAINT), sp = 2300, aa = a + BD.rand(-.02, .02);
      this.st.col = col;
      BD.fx.glowAt(mx, my, 40, col, .06);
      BD.proj({ x: mx, y: my, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, g: 500, r: 7, life: 2, col,
        draw(x) { x.fillStyle = '#141414'; x.beginPath(); x.arc(this.x, this.y, 9, 0, BD.TAU); x.fill(); x.fillStyle = this.col; x.beginPath(); x.arc(this.x, this.y, 6.5, 0, BD.TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(this.x - 2, this.y - 2, 2, 0, BD.TAU); x.fill(); },
        onHit(h) {
          BD.fx.paint(h.x, h.y, 10, this.col, 420); BD.audio.play('splat');
          if (h.part) {
            const d = h.part.dummy, v = Math.hypot(this.vx, this.vy);
            G.hit(h.part, this.vx / v * 700, this.vy / v * 700, { dmg: 4, src: 'paintball', cat: 'guns', fx: false, spread: .1 });
            d.mark(h.x, h.y, 'paint', this.col);
            if (G.gate('pbsay', 4) && Math.random() < .4) { d.say = BD.pick(['אני יצירת אמנות?', 'זה יורד בכביסה?', 'איזה צבע זה?!']); d.sayT = 1.6; }
          } else if (h.ent) { h.ent.push(this.vx * .15, this.vy * .15); }
          else BD.scar(h.x, h.y, 'paint', this.col);
        } });
    },
    drawGun(x, st) {
      A.rect(x, 0, -10, 116, 18, '#2f6fdb', 6, 4);
      A.rect(x, 96, -13, 24, 24, '#141414', 4, 3);
      A.rect(x, -34, -14, 44, 24, '#2f6fdb', 6, 4);
      A.poly(x, [[-6, 8], [22, 8], [16, 48], [-12, 48]], '#1f1f1f', 4);
      // hopper full of balls
      x.beginPath(); x.ellipse(26, -32, 26, 20, 0, 0, BD.TAU); x.fillStyle = '#d9eef7'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      for (let i = 0; i < 5; i++) { x.fillStyle = PAINT[i]; x.beginPath(); x.arc(12 + i * 7, -30 + (i % 2) * 7, 6, 0, BD.TAU); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(18, -42, 10, 4, -.3, 0, BD.TAU); x.fill();
      A.rect(x, 20, -14, 12, 8, '#141414', 2, 2);
      x.fillStyle = BD.YEL; x.fillRect(40, -6, 40, 4);
    }
  });

  /* ---------- shotgun: eight pellets and a pump between shots ---------- */
  const sg = BD.mkGun({
    id: 'shotgun', name: 'רובה ציד', price: 200, power: 4, chaos: 3, rate: .75, pellets: 8, spread: .11, dmg: 6, force: 1900, kick: .5, len: 150, snd: 'shotgun', shake: .3, muzzle: lift, tracerW: 3,
    desc: 'שמונה כדוריות בבת אחת והדף שמעיף אותו לקיר. אחרי כל ירייה טעינה.', tip: 'מקרוב זה הכי חזק',
    tick(dt) { const st = this.st; if (st.pumpT > 0) st.pumpT = Math.max(0, st.pumpT - dt); },
    drawGun(x, st) {
      const pk = st && st.pumpT ? Math.sin((1 - st.pumpT / .45) * Math.PI) : 0;
      A.rect(x, 20, -14, 130, 10, '#4a4f55', 3, 4);
      A.rect(x, 20, -3, 112, 9, '#3b4148', 3, 3);
      A.rect(x, 64 - pk * 26, -6, 46, 16, '#8a5a2b', 4, 4);
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(70 - pk * 26 + i * 10, -4); x.lineTo(70 - pk * 26 + i * 10, 8); x.stroke(); }
      A.rect(x, -10, -16, 36, 26, '#2b2b2b', 4, 4);
      A.poly(x, [[-10, -14], [-70, -6], [-74, 22], [-10, 10]], '#8a5a2b', 4);
      x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-64, -4, 50, 4);
      x.strokeStyle = '#141414'; x.lineWidth = 4; x.beginPath(); x.arc(8, 14, 9, 0, Math.PI); x.stroke();
    }
  });
  wrap(sg, 'shoot', function (base, P) {
    base.call(this, P); this.st.pumpT = .45;
    const [mx, my] = this.muzzle(); BD.fx.smoke(mx, my, 4, '#bbb', 18, 40); BD.fx.glowAt(mx, my, 110, '#ffcf6a', .08);
    G.later(.2, () => BD.audio.play('pump'));
  });

  /* ---------- machine gun ---------- */
  BD.mkGun({
    id: 'mg', name: 'מקלע', price: 350, power: 3, chaos: 3, auto: true, rate: .075, spinUp: 40, spread: .045, dmg: 5, force: 1050, kick: .3, len: 150, snd: 'mg', shake: .06, muzzle: lift,
    desc: 'מחזיקים והוא לא מפסיק. תרמילים עפים לכל עבר.', tip: 'החזיקו על הבובה כשהיא באוויר כדי להשאיר אותה שם',
    drawGun(x) {
      A.rect(x, 50, -9, 100, 12, '#3b4148', 3, 4);
      x.fillStyle = '#141414'; for (let i = 0; i < 8; i++) x.fillRect(60 + i * 10, -14, 5, 4);
      A.rect(x, 140, -12, 14, 18, '#2b2b2b', 2, 3);
      A.rect(x, -16, -18, 72, 30, '#4f5a3a', 4, 4);
      A.rect(x, 4, 10, 30, 30, '#3a3a3a', 3, 4);
      x.fillStyle = '#d4a73a'; for (let i = 0; i < 4; i++) { x.fillRect(8 + i * 6, 40, 4, 10); }
      A.poly(x, [[-16, -14], [-62, -10], [-62, 16], [-16, 8]], '#3a3a3a', 4);
      A.rect(x, 0, -28, 34, 10, '#2b2b2b', 2, 3);
      x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-10, -14, 60, 4);
    }
  });

  /* ---------- water cannon: a real stream that pushes and soaks ---------- */
  function stream() {
    return G.add({ z: 2, ps: [], keep: true,
      update(dt) {
        const d = G.dummy;
        for (let i = this.ps.length - 1; i >= 0; i--) {
          const p = this.ps[i]; p.t -= dt; p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          let gone = p.t <= 0 || p.x < 0 || p.x > G.W;
          if (!gone && d && !d.gone) {
            const q = G.part(p.x, p.y, 8);
            if (q) {
              gone = true; const k = .055;
              G.ph.push(q, p.vx * k, p.vy * k - 40);
              for (const o of d.parts) if (o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 90) G.ph.push(o, p.vx * k * .35, p.vy * k * .35);
              d.wet = 1;
              if (d.burn > 0) { d.burn = 0; G.special('steam'); BD.fx.smoke(q.x, q.y, 10, '#eef4ff', 30, 140); BD.audio.play('sizzle'); d.talk('wet', true); }
              if (G.gate('wdmg', .2)) { G.damage(2.5, q.x, q.y, { src: 'water', cat: 'guns', comboGap: .45 }); if (Math.random() < .15) d.setMood('hurt', .5); }
              if (Math.random() < .3) BD.fx.drops(p.x, p.y, 2, '#7cc8ff', 300, 4);
            }
          }
          if (!gone && p.y > G.floor) {
            gone = true; if (G.gate('puddle', .12)) BD.fx.stain(p.x, G.floor - 2, BD.rand(20, 40), '#4aa3e8', .3);
            if (Math.random() < .3) BD.fx.drops(p.x, G.floor - 3, 2, '#9fd8ff', 260, 4);
          }
          if (!gone) for (const e of G.ents) { if (e.dead || !e.grabbable || !e.pos) continue; const [cx, cy] = e.pos(), rr = e.ball ? e.ball.r : Math.min(e.box.w, e.box.h) / 2; if (Math.hypot(cx - p.x, cy - p.y) < rr + 6) { e.push(p.vx * .02, p.vy * .02); gone = true; break; } }
          if (gone) this.ps.splice(i, 1);
        }
        return this.keep || this.ps.length > 0;
      },
      draw(x) {
        x.lineCap = 'round';
        x.strokeStyle = '#2f8fd8'; x.lineWidth = 15; x.beginPath(); for (const p of this.ps) { x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * .034, p.y - p.vy * .034); } x.stroke();
        x.strokeStyle = '#7cc8ff'; x.lineWidth = 9; x.stroke();
        x.strokeStyle = 'rgba(235,250,255,.85)'; x.lineWidth = 3; x.beginPath(); for (const p of this.ps) { x.moveTo(p.x - 2, p.y - 3); x.lineTo(p.x - p.vx * .012, p.y - p.vy * .012 - 3); } x.stroke();
      } });
  }
  BD.mkGun({
    id: 'water', name: 'תותח מים', price: 300, power: 2, chaos: 3, auto: true, rate: 99, len: 130, snd: null, shell: false, muzzle: lift,
    desc: 'זרם מים חזק שדוחף את הבובה לקיר ומרטיב אותה עד העצם. מכבה שריפות.', tip: 'הציתו אותו ואז מים = "אדים!"',
    shoot() {},
    leave() { const st = this.st; if (st.lp) { st.lp.stop(); st.lp = null; } if (st.s) st.s.keep = false; st.fire = false; },
    tick(dt) {
      const st = this.st;
      if (st.fire) {
        if (!st.s || st.s.dead) st.s = stream();
        st.s.keep = true;
        if (!st.lp) st.lp = BD.audio.loop('water');
        const [mx, my] = this.muzzle();
        for (let i = 0; i < 4; i++) { const a = st.a + BD.rand(-.03, .03), v = BD.rand(1700, 1900); st.s.ps.push({ x: mx + BD.rand(-3, 3), y: my + BD.rand(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.2 }); }
        st.kick = .15; if (Math.random() < .3) BD.fx.drops(mx, my, 1, '#9fd8ff', 200, 3);
      } else {
        if (st.s) st.s.keep = false;
        if (st.lp) { st.lp.stop(); st.lp = null; }
      }
    },
    drawGun(x) {
      A.rect(x, 40, -10, 90, 18, '#d3202a', 4, 4);
      A.rect(x, 118, -14, 16, 26, '#c9d3dc', 3, 4);
      x.beginPath(); x.ellipse(10, -6, 44, 30, 0, 0, BD.TAU); x.fillStyle = '#2f8fd8'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      x.fillStyle = '#7cc8ff'; x.beginPath(); x.ellipse(10, 4, 36, 16, 0, 0, Math.PI); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(-4, -22, 16, 6, -.3, 0, BD.TAU); x.fill();
      A.rect(x, 0, -40, 20, 10, '#141414', 2, 3);
      A.poly(x, [[30, 14], [58, 14], [50, 50], [24, 50]], '#2b2b2b', 4);
      x.strokeStyle = '#141414'; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-24 + i * 18, -30); x.lineTo(-24 + i * 18, 18); x.stroke(); }
    }
  });

  /* ---------- sniper: scope, slow motion, one huge shot ---------- */
  const sn = BD.mkGun({
    id: 'sniper', name: 'צלף', price: 450, power: 4, chaos: 2, rate: 1.1, dmg: 45, force: 5200, kick: .8, len: 190, snd: 'sniper', shake: .35, tracer: '#ffffff', tracerW: 7, muzzle: lift,
    desc: 'כוונת טלסקופית, ירייה אחת, הכל נהיה איטי לרגע. מעיף אותו לצד השני של החדר.', tip: 'כוונו לראש בשביל "הדשוט!"',
    onHit(r) {
      BD.fx.slowmo(.45, .15); BD.fx.zoom(1.18, .35, r.x, r.y); BD.fx.ring(r.x, r.y, 120, '#fff', .3, 10); BD.fx.lines(r.x, r.y, 10, Math.atan2(r.uy, r.ux), '#fff');
      if (r.part.name === 'head') { BD.fx.text(r.x, r.y - 80, 'הדשוט!', BD.YEL, 76, 1, -50); G.damage(25, r.x, r.y, { src: 'sniper', cat: 'guns' }); r.part.dummy.dizzy = 2.5; }
    },
    drawGun(x) {
      A.rect(x, 50, -8, 140, 10, '#2b2f33', 3, 4);
      A.rect(x, 176, -11, 18, 16, '#141414', 2, 3);
      A.poly(x, [[-80, -8], [60, -12], [60, 12], [10, 12], [-6, 24], [-80, 16]], '#5a6b3c', 4);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-70, -6, 120, 4);
      A.rect(x, 0, -34, 80, 16, '#1f1f1f', 6, 4);
      A.circ(x, 82, -26, 10, '#5fb8ff', 3);
      A.rect(x, 26, -20, 8, 10, '#1f1f1f', 1, 2); A.rect(x, 50, -20, 8, 10, '#1f1f1f', 1, 2);
      A.poly(x, [[100, 4], [104, 36], [116, 36], [110, 4]], '#2b2b2b', 3);
      x.strokeStyle = '#141414'; x.lineWidth = 4; x.beginPath(); x.arc(28, 16, 9, 0, Math.PI); x.stroke();
    }
  });
  wrap(sn, 'draw', function (base, x, P) {
    base.call(this, x, P);
    if (!P.over && !P.down) return;
    const R = 110, ready = this.st.cool <= 0;
    x.save();
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.rect(-50, -50, G.W + 100, G.H + 100); x.arc(P.x, P.y, R, 0, BD.TAU, true); x.fill();
    x.strokeStyle = '#141414'; x.lineWidth = 10; x.beginPath(); x.arc(P.x, P.y, R, 0, BD.TAU); x.stroke();
    x.strokeStyle = ready ? BD.RED : '#777'; x.lineWidth = 2; x.beginPath();
    x.moveTo(P.x - R, P.y); x.lineTo(P.x - 10, P.y); x.moveTo(P.x + 10, P.y); x.lineTo(P.x + R, P.y); x.moveTo(P.x, P.y - R); x.lineTo(P.x, P.y - 10); x.moveTo(P.x, P.y + 10); x.lineTo(P.x, P.y + R); x.stroke();
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(P.x - 6, P.y + i * 22); x.lineTo(P.x + 6, P.y + i * 22); x.stroke(); }
    x.fillStyle = ready ? BD.RED : '#777'; x.beginPath(); x.arc(P.x, P.y, 3, 0, BD.TAU); x.fill();
    x.restore();
  });

  /* ---------- laser: a continuous burning beam ---------- */
  const lz = BD.mkGun({
    id: 'laser', name: 'אקדח לייזר', price: 700, power: 3, chaos: 3, auto: true, rate: 99, len: 120, snd: null, shell: false, muzzle: lift,
    desc: 'קרן לייזר ורודה שלא נגמרת. משאירה סימני חריכה ומחממת אותו עד שהוא עולה באש.', tip: 'תעבירו את הקרן לאורך כל הגוף',
    shoot() {},
    tick(dt, P) {
      const st = this.st;
      if (!st.fire) { st.beam = null; if (st.lp) { st.lp.stop(); st.lp = null; } return; }
      if (!st.lp) { st.lp = BD.audio.loop('beam'); BD.audio.play('lzrOn'); }
      const [mx, my] = this.muzzle(), r = BD.ray(mx, my, mx + Math.cos(st.a) * 4000, my + Math.sin(st.a) * 4000);
      st.beam = { x0: mx, y0: my, x1: r.x, y1: r.y }; st.kick = .1;
      G.light(r.x, r.y, 220, .8, .06); G.light(mx, my, 160, .6, .06);
      if (Math.random() < .6) BD.fx.spark(r.x, r.y, 2, BD.pick(['#ff7ab8', '#fff']), 500);
      if (r.part) {
        const d = r.part.dummy;
        G.ph.push(r.part, r.ux * 60, r.uy * 60 - 20);
        d.soot = Math.min(1, d.soot + dt * .25);
        if (G.gate('lzd', .1)) { G.damage(3, r.x, r.y, { src: 'laser', cat: 'guns', comboGap: .4 }); d.setMood('scream', .4); }
        if (G.gate('lzm', .35)) d.mark(r.x, r.y, 'soot');
        if (G.gate('lzs', .3)) BD.audio.play('sizzle');
        if (Math.random() < dt * .8) d.ignite(1.2);
        if (Math.random() < .3) BD.fx.smoke(r.x, r.y, 1, '#666', 10, 80);
      } else if (r.ent) { r.ent.push(r.ux * 20, r.uy * 20); if (r.ent.hp !== Infinity) r.ent.hp -= dt * 1.5; }
      else if (r.surface && G.gate('lzscar', .08)) { BD.fx.stain(r.x, r.y, 6, '#2a1a1a', .25); if (Math.random() < .3) BD.fx.smoke(r.x, r.y, 1, '#777', 10, 60); }
    },
    drawGun(x) {
      A.rect(x, 30, -12, 80, 20, '#e8e8f0', 8, 4);
      A.rect(x, 104, -15, 18, 26, '#ff4f9a', 4, 4);
      x.fillStyle = '#ff4f9a'; for (let i = 0; i < 3; i++) x.fillRect(44 + i * 18, -8, 10, 12);
      A.poly(x, [[-20, -18], [40, -18], [40, 14], [-20, 14]], '#9aa3ad', 4);
      A.circ(x, 6, -2, 9, '#ff4f9a', 3);
      A.poly(x, [[0, 12], [26, 12], [18, 48], [-8, 48]], '#3a3f46', 4);
      x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(36, -9, 60, 3);
      A.poly(x, [[30, -18], [58, -34], [66, -34], [44, -18]], '#9aa3ad', 3);
    }
  });
  wrap(lz, 'draw', function (base, x, P) {
    const b = this.st.beam;
    if (b) {
      const w = 1 + Math.sin(G.rt * 60) * .15;
      x.lineCap = 'round';
      x.globalCompositeOperation = 'lighter';
      for (const [lw, c, a] of [[30, '#ff2d7a', .2], [16, '#ff4f9a', .45], [8, '#ffb3d6', .9]]) { x.globalAlpha = a; x.strokeStyle = c; x.lineWidth = lw * w; x.beginPath(); x.moveTo(b.x0, b.y0); x.lineTo(b.x1, b.y1); x.stroke(); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(b.x0, b.y0); x.lineTo(b.x1, b.y1); x.stroke();
      const s = 34 + Math.random() * 14; x.globalCompositeOperation = 'lighter'; x.drawImage(BD.fx.glow('#ff4f9a'), b.x1 - s, b.y1 - s, s * 2, s * 2); x.drawImage(BD.fx.glow('#ff4f9a'), b.x0 - 24, b.y0 - 24, 48, 48); x.globalCompositeOperation = 'source-over';
    }
    base.call(this, x, P);
  });

  /* ---------- minigun: spin up, then a wall of lead ---------- */
  BD.mkGun({
    id: 'minigun', name: 'מיניגאן', price: 900, power: 4, chaos: 5, auto: true, rate: .035, spinUp: 3.2, spread: .07, dmg: 4.5, force: 1150, kick: .35, len: 160, snd: 'mini', shake: .1, loopSnd: 'minigun', muzzle: lift,
    desc: 'שש קנים מסתובבים. צריך שנייה להסתובב, ואז זה לא נעצר.', tip: 'החזיקו ותראו אותו מרחף על הכדורים',
    tick(dt) { const st = this.st; st.rot = (st.rot || 0) + st.spin * dt * 45; },
    drawGun(x, st) {
      const rot = (st && st.rot) || 0;
      // barrels drawn back to front by depth so they really look like they spin
      const bs = []; for (let i = 0; i < 6; i++) { const a = rot + i * BD.TAU / 6; bs.push([Math.sin(a) * 11, Math.cos(a)]); }
      bs.sort((a, b) => a[1] - b[1]);
      for (const [y, z] of bs) { const sh = Math.round(60 + z * 40); A.rect(x, 40, y - 4, 120, 8, `rgb(${sh},${sh + 6},${sh + 12})`, 3, 3); }
      A.rect(x, 100, -18, 12, 36, '#2b2b2b', 2, 3); A.rect(x, 146, -17, 10, 34, '#2b2b2b', 2, 3);
      A.rect(x, -40, -24, 84, 46, '#5e6a75', 8, 4);
      x.fillStyle = BD.YEL; x.fillRect(-30, -18, 64, 6);
      A.rect(x, -20, 22, 34, 22, '#3a3a3a', 3, 4);
      x.strokeStyle = '#d4a73a'; x.lineWidth = 6; x.beginPath(); x.moveTo(-4, 44); x.quadraticCurveTo(-10, 70, -40, 64); x.stroke();
      x.strokeStyle = '#141414'; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-6 - i * 6, 46 + i * 4); x.lineTo(-2 - i * 6, 56 + i * 3); x.stroke(); }
      A.rect(x, -56, -12, 18, 30, '#2b2b2b', 3, 3);
      x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-34, -8, 70, 4);
    }
  });

  /* ---------- rocket launcher ---------- */
  function rocket(mx, my, a, src) {
    const sp = 900;
    BD.proj({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 12, life: 3.5, a,
      steer(dt) { const v = Math.hypot(this.vx, this.vy), nv = Math.min(2600, v + 3200 * dt); this.vx *= nv / v; this.vy *= nv / v; this.a = Math.atan2(this.vy, this.vx); },
      trail() {
        const bx = this.x - Math.cos(this.a) * 30, by = this.y - Math.sin(this.a) * 30;
        BD.fx.fire(bx, by, 1, 60, .7); if (Math.random() < .7) BD.fx.smoke(bx, by, 1, '#9a948c', 14, 30); G.light(bx, by, 160, .7, .05);
      },
      draw(x) {
        x.save(); x.translate(this.x, this.y); x.rotate(this.a);
        A.poly(x, [[-30, -9], [-38, -18], [-26, -9]], BD.RED, 3); A.poly(x, [[-30, 9], [-38, 18], [-26, 9]], BD.RED, 3);
        A.rect(x, -32, -9, 44, 18, '#d9dde1', 6, 4);
        A.poly(x, [[10, -9], [30, 0], [10, 9]], BD.RED, 4);
        x.fillStyle = '#141414'; x.fillRect(-12, -9, 4, 18);
        const f = 10 + Math.random() * 10; x.fillStyle = '#ffb000'; x.beginPath(); x.moveTo(-34, -6); x.lineTo(-34 - f * 2, 0); x.lineTo(-34, 6); x.fill(); x.fillStyle = '#fff3b0'; x.beginPath(); x.moveTo(-34, -3); x.lineTo(-34 - f, 0); x.lineTo(-34, 3); x.fill();
        x.restore();
      },
      onHit(h) { G.explode(h.x, h.y, 125, { src, cat: 'guns', dmg: 70 }); } });
  }
  BD.mkGun({
    id: 'launcher', name: 'משגר רקטות', price: 1000, power: 5, chaos: 4, rate: 1.1, len: 170, snd: 'rocketl', kick: .9, shake: .25, shell: false, muzzle: lift,
    desc: 'רקטה עם שובל עשן שמאיצה ומתפוצצת בכל דבר שהיא נוגעת בו.', tip: 'זרקו אותו לאוויר ותירו = "תקיפה אווירית!"',
    fire(mx, my, a) {
      rocket(mx, my, a, 'launcher');
      const [px, py] = this.pivot(); BD.fx.smoke(px - Math.cos(a) * 40, py - Math.sin(a) * 40, 6, '#bbb', 26, 30);
      BD.fx.glowAt(mx, my, 90, '#ffcf6a', .1); G.light(mx, my, 300, 1, .12);
    },
    drawGun(x) {
      A.rect(x, -50, -20, 220, 40, '#4f5a3a', 10, 5);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(-46, 6, 212, 10);
      x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-44, -15, 206, 6);
      A.rect(x, 150, -24, 24, 48, '#3a422a', 6, 4); A.rect(x, -60, -24, 22, 48, '#3a422a', 6, 4);
      x.fillStyle = BD.YEL; x.fillRect(110, -20, 10, 40); x.fillStyle = '#141414'; x.fillRect(114, -20, 3, 40);
      A.rect(x, 20, -40, 50, 18, '#1f1f1f', 4, 4); A.circ(x, 68, -31, 7, '#5fb8ff', 2);
      A.poly(x, [[0, 20], [26, 20], [18, 52], [-6, 52]], '#2b2b2b', 4);
      A.poly(x, [[60, 20], [80, 20], [76, 44], [58, 44]], '#2b2b2b', 4);
      A.poly(x, [[170, -12], [192, 0], [170, 12]], BD.RED, 3);
    }
  });

  /* ---------- plasma cannon: hold to charge, let go to fire ---------- */
  function plasmaBlast(x, y, ch) {
    const R = 80 + ch * 90;
    G.explode(x, y, R, { src: 'plasma', cat: 'guns', col: '#8a5cff', fire: false, dmg: 40 + ch * 60 });
    BD.audio.play('plasmaHit');
    BD.fx.ring(x, y, R * 2.2, '#64e4ff', .55, 16); BD.fx.ring(x, y, R * 1.4, '#c38bff', .4, 10);
    BD.fx.spark(x, y, 26, '#9fe8ff', 1100); BD.fx.glowAt(x, y, R * 2.4, '#7b4dff', .35); BD.fx.flash(.25, '#cbb8ff');
    G.light(x, y, R * 5, 1, .5);
    const d = G.dummy;
    if (d && !d.gone && Math.hypot(d.j.chest.x - x, d.j.chest.y - y) < R * 2.6) { d.zap = Math.max(d.zap, .6 + ch * .4); d.talk('zap'); BD.audio.play('zap'); }
    G.add({ z: 2, t: .5, seed: [], update(dt) { this.t -= dt; return this.t > 0; },
      draw(c) {
        const k = this.t / .5; c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) { const a = Math.random() * BD.TAU, L = R * (1 + Math.random() * 1.4); c.globalAlpha = k; BD.draw.bolt(c, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, i % 2 ? '#64e4ff' : '#c38bff', 3, 26, 8); }
        if (d && !d.gone && Math.random() < .6) BD.draw.bolt(c, x, y, d.j.chest.x, d.j.chest.y, '#9fe8ff', 3, 30, 8);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      } });
  }
  const pl = BD.mkGun({
    id: 'plasma', name: 'תותח פלזמה', price: 1300, power: 5, chaos: 4, rate: .5, len: 160, snd: 'plasma', kick: .9, shake: .3, shell: false, muzzle: lift,
    desc: 'מחזיקים כדי לטעון כדור אנרגיה, משחררים כדי לירות. ככל שטוענים יותר, הפיצוץ גדול יותר והבובה מתחשמלת.', tip: 'טעינה מלאה זה שנייה וקצת',
    shoot() {
      const st = this.st; if (st.charging || st.cool > 0) return;
      st.charging = true; st.ch = 0; BD.audio.play('charge', 1.2);
    },
    tick(dt) {
      const st = this.st; if (!st.charging) return;
      st.ch = Math.min(1, (st.ch || 0) + dt / 1.2);
      const [mx, my] = this.muzzle();
      if (Math.random() < .5 + st.ch) { const a = Math.random() * BD.TAU, r = 40 + st.ch * 30; BD.fx.trail(mx + Math.cos(a) * r, my + Math.sin(a) * r, BD.pick(['#64e4ff', '#c38bff']), 6, .2); }
      G.light(mx, my, 150 + st.ch * 200, .8, .06);
      if (st.ch >= 1 && G.gate('plfull', .5)) BD.audio.play('tick');
    },
    release() {
      const st = this.st; if (!st.charging) return;
      st.charging = false; st.cool = this.rate; st.kick = 1; st.flash = .08;
      const ch = Math.max(.25, st.ch || 0), [mx, my] = this.muzzle(), a = st.a, sp = 1500, r = 12 + ch * 22;
      BD.audio.play('plasma'); BD.fx.shake(.15 + ch * .3); BD.fx.ring(mx, my, 80, '#64e4ff', .25, 8);
      BD.proj({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, life: 3, ch,
        trail() { BD.fx.trail(this.x, this.y, '#7b4dff', this.r * 1.3, .25); if (Math.random() < .5) BD.fx.spark(this.x, this.y, 1, '#9fe8ff', 300); G.light(this.x, this.y, 260, .9, .05); },
        draw(c) {
          const s = this.r * (1 + Math.sin(G.rt * 40) * .1);
          c.globalCompositeOperation = 'lighter'; c.drawImage(BD.fx.glow('#7b4dff'), this.x - s * 3, this.y - s * 3, s * 6, s * 6); c.drawImage(BD.fx.glow('#64e4ff'), this.x - s * 1.6, this.y - s * 1.6, s * 3.2, s * 3.2); c.globalCompositeOperation = 'source-over';
          c.fillStyle = '#eaffff'; c.beginPath(); c.arc(this.x, this.y, s * .55, 0, BD.TAU); c.fill();
        },
        onHit(h) { plasmaBlast(h.x, h.y, this.ch); } });
    },
    drawGun(x) {
      A.rect(x, 40, -16, 110, 32, '#2b2f3a', 10, 4);
      for (let i = 0; i < 4; i++) A.rect(x, 54 + i * 22, -21, 10, 42, '#8a5cff', 3, 3);
      A.rect(x, 146, -20, 20, 40, '#3a3f4c', 6, 4);
      A.circ(x, 156, 0, 9, '#64e4ff', 3);
      A.poly(x, [[-40, -24], [44, -24], [44, 20], [-40, 20]], '#e1e4ea', 4);
      x.fillStyle = '#64e4ff'; x.fillRect(-30, -14, 60, 8);
      x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(-34, -20, 70, 3);
      A.poly(x, [[-10, 18], [16, 18], [8, 52], [-16, 52]], '#2b2b2b', 4);
      A.poly(x, [[-40, -10], [-66, -4], [-66, 14], [-40, 12]], '#3a3f4c', 4);
    }
  });
  wrap(pl, 'draw', function (base, x, P) {
    base.call(this, x, P);
    const st = this.st; if (!st.charging) return;
    const [mx, my] = this.muzzle(), s = 14 + st.ch * 34 + Math.sin(G.rt * 30) * 3;
    x.globalCompositeOperation = 'lighter';
    x.drawImage(BD.fx.glow('#7b4dff'), mx - s * 2.6, my - s * 2.6, s * 5.2, s * 5.2);
    x.drawImage(BD.fx.glow('#64e4ff'), mx - s * 1.4, my - s * 1.4, s * 2.8, s * 2.8);
    if (st.ch > .3) for (let i = 0; i < 2; i++) { const a = Math.random() * BD.TAU; BD.draw.bolt(x, mx, my, mx + Math.cos(a) * s * 1.8, my + Math.sin(a) * s * 1.8, '#9fe8ff', 2, 8, 4); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#f2ffff'; x.beginPath(); x.arc(mx, my, s * .45, 0, BD.TAU); x.fill();
  });
  /* aim at the press point before the first shot: a tap on a phone has no
     mouse-move before it, and chaos shots start from a fresh state */
  const ALL = ['pistol', 'paintball', 'shotgun', 'mg', 'water', 'sniper', 'laser', 'minigun', 'launcher', 'plasma'];
  ALL.forEach(id => wrap(BD.W[id], 'shoot', function (base, P) {
    if (P) { const [px, py] = this.pivot(); this.st.a = Math.atan2(P.y - py, P.x - px); }
    return base.call(this, P);
  }));
  /* the gun is held by someone standing just outside the room: it sits at the side
     wall at chest height, so shots fly over the props on the floor */
  /* bigger dock icons: fit the whole gun, stock included */
  const BACK = { pistol: 10, paintball: 40, shotgun: 76, mg: 64, water: 54, sniper: 82, laser: 22, minigun: 58, launcher: 62, plasma: 68 };
  ALL.forEach(id => { const w = BD.W[id]; w.icon = function (x, s) { const b = BACK[id], L = this.len + b, sc = s * 1.32 / L; x.save(); x.scale(sc, sc); x.rotate(-.3); x.translate(-L / 2 + b, 8); this.drawGun(x, { spin: 0 }); x.restore(); }; });
  ALL.forEach(id => {
    const w = BD.W[id];
    w.pivot = function () { return [this.st.side < 0 ? 74 : G.W - 74, BD.clamp(G.floor - 250, G.H * .3, G.floor - 140)]; };
    wrap(w, 'draw', function (base, x, P) {
      const st = this.st, [px, py] = this.pivot(), out = st.side < 0 ? -1 : 1, kx = -Math.cos(st.a) * (st.kick || 0) * 30, ky = -Math.sin(st.a) * (st.kick || 0) * 30;
      const gx = px + kx + Math.cos(st.a + Math.PI / 2 * (Math.cos(st.a) < 0 ? -1 : 1)) * 12, gy = py + ky + 22;
      // the sleeve comes in from outside the wall, with a tribe-red cuff
      x.lineCap = 'round';
      x.strokeStyle = '#141414'; x.lineWidth = 40; x.beginPath(); x.moveTo(px + out * 150, gy + 70); x.lineTo(gx + out * 26, gy + 4); x.stroke();
      x.strokeStyle = '#2b2b33'; x.lineWidth = 32; x.stroke();
      x.strokeStyle = BD.RED; x.lineWidth = 34; x.beginPath(); x.moveTo(gx + out * 34, gy + 9); x.lineTo(gx + out * 22, gy + 2); x.stroke();
      base.call(this, x, P);
      x.fillStyle = '#141414'; x.beginPath(); x.ellipse(gx + out * 6, gy - 2, 15, 13, 0, 0, BD.TAU); x.fill();
      x.fillStyle = '#f6c21c'; x.beginPath(); x.ellipse(gx + out * 6, gy - 2, 11, 9.5, 0, 0, BD.TAU); x.fill();
    });
  });
})();
