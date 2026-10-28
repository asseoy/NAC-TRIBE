/* Elements: fire, ice, lightning, tornado, meteor shower, earthquake, black hole,
   gravity, tidal wave and acid rain. */
'use strict';
(() => {
  const G = BD.G, A = BD.art;

  /* ---- fire: a torch that sprays flames where you hold it ---- */
  BD.weapon({
    id: 'fire', cat: 'elem', name: 'אש', price: 0, power: 2, chaos: 3,
    desc: 'מחזיקים ויוצאת להבה. הבובה נדלקת ורצה מצד לצד בצרחות.', tip: 'אחרי זה כבו אותו עם מים לקומבו "אדים"',
    enter() { this.st.on = false; },
    down() { this.st.on = true; this.st.lp = this.st.lp || BD.audio.loop('fire'); },
    up() { this.st.on = false; if (this.st.lp) { this.st.lp.stop(); this.st.lp = null; } },
    leave() { this.up(); },
    update(dt, P) {
      if (!this.st.on) return;
      const d = G.dummy, a = d && !d.gone ? Math.atan2(d.j.chest.y - P.y, d.j.chest.x - P.x) : -Math.PI / 2;
      this.st.a = a;
      for (let i = 0; i < 3; i++) {
        const sp = BD.rand(500, 900), aa = a + BD.rand(-.18, .18);
        BD.fx.fire(P.x + Math.cos(a) * 40, P.y + Math.sin(a) * 40, 1, 60, 1);
        BD.fx.S && null;
        G.add({ z: 2, x: P.x + Math.cos(a) * 40, y: P.y + Math.sin(a) * 40, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, t: .45,
          update(dt2) { this.t -= dt2; this.x += this.vx * dt2; this.y += this.vy * dt2; this.vy -= 400 * dt2; if (Math.random() < .5) BD.fx.fire(this.x, this.y, 1, 40, .9 + (.45 - this.t)); G.light(this.x, this.y, 160, .5, .1);
            const p = G.part(this.x, this.y, 12); if (p) { const dd = p.dummy; if (dd.wet > .3) { dd.wet = 0; G.special('steam'); BD.fx.smoke(p.x, p.y, 6, '#eef', 26, 120); BD.audio.play('sizzle'); } else dd.ignite(3); if (G.gate('fireDmg', .15)) G.damage(3, p.x, p.y, { src: 'fire', cat: 'elem', comboGap: .5 }); return false; }
            return this.t > 0 && this.y < G.floor; } });
      }
    },
    draw(x, P) {
      if (!P.over && !P.down) return; const a = this.st.on ? this.st.a : -Math.PI / 2 - .4;
      x.save(); x.translate(P.x, P.y); x.rotate(a); this.drawIt(x, G.rt, this.st.on); x.restore();
    },
    drawIt(x, t, on) {
      A.rect(x, -70, -12, 64, 24, BD.RED, 6, 4);
      A.rect(x, -10, -16, 34, 32, '#3b4148', 4, 4);
      x.fillStyle = '#141414'; x.fillRect(22, -6, 8, 12);
      if (!on) { const f = 1 + Math.sin(t * 20) * .15; x.fillStyle = '#ff7a00'; x.beginPath(); x.ellipse(40, 0, 12 * f, 7, 0, 0, BD.TAU); x.fill(); x.fillStyle = '#ffd54a'; x.beginPath(); x.ellipse(37, 0, 6 * f, 4, 0, 0, BD.TAU); x.fill(); }
    },
    fireAt(x, y) { const p = G.part(x, y, 500); if (p) { p.dummy.ignite(3); BD.fx.fire(p.x, p.y, 20, 200, 1.2); BD.audio.play('fire'); G.damage(10, p.x, p.y, { src: 'fire', cat: 'elem' }); } },
    icon(x, s, t = 0) { x.save(); const k = s / 120; x.scale(k, k); x.rotate(-.5); x.translate(10, 0); this.drawIt(x, t, false); x.restore(); }
  });

  /* ---- shared bits for the elemental powers ---- */
  BD.audio.def('thunder', ({ tone, noise }) => { noise(.12, 1, 7000, 1500, .7, 'highpass'); noise(2, .9, 1100, 40, .6); tone('sine', 62, 24, 1.6, .6); noise(1.2, .5, 400, 60, .6, 'lowpass', .25); });
  BD.audio.def('splash', ({ noise, tone }, f = 1) => { noise(.5 + f * .5, .7, 2600, 300, .6, 'bandpass'); noise(.25, .5, 7000, 2000, 1, 'highpass'); tone('sine', 120, 50, .4, .3 * f); });
  BD.audio.def('meteor', ({ noise }) => { noise(1, .4, 3500, 180, 1.2, 'bandpass'); });
  BD.audio.def('warp', ({ tone, noise }) => { tone('sine', 70, 620, .5, .3); tone('sine', 620, 70, .6, .2, .4); noise(.9, .2, 300, 3000, 2, 'bandpass'); });
  BD.audio.def('crackle', ({ noise }) => { for (let i = 0; i < 6; i++) noise(.05, .55, 3200, 600, 1, 'lowpass', i * .06); });
  BD.audio.def('swallow', ({ tone, noise }) => { tone('sine', 420, 28, 1.3, .5); tone('square', 210, 20, 1.1, .1); noise(1.1, .5, 2400, 50, 1); });
  BD.audio.def('icenova', ({ tone, noise, rand }) => { for (let i = 0; i < 10; i++) tone('sine', rand(1800, 4200), rand(3000, 6000), .25, .05, i * .02); noise(.5, .35, 9000, 2500, 2, 'highpass'); tone('triangle', 1200, 400, .3, .1); });
  // translucent icon of the power that follows the pointer
  const ghost = function (x, P) { if (!P.over || (P.touch && !P.down)) return; x.save(); x.globalAlpha = .6; x.translate(P.x, P.y - 6); this.icon(x, 64, G.rt); x.restore(); };
  const dummyAt = () => { const d = G.dummy; return d && !d.gone ? d : null; };
  // every physical particle that can be moved by a force
  const movable = () => G.ph.ps.filter(p => p.alive && p.im > 0);
  const entOf = p => p.ent || (p.body && p.body.ent);

  /* ---- ice: a freezing nova where you tap ---- */
  BD.weapon({
    id: 'ice', cat: 'elem', name: 'קרח', price: 150, power: 2, chaos: 2,
    desc: 'פיצוץ קפוא שהופך את הבובה לגוש קרח. עכשיו רק צריך לשבור אותו.', tip: 'הקפיאו ואז פטיש או מחבט = שובר קרח',
    down(P) { this.blast(P.x, P.y); }, fireAt(x, y) { this.blast(x, y); }, draw: ghost,
    blast(x, y) {
      if (!G.gate('ice', .35)) return;
      BD.audio.play('icenova'); BD.audio.play('freeze');
      const spikes = Array.from({ length: 11 }, (_, i) => ({ a: i / 11 * BD.TAU + BD.rand(-.2, .2), len: BD.rand(60, 120), w: BD.rand(10, 18) }));
      const flakes = Array.from({ length: 22 }, () => { const a = Math.random() * BD.TAU, v = BD.rand(80, 380); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, r: BD.rand(4, 9), rot: Math.random() * 6 }; });
      G.add({ z: 2, t: 0,
        update(dt) {
          this.t += dt;
          for (const f of flakes) { f.vx *= .96; f.vy = f.vy * .96 + 60 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 2; }
          return this.t < 1.6;
        },
        draw(c) {
          const k = Math.min(1, this.t / .14), fade = BD.clamp((1.1 - this.t) / .5, 0, 1);
          if (fade > 0) {
            c.globalAlpha = fade;
            for (const s of spikes) {
              const L = s.len * k, ca = Math.cos(s.a), sa = Math.sin(s.a), nx = -sa * s.w / 2, ny = ca * s.w / 2;
              A.poly(c, [[x + nx, y + ny], [x + ca * L * .75 + nx * .7, y + sa * L * .75 + ny * .7], [x + ca * L, y + sa * L], [x + ca * L * .75 - nx * .7, y + sa * L * .75 - ny * .7], [x - nx, y - ny]], '#bfefff', 3);
              c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ca * L * .8, y + sa * L * .8); c.stroke();
            }
            A.circ(c, x, y, 18 * k, '#e9fbff', 3);
          }
          c.globalAlpha = BD.clamp((1.6 - this.t) / .6, 0, 1);
          c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.lineCap = 'round';
          for (const f of flakes) { c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(-Math.cos(a) * f.r, -Math.sin(a) * f.r); c.lineTo(Math.cos(a) * f.r, Math.sin(a) * f.r); } c.stroke(); c.restore(); }
          c.globalAlpha = 1;
        } });
      BD.fx.shards(x, y, 12); BD.fx.ring(x, y, 170, '#bfefff', .45, 12); BD.fx.ring(x, y, 90, '#fff', .3, 6); BD.fx.glowAt(x, y, 160, '#9fe4ff', .3);
      G.light(x, y, 300, .8, .3);
      if (y > G.floor - 40) BD.fx.stain(x, G.floor - 2, 60, '#cfefff', .5);
      const d = dummyAt(); if (!d) return;
      const [p, dd] = d.nearest(x, y);
      if (dd < 120) {
        const was = d.frozen; d.freeze(5);
        G.damage(6, p.x, p.y, { src: 'ice', cat: 'elem' });
        if (!was) BD.fx.text(p.x, p.y - 90, 'קפוא!', '#bfefff', 64, .9, -60);
        for (const q of d.parts) G.ph.setVel(q, G.ph.vel(q)[0] * .3, G.ph.vel(q)[1] * .3);
      }
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k); x.rotate(t * .5);
      for (let i = 0; i < 6; i++) { const a = i / 6 * BD.TAU; x.save(); x.rotate(a); A.poly(x, [[-7, 0], [-5, -34], [0, -48], [5, -34], [7, 0]], i % 2 ? '#9fdcff' : '#d6f4ff', 3); x.strokeStyle = '#141414'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -26); x.lineTo(-10, -36); x.moveTo(0, -26); x.lineTo(10, -36); x.stroke(); x.restore(); }
      A.circ(x, 0, 0, 14, '#e9fbff', 3); x.restore();
    }
  });

  /* ---- lightning: a storm cloud, then a branching bolt ---- */
  BD.weapon({
    id: 'lightning', cat: 'elem', name: 'ברק', price: 300, power: 3, chaos: 3,
    desc: 'ענן סערה קטן נוצר מעל, וברק פוגע בבובה. רואים לה את השלד.', tip: 'זרקו אותה לאוויר ואז ברק = קפיצה חשמלית',
    down(P) { this.strike(P.x, P.y); }, fireAt(x, y) { this.strike(x, y); }, draw: ghost,
    strike(x, y) {
      if (!G.gate('bolt', .45)) return;
      const cy = Math.max(70, Math.min(140, y - 260));
      const e = { z: 2, t: 0, x, cy, puffs: Array.from({ length: 7 }, (_, i) => [(i - 3) * 30 + BD.rand(-8, 8), BD.rand(-14, 14), BD.rand(30, 46)]) };
      e.update = function (dt) {
        this.t += dt;
        if (this.t < .38 && Math.random() < .3) G.light(this.x, this.cy, 160, .4, .05);
        if (!this.hit && this.t >= .38) {
          this.hit = 1;
          const d = dummyAt(); let tx = x, ty = G.floor, part = null;
          if (d) { const [p, dd] = d.nearest(x, y); if (dd < 250) { part = p; tx = p.x; ty = p.y; } }
          this.tx = tx; this.ty = ty;
          BD.audio.play('thunder'); BD.fx.flash(.55, '#eaf4ff'); BD.fx.shake(.45); G.light(tx, ty, 700, 1, .5);
          BD.fx.spark(tx, ty, 24, '#bfe9ff', 1000); BD.fx.ring(tx, ty, 150, '#dff3ff', .35, 10); BD.fx.glowAt(tx, ty, 220, '#bfe9ff', .3);
          if (part) {
            const dm = part.dummy; dm.zap = 1.2; dm.soot = Math.min(1, dm.soot + .15);
            G.hit(part, BD.rand(-300, 300), -1100, { dmg: 22, src: 'lightning', cat: 'elem', snd: 'zap', mark: 'soot' });
            if (dm.frozen) dm.thaw(true);
            dm.talk('zap', true);
          } else {
            BD.fx.stain(tx, G.floor - 2, 40, '#000', .45); BD.fx.debris(tx, G.floor, 8, G.arena.chips, 600, 7); BD.audio.play('zap');
            for (const en of G.ents) if (en.grabbable && !en.dead) { const [ex, ey] = en.pos(); if (Math.hypot(ex - tx, ey - ty) < 120) en.push(BD.rand(-300, 300), -900); }
          }
        }
        return this.t < 1.1;
      };
      e.draw = function (c) {
        const k = BD.clamp(this.t / .25, 0, 1), fade = BD.clamp((1.1 - this.t) / .35, 0, 1);
        if (this.hit && this.t < .72) {
          const pts = BD.draw.bolt(c, this.x + BD.rand(-10, 10), this.cy + 20, this.tx, this.ty, '#bfe9ff', 6, 46, 11);
          for (let i = 0; i < 3; i++) { const p = pts[2 + i * 3]; if (p) BD.draw.bolt(c, p[0], p[1], p[0] + BD.rand(-120, 120), p[1] + BD.rand(40, 150), '#bfe9ff', 2.5, 22, 5); }
        }
        // the cloud
        c.globalAlpha = fade;
        const flick = this.t < .4 && Math.random() < .25;
        for (const [dx, dy, r] of this.puffs) A.circ(c, this.x + dx * k, this.cy + dy * k, r * k, '#3d4652', 4);
        for (const [dx, dy, r] of this.puffs) { c.fillStyle = flick ? '#9fb8d6' : '#55606e'; c.beginPath(); c.arc(this.x + dx * k, this.cy + dy * k - 4, r * k * .8, 0, BD.TAU); c.fill(); }
        c.globalAlpha = 1;
      };
      G.add(e); BD.audio.play('rumble', .5);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      for (const [dx, dy, r] of [[-26, -18, 22], [0, -28, 28], [26, -16, 22], [8, -8, 22], [-14, -6, 18]]) A.circ(x, dx, dy, r, '#3d4652', 4);
      for (const [dx, dy, r] of [[-26, -20, 16], [0, -31, 21], [26, -18, 16]]) { x.fillStyle = '#5c6877'; x.beginPath(); x.arc(dx, dy, r, 0, BD.TAU); x.fill(); }
      const fl = Math.sin(t * 9) > .3 ? '#fff' : BD.YEL;
      A.poly(x, [[4, 4], [-14, 30], [0, 30], [-10, 54], [18, 22], [4, 22], [14, 4]], fl, 4);
      x.restore();
    }
  });

  /* ---- acid rain: a green cloud follows the dummy ---- */
  BD.weapon({
    id: 'acid', cat: 'elem', name: 'גשם חומצה', price: 450, power: 2, chaos: 3,
    desc: 'ענן ירוק נתקע מעל הבובה ומטפטף עליה חומצה זוהרת. היא קופצת ומשתוללת.', tip: 'שלבו עם כבידה אפס, הטיפות רודפות אחריה',
    down(P) { this.cloud(P.x); }, fireAt(x) { this.cloud(x); }, draw: ghost,
    cloud(x) {
      if (G.ents.some(e => e.acid && !e.dead) || !G.gate('acid', .5)) return;
      const lp = BD.audio.loop('rain');
      const e = { z: 2, acid: true, t: 0, life: 5.2, x, y: 110, drops: [], puffs: Array.from({ length: 9 }, (_, i) => [(i - 4) * 34, BD.rand(-14, 14), BD.rand(32, 48)]) };
      e.update = function (dt) {
        this.t += dt;
        const d = dummyAt(); if (d) this.x = BD.lerp(this.x, d.j.chest.x, dt * 1.6);
        this.y = 100 + Math.sin(this.t * 2) * 8;
        const on = this.t > .4 && this.t < this.life - .5;
        lp.set(on ? .9 : .2);
        if (on) for (let i = 0; i < 2; i++) this.drops.push({ x: this.x + BD.rand(-150, 150), y: this.y + 30, vy: BD.rand(500, 700) });
        for (const p of this.drops) {
          p.vy += 1600 * dt; p.y += p.vy * dt;
          const part = G.part(p.x, p.y, 5);
          if (part) {
            p.dead = 1; const dm = part.dummy;
            BD.fx.spark(p.x, p.y, 3, '#9cff6a', 250); if (Math.random() < .25) BD.fx.smoke(p.x, p.y, 1, 'rgba(120,200,90,.6)', 8, 60);
            if (G.gate('acidM', .22)) dm.mark(p.x, p.y, 'acid');
            if (G.gate('acidD', .12)) { G.damage(2, p.x, p.y, { src: 'acid', cat: 'elem', comboGap: .5 }); dm.setMood('scream', .6); G.ph.push(BD.pick(dm.parts), BD.rand(-500, 500), BD.rand(-700, -200)); dm.stun = Math.max(dm.stun, .3); }
            if (G.gate('acidS', .3)) BD.audio.play('sizzle');
            if (Math.random() < .03) dm.talk('hurt');
          } else if (p.y > G.floor) { p.dead = 1; BD.fx.stain(p.x, G.floor - 2, BD.rand(6, 14), '#62d12c', .35); if (Math.random() < .3) BD.fx.bubbles(p.x, G.floor - 4, 2, '#9cff6a'); }
        }
        this.drops = this.drops.filter(p => !p.dead);
        G.light(this.x, this.y + 40, 260, .4, .05);
        if (this.t > this.life) { lp.stop(); return false; }
      };
      e.kill = () => lp.stop();
      e.draw = function (c) {
        const k = BD.clamp(this.t / .4, 0, 1) * BD.clamp((this.life - this.t) / .5, 0, 1);
        c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#7cff3b'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
        for (const p of this.drops) { c.moveTo(p.x, p.y); c.lineTo(p.x, p.y - 14); } c.stroke(); c.globalCompositeOperation = 'source-over';
        c.globalAlpha = k;
        for (const [dx, dy, r] of this.puffs) A.circ(c, this.x + dx, this.y + dy, r, '#3f5a34', 4);
        for (const [dx, dy, r] of this.puffs) { c.fillStyle = '#5f8a46'; c.beginPath(); c.arc(this.x + dx - 3, this.y + dy - 6, r * .75, 0, BD.TAU); c.fill(); }
        c.fillStyle = 'rgba(160,255,90,.35)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(this.x - 100 + i * 66, this.y + 30, 10 + Math.sin(this.t * 6 + i) * 3, 0, BD.TAU); c.fill(); }
        // two angry eyes in the cloud
        c.fillStyle = '#141414'; c.beginPath(); c.ellipse(this.x - 22, this.y - 2, 7, 9, 0, 0, BD.TAU); c.ellipse(this.x + 22, this.y - 2, 7, 9, 0, 0, BD.TAU); c.fill();
        c.lineWidth = 4; c.strokeStyle = '#141414'; c.beginPath(); c.moveTo(this.x - 34, this.y - 18); c.lineTo(this.x - 12, this.y - 10); c.moveTo(this.x + 34, this.y - 18); c.lineTo(this.x + 12, this.y - 10); c.stroke();
        c.globalAlpha = 1;
      };
      G.add(e); BD.audio.play('rumble', .4);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      x.strokeStyle = '#7cff3b'; x.lineWidth = 5; x.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const yy = ((t * 60 + i * 13) % 30); x.beginPath(); x.moveTo(-27 + i * 18, 12 + yy); x.lineTo(-27 + i * 18, 22 + yy); x.stroke(); }
      for (const [dx, dy, r] of [[-26, -14, 22], [0, -24, 28], [26, -12, 22], [6, -2, 22], [-14, 0, 18]]) A.circ(x, dx, dy, r, '#3f5a34', 4);
      for (const [dx, dy, r] of [[-26, -17, 15], [0, -28, 20], [26, -15, 15]]) { x.fillStyle = '#6f9f50'; x.beginPath(); x.arc(dx, dy, r, 0, BD.TAU); x.fill(); }
      x.fillStyle = '#141414'; x.beginPath(); x.ellipse(-10, -10, 5, 6, 0, 0, BD.TAU); x.ellipse(10, -10, 5, 6, 0, 0, BD.TAU); x.fill();
      x.restore();
    }
  });

  /* ---- gravity: pull everything toward where you tap ---- */
  BD.weapon({
    id: 'gravity', cat: 'elem', name: 'כבידה', price: 400, power: 1, chaos: 4,
    desc: 'הופכים את הכבידה לכיוון שלוחצים: לתקרה, לקירות, או בכלל בלי. לחמש שניות.', tip: 'לחיצה במרכז החדר = אפס כבידה',
    down(P) { this.bend(P.x, P.y); }, fireAt(x, y) { this.bend(BD.rand(0, G.W), BD.rand(0, G.H)); },
    draw(x, P) {
      if (!P.over || (P.touch && !P.down)) return;
      const cx = G.W / 2, cy = G.H / 2, dx = P.x - cx, dy = P.y - cy, d = Math.hypot(dx, dy);
      x.save(); x.globalAlpha = .35; x.strokeStyle = BD.YEL; x.lineWidth = 4; x.setLineDash([12, 10]); x.beginPath();
      if (d < 130) x.arc(cx, cy, 130, 0, BD.TAU); else { x.moveTo(cx, cy); x.lineTo(P.x, P.y); }
      x.stroke(); x.restore();
    },
    bend(x, y) {
      if (!G.gate('grav', .3)) return;
      const cx = G.W / 2, cy = G.H / 2, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      let gx = 0, gy = 0, label = 'אפס כבידה';
      if (d > 130) { gx = dx / d * 1.2; gy = dy / d * 1.2; label = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'כבידה לתקרה' : 'כבידה כפולה') : (dx < 0 ? 'כבידה שמאלה' : 'כבידה ימינה'); if (dy > 0 && Math.abs(dy) > Math.abs(dx)) gy = 2.2; }
      G.bendGravity(gx, gy, 5);
      G.ents.filter(e => e.gravInd).forEach(e => e.dead = true);
      // nudge everything so the change is felt right away
      for (const p of movable()) G.ph.push(p, gx * 300 + BD.rand(-80, 80), (gy - 1) * 250);
      const dm = dummyAt(); if (dm) { dm.stun = Math.max(dm.stun, 1.5); dm.setMood('scared', 1.5); if (Math.random() < .5) dm.talk('fly'); }
      BD.audio.play('warp'); BD.fx.flash(.2, '#d9c8ff');
      BD.fx.text(cx, 160, label, BD.YEL, 64, 1.3, -20);
      const ang = d > 130 ? Math.atan2(gy, gx) : 0, zero = d <= 130;
      G.add({ z: 3, gravInd: true, t: 0, life: 5,
        update(dt) { this.t += dt; if (Math.random() < dt * 3) BD.fx.ring(cx, cy, 380, 'rgba(190,160,255,.6)', 1, 4); return this.t < this.life && (G.gravT > 0 || this.t < .2); },
        draw(c) {
          const k = BD.clamp(this.t / .25, 0, 1) * BD.clamp((this.life - this.t) / .4, 0, 1), pulse = 1 + Math.sin(this.t * 8) * .06;
          c.save(); c.globalAlpha = .55 * k;
          // expanding ripple rings
          c.strokeStyle = '#b9a2ff'; c.lineWidth = 3;
          for (let i = 0; i < 3; i++) { const r = ((this.t * 120 + i * 90) % 270) + 30; c.globalAlpha = .5 * k * (1 - r / 300); c.beginPath(); c.arc(cx, cy, r, 0, BD.TAU); c.stroke(); }
          c.globalAlpha = .8 * k; c.translate(cx, cy); c.scale(pulse, pulse);
          if (zero) {
            c.rotate(this.t * 1.5);
            for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); A.poly(c, [[34, -10], [70, -10], [70, -22], [96, 0], [70, 22], [70, 10], [34, 10]], BD.YEL, 4); }
            A.circ(c, 0, 0, 22, '#141414', 3);
          } else {
            c.rotate(ang); const sh = (this.t * 160) % 40;
            for (let i = 0; i < 3; i++) { c.globalAlpha = .25 * k * (i + 1); A.poly(c, [[-120 + i * 40 + sh, -14], [-90 + i * 40 + sh, 0], [-120 + i * 40 + sh, 14]], BD.YEL, 3); }
            c.globalAlpha = .85 * k;
            A.poly(c, [[-70, -18], [40, -18], [40, -44], [110, 0], [40, 44], [40, 18], [-70, 18]], BD.YEL, 5);
          }
          c.restore();
        } });
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      x.strokeStyle = '#8f74e8'; x.lineWidth = 4;
      for (let i = 0; i < 3; i++) { x.globalAlpha = .4 + i * .2; x.beginPath(); x.ellipse(0, 6, 46 - i * 12, 14 - i * 3, 0, 0, BD.TAU); x.stroke(); }
      x.globalAlpha = 1;
      const b = Math.sin(t * 3) * 6;
      A.poly(x, [[-12, 30 + b], [-12, -10 + b], [-28, -10 + b], [0, -44 + b], [28, -10 + b], [12, -10 + b], [12, 30 + b]], BD.YEL, 4);
      x.restore();
    }
  });

  /* ---- tornado: a funnel that wanders across the room ---- */
  BD.weapon({
    id: 'tornado', cat: 'elem', name: 'טורנדו', price: 800, power: 3, chaos: 5,
    desc: 'משפך רוח מסתובב נודד בחדר ושואב את הבובה וכל מה שעל הרצפה למעלה.', tip: 'זרקו רימון לתוך הטורנדו = טורנדו של אש',
    down(P) { this.spawn(P.x); }, fireAt(x) { this.spawn(x); }, draw: ghost,
    spawn(x0) {
      if (G.ents.filter(e => e.tornado && !e.dead).length >= 2 || !G.gate('torn', .5)) return;
      const lp = BD.audio.loop('wind'), top = 30;
      const R = y => 46 + (G.floor - y) * .34;
      const e = { z: 2, tornado: true, t: 0, life: 6.5, x: BD.clamp(x0, 120, G.W - 120), vx: (x0 < G.W / 2 ? 1 : -1) * 170,
        deb: Array.from({ length: 16 }, () => ({ h: Math.random(), a: Math.random() * BD.TAU, w: BD.rand(3, 6), s: BD.rand(5, 12), c: BD.pick(['#8d6e63', '#5d4037', '#a1887f', '#cfd8dc']) })) };
      e.str = function () { return BD.clamp(this.t / .7, 0, 1) * BD.clamp((this.life - this.t) / .7, 0, 1); };
      e.sub = function () {
        const s = this.str(); if (s <= 0) return;
        const gy = 2300 * Math.max(G.ph.gScale, .3);
        for (const p of movable()) {
          const dx = p.x - this.x, r = R(p.y);
          if (Math.abs(dx) > r + 110 || p.y < top) continue;
          const inside = Math.abs(dx) < r ? 1 : .45;
          p.ax += -dx * 26 * s + Math.sin(this.t * 9 + p.y * .02) * 2600 * s * inside;
          p.ay -= gy * (p.y > 190 ? 1.35 : .85) * s * inside;
          if (p.dummy) { const d = p.dummy; d.stun = Math.max(d.stun, .5); }
        }
      };
      e.update = function (dt) {
        this.t += dt; const s = this.str();
        this.x += this.vx * dt; if (this.x < 130 || this.x > G.W - 130) { this.vx *= -1; this.x = BD.clamp(this.x, 130, G.W - 130); }
        G.tornadoOn = true; lp.set(.3 + s * .9, 400 + s * 300);
        for (const b of this.deb) b.a += dt * b.s;
        if (Math.random() < .5 * s) BD.fx.smoke(this.x + BD.rand(-60, 60), G.floor - 10, 1, G.arena.dust, 24, 120);
        const d = dummyAt();
        if (d && s > .3) {
          const dx = d.j.chest.x - this.x;
          if (Math.abs(dx) < R(d.j.chest.y) + 40) {
            d.dizzy = Math.min(4, d.dizzy + dt * 1.5); d.setMood(d.dizzy > 2 ? 'dizzy' : 'scream', .5);
            if (G.gate('tornD', .25)) G.damage(3, d.j.chest.x, d.j.chest.y, { src: 'tornado', cat: 'elem', comboGap: .45 });
            if (Math.random() < dt * .6) d.talk('fly');
          }
        }
        if (this.t > this.life) return false;
      };
      e.kill = function () { lp.stop(); G.tornadoOn = G.ents.some(o => o !== this && o.tornado && !o.dead); };
      e.draw = function (c) {
        const s = this.str(), N = 20, H = G.floor - top;
        c.save(); c.globalAlpha = .25 + .45 * s;
        const pts = [];
        for (let i = 0; i <= N; i++) { const y = G.floor - i * H / N, r = R(y) * (.3 + .7 * s), x = this.x + Math.sin(this.t * 3 + i * .45) * 14 * (i / N) * 2; pts.push([x, y, r]); }
        // body
        c.fillStyle = 'rgba(205,210,214,.5)'; c.beginPath();
        pts.forEach(([x, y, r], i) => i ? c.lineTo(x - r, y) : c.moveTo(x - r, y));
        for (let i = N; i >= 0; i--) c.lineTo(pts[i][0] + pts[i][2], pts[i][1]);
        c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,20,20,.45)'; c.lineWidth = 3; c.stroke();
        // spinning bands
        c.lineCap = 'round';
        for (let i = 1; i <= N; i++) {
          const [x, y, r] = pts[i];
          c.strokeStyle = i % 2 ? 'rgba(255,255,255,.75)' : 'rgba(120,128,136,.6)'; c.lineWidth = 3 + i * .15;
          c.setLineDash([r * .7, r * .5]); c.lineDashOffset = -this.t * (500 + i * 30);
          c.beginPath(); c.ellipse(x, y, r, r * .2, 0, 0, BD.TAU); c.stroke();
        }
        c.setLineDash([]);
        c.globalAlpha = 1;
        // debris orbiting around the funnel
        for (const b of this.deb) {
          const i = Math.round(b.h * N), [x, y, r] = pts[i], ox = x + Math.cos(b.a) * r * 1.05, oy = y + Math.sin(b.a) * r * .2;
          c.globalAlpha = Math.sin(b.a) < 0 ? .45 * s : s;
          c.save(); c.translate(ox, oy); c.rotate(b.a * 2); c.fillStyle = b.c; c.fillRect(-b.w, -b.w * .6, b.w * 2, b.w * 1.2); c.restore();
        }
        c.restore();
      };
      G.add(e); BD.audio.play('whoosh');
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      for (let i = 0; i < 7; i++) {
        const y = 42 - i * 14, r = 8 + i * 7, xo = Math.sin(t * 4 + i * .6) * 4;
        x.lineWidth = 9; x.strokeStyle = '#141414'; x.beginPath(); x.ellipse(xo, y, r, r * .28, 0, 0, BD.TAU); x.stroke();
        x.lineWidth = 5; x.strokeStyle = i % 2 ? '#e3e8ec' : '#9aa5ad'; x.stroke();
      }
      x.restore();
    }
  });

  /* ---- earthquake: the floor jumps in waves ---- */
  BD.weapon({
    id: 'quake', cat: 'elem', name: 'רעידת אדמה', price: 900, power: 3, chaos: 4,
    desc: 'ארבע שניות שהחדר רועד: הרצפה נסדקת, הכל קופץ באוויר ודברים נופלים מהתקרה.', tip: 'הכדור והחביות קופצים גם, תיזהרו מהחבית',
    down() { this.quake(); }, fireAt() { this.quake(); }, draw: ghost,
    quake() {
      if (G.ents.some(e => e.quake && !e.dead) || !G.gate('quake', .5)) return;
      const lp = BD.audio.loop('rumble'), dir = Math.random() < .5 ? 1 : -1;
      const e = { z: 0, quake: true, t: 0, shakeT: 4, life: 6, cracks: [], pulse: 0, wx: dir > 0 ? -100 : G.W + 100, dir, kicked: new Map() };
      e.addCrack = function () {
        const x0 = BD.rand(40, G.W - 40), y0 = G.floor + BD.rand(6, (G.H - G.floor) * .7), pts = [[x0, y0]];
        let x = x0, y = y0; for (let i = 0; i < 7; i++) { x += BD.rand(18, 36) * (Math.random() < .5 ? -1 : 1); y += BD.rand(-8, 8); y = BD.clamp(y, G.floor + 3, G.H - 4); pts.push([x, y]); }
        this.cracks.push({ pts, t: 0, up: Math.random() < .35 ? BD.rand(40, 120) : 0 });
        BD.audio.play('crackle'); BD.fx.debris(x0, G.floor, 4, G.arena.chips, 400, 6);
      };
      e.update = function (dt) {
        this.t += dt; const on = this.t < this.shakeT, k = on ? BD.clamp(this.t / .3, 0, 1) : 0;
        if (on) {
          BD.fx.shakeTo(.5 * k);
          lp.set(.4 + k * .8);
          // a wave front runs across the floor and kicks what it passes
          this.wx += this.dir * 1300 * dt;
          if (this.wx > G.W + 150 || this.wx < -150) { this.dir *= -1; this.kicked.clear(); }
          for (const p of movable()) {
            if (p.y < G.floor - p.r - 8) continue;
            if (Math.abs(p.x - this.wx) > 70 || this.kicked.has(p)) continue;
            this.kicked.set(p, 1);
            G.ph.push(p, BD.rand(-160, 160), -BD.rand(700, 1150) * k);
          }
          this.pulse -= dt;
          if (this.pulse <= 0) { this.pulse = BD.rand(.25, .5); if (this.cracks.length < 12) this.addCrack(); BD.audio.play('stomp'); }
          if (Math.random() < dt * 6) BD.fx.debris(BD.rand(30, G.W - 30), 4, 1, G.arena.chips, 120, BD.rand(6, 12));
          if (Math.random() < dt * 8) BD.fx.smoke(BD.rand(0, G.W), G.floor - 6, 1, G.arena.dust, 22, 50);
          const d = dummyAt();
          if (d) { d.stun = Math.max(d.stun, .4); if (d.air > .1 && G.gate('quakeD', .3)) { G.damage(4, d.j.chest.x, d.j.chest.y, { src: 'quake', cat: 'elem', comboGap: .5 }); d.setMood('scared', .6); } if (Math.random() < dt * .4) d.talk('scared'); }
        } else lp.set(0);
        for (const c of this.cracks) c.t += dt;
        if (this.t > this.life) { lp.stop(); return false; }
      };
      e.kill = () => lp.stop();
      e.draw = function (c) {
        const fade = BD.clamp((this.life - this.t) / 1.5, 0, 1);
        c.save(); c.globalAlpha = fade; c.lineJoin = 'round'; c.lineCap = 'round';
        for (const cr of this.cracks) {
          const g = BD.clamp(cr.t / .25, 0, 1), n = Math.max(2, Math.round(cr.pts.length * g));
          c.strokeStyle = '#1c1a17'; c.lineWidth = 5; c.beginPath(); cr.pts.slice(0, n).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.beginPath(); cr.pts.slice(0, n).forEach(([x, y], i) => i ? c.lineTo(x, y + 3) : c.moveTo(x, y + 3)); c.stroke();
          if (cr.up) { const [x0] = cr.pts[0]; c.strokeStyle = 'rgba(60,45,25,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, G.floor); let yy = G.floor, xx = x0; while (yy > G.floor - cr.up * g) { yy -= 14; xx += BD.rand(-8, 8); c.lineTo(xx, yy); } c.stroke(); }
        }
        c.restore();
      };
      G.add(e); BD.fx.shake(.6); BD.audio.play('boom', .5);
      BD.fx.text(G.W / 2, 170, 'רעידת אדמה!', BD.YEL, 72, 1.2, -20);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k); x.translate(Math.sin(t * 30) * 2, 0);
      A.poly(x, [[-48, -6], [-4, -10], [-10, 10], [6, 14], [-2, 40], [-48, 40]], '#8a7a62', 4);
      A.poly(x, [[48, -12], [4, -16], [14, 6], [2, 12], [12, 40], [48, 40]], '#a08f74', 4);
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(-44, -4, 32, 5); x.fillRect(12, -10, 32, 5);
      x.strokeStyle = '#141414'; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-40 + i * 34, -24); x.lineTo(-34 + i * 34, -36); x.stroke(); }
      x.restore();
    }
  });

  /* ---- meteor shower: flaming rocks rain diagonally ---- */
  BD.weapon({
    id: 'meteor', cat: 'elem', name: 'מטר מטאורים', price: 1500, power: 5, chaos: 5, big: true,
    desc: 'השמיים מחשיכים ושש שניות של סלעים בוערים נופלים סביב הבובה ומשאירים מכתשים.', tip: 'כמה שיותר קרוב לבובה, יותר פגיעות ישירות',
    down(P) { this.shower(P.x); }, fireAt(x) { this.shower(x); }, draw: ghost,
    shower(x0) {
      if (G.ents.some(e => e.meteor && !e.dead) || !G.gate('meteor', .5)) return;
      const S = BD.fx.S, dir = x0 > G.W / 2 ? 1 : -1;
      const e = { z: 0, meteor: true, t: 0, life: 6.8, next: .5, x0, dir };
      e.update = function (dt) {
        this.t += dt;
        const tk = BD.clamp(this.t / .6, 0, 1) * BD.clamp((this.life - this.t) / .8, 0, 1);
        if (!S.tint || S.tint.own === this) S.tint = { own: this, col: '#3a0d00', a: .28 * tk };
        const d = dummyAt(); if (d) this.x0 = BD.lerp(this.x0, d.j.chest.x, dt);
        this.next -= dt;
        if (this.next <= 0 && this.t < this.life - 1) { this.next = BD.rand(.22, .42); rock(BD.clamp(this.x0 + BD.rand(-300, 300), 40, G.W - 40), this.dir); }
        if (this.t > this.life) return false;
      };
      e.kill = function () { if (S.tint && S.tint.own === this) S.tint = null; };
      G.add(e); BD.audio.play('rumble', 1); BD.fx.text(G.W / 2, 160, 'מטר מטאורים!', '#ffb000', 76, 1.2, -20);
      function rock(tx, dir) {
        const ty = G.floor, sx = BD.clamp(tx - dir * BD.rand(380, 600), 30, G.W - 30), T = BD.rand(.7, .95);
        const r = BD.rand(16, 26), pts = Array.from({ length: 8 }, (_, i) => r * BD.rand(.8, 1.15));
        BD.audio.play('meteor');
        BD.proj({ x: sx, y: -70, vx: (tx - sx) / T, vy: (ty + 70) / T - 160 * T, g: 320, r: r * .8, life: 3, passTop: true, rot: 0,
          trail(dt) {
            this.rot += dt * 6;
            BD.fx.fire(this.x, this.y, 2, 90, r / 16); if (Math.random() < .22) BD.fx.smoke(this.x, this.y, 1, '#3a3330', r * .9, 30);
            BD.fx.trail(this.x, this.y, '#ffb347', r * 1.6, .25); G.light(this.x, this.y, 240, .7, .05);
          },
          draw(c) {
            const a = Math.atan2(this.vy, this.vx);
            c.save(); c.translate(this.x, this.y);
            c.globalCompositeOperation = 'lighter'; c.globalAlpha = .7; c.drawImage(BD.fx.glow('#ff7a00'), -r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
            c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
            c.rotate(a); c.fillStyle = 'rgba(255,170,40,.75)'; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(-r * 4, 0, 0, r); c.closePath(); c.fill();
            c.rotate(this.rot - a);
            c.beginPath(); pts.forEach((pr, i) => { const aa = i / 8 * BD.TAU; c.lineTo(Math.cos(aa) * pr, Math.sin(aa) * pr); }); c.closePath();
            c.fillStyle = '#4a3a33'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#141414'; c.stroke();
            c.fillStyle = '#ff7a00'; c.beginPath(); c.arc(r * .2, r * .1, r * .3, 0, BD.TAU); c.fill(); c.fillStyle = '#ffb000'; c.beginPath(); c.arc(-r * .35, -r * .25, r * .18, 0, BD.TAU); c.fill();
            c.restore();
          },
          onHit(h) {
            G.explode(h.x, h.y, 70 + r * 1.2, { src: 'meteor', cat: 'elem', dmg: 38 });
            BD.fx.stain(h.x, G.floor - 2, 55, '#1c1210', .55);
            BD.fx.debris(h.x, h.y, 10, ['#4a3a33', '#2b2220', '#ff7a00'], 900, 10);
            if (h.part) h.part.dummy.ignite(2);
          } });
      }
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      x.fillStyle = '#ff7a00'; x.beginPath(); x.moveTo(-50, -40); x.quadraticCurveTo(-10, -10, 2, 16); x.lineTo(20, -4); x.quadraticCurveTo(-8, -26, -50, -40); x.fill();
      x.fillStyle = BD.YEL; x.beginPath(); x.moveTo(-40, -34); x.quadraticCurveTo(-8, -10, 6, 8); x.lineTo(14, 0); x.quadraticCurveTo(-8, -18, -40, -34); x.fill();
      x.save(); x.translate(18, 18); x.rotate(t * 2);
      x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * BD.TAU, r = 22 * (i % 2 ? .85 : 1.05); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath();
      x.fillStyle = '#4a3a33'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      x.fillStyle = '#ff7a00'; x.beginPath(); x.arc(5, 2, 6, 0, BD.TAU); x.fill(); x.restore();
      x.restore();
    }
  });

  /* ---- tidal wave: a giant cartoon wave crosses the room ---- */
  BD.weapon({
    id: 'wave', cat: 'elem', name: 'גל צונאמי', price: 1700, power: 4, chaos: 5, big: true,
    desc: 'גל ענק נכנס מהצד, סוחף את הבובה וכל מה שבחדר ומטיח אותם בקיר השני. הכל נשאר רטוב.', tip: 'מכבה בובה בוערת = אדים',
    down(P) { this.wave(P.x); }, fireAt(x) { this.wave(x); }, draw: ghost,
    wave(x0) {
      if (G.ents.some(e => e.wave && !e.dead) || !G.gate('wave', .5)) return;
      const d0 = dummyAt(), dir = (d0 ? d0.j.chest.x : G.W / 2) > G.W / 2 ? 1 : -1;
      const lp = BD.audio.loop('water'), wl = BD.audio.loop('wind'), HMAX = Math.min(G.floor * .72, 560), SP = 1050;
      const e = { z: 2, wave: true, t: 0, dir, front: dir > 0 ? -160 : G.W + 160, h: 0, drain: -1 };
      e.surf = function (x) {
        const dist = (this.front - x) * this.dir; if (dist < 0) return null;
        const prof = .42 + .58 * Math.exp(-dist / 360);
        return G.floor - this.h * prof + Math.sin(x * .018 + this.t * 6) * 10 * (this.h / HMAX);
      };
      e.sub = function () {
        if (this.h < 20) return;
        for (const p of movable()) {
          const sy = this.surf(p.x); if (sy == null || p.y < sy - 10) continue;
          const [vx, vy] = G.ph.vel(p), tv = this.drain < 0 ? this.dir * SP * .95 : this.dir * 200;
          p.ax += (tv - vx) * 10; p.ay -= 2300 * Math.max(G.ph.gScale, .3) * 1.15 + vy * 3;
          if (p.dummy) {
            const d = p.dummy; d.wet = 1; d.stun = Math.max(d.stun, .6);
            if (d.burn > 0) { d.burn = 0; G.special('steam'); BD.fx.smoke(p.x, p.y, 12, '#eef4ff', 34, 140); BD.audio.play('sizzle'); }
          }
        }
      };
      e.update = function (dt) {
        this.t += dt;
        if (this.drain < 0) {
          this.h = Math.min(HMAX, this.h + HMAX * dt * 2.4);
          this.front += this.dir * SP * dt;
          const hitWall = this.dir > 0 ? this.front >= G.W - 20 : this.front <= 20;
          if (hitWall) {
            this.drain = 0; this.front = this.dir > 0 ? G.W + 40 : -40;
            const wx = this.dir > 0 ? G.W - 10 : 10;
            BD.audio.play('splash', 1.4); BD.audio.play('stomp'); BD.fx.shake(.8);
            for (let i = 0; i < 5; i++) BD.fx.drops(wx, G.floor - HMAX * (.2 + i * .18), 10, '#bfe6ff', 900, 9);
            BD.fx.ring(wx, G.floor - HMAX * .6, 260, '#e8f6ff', .5, 14);
            BD.fx.text(G.W / 2, 200, 'שפריץ!', '#e8f6ff', 80, 1, -30);
          }
          // spray off the crest
          const cy = this.surf(this.front - this.dir * 2) || G.floor;
          if (Math.random() < .8) BD.fx.drops(this.front, cy, 2, '#d8f1ff', 420, 6);
          if (Math.random() < .5) BD.fx.bubbles(this.front - this.dir * 80, G.floor - this.h * .4, 2, '#e6f7ff');
        } else {
          this.drain += dt; this.h = Math.max(0, HMAX * (1 - this.drain / 1.3));
        }
        lp.set(.4 + .8 * this.h / HMAX); wl.set(.5 * this.h / HMAX);
        const d = dummyAt();
        if (d && this.h > 40) { const sy = this.surf(d.j.chest.x); if (sy != null && d.j.chest.y > sy - 20 && G.gate('waveD', .22)) { G.damage(5, d.j.chest.x, d.j.chest.y, { src: 'wave', cat: 'elem', comboGap: .4 }); d.setMood('scream', .5); if (Math.random() < .1) d.talk('wet'); } }
        if (this.drain > 1.35) { for (let i = 0; i < 14; i++) BD.fx.stain(BD.rand(0, G.W), G.floor - 2, BD.rand(20, 50), '#5fb8ff', .25); return false; }
      };
      e.kill = () => { lp.stop(); wl.stop(); };
      e.draw = function (c) {
        if (this.h < 2) return;
        const back = this.dir > 0 ? -60 : G.W + 60, step = 24 * this.dir, front = this.front;
        const top = this.surf(front - this.dir * 1) || G.floor;
        c.save();
        // body of water
        const grd = c.createLinearGradient(0, G.floor - this.h, 0, G.floor); grd.addColorStop(0, '#5cc0f5'); grd.addColorStop(1, '#1f5fb0');
        c.globalAlpha = .84; c.fillStyle = grd; c.beginPath(); c.moveTo(back, G.floor + 6);
        for (let x = back; (x - front) * this.dir < 0; x += step) c.lineTo(x, this.surf(x));
        if (this.drain < 0) {
          // the curling lip at the front
          const L = Math.min(150, this.h * .35);
          c.lineTo(front, top);
          c.bezierCurveTo(front + this.dir * L * .9, top - L * .3, front + this.dir * L * 1.1, top + L * .5, front + this.dir * L * .55, top + L * .65);
          c.quadraticCurveTo(front + this.dir * L * .2, top + L * .4, front + this.dir * L * .3, top + L);
          c.lineTo(front + this.dir * 40, G.floor + 6);
        } else c.lineTo(front, G.floor + 6);
        c.closePath(); c.fill();
        c.globalAlpha = 1; c.lineWidth = 5; c.strokeStyle = '#123c75'; c.stroke();
        // lighter bands inside
        c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 4;
        for (let b = 1; b <= 3; b++) { c.beginPath(); let first = true; for (let x = back; (x - front) * this.dir < -40; x += step) { const y = this.surf(x) + b * this.h * .2 + Math.sin(x * .03 + this.t * 4 + b) * 6; if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); } c.stroke(); }
        // foam on the crest
        c.fillStyle = '#fff';
        for (let x = front - this.dir * 10, i = 0; i < 16; i++, x -= this.dir * 26) { const y = this.surf(x); if (y == null) break; const r = 9 + Math.sin(this.t * 10 + i) * 3 + (i < 4 ? 6 : 0); c.beginPath(); c.arc(x, y, r, 0, BD.TAU); c.fill(); }
        c.restore();
      };
      G.add(e); BD.audio.play('splash', 1); BD.audio.play('whoosh');
      BD.fx.text(G.W / 2, 170, 'צונאמי!', '#bfe6ff', 80, 1.1, -20);
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      const b = Math.sin(t * 3) * 3;
      x.beginPath(); x.moveTo(-52, 44); x.lineTo(-52, 6); x.bezierCurveTo(-30, -6 + b, -10, -46 + b, 22, -44 + b); x.bezierCurveTo(50, -42 + b, 54, -14 + b, 36, -10 + b);
      x.bezierCurveTo(30, -26 + b, 10, -24 + b, 6, -10); x.bezierCurveTo(2, 8, 24, 30, 52, 30); x.lineTo(52, 44); x.closePath();
      x.fillStyle = '#3f95e0'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#141414'; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-44, 20); x.bezierCurveTo(-24, 10, -12, -16, 8, -28); x.stroke();
      x.fillStyle = '#fff'; for (const [a, c2, r] of [[30, -40, 7], [42, -30, 6], [18, -44, 6], [40, -16, 5]]) { x.beginPath(); x.arc(a, c2 + b, r, 0, BD.TAU); x.fill(); }
      x.restore();
    }
  });

  /* ---- black hole: swallows everything ---- */
  BD.weapon({
    id: 'blackhole', cat: 'elem', name: 'חור שחור', price: 3000, power: 5, chaos: 5, big: true,
    desc: 'חור שחור נפתח איפה שלחצתם ושואב הכל. אם הבובה נבלעת, נכנסת בובה חדשה.', tip: 'פתחו אותו קרוב לבובה, ואז תיהנו מהספגטי',
    down(P) { this.open(P.x, P.y); }, fireAt(x, y) { this.open(x, y); }, draw: ghost,
    open(x0, y0) {
      if (G.ents.some(e => e.bh && !e.dead) || !G.gate('bh', .5)) return;
      const cx = BD.clamp(x0, 120, G.W - 120), cy = BD.clamp(y0, 120, G.floor - 140);
      const lp = BD.audio.loop('suck'), LIFE = 4.8;
      const e = { z: 2, bh: true, t: 0, R: 0, streaks: [], ate: false };
      e.pow = function () { return this.t < .6 ? this.t / .6 * .3 : this.t < LIFE ? .3 + .7 * Math.min(1, (this.t - .6) / 3) : 0; };
      e.sub = function () {
        const s = this.pow(); if (s <= 0) return;
        for (const p of movable()) {
          if (this.ate && p.dummy) continue;
          const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1;
          if (d > 900) continue;
          const F = 9000 * s / (d / 220 + .35);
          p.ax += dx / d * F - dy / d * F * .45; p.ay += dy / d * F + dx / d * F * .45 - 2300 * G.ph.gScale * s * .8;
          const en = entOf(p);
          if (en && !en.dead && d < this.R + 14 && en.grabbable) { en.dead = true; BD.fx.spark(cx, cy, 12, '#c9a2ff', 500); BD.audio.play('pop'); }
        }
      };
      e.update = function (dt) {
        this.t += dt; const s = this.pow();
        this.R = this.t < .6 ? 52 * this.t / .6 : this.t < LIFE ? 52 + Math.sin(this.t * 6) * 3 : Math.max(0, 52 * (1 - (this.t - LIFE) / .35));
        lp.set(.3 + s * .9, 40 + s * 50);
        for (let i = 0; i < 3; i++) { const a = Math.random() * BD.TAU, r = BD.rand(160, 360); this.streaks.push({ a, r, w: BD.rand(1.5, 3.5), c: BD.pick(['#ffb347', '#c9a2ff', '#fff']) }); }
        for (const q of this.streaks) { q.r -= dt * (180 + 26000 / q.r); q.a += dt * 260 / q.r; }
        this.streaks = this.streaks.filter(q => q.r > this.R * .9);
        G.light(cx, cy, 300, .6, .05);
        const d = dummyAt();
        if (d && this.t < LIFE && !this.ate) {
          const ch = d.j.chest, dd = Math.hypot(ch.x - cx, ch.y - cy);
          if (dd < 420) {
            d.sq = { k: -BD.clamp((420 - dd) / 420 * .55, 0, .55), a: Math.atan2(cy - ch.y, cx - ch.x), t: .1 };
            d.stun = Math.max(d.stun, .6); d.setMood(dd < 200 ? 'scream' : 'scared', .4);
            if (G.gate('bhD', .25)) G.damage(3, ch.x, ch.y, { src: 'blackhole', cat: 'elem', comboGap: .5 });
            if (Math.random() < dt * .7) d.talk('scared');
          }
          if (dd < 46 + this.R * .3 || (this.t > LIFE - .4 && dd < 160)) {
            this.ate = true; G.damage(150, cx, cy, { src: 'blackhole', cat: 'elem' });
            G.special('blackhole'); BD.audio.play('swallow'); BD.fx.flash(.35, '#c9a2ff'); BD.fx.shake(.6);
            BD.fx.text(cx, cy - 120, 'נבלע!', '#c9a2ff', 80, 1.2, -40);
            G.respawn(1.6);
          }
        }
        if (this.t >= LIFE + .35 && !this.burst) {
          this.burst = 1; lp.stop();
          G.ph.blast(cx, cy, 650, 3200); BD.audio.play('boom', 1); BD.fx.flash(.6, '#efe2ff'); BD.fx.shake(.9);
          BD.fx.ring(cx, cy, 420, '#c9a2ff', .6, 22); BD.fx.ring(cx, cy, 260, '#fff', .4, 10);
          BD.fx.spark(cx, cy, 50, '#d9c4ff', 1400); BD.fx.spark(cx, cy, 30, '#ffb347', 1100); BD.fx.glowAt(cx, cy, 380, '#b38cff', .4);
          G.hitArea(cx, cy, 400, 2600, { dmg: 25, src: 'blackhole', cat: 'elem' });
        }
        if (this.t > LIFE + .7) return false;
      };
      e.kill = () => lp.stop();
      e.draw = function (c) {
        if (this.burst) return;
        const R = this.R, s = this.pow();
        c.save(); c.translate(cx, cy);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55 + s * .3;
        c.drawImage(BD.fx.glow('#7b3fe0'), -R * 5, -R * 5, R * 10, R * 10);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        // infalling streaks
        c.lineCap = 'round';
        for (const q of this.streaks) { c.strokeStyle = q.c; c.globalAlpha = .7; c.lineWidth = q.w; c.beginPath(); c.arc(0, 0, q.r, q.a, q.a + 18 / q.r * 6); c.stroke(); }
        c.globalAlpha = 1;
        const disk = (from, to) => {
          c.save(); c.rotate(-.25); c.scale(1, .3);
          for (let i = 0; i < 6; i++) {
            const r = R * (1.5 + i * .32);
            c.strokeStyle = ['#fff3c4', '#ffb347', '#ff7a00', '#e0458a', '#a24bff', '#5b2bb5'][i]; c.lineWidth = R * .26;
            c.setLineDash([r * .5, r * .18]); c.lineDashOffset = -this.t * (300 - i * 30);
            c.beginPath(); c.arc(0, 0, r, from, to); c.stroke();
          }
          c.setLineDash([]); c.restore();
        };
        disk(Math.PI, BD.TAU);
        // the event horizon with a bright lensing ring
        c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, R, 0, BD.TAU); c.fill();
        c.strokeStyle = '#ffd9a0'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, R * 1.08, 0, BD.TAU); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 1.7 + Math.sin(this.t * 5) * 3, 0, BD.TAU); c.stroke();
        disk(0, Math.PI);
        c.restore();
      };
      G.add(e); BD.audio.play('warp'); BD.fx.flash(.15, '#c9a2ff');
    },
    icon(x, s, t = 0) {
      x.save(); const k = s / 110; x.scale(k, k);
      const ring = (from, to) => { x.save(); x.rotate(-.3); x.scale(1, .32); const cols = ['#ffb347', '#ff7a00', '#e0458a', '#a24bff']; for (let i = 0; i < 4; i++) { x.strokeStyle = cols[i]; x.lineWidth = 9; x.setLineDash([22, 8]); x.lineDashOffset = -t * 60 - i * 10; x.beginPath(); x.arc(0, 0, 32 + i * 8, from, to); x.stroke(); } x.setLineDash([]); x.restore(); };
      ring(Math.PI, BD.TAU);
      x.fillStyle = '#000'; x.beginPath(); x.arc(0, 0, 22, 0, BD.TAU); x.fill(); x.lineWidth = 4; x.strokeStyle = '#ffd9a0'; x.stroke();
      ring(0, Math.PI);
      x.restore();
    }
  });
})();
