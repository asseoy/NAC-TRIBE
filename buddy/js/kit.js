/* Building blocks the weapons share: physical props, projectiles, hitscan rays,
   melee swings, guns and things you hold and throw. */
'use strict';

/* ---------- a physical object in the arena (box or ball) ---------- */
BD.body = function (o) {
  const G = BD.G, ph = G.ph;
  const e = Object.assign({ z: 1, hp: Infinity, heavy: 1, grabbable: true, life: Infinity, fade: .4, rot: 0, age: 0 }, o);
  if (o.shape === 'ball') {
    e.ball = ph.particle(o.x, o.y, o.r, o.mass || 2, { group: 'e' + Math.random(), rest: o.rest ?? .45, fr: o.fr ?? .4 });
    e.ball.ent = e; if (o.noGrav) e.ball.noGrav = true;
    if (o.vx || o.vy) ph.setVel(e.ball, o.vx || 0, o.vy || 0);
  } else {
    e.box = ph.box(o.x, o.y, o.w, o.h, o.mass || 4, { angle: o.angle || 0, rest: o.rest, fr: o.fr });
    e.box.ent = e;
    if (o.vx || o.vy) e.box.ps.forEach(p => ph.setVel(p, o.vx || 0, o.vy || 0));
  }
  e.pos = function () { return this.ball ? [this.ball.x, this.ball.y] : ph.boxCenter(this.box); };
  e.ang = function () { return this.ball ? this.rot : ph.boxAngle(this.box); };
  e.vel = function () { if (this.ball) return ph.vel(this.ball); let vx = 0, vy = 0; for (const p of this.box.ps) { const v = ph.vel(p); vx += v[0] / 4; vy += v[1] / 4; } return [vx, vy]; };
  e.push = function (vx, vy) { (this.ball ? [this.ball] : this.box.ps).forEach(p => ph.push(p, vx, vy)); };
  e.setVel = function (vx, vy) { (this.ball ? [this.ball] : this.box.ps).forEach(p => ph.setVel(p, vx, vy)); };
  e.kill = function () { ph.kill(this.ball || this.box); if (this.onKill) this.onKill(); };
  const upd = o.update;
  e.update = function (dt) {
    this.age += dt;
    if (this.ball) { const [vx] = ph.vel(this.ball); this.rot += vx * dt / this.ball.r; }
    if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) return false; }
    if (upd && upd.call(this, dt) === false) return false;
    if (this.hp <= 0) { if (this.onBreak) this.onBreak(); return false; }
  };
  const dr = o.draw;
  e.draw = function (x) {
    const [cx, cy] = this.pos(); x.save(); x.translate(cx, cy); x.rotate(this.ang());
    if (this.life < this.fade) x.globalAlpha = Math.max(0, this.life / this.fade);
    dr.call(this, x, this.ball ? this.ball.r : this.box.w, this.box ? this.box.h : 0);
    x.restore();
  };
  if (!e.impact) e.impact = function (rel, x, y) {
    if (this.hp !== Infinity && rel > (this.tough || 900)) this.hp -= (rel - (this.tough || 900)) / 400;
    if (rel > 600 && this.snd && G.gate('pimp' + (this.ball || this.box).group, .12)) BD.audio.play(this.snd, BD.clamp(rel / 3000, .1, 1));
    if (this.onImpact) this.onImpact(rel, x, y);
  };
  if (!e.blasted) e.blasted = function (x, y, R, power) { const [cx, cy] = this.pos(); const d = Math.hypot(cx - x, cy - y); if (d < R && this.hp !== Infinity) this.hp -= (1 - d / R) * (this.blastHp || 3); };
  return G.add(e);
};

