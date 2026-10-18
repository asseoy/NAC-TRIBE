/* A match: two fighters, projectiles, camera, rounds, HUD. */
'use strict';
NF.DMG = 6;   // move dmg units -> hp
NF.Match = class Match {
  constructor(opts) {
    this.opts = opts;   // {p1:def, p2:def, c1, c2, arena, mode, diff, onEnd}
    this.fx = new NF.FX();
    this.f = [new NF.Fighter(opts.p1, 0, opts.c1), new NF.Fighter(opts.p2, 1, opts.c2)];
    this.arena = opts.arena;
    this.round = 1; this.wins = [0, 0]; this.t = 0;
    this.cam = { x: 0, y: 420, z: .92, sx: 0, sy: 0 };
    this.shakeA = 0; this.hitstop = 0; this.slow = 1; this.slowAcc = 0;
    this.proj = []; this.erupt = []; this.clones = [];
    this.paused = false; this.cine = null; this.over = false;
    this.startRound();
  }
  startRound() {
    const [a, b] = this.f;
    a.reset(-230); b.reset(230); a.meter = a.meter || 0; b.meter = b.meter || 0;
    if (this.round === 1) { a.meter = 0; b.meter = 0; }
    a.state = b.state = 'intro'; this.phase = 'intro'; this.pt = 0; this.timer = 99 * 60;
    this.proj.length = 0; this.erupt.length = 0; this.clones.length = 0; this.fx.clear(); this.cine = null; this.over = false; this.koT = 0;
    this.cam.x = 0; this.cam.z = .92;
  }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); }

  /* ================= hits ================= */
  canBlock(def, att, level) {
    if (level === 'unblockable' || def.air || def.dead) return false;
    if (!['idle', 'walk', 'crouch', 'block', 'land'].includes(def.state)) return false;
    const inp = def.ctrl.last || { held: {} }, h = inp.held;
    const away = att.x > def.x ? h.left : h.right;
    if (!away) return false;
    const crouch = !!h.down;
    if (level === 'low' && !crouch) return false;
    if (level === 'high' && crouch) return false;
    def.blockCrouch = crouch;
    return true;
  }
  resolveHit(att, def, m, c, src) {
    const dir = def.x >= (src ? src.x : att.x) ? 1 : -1;
    const fromX = c ? c[0] : def.x, fromY = c ? c[1] : def.y - 120;
    const px = (fromX + def.x) / 2, py = c ? c[1] : def.y - 120;
    if (this.canBlock(def, src || att, m.level)) {
      def.state = 'block'; def.st = 0; def.stun = m.bstun || 10; def.vx = dir * ((m.kb ? m.kb[0] : 4) * .55 + 2);
      const chip = Math.round((m.chip || 0) * NF.DMG);
      if (chip) { def.hp = Math.max(1, def.hp - chip); }
      if (Math.abs(def.x) > NF.STAGE_R - 10 && !src) att.vx = -dir * 4;
      this.hitstop = 5; this.fx.sparks(px, py, -dir, '#a8d8ff', 12, .8); this.fx.ring(px, py, '#cfe8ff', 6, 46, 10, 5);
      NF.audio.play('block'); att.meter = Math.min(100, att.meter + (m.meter || 4) * .4); def.meter = Math.min(100, def.meter + 3);
      return 'block';
    }
    if (def.armor > 0 && def.state === 'attack') {
      const d = Math.round(m.dmg * NF.DMG * .6); def.hp = Math.max(1, def.hp - d); def.hitFlash = 4; this.hitstop = 4; NF.audio.play('hitL'); this.fx.sparks(px, py, -dir, '#ff6060', 8); return 'armor';
    }
    // damage with combo scaling
    att.combo = (def.state === 'hurt' || def.state === 'fall') ? att.combo + 1 : 1;
    const scale = m.kind === 'ult' ? 1 : Math.max(.35, 1 - .1 * Math.max(0, att.combo - 2));
    const dmg = Math.max(1, Math.round(m.dmg * NF.DMG * scale));
    def.hp -= dmg; att.comboDmg = att.combo === 1 ? dmg : att.comboDmg + dmg; att.comboShow = 90;
    const wasAir = def.air;
    def.attacking = false; def.move = null; def.ghost = false; def.hidden = 0;
    def.lowHurt = def.state === 'crouch' || m.level === 'low';
    const kb = m.kb || [4, 0], w = def.def.phys.weight;
    if (wasAir || m.launch || m.knock || def.hp <= 0) {
      def.air = true; def.state = 'fall'; def.st = 0; def.knocked = !!(m.knock || m.launch || def.hp <= 0);
      def.vy = Math.min(kb[1] || -6, m.launch ? -14 : -7) / Math.sqrt(w); def.vx = dir * Math.max(3, kb[0] * .7) / w;
      def.y = Math.min(def.y, NF.FLOOR - 1);
      if (wasAir) def.juggle++;
    } else {
      def.state = 'hurt'; def.st = 0; def.stun = m.stun || 14; def.vx = dir * kb[0] / w;
    }
    def.hitFlash = 3;
    const big = m.dmg >= 11 || m.kind === 'ult';
    this.hitstop = m.kind === 'ult' ? 12 : big ? 9 : 6;
    this.shake(big ? 12 : 5);
    const col = m.fire ? '#ff8a20' : '#ffe08a';
    this.fx.sparks(px, py, -dir, col, big ? 26 : 14, big ? 1.4 : 1);
    this.fx.ring(px, py, big ? '#ff4a20' : '#fff', 8, big ? 110 : 60, big ? 16 : 10, big ? 9 : 6);
    if (big) this.fx.burst([px, py], '#ff3a20', 16);
    if (m.fire || ['fireFist', 'dragon', 'fireTrail'].includes(m.fx)) this.fx.flame(px, py, 8, 1);
    NF.audio.play(big ? 'hitH' : 'hitL');
    att.meter = Math.min(100, att.meter + (m.meter || 5)); def.meter = Math.min(100, def.meter + dmg * .06);
    if (att.meter >= 100 && !att.ultReadyShown) { att.ultReadyShown = 1; NF.audio.play('meter'); }
    if (def.hp <= 0) this.ko(att, def);
    return 'hit';
  }
  ko(att, def) {
    if (this.over) return;
    def.hp = 0; def.dead = true; this.over = true; this.phase = 'ko'; this.pt = 0; this.koWinner = att;
    this.slow = .22; this.hitstop = 18; this.shake(22); this.fx.screenFlash('#fff', .8);
    NF.audio.play('ko');
  }

  /* ================= spawns ================= */
  spawnProj(f, p) {
    if (this.proj.some(q => q.owner === f && q.kind !== 'wave') && p.kind !== 'wave') { /* one at a time */ }
    for (let i = 0; i < (p.n || 1); i++) {
      const h = f.wj(p.kind === 'wave' ? 'haN' : 'haN');
      this.proj.push({ owner: f, kind: p.kind, x: h[0] + f.face * 20 - (i * 50 * f.face), y: p.kind === 'wave' ? NF.FLOOR - 20 : h[1] + i * 26, vx: p.speed * f.face, vy: p.vy || 0, grav: p.grav || 0, r: p.r * 1, life: p.life + i * 6, age: -i * 6, m: Object.assign({ kind: 'special', level: p.level || 'mid' }, p), hit: false, boom: p.boom });
    }
  }
  spawnEruption(f, opp, m) { this.erupt.push({ owner: f, x: opp.x, t: 0, delay: m.delay || 24, m, done: false }); }
  spawnClone(f, m) { this.clones.push({ owner: f, x: f.x, y: f.y, face: f.face, t: 0, m, hit: false, pose: NF.rig.copy(f.pose), J: f.J }); NF.audio.play('magic'); this.fx.smoke(f.x, f.y - 100, 10, 'rgba(60,0,20,'); }
  startUlt(att, def) { if (this.cine || this.over) return; att.meter = 0; att.ultReadyShown = 0; this.cine = NF.ult.start(this, att, def); }

  /* ================= update ================= */
  update() {
    this.t++;
    if (this.paused) return;
    NF.input.poll();
    const [a, b] = this.f;
    this.fx.update();
    if (this.shakeA > 0) { this.shakeA *= .86; if (this.shakeA < .3) this.shakeA = 0; }
    this.cam.sx = (Math.random() * 2 - 1) * this.shakeA; this.cam.sy = (Math.random() * 2 - 1) * this.shakeA;

    // slow motion: skip simulation frames
    if (this.slow < 1) { this.slowAcc += this.slow; if (this.slowAcc < 1) { this.updateCam(); return; } this.slowAcc -= 1; }
    if (this.hitstop > 0) { this.hitstop--; a.frozen = b.frozen = true; this.updateCam(); return; }
    a.frozen = b.frozen = false;

    if (this.cine) { const done = this.cine.update(this); a.updatePose(this, b); b.updatePose(this, a); if (done) this.cine = null; this.updateCam(); return; }

    this.pt++;
    if (this.phase === 'intro') {
      if (this.pt === 20) NF.audio.play('bell');
      if (this.pt === 95) NF.audio.play('fight');
      if (this.pt >= 110) { this.phase = 'fight'; a.state = b.state = 'idle'; }
      a.updatePose(this, b); b.updatePose(this, a); this.updateCam(); return;
    }
    if (this.phase === 'fight') { if (this.timer > 0) this.timer--; if (this.timer <= 0) this.timeOver(); }

    a.update(this, b); b.update(this, a);
    this.push(a, b);
    this.updateProj(); this.updateErupt(); this.updateClones();
    for (const f of this.f) { if (f.combo > 0 && f.comboShow <= 0) f.combo = 0; }

    if (this.phase === 'ko') {
      if (this.pt === 70) { this.slow = 1; }
      const w = this.koWinner, l = w === a ? b : a;
      if (this.pt > 70 && !w.air && ['idle', 'walk', 'crouch', 'land'].includes(w.state)) { w.state = 'win'; w.st = 0; }
      if (this.pt === 90) NF.audio.play('bell');
      if (this.pt > 200) this.endRound(w === a ? 0 : 1);
    }
    if (this.phase === 'timeover' && this.pt > 160) this.endRound(this.toWinner);
    this.updateCam();
  }
  timeOver() {
    if (this.phase !== 'fight') return;
    const [a, b] = this.f, ra = a.hp / a.maxhp, rb = b.hp / b.maxhp;
    this.toWinner = ra === rb ? -1 : ra > rb ? 0 : 1; this.phase = 'timeover'; this.pt = 0; this.over = true;
    if (this.toWinner >= 0) { this.f[this.toWinner].state = 'win'; this.f[1 - this.toWinner].state = 'lose'; }
    NF.audio.play('bell');
  }
  endRound(w) {
    if (this.phase === 'roundEnd' || this.phase === 'matchEnd') return;
    if (w >= 0) this.wins[w]++;
    if (this.wins[0] >= 2 || this.wins[1] >= 2) {
      this.phase = 'matchEnd'; const win = this.wins[0] >= 2 ? 0 : 1; this.f[win].state = 'win'; this.f[1 - win].state = 'lose';
      this.opts.onEnd && this.opts.onEnd(win);
      return;
    }
    this.round++; this.startRound();
  }
  push(a, b) {
    if (a.ghost || b.ghost || a.hidden > 0 || b.hidden > 0) return;
    const w = 34 * (a.sc + b.sc) / 2 + 16, dx = b.x - a.x, ady = Math.abs(a.y - b.y);
    if (ady < 150 && Math.abs(dx) < w * 2) {
      const ov = w * 2 - Math.abs(dx); if (ov <= 0) return;
      const s = dx === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(dx);
      let ma = ov / 2, mb = ov / 2;
      if (a.x - s * ma < NF.STAGE_L || a.x - s * ma > NF.STAGE_R) { mb += ma; ma = 0; }
      if (b.x + s * mb < NF.STAGE_L || b.x + s * mb > NF.STAGE_R) { ma += mb; mb = 0; }
      a.x -= s * ma; b.x += s * mb;
    }
  }
  updateProj() {
    for (const q of this.proj) {
      q.age++; q.life--; q.x += q.vx; q.vy += q.grav; q.y += q.vy;
      const opp = this.f[1 - q.owner.idx];
      if (q.kind === 'bomb' && q.y >= NF.FLOOR - 20 && q.vy > 0) { q.y = NF.FLOOR - 20; q.vy *= -.45; q.vx *= .7; if (Math.abs(q.vy) < 3) q.life = Math.min(q.life, 1); }
      // trails
      if (q.kind === 'fire') { this.fx.flame(q.x - q.vx, q.y, 3, 1.4); if (q.age % 3 === 0) this.fx.embers(q.x, q.y, 2); }
      if (q.kind === 'dark') { this.fx.flame(q.x - q.vx, q.y, 2, 1.1, 'dark'); }
      if (q.kind === 'blade') { if (q.age % 2 === 0) this.fx.embers(q.x, q.y, 1, '#ff4a5a'); }
      if (q.kind === 'wave') { if (q.age % 2 === 0) { this.fx.dust(q.x, NF.FLOOR, 2); this.fx.flame(q.x, NF.FLOOR - 10, 1, .8); } }
      if (q.kind === 'bomb') { if (q.age % 2 === 0) this.fx.embers(q.x, q.y, 1, '#ffd040'); }
      if (q.age < 0 || q.hit) continue;
      // projectile clash
      for (const o of this.proj) if (o !== q && o.owner !== q.owner && !o.hit && o.age >= 0 && Math.hypot(o.x - q.x, o.y - q.y) < o.r + q.r) { o.hit = q.hit = true; o.life = q.life = 0; this.fx.burst([(o.x + q.x) / 2, (o.y + q.y) / 2], '#ffb040', 26); this.fx.ring((o.x + q.x) / 2, (o.y + q.y) / 2, '#fff', 10, 100, 14, 6); NF.audio.play('boom'); this.shake(6); }
      if (q.hit) continue;
      if (opp.hittable() && opp.hurt().some(h => (h[0] - q.x) ** 2 + (h[1] - q.y) ** 2 < (h[2] + q.r) ** 2)) {
        q.hit = true; q.life = 0;
        const m = Object.assign({ dmg: q.m.dmg, chip: q.m.chip, stun: q.m.stun, bstun: q.m.bstun, kb: q.m.kb, level: q.m.level, knock: q.m.knock, launch: q.m.launch, meter: 6, fire: q.kind === 'fire' }, {});
        this.resolveHit(q.owner, opp, m, [q.x, q.y], q);
        if (q.kind === 'bomb' || q.kind === 'fire') this.explode(q);
      }
      if (q.life <= 0 && q.kind === 'bomb' && !q.hit) { this.explode(q); q.hit = true;
        if (opp.hittable() && Math.hypot(opp.x - q.x, opp.y - 100 - q.y) < 130) this.resolveHit(q.owner, opp, Object.assign({}, q.m, { meter: 6 }), [q.x, q.y], q); }
    }
    this.proj = this.proj.filter(q => q.life > 0 && q.x > NF.STAGE_L - 300 && q.x < NF.STAGE_R + 300);
  }
  explode(q) { this.fx.burst([q.x, q.y], q.kind === 'bomb' ? '#ffcf40' : '#ff5a10', 30); this.fx.ring(q.x, q.y, '#ffb040', 10, 140, 18, 10); this.fx.flame(q.x, q.y, 10, 1.6); this.shake(10); NF.audio.play('boom'); }
  updateErupt() {
    for (const e of this.erupt) {
      e.t++;
      const opp = this.f[1 - e.owner.idx];
      if (e.t < e.delay) { if (e.t % 3 === 0) this.fx.embers(e.x + NF.rand(-40, 40), NF.FLOOR, 2); if (e.t === 1) this.fx.crack(e.x, NF.FLOOR); }
      if (e.t >= e.delay && e.t < e.delay + 26) { this.fx.flame(e.x + NF.rand(-36, 36), NF.FLOOR - NF.rand(0, 240), 4, 1.6); if (e.t === e.delay) { this.shake(14); NF.audio.play('fire'); this.fx.debris(e.x, NF.FLOOR, 12); } }
      if (!e.done && e.t >= e.delay && e.t < e.delay + 8 && opp.hittable() && Math.abs(opp.x - e.x) < 70 && opp.y > NF.FLOOR - 260) {
        e.done = true; this.resolveHit(e.owner, opp, Object.assign({ fire: true }, e.m), [e.x, opp.y - 80], { x: e.x - opp.face });
      }
    }
    this.erupt = this.erupt.filter(e => e.t < e.delay + 40);
  }
  updateClones() {
    for (const c of this.clones) {
      c.t++; const opp = this.f[1 - c.owner.idx];
      if (c.t < 30) { c.x += c.face * 12; if (c.t % 2 === 0) this.fx.flame(c.x, c.y - 100, 2, 1.2, 'dark'); }
      const P = c.owner.def.poses, R = NF.rig;
      c.pose = R.blend(c.pose, c.t < 18 ? R.add(P.stance, { lean: 40, hn: [80, -150] }) : R.add(P.stance, { hn: [150, -150], lean: 30 }), .4);
      c.J = R.solve(c.owner.def.sk, c.pose);
      if (!c.hit && c.t >= 16 && c.t < 34 && opp.hittable() && Math.abs(opp.x - c.x) < 110) { c.hit = true; this.resolveHit(c.owner, opp, c.m, [c.x + c.face * 60, c.y - 140], c); }
    }
    this.clones = this.clones.filter(c => c.t < 46);
  }
  updateCam() {
    const [a, b] = this.f, cam = this.cam;
    if (this.cine && this.cine.cam) { const cc = this.cine.cam; cam.x = NF.lerp(cam.x, cc.x, cc.k || .15); cam.y = NF.lerp(cam.y, cc.y, cc.k || .15); cam.z = NF.lerp(cam.z, cc.z, cc.k || .15); return; }
    const mx = (a.x + b.x) / 2, dist = Math.abs(a.x - b.x);
    const z = NF.clamp(1040 / (dist + 640), .78, 1.0);
    const hy = Math.min(a.y, b.y);
    cam.x = NF.lerp(cam.x, NF.clamp(mx, NF.STAGE_L + 520, NF.STAGE_R - 520), .12);
    cam.z = NF.lerp(cam.z, z, .06);
    cam.y = NF.lerp(cam.y, 420 - Math.max(0, NF.FLOOR - 120 - hy) * .3, .08);
  }

  /* ================= render ================= */
  render(ctx, W, H) {
    ctx.direction = 'ltr';
    const cam = this.cam, ar = this.arena;
    ctx.save();
    ctx.translate(W / 2 + cam.sx, H / 2 + cam.sy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    ar.back(ctx, cam, this.t, this.fx);
    ar.floor(ctx, cam, this.t);
    this.fx.drawBack(ctx);
    if (this.cine && this.cine.drawBack) this.cine.drawBack(ctx, this);
    // eruption telegraph
    for (const e of this.erupt) if (e.t < e.delay) { ctx.save(); const k = e.t / e.delay; ctx.globalAlpha = .4 + k * .5; const g = ctx.createRadialGradient(e.x, NF.FLOOR, 0, e.x, NF.FLOOR, 90); g.addColorStop(0, 'rgba(255,200,60,.9)'); g.addColorStop(1, 'rgba(255,40,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, NF.FLOOR + 4, 90, 18, 0, 0, 7); ctx.fill(); ctx.restore(); }
    // fighters: attacker on top
    const [a, b] = this.f, order = (b.attacking && !a.attacking) ? [a, b] : [b, a];
    for (const f of order) f.draw(ctx, this);
    for (const c of this.clones) this.drawClone(ctx, c);
    for (const q of this.proj) this.drawProj(ctx, q);
    this.fx.draw(ctx);
    if (this.cine && this.cine.drawWorld) this.cine.drawWorld(ctx, this);
    ar.front(ctx, cam, this.t);
    ctx.restore();
    // ambient colour grade
    ctx.save(); ctx.fillStyle = ar.light; ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(0, 0, W, H); ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (this.cine && this.cine.drawScreen) this.cine.drawScreen(ctx, W, H, this);
    this.drawHUD(ctx, W, H);
    this.fx.drawScreen(ctx, W, H);
  }
  drawClone(ctx, c) {
    const d = c.owner.def, f = c.owner;
    c.cv = f.snapshot(c.pose, 'rgba(40,0,12,.9)', c.cv);
    ctx.save(); ctx.globalAlpha = c.t > 36 ? (46 - c.t) / 10 * .85 : .85; ctx.translate(c.x, c.y); ctx.scale(c.face, 1);
    ctx.shadowColor = '#ff1a3a'; ctx.shadowBlur = 18; ctx.drawImage(c.cv, -c.cv._ox, -c.cv._oy); ctx.restore();
  }
  drawProj(ctx, q) {
    if (q.age < 0) return;
    ctx.save(); ctx.translate(q.x, q.y);
    const t = q.age;
    if (q.kind === 'fire') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const r = q.r * (1.3 - i * .3) + Math.sin(t * .5 + i) * 4; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, ['rgba(255,240,180,1)', 'rgba(255,160,40,1)', 'rgba(255,70,10,.9)'][i]); g.addColorStop(1, 'rgba(160,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); }
      // skull-ish face in the fireball
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(80,0,0,.55)'; ctx.scale(Math.sign(q.vx), 1);
      ctx.beginPath(); ctx.ellipse(8, -6, 6, 4, 0, 0, 7); ctx.ellipse(-8, -6, 6, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(0, 14); ctx.lineTo(10, 8); ctx.fill();
    } else if (q.kind === 'dark') {
      ctx.rotate(t * .2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r * 1.4); g.addColorStop(0, '#000'); g.addColorStop(.5, '#2a0010'); g.addColorStop(.75, 'rgba(255,30,70,.8)'); g.addColorStop(1, 'rgba(120,0,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r * 1.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff3a5a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.rotate(2.09); ctx.beginPath(); ctx.arc(q.r * .5, 0, q.r * .6, -1, 1); ctx.stroke(); }
    } else if (q.kind === 'blade') {
      ctx.scale(Math.sign(q.vx), 1); ctx.rotate(Math.sin(t * .3) * .1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,40,60,.9)'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.quadraticCurveTo(-6, -42, -26, -36); ctx.quadraticCurveTo(-4, -18, -6, 0); ctx.quadraticCurveTo(-4, 18, -26, 36); ctx.quadraticCurveTo(-6, 42, 24, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,220,.9)'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(-4, -26, -14, -24); ctx.quadraticCurveTo(0, -10, 0, 0); ctx.quadraticCurveTo(0, 10, -14, 24); ctx.quadraticCurveTo(-4, 26, 18, 0); ctx.fill();
    } else if (q.kind === 'bomb') {
      ctx.rotate(t * .25);
      ctx.fillStyle = '#1a0a0c'; ctx.beginPath(); ctx.arc(0, 0, q.r * .8, 0, 7); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#ff5a20'; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; const p = .6 + Math.sin(t * .6) * .4;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r * 1.6); g.addColorStop(0, `rgba(255,220,80,${p})`); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r * 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff6c0'; ctx.fillRect(-3, -q.r * .8 - 8, 6, 8);
    } else if (q.kind === 'wave') {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 20, 0, -80); g.addColorStop(0, 'rgba(255,200,80,.95)'); g.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, 20); ctx.quadraticCurveTo(0, -90 - Math.sin(t) * 10, 40, 20); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= HUD ================= */
  drawHUD(ctx, W, H) {
    const [a, b] = this.f, now = this.t;
    if (this.cine && this.cine.hideHud) return;
    for (const f of this.f) this.drawBar(ctx, W, f);
    // timer
    ctx.save(); ctx.translate(W / 2, 54);
    R.poly(ctx, [[-56, -38], [56, -38], [44, 40], [-44, 40]], '#120708', 4, '#c8141c');
    ctx.font = "62px 'Bebas Neue', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sec = Math.ceil(this.timer / 60);
    ctx.fillStyle = sec <= 10 && this.phase === 'fight' && now % 30 < 15 ? '#ff3a3a' : '#fff1e6'; ctx.fillText(String(sec).padStart(2, '0'), 0, 4);
    ctx.restore();
    // round pips
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
      const x = W / 2 + (i ? 1 : -1) * (74 + k * 26), y = 92;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = this.wins[i] > k ? '#ffcf40' : '#2a1416'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120708'; ctx.stroke();
      if (this.wins[i] > k) { ctx.save(); ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 12; ctx.fill(); ctx.restore(); }
    }
    // combo counters
    for (const f of this.f) if (f.combo >= 2 && f.comboShow > 0) {
      const left = f.idx === 0, x = left ? 90 : W - 90, k = Math.min(1, (90 - f.comboShow) / 6);
      ctx.save(); ctx.translate(x, 260); ctx.rotate(left ? -.08 : .08); ctx.scale(.6 + k * .4 + (f.comboShow > 84 ? .2 : 0), .6 + k * .4 + (f.comboShow > 84 ? .2 : 0));
      ctx.globalAlpha = Math.min(1, f.comboShow / 20); ctx.textAlign = left ? 'left' : 'right';
      const lbl = f.combo >= 10 ? 'INSANE COMBO!' : f.combo >= 6 ? 'BRUTAL COMBO!' : 'HIT COMBO!';
      ctx.font = "96px 'Bebas Neue', Impact, sans-serif"; ctx.lineWidth = 10; ctx.strokeStyle = '#120708'; ctx.strokeText(f.combo, 0, 0);
      const g = ctx.createLinearGradient(0, -70, 0, 0); g.addColorStop(0, '#fff6c0'); g.addColorStop(1, '#ff3a1a'); ctx.fillStyle = g; ctx.fillText(f.combo, 0, 0);
      ctx.font = "40px 'Bebas Neue', Impact, sans-serif"; ctx.strokeText(lbl, 0, 40); ctx.fillStyle = '#fff'; ctx.fillText(lbl, 0, 40);
      ctx.font = "26px 'Bebas Neue', Impact, sans-serif"; ctx.fillStyle = '#ffcf40'; ctx.strokeText(f.comboDmg + ' DMG', 0, 70); ctx.fillText(f.comboDmg + ' DMG', 0, 70);
      ctx.restore();
    }
    // centre banners
    let txt = null, sub = null, k = 0;
    if (this.phase === 'intro') { if (this.pt < 90) { txt = 'ROUND ' + this.round; k = this.pt; } else { txt = 'FIGHT!'; k = this.pt - 90; } if (this.round === 3 && this.pt < 90) sub = 'FINAL ROUND'; }
    if (this.phase === 'ko') { txt = 'K.O.!'; k = this.pt; }
    if (this.phase === 'timeover') { txt = 'TIME!'; k = this.pt; }
    if (txt) this.banner(ctx, W, H, txt, k, sub);
  }
  banner(ctx, W, H, txt, k, sub) {
    ctx.save(); ctx.translate(W / 2, H * .42);
    const s = k < 8 ? 2.4 - k * .175 : 1 + Math.sin(k * .2) * .02, a = Math.min(1, k / 4);
    ctx.globalAlpha = a; ctx.scale(s, s); ctx.rotate(-.04);
    ctx.font = "150px 'Bebas Neue', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 16; ctx.strokeStyle = '#120708'; ctx.strokeText(txt, 0, 0);
    const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#fff6d0'); g.addColorStop(.5, txt === 'K.O.!' ? '#ff2a1a' : '#ffb030'); g.addColorStop(1, '#a8080e');
    ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
    if (sub) { ctx.font = "44px 'Bebas Neue', Impact, sans-serif"; ctx.lineWidth = 8; ctx.strokeText(sub, 0, 92); ctx.fillStyle = '#fff'; ctx.fillText(sub, 0, 92); }
    ctx.restore();
  }
  drawBar(ctx, W, f) {
    const left = f.idx === 0, bw = W * .36, x0 = left ? 120 : W - 120, dir = left ? 1 : -1, y = 34;
    ctx.save();
    // portrait
    const pimg = NF.img[f.def.img], px = left ? 18 : W - 118;
    ctx.save(); ctx.beginPath(); ctx.moveTo(px, 18); ctx.lineTo(px + 100, 18); ctx.lineTo(px + 100, 108); ctx.lineTo(px, 108); ctx.closePath();
    ctx.fillStyle = '#120708'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = f.def.color; ctx.stroke(); ctx.clip();
    if (pimg) { const c = f.def.faceCrop, sx = c[0] * pimg.width, sy = c[1] * pimg.height, sw = (c[2] - c[0]) * pimg.width, sh = (c[3] - c[1]) * pimg.height; ctx.save(); if (!left) { ctx.translate(px + 100, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); } ctx.drawImage(pimg, sx, sy, sw, sh, px, 18, 100, 90); ctx.restore(); }
    ctx.restore();
    // health bar frame
    const hx = left ? x0 : x0 - bw;
    R.poly(ctx, [[hx - 6, y - 8], [hx + bw + 6, y - 8], [hx + bw + 6 - dir * 0, y + 30], [hx - 6, y + 30]], '#120708', 3, '#3a1214');
    const pct = Math.max(0, f.hp / f.maxhp), lag = Math.max(0, f.hpLag / f.maxhp);
    const fillX = (p) => left ? [hx, bw * p] : [hx + bw * (1 - p), bw * p];
    let [lx, lw] = fillX(lag); ctx.fillStyle = '#fff2d8'; ctx.fillRect(lx, y, lw, 22);
    let [fx, fw] = fillX(pct);
    const g = ctx.createLinearGradient(0, y, 0, y + 22); g.addColorStop(0, pct > .3 ? '#ffd23a' : '#ff6a3a'); g.addColorStop(.5, pct > .3 ? '#ff8a10' : '#e0141c'); g.addColorStop(1, '#a8080e');
    ctx.fillStyle = g; ctx.fillRect(fx, y, fw, 22);
    if (pct < .25 && this.t % 20 < 10) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(fx, y, fw, 22); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(fx, y + 2, fw, 5);
    // name
    ctx.font = "30px 'Bebas Neue', Impact, sans-serif"; ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'top';
    ctx.lineWidth = 6; ctx.strokeStyle = '#120708'; const nm = f.def.name + (this.opts.labels ? '  ·  ' + this.opts.labels[f.idx] : '');
    ctx.strokeText(nm, left ? hx : hx + bw, y + 28); ctx.fillStyle = '#fff1e6'; ctx.fillText(nm, left ? hx : hx + bw, y + 28);
    // ultimate meter
    const mw = bw * .62, mx = left ? hx : hx + bw - mw, my = y + 62, full = f.meter >= 100;
    R.poly(ctx, [[mx - 4, my - 4], [mx + mw + 4, my - 4], [mx + mw + 4, my + 18], [mx - 4, my + 18]], '#120708', 3, '#3a1214');
    const mp = f.meter / 100, [qx, qw] = left ? [mx, mw * mp] : [mx + mw * (1 - mp), mw * mp];
    const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0); mg.addColorStop(0, '#7a0a10'); mg.addColorStop(1, full ? '#fff0a0' : '#ff2a3a');
    ctx.fillStyle = mg; ctx.fillRect(qx, my, qw, 14);
    for (let i = 1; i < 4; i++) { ctx.fillStyle = '#120708'; ctx.fillRect(mx + mw * i / 4 - 1, my, 2, 14); }
    if (full) {
      ctx.save(); ctx.shadowColor = '#ffcf40'; ctx.shadowBlur = 16 + Math.sin(this.t * .25) * 10; ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 3; ctx.strokeRect(mx - 4, my - 4, mw + 8, 22); ctx.restore();
      ctx.font = "26px 'Bebas Neue', Impact, sans-serif"; ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'middle';
      const tx = left ? mx + mw + 14 : mx - 14; ctx.globalAlpha = .65 + Math.sin(this.t * .25) * .35; ctx.lineWidth = 5; ctx.strokeStyle = '#120708'; ctx.strokeText('ULTIMATE READY!', tx, my + 7); ctx.fillStyle = '#ffe070'; ctx.fillText('ULTIMATE READY!', tx, my + 7);
    }
    ctx.restore();
  }
};
const R = NF.rig;