/* ---------- a ray from the gun: first thing it touches ---------- */
BD.ray = function (x0, y0, x1, y1, o = {}) {
  const G = BD.G, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  let best = { t: L, x: x1, y: y1, surface: null };
  // walls, floor and ceiling
  const walls = [[(G.floor - y0) / uy, 'floor'], [(0 - y0) / uy, 'ceil'], [(0 - x0) / ux, 'wall'], [(G.W - x0) / ux, 'wall']];
  for (const [t, k] of walls) if (t > 1 && t < best.t) best = { t, x: x0 + ux * t, y: y0 + uy * t, surface: k };
  const circ = (cx, cy, r) => { const fx = x0 - cx, fy = y0 - cy, b = fx * ux + fy * uy, c = fx * fx + fy * fy - r * r, h = b * b - c; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; };
  if (G.dummy && !G.dummy.gone && !o.noDummy) for (const p of G.dummy.parts) { const t = circ(p.x, p.y, p.r + (o.fat || 0)); if (t > 0 && t < best.t) best = { t, x: x0 + ux * t, y: y0 + uy * t, part: p, surface: null }; }
  for (const e of G.ents) {
    if (e.dead || !e.shootable) continue;
    if (e.ball) { const t = circ(e.ball.x, e.ball.y, e.ball.r); if (t > 0 && t < best.t) best = { t, x: x0 + ux * t, y: y0 + uy * t, ent: e, surface: null, part: null }; }
    else if (e.box) { const [cx, cy] = e.pos(); const t = circ(cx, cy, Math.min(e.box.w, e.box.h) / 2 + 6); if (t > 0 && t < best.t) best = { t, x: x0 + ux * t, y: y0 + uy * t, ent: e, surface: null, part: null }; }
  }
  best.ux = ux; best.uy = uy; return best;
};
/* a bullet hole / scorch on a wall or the floor */
BD.scar = function (x, y, kind = 'hole', col) {
  const G = BD.G, fx = BD.fx;
  if (kind === 'hole') { fx.stain(x, y, 5, '#111', .8); fx.debris(x, y, 3, G.arena.chips || ['#999', '#666'], 300, 4); fx.smoke(x, y, 1, G.arena.dust || '#ccc', 10, 30); }
  else if (kind === 'paint') fx.stain(x, y, BD.rand(16, 26), col, .85);
  else if (kind === 'scorch') fx.stain(x, y, 30, '#000', .4);
};

/* ---------- projectiles: rockets, plasma balls, paintballs... ---------- */
BD.proj = function (o) {
  const G = BD.G;
  const e = Object.assign({ z: 2, g: 0, r: 8, life: 4, age: 0, drag: 1, hitDummy: true }, o);
  e.update = function (dt) {
    this.age += dt; this.life -= dt; if (this.life <= 0) { if (this.onExpire) this.onExpire(); return false; }
    if (this.steer) this.steer(dt);
    const ox = this.x, oy = this.y;
    this.vy += this.g * dt; this.vx *= Math.pow(this.drag, dt * 60); this.vy *= Math.pow(this.drag, dt * 60);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.trail) this.trail(dt);
    // touching the dummy along the path
    if (this.hitDummy && G.dummy && !G.dummy.gone) for (const p of G.dummy.parts) {
      if (BD.segDist(p.x, p.y, ox, oy, this.x, this.y) < p.r + this.r) { this.onHit({ part: p, x: this.x, y: this.y }); return false; }
    }
    for (const en of G.ents) {
      if (en === this || en.dead || !en.shootable) continue;
      const [cx, cy] = en.pos(), rr = en.ball ? en.ball.r : Math.min(en.box.w, en.box.h) / 2;
      if (BD.segDist(cx, cy, ox, oy, this.x, this.y) < rr + this.r) { this.onHit({ ent: en, x: this.x, y: this.y }); return false; }
    }
    if (this.y > G.floor - this.r) { this.y = G.floor - this.r; this.onHit({ surface: 'floor', x: this.x, y: G.floor }); return false; }
    if (this.y < this.r && this.vy < 0 && !this.passTop) { this.onHit({ surface: 'ceil', x: this.x, y: 0 }); return false; }
    if (this.x < this.r || this.x > G.W - this.r) { if (this.age > .05 || !this.fromEdge) { this.onHit({ surface: 'wall', x: BD.clamp(this.x, 0, G.W), y: this.y }); return false; } }
  };
  return G.add(e);
};

/* ---------- melee: tap for an automatic swing, or drag to swing it yourself ---------- */
BD.mkSwing = function (d) {
  const G = BD.G;
  return BD.weapon(Object.assign({
    cat: 'melee', len: 130, thick: 18, k: 1, dmgK: 1, snd: 'hit', mk: 'bruise', swingT: .2,
    enter() { const st = this.st; st.mode = 'idle'; st.gx = G.P.x; st.gy = G.P.y; st.a = -2.2; st.hx = st.gx + Math.cos(st.a) * this.len; st.hy = st.gy + Math.sin(st.a) * this.len; st.trail = []; st.hits = new Map(); },
    down(P) {
      const st = this.st; st.down = true; st.t0 = G.rt; st.mode = 'drag'; st.hits = new Map();
      st.gx = P.x; st.gy = P.y + this.len * .35; st.hx = P.x; st.hy = P.y - this.len * .65;
      st.phx = st.hx; st.phy = st.hy;
    },
    up(P) {
      const st = this.st; st.down = false;
      if (P.moved < 18 && G.rt - st.t0 < .35) this.auto(P.x, P.y); else st.mode = 'idle';
    },
    auto(x, y) {
      const st = this.st, d = G.dummy, cx = d && !d.gone ? d.j.chest.x : G.W / 2;
      const dir = x < cx ? 1 : -1, L = this.len;
      st.gx = x - dir * L * .38; st.gy = y + L * .62;
      const ap = Math.atan2(y - st.gy, x - st.gx);
      st.a0 = ap - dir * 1.5; st.a1 = ap + dir * .7; st.at = 0; st.mode = 'auto'; st.dir = dir; st.hits = new Map();
      if (this.onSwing) this.onSwing(x, y);
      BD.audio.play('swoosh');
    },
    sub(dt, P) {
      const st = this.st, L = this.len;
      let ox = st.hx, oy = st.hy, ogx = st.gx, ogy = st.gy;
      if (st.mode === 'auto') {
        st.at += dt / this.swingT; const k = BD.clamp(st.at, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        st.a = BD.lerp(st.a0, st.a1, e);
        st.hx = st.gx + Math.cos(st.a) * L; st.hy = st.gy + Math.sin(st.a) * L;
        if (st.at >= 1.6) st.mode = 'idle';
      } else if (st.mode === 'drag') {
        st.gx = P.x; st.gy = P.y;
        // the head trails behind the grip like a real swing
        const vx = (st.hx - st.phx) * .92, vy = (st.hy - st.phy) * .92 + (this.heavyHead ? 2400 * dt * dt : 0);
        st.phx = st.hx; st.phy = st.hy; st.hx += vx; st.hy += vy;
        const dx = st.hx - st.gx, dy = st.hy - st.gy, dd = Math.hypot(dx, dy) || 1;
        st.hx = st.gx + dx / dd * L; st.hy = st.gy + dy / dd * L; st.a = Math.atan2(dy, dx);
      } else return;
      const hvx = (st.hx - ox) / dt, hvy = (st.hy - oy) / dt, gvx = (st.gx - ogx) / dt, gvy = (st.gy - ogy) / dt;
      const sp = Math.hypot(hvx, hvy);
      if (st.mode === 'auto' && st.at > 1) return;
      this.contact(hvx, hvy, gvx, gvy, sp);
    },
    contact(hvx, hvy, gvx, gvy, sp) {
      const st = this.st, d = G.dummy; if (!d || d.gone) return;
      for (const p of d.parts) {
        const dist = BD.segDist(p.x, p.y, st.gx, st.gy, st.hx, st.hy);
        if (dist > p.r + this.thick / 2) continue;
        const last = st.hits.get(p) || -9; if (G.rt - last < .18) continue;
        // speed of the tool at that point: grip speed plus a share of the head speed
        const t = BD.clamp(Math.hypot(p.x - st.gx, p.y - st.gy) / this.len, 0, 1);
        const vx = BD.lerp(gvx, hvx, t), vy = BD.lerp(gvy, hvy, t), v = Math.hypot(vx, vy);
        if (v < 350) continue;
        st.hits.set(p, G.rt); for (const q of d.parts) if (Math.hypot(q.x - p.x, q.y - p.y) < 70) st.hits.set(q, G.rt);
        const f = Math.min(v, 5200) * this.k;
        G.hit(p, vx / v * f * .7, vy / v * f * .7, { dmg: Math.min(v, 5200) / 85 * this.dmgK, src: this.id, cat: 'melee', snd: this.snd, mark: this.mk });
        if (this.onHit) this.onHit(p, vx, vy, v);
        break;
      }
      // props get knocked too
      for (const e of G.ents) {
        if (e.dead || !e.grabbable) continue;
        const [cx, cy] = e.pos(), rr = e.ball ? e.ball.r : Math.min(e.box.w, e.box.h) / 2;
        if (BD.segDist(cx, cy, st.gx, st.gy, st.hx, st.hy) < rr + this.thick / 2 && sp > 400 && G.gate('pk' + (e.ball || e.box).group, .2)) {
          e.push(hvx * .5 * this.k, hvy * .5 * this.k); BD.audio.play(this.snd, .5); BD.fx.spark(cx, cy, 6, '#fff', 400);
          if (e.hp !== Infinity) e.hp -= sp / 1500;
        }
      }
    },
    update(dt) {
      const st = this.st;
      st.trail.push([st.gx, st.gy, st.hx, st.hy]); if (st.trail.length > 6) st.trail.shift();
    },
    draw(x, P) {
      const st = this.st;
      if (st.mode === 'idle') {
        if (!P.over || (P.touch && !P.down)) return;
        // resting in the hand, waiting
        x.save(); x.translate(P.x, P.y + 20); x.rotate(-1.9 + Math.sin(G.rt * 3) * .05); x.translate(-this.len * .15, 0); this.drawTool(x, this.len); x.restore();
        return;
      }
      // motion smear between the last poses
      const T = st.trail;
      if (T.length > 2) {
        const a = T[0], b = T[T.length - 1], sp = Math.hypot(b[2] - a[2], b[3] - a[3]);
        if (sp > 40) {
          x.globalAlpha = .28; x.fillStyle = this.smear || '#fff'; x.beginPath();
          x.moveTo(T[0][0], T[0][1]); for (const p of T) x.lineTo(BD.lerp(p[0], p[2], .35), BD.lerp(p[1], p[3], .35));
          for (let i = T.length - 1; i >= 0; i--) x.lineTo(T[i][2], T[i][3]); x.closePath(); x.fill(); x.globalAlpha = 1;
        }
      }
      x.save(); x.translate(st.gx, st.gy); x.rotate(st.a); this.drawTool(x, this.len); x.restore();
    },
    fireAt(x, y) {
      const o = Object.create(this); o.st = {}; o.enter(); o.auto(x, y);
      G.add({ z: 2, sub(dt) { o.sub(dt, G.P); }, update(dt) { o.update(dt); return o.st.mode !== 'idle'; }, draw(c) { o.draw(c, G.P); } });
    },
    icon(x, s) { x.save(); x.rotate(-Math.PI / 4); const L = this.len, sc = s * 1.2 / L; x.scale(sc, sc); x.translate(-L / 2, 0); this.drawTool(x, L); x.restore(); }
  }, d));
};

/* ---------- guns: aimed from the bottom corner, hold to keep firing ---------- */
BD.mkGun = function (d) {
  const G = BD.G;
  return BD.weapon(Object.assign({
    cat: 'guns', rate: .3, auto: false, pellets: 1, spread: 0, force: 1500, dmg: 9, kick: .25, tracer: '#ffe9a8', snd: 'gun', len: 120, mk: 'hole', shake: .08,
    enter() { const st = this.st; st.cool = 0; st.kick = 0; st.side = G.P.x > G.W / 2 ? -1 : 1; st.a = 0; st.flash = 0; st.fire = false; st.spin = 0; },
    pivot() { const st = this.st; return [st.side < 0 ? 80 : G.W - 80, G.H - 34]; },
    down(P) {
      const st = this.st, d = G.dummy; st.fire = true;
      // the gun stands on the side away from where you aim
      st.side = P.x > G.W / 2 ? -1 : 1;
      if (!this.auto && st.cool <= 0) this.shoot(P);
    },
    up() { this.st.fire = false; if (this.release) this.release(); },
    leave() { if (this.st.lp) this.st.lp.stop(); },
    update(dt, P) {
      const st = this.st, [px, py] = this.pivot();
      const want = Math.atan2(P.y - py, P.x - px);
      st.a = want; st.cool -= dt; st.kick = Math.max(0, st.kick - dt * 6); st.flash = Math.max(0, st.flash - dt);
      if (this.auto) {
        st.spin = BD.lerp(st.spin, st.fire ? 1 : 0, dt * (this.spinUp || 20));
        if (st.fire && st.cool <= 0 && st.spin > .8) { this.shoot(P); st.cool = this.rate; }
        if (this.loopSnd) { if (st.spin > .05 && !st.lp) st.lp = BD.audio.loop(this.loopSnd); if (st.lp) { st.lp.set(st.spin, 30 + st.spin * 60); if (st.spin < .05) { st.lp.stop(); st.lp = null; } } }
      }
      if (this.tick) this.tick(dt, P);
    },
    muzzle() { const st = this.st, [px, py] = this.pivot(), L = this.len - st.kick * 30; return [px + Math.cos(st.a) * L, py + Math.sin(st.a) * L]; },
    shoot(P) {
      const st = this.st; if (!this.auto) st.cool = this.rate;
      const [mx, my] = this.muzzle();
      st.kick = 1; st.flash = .06;
      BD.audio.play(this.snd, this.big);
      BD.fx.shake(this.shake);
      if (this.fire) return this.fire(mx, my, st.a, P);
      for (let i = 0; i < this.pellets; i++) {
        const a = st.a + BD.rand(-this.spread, this.spread), r = BD.ray(mx, my, mx + Math.cos(a) * 4000, my + Math.sin(a) * 4000);
        this.bullet(mx, my, r);
      }
      this.muzzleFx(mx, my);
    },
    muzzleFx(mx, my) {
      const st = this.st;
      BD.fx.glowAt(mx, my, 60, '#ffd27a', .07); G.light(mx, my, 300, .9, .08);
      BD.fx.spark(mx, my, 4, '#ffe9a8', 500);
      if (this.shell !== false) BD.fx.debris(mx - Math.cos(st.a) * 60, my - Math.sin(st.a) * 60, 1, ['#d4a73a'], 380, 5);
    },
    bullet(mx, my, r) {
      const G2 = G;
      G2.add({ z: 2, t: .07, x0: mx, y0: my, x1: r.x, y1: r.y, col: this.tracer, w: this.tracerW || 4, update(dt) { this.t -= dt; return this.t > 0; },
        draw(x) { x.globalAlpha = this.t / .07; x.strokeStyle = this.col; x.lineWidth = this.w; x.lineCap = 'round'; x.beginPath(); x.moveTo(this.x0, this.y0); x.lineTo(this.x1, this.y1); x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = this.w * .4; x.stroke(); x.globalAlpha = 1; } });
      if (r.part) {
        G.hit(r.part, r.ux * this.force, r.uy * this.force, { dmg: this.dmg, src: this.id, cat: 'guns', snd: 'hit', mark: this.mk, fx: false, spread: .15 });
        BD.fx.spark(r.x, r.y, 6, '#fff', 500); BD.fx.ring(r.x, r.y, 26, '#fff', .15, 5);
        if (this.onHit) this.onHit(r);
      } else if (r.ent) { r.ent.push(r.ux * this.force * .4, r.uy * this.force * .4); if (r.ent.hp !== Infinity) r.ent.hp -= this.dmg / 10; BD.fx.spark(r.x, r.y, 8, '#fff', 400); if (r.ent.shot) r.ent.shot(r); }
      else if (r.surface) { BD.scar(r.x, r.y, this.mk === 'paint' ? 'paint' : 'hole', this.paintCol); if (this.onMiss) this.onMiss(r); }
    },
    draw(x, P) {
      const st = this.st, [px, py] = this.pivot(), flip = Math.cos(st.a) < 0;
      // crosshair
      if (P.over || P.down) {
        x.strokeStyle = BD.RED; x.lineWidth = 3; x.beginPath(); x.arc(P.x, P.y, 18, 0, BD.TAU); x.moveTo(P.x - 28, P.y); x.lineTo(P.x - 8, P.y); x.moveTo(P.x + 8, P.y); x.lineTo(P.x + 28, P.y); x.moveTo(P.x, P.y - 28); x.lineTo(P.x, P.y - 8); x.moveTo(P.x, P.y + 8); x.lineTo(P.x, P.y + 28); x.stroke();
      }
      x.save(); x.translate(px, py); x.rotate(st.a); if (flip) x.scale(1, -1); x.translate(-st.kick * 30, 0);
      this.drawGun(x, st);
      x.restore();
      if (st.flash > 0) {
        const [mx, my] = this.muzzle(); x.save(); x.translate(mx, my); x.rotate(st.a); x.fillStyle = '#fff3b0';
        x.beginPath(); x.moveTo(0, -12); x.lineTo(46, 0); x.lineTo(0, 12); x.lineTo(14, 0); x.closePath(); x.fill();
        x.fillStyle = '#ffb000'; x.beginPath(); x.moveTo(0, -18); x.lineTo(22, -26); x.lineTo(10, 0); x.lineTo(22, 26); x.lineTo(0, 18); x.closePath(); x.fill(); x.restore();
      }
    },
    fireAt(x, y) {
      const o = Object.create(this), T = { x, y, over: false, down: false }; o.st = {}; o.enter(); o.st.side = Math.random() < .5 ? -1 : 1;
      let life = this.auto ? .7 : .35; o.st.fire = true; o.st.spin = 1;
      if (!this.auto) o.shoot(T);
      G.add({ z: 2, update(dt) { o.update(dt, T); life -= dt; if (life <= 0) { o.st.fire = false; if (o.release) o.release(); o.leave(); return false; } }, draw(c) { o.draw(c, T); } });
    },
    icon(x, s) { x.save(); const sc = s / this.len * .95; x.scale(sc, sc); x.translate(-this.len * .5, 4); x.rotate(-.25); this.drawGun(x, { spin: 0 }); x.restore(); }
  }, d));
};

/* ---------- things you hold, then drop or throw (grenades, dynamite...) ---------- */
BD.mkThrow = function (d) {
  const G = BD.G;
  return BD.weapon(Object.assign({
    cat: 'boom', r: 16, mass: 1.5, max: 6,
    down(P) {
      if (G.ents.filter(e => e.wid === this.id && !e.dead).length >= this.max) { BD.audio.play('deny'); return; }
      const e = this.spawn(P.x, P.y); e.wid = this.id; this.st.held = e;
      if (e.ball) { e.held = true; e.ball.im = 0; }
    },
    sub(dt, P) { const e = this.st.held; if (e && e.ball && !e.dead) { e.ball.x = BD.clamp(P.x, e.ball.r, G.W - e.ball.r); e.ball.y = BD.clamp(P.y, e.ball.r, G.floor - e.ball.r); } },
    up(P) {
      const e = this.st.held; this.st.held = null; if (!e || e.dead) return;
      if (e.ball) { e.ball.im = 1 / e.ball.mass; e.held = false; const sp = Math.hypot(P.vx, P.vy), f = sp > 4000 ? 4000 / sp : 1; G.ph.setVel(e.ball, P.vx * f, P.vy * f); e.spin = P.vx / 60; }
    },
    leave() { if (this.st.held && !this.st.held.dead) this.up(G.P); },
    draw(x, P) {
      if (this.st.held || !P.over || (P.touch && !P.down)) return;
      x.globalAlpha = .55; x.save(); x.translate(P.x, P.y); this.drawIt(x, this.r, G.rt); x.restore(); x.globalAlpha = 1;
    },
    fireAt(x, y) { const e = this.spawn(x, 70); e.wid = this.id; if (e.ball) G.ph.setVel(e.ball, BD.rand(-300, 300), 200); },
    icon(x, s) { x.save(); const sc = s / (this.r * 3.2); x.scale(sc, sc); this.drawIt(x, this.r, 0); x.restore(); }
  }, d));
};

/* ---------- drawing helpers for weapon art ---------- */
BD.art = {
  outline: '#141414',
  // a rounded bar with an outline, a base colour and a highlight
  bar(x, x0, y0, x1, y1, w, col, hi = 'rgba(255,255,255,.35)') {
    x.lineCap = 'round'; x.strokeStyle = '#141414'; x.lineWidth = w + 6; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = col; x.lineWidth = w; x.stroke();
    if (hi) { x.strokeStyle = hi; x.lineWidth = Math.max(1.5, w * .22); x.beginPath(); x.moveTo(x0, y0 - w * .22); x.lineTo(x1, y1 - w * .22); x.stroke(); }
  },
  poly(x, pts, col, lw = 4) { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fillStyle = col; x.fill(); x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = '#141414'; x.stroke(); },
  circ(x, cx, cy, r, col, lw = 4) { x.beginPath(); x.arc(cx, cy, r, 0, BD.TAU); x.fillStyle = col; x.fill(); x.lineWidth = lw; x.strokeStyle = '#141414'; x.stroke(); },
  rect(x, X, Y, w, h, col, r = 3, lw = 4) { BD.draw.rr(x, X, Y, w, h, r); x.fillStyle = col; x.fill(); x.lineWidth = lw; x.strokeStyle = '#141414'; x.stroke(); },
  shine(x, cx, cy, r) { x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(cx - r * .35, cy - r * .4, r * .32, r * .2, -.6, 0, BD.TAU); x.fill(); },
  fuse(x, x0, y0, len, t, lit) {
    x.strokeStyle = '#141414'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + len * .5, y0 - len * .6, x0 + len, y0 - len * .35); x.stroke();
    x.strokeStyle = '#d8c39a'; x.lineWidth = 3; x.stroke();
    if (lit) { const fx = x0 + len, fy = y0 - len * .35, f = 6 + Math.sin(t * 50) * 3; x.fillStyle = '#ffd54a'; x.beginPath(); x.arc(fx, fy, f + 3, 0, BD.TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(fx, fy, f * .5, 0, BD.TAU); x.fill(); }
  }
};
/* a burning fuse throws sparks */
BD.fuseFx = (x, y) => { if (Math.random() < .5) BD.fx.spark(x, y, 1, '#ffd54a', 200); };
