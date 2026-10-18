/* A fighter: state machine, physics, moves, hit detection, drawing. */
'use strict';
NF.Fighter = class Fighter {
  constructor(def, idx, ctrl) {
    this.def = def; this.idx = idx; this.ctrl = ctrl;
    this.reset(idx === 0 ? -220 : 220);
  }
  reset(x) {
    const d = this.def;
    this.x = x; this.y = NF.FLOOR; this.vx = 0; this.vy = 0; this.face = x < 0 ? 1 : -1;
    this.hp = this.maxhp = d.phys.hp; this.hpLag = this.hp; this.meter = this.meter || 0;
    this.state = 'idle'; this.st = 0; this.move = null; this.mt = 0; this.stun = 0; this.inv = 0;
    this.air = false; this.jumps = 0; this.juggle = 0; this.combo = 0; this.comboDmg = 0; this.comboShow = 0;
    this.pose = NF.rig.copy(d.poses.stance); this.t = 0; this.ch = this.ch || {}; this.frozen = false;
    this.alpha = 1; this.trail = []; this.trailOn = 0; this.lastHit = {}; this.armor = 0; this.hidden = 0; this.glowEyes = 0;
    this.walkPh = 0; this.blocking = 0; this.hitFlash = 0; this.landed = 0; this.attacking = false; this.projOut = 0;
    this.J = NF.rig.solve(d.sk, this.pose); this.prevW = {};
    for (const k in this.ch) this.ch[k].init = false;
  }
  get grounded() { return !this.air; }
  get sc() { return this.def.sk.scale; }
  /* world-space joint */
  wj(name) { const p = this.J[name]; if (!p) return [this.x, this.y - 100]; return [this.x + p[0] * this.face, this.y + p[1]]; }

  /* ---------------- hurt circles ---------------- */
  hurt() {
    const s = this.sc, J = this.J, out = [];
    const add = (j, r, off = [0, 0]) => { const p = this.wj(j); out.push([p[0] + off[0] * this.face, p[1] + off[1], r * s]); };
    add('head', 24); add('chest', 30); add('hip', 28, [0, -14]); add('knN', 20); add('knF', 20); add('ftN', 16); add('ftF', 16);
    if (this.attacking) { add('haN', 14); add('elN', 14); }
    return out;
  }
  hitCircle(m) {
    const h = m.hit; if (!h) return null;
    let p;
    if (h.j === 'wpn') { const w = this.J.wpn || this.J.haN; p = [this.x + w[0] * this.face, this.y + w[1]]; }
    else p = this.wj(h.j);
    const off = h.off || [0, 0];
    return [p[0] + off[0] * this.face, p[1] + off[1], h.r * this.sc];
  }

  /* ---------------- input helpers ---------------- */
  dirHeld(inp) { const f = inp.held; return { fwd: this.face > 0 ? f.right : f.left, back: this.face > 0 ? f.left : f.right, up: f.up, down: f.down }; }
  canAct() { return ['idle', 'walk', 'crouch', 'jump', 'land'].includes(this.state) && this.stun <= 0; }

  startMove(m, M) {
    this.state = 'attack'; this.move = m; this.mt = 0; this.hitCount = 0; this.hitTimer = 0; this.connected = false; this.whiffed = true;
    this.attacking = true; this.moveAir = this.air; this.inv = Math.max(this.inv, m.inv || 0); this.armor = m.armor ? m.start + m.active : 0;
    if (m.sfx && m.start < 8) NF.audio.play(m.sfx);
    if (m.kind === 'special') { this.meter = Math.min(100, this.meter + 2); }
    M && M.onMoveStart && M.onMoveStart(this, m);
  }
  pickSpecial(inp) {
    const d = this.dirHeld(inp), S = this.def.specials;
    if (d.down) return S[2]; if (d.fwd) return S[1]; if (d.back || d.up) return S[3]; return S[0];
  }

  /* ================= main update ================= */
  update(M, opp) {
    this.t++;
    const inp = this.ctrl.get(this, opp, M);
    const P = this.def.phys;
    if (this.hidden > 0) this.hidden--;
    if (this.inv > 0) this.inv--;
    if (this.comboShow > 0) this.comboShow--;
    this.hpLag = this.hpLag > this.hp ? Math.max(this.hp, this.hpLag - (this.stun > 0 ? 0 : 6)) : this.hp;
    this.st++;
    if (M.cine) { this.updatePose(M, opp); return; }   // ultimate cinematic owns the fighters

    // facing (only when free)
    if ((this.canAct() || this.state === 'block') && !this.air) { const nf = opp.x >= this.x ? 1 : -1; if (nf !== this.face) { this.face = nf; } }

    const dir = this.dirHeld(inp);
    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': case 'land': {
        if (this.state === 'land' && this.st > 4) this.state = 'idle';
        // ultimate
        if (inp.buf.ult && this.meter >= 100 && this.state !== 'land') { this.ctrl.consume('ult'); M.startUlt(this, opp); return; }
        if (inp.buf.special) { this.ctrl.consume('special'); this.startMove(this.pickSpecial(inp), M); break; }
        const crouch = dir.down;
        if (inp.buf.heavy) { this.ctrl.consume('heavy'); this.startMove(crouch ? this.def.moves.cH : this.def.moves.H, M); break; }
        if (inp.buf.light) { this.ctrl.consume('light'); this.startMove(crouch ? this.def.moves.cL : this.def.moves.L1, M); break; }
        if (inp.buf.up && this.state !== 'land') {
          this.ctrl.consume('up'); this.air = true; this.jumps = 1; this.vy = -P.jump; this.vx = (dir.fwd ? P.walk * 1.15 : dir.back ? -P.back * 1.15 : 0) * this.face;
          this.state = 'jump'; this.st = 0; NF.audio.play('jump'); M.fx.dust(this.x, this.y, 8); break;
        }
        if (crouch) { this.state = 'crouch'; this.vx = 0; this.blocking = dir.back ? 2 : 0; }
        else if (dir.fwd) { this.state = 'walk'; this.vx = P.walk * this.face; this.blocking = 0; }
        else if (dir.back) { this.state = 'walk'; this.vx = -P.back * this.face; this.blocking = 1; }
        else { if (this.state !== 'land') this.state = 'idle'; this.vx *= .5; this.blocking = 0; }
        break;
      }
      case 'jump': {
        this.blocking = 0;
        if (inp.buf.special) { const sp = this.pickSpecial(inp); if (sp.airOk || sp.type === 'airdash') { this.ctrl.consume('special'); this.startMove(sp, M); break; } }
        if (inp.buf.heavy) { this.ctrl.consume('heavy'); this.startMove(this.def.moves.jH, M); break; }
        if (inp.buf.light) { this.ctrl.consume('light'); this.startMove(this.def.moves.jL, M); break; }
        if (inp.buf.up && P.doubleJump && this.jumps < 2 && this.st > 6) { this.ctrl.consume('up'); this.jumps = 2; this.vy = -P.jump * .8; this.vx = (dir.fwd ? P.walk : dir.back ? -P.back : this.vx * this.face) * this.face; M.fx.ring(this.x, this.y - 40, '#ff3040'); NF.audio.play('jump'); }
        break;
      }
      case 'attack': this.updateMove(M, opp, inp); break;
      case 'hurt': case 'block':
        if (--this.stun <= 0) { this.state = this.air ? 'fall' : (this.blockCrouch ? 'crouch' : 'idle'); this.st = 0; if (!this.air) { this.combo = 0; opp.combo = 0; this.juggle = 0; } }
        break;
      case 'fall':
        break;
      case 'down':
        this.vx *= .8;
        if (this.st > (M.over ? 9999 : 42)) { this.state = 'rise'; this.st = 0; this.inv = 18; }
        break;
      case 'rise':
        if (this.st > 16) { this.state = 'idle'; this.st = 0; opp.combo = 0; this.juggle = 0; }
        break;
      case 'win': case 'lose': case 'intro': this.vx *= .8; break;
    }

    /* ---- physics ---- */
    const noGrav = this.state === 'attack' && this.move && this.move.type === 'airdash' && this.mt >= this.move.start && this.mt < this.move.start + this.move.active;
    if (this.air) {
      if (!noGrav) this.vy += P.gravity;
      this.x += this.vx; this.y += this.vy;
      if (this.y >= NF.FLOOR) {
        this.y = NF.FLOOR; this.air = false; this.vy = 0;
        M.fx.dust(this.x, this.y, 6);
        if (this.state === 'fall' || (this.state === 'hurt' && this.knocked)) {
          if (this.dead) { this.state = 'down'; this.st = 0; M.shake(10); NF.audio.play('land'); }
          else if (this.knocked || this.juggle > 0) { this.state = 'down'; this.st = 0; this.vx *= .4; M.shake(6); NF.audio.play('land'); M.fx.dust(this.x, this.y, 16); }
          else { this.state = 'idle'; }
          this.knocked = false;
        } else if (this.state === 'attack') {
          const m = this.move;
          if (m && (m.air || ['flykick', 'rise', 'airdash', 'phantom', 'spin'].includes(m.type))) { this.state = 'land'; this.st = 0; this.move = null; this.attacking = false; this.vx = 0; }
        } else if (this.state === 'jump') { this.state = 'land'; this.st = 0; this.vx = 0; NF.audio.play('land'); }
        else if (this.state === 'hurt') { /* stays in stun */ }
      }
    } else {
      this.x += this.vx;
      if (this.state === 'hurt' || this.state === 'block' || this.state === 'down') this.vx *= .82;
      else if (this.state === 'attack' && !(this.move && ['dash', 'rush', 'spin', 'through', 'strike'].includes(this.move.type))) this.vx *= .7;
    }
    if (this.state === 'fall' && !this.air) { this.state = 'down'; this.st = 0; }
    this.x = NF.clamp(this.x, NF.STAGE_L, NF.STAGE_R);
    if (this.state === 'walk' && this.t % 18 === 0) NF.audio.play('step');
    this.updatePose(M, opp);
  }

  /* ---------------- moves ---------------- */
  updateMove(M, opp, inp) {
    const m = this.move, P = this.def.phys; this.mt++;
    const t = this.mt, A0 = m.start, A1 = m.start + m.active, END = m.start + m.active + m.rec;
    const active = t >= A0 && t < A1;
    // --- per-type behaviour ---
    switch (m.type) {
      case 'strike': if (t < A1 - 1) this.vx = (m.step || 0) * this.face * (t < A0 ? .4 : 1.2); break;
      case 'dash': if (active) { this.vx = m.speed * this.face; if (t % 2 === 0) M.fx.trail(this, m.fx); } else if (t >= A1) this.vx *= .7; break;
      case 'rush': if (active) { this.vx = m.speed * this.face; if (t % 3 === 0) M.fx.trail(this, m.fx); } break;
      case 'spin': if (active) { this.vx = m.speed * this.face; if (m.rise && t === A0) { this.air = true; this.vy = m.rise; } if (t % 2 === 0) M.fx.trail(this, m.fx); } break;
      case 'rise': if (t === A0) { this.air = true; this.vy = m.rise; this.vx = m.adv * this.face; M.fx.burst(this.wj('haN'), '#ff6a20', 18); } if (active && t % 2 === 0) M.fx.trail(this, m.fx); break;
      case 'flykick': if (t === A0) { this.air = true; this.vy = m.vy; this.vx = m.vx * this.face; } if (active && t % 2 === 0) M.fx.trail(this, m.fx); break;
      case 'airdash': if (t === A0) { this.vx = m.speed * this.face; this.vy = 0; M.fx.ring(this.x, this.y - 100, '#ff3040'); } if (active && t % 2 === 0) M.fx.trail(this, m.fx); if (t === A1) this.vx *= .4; break;
      case 'through': if (active) { this.vx = m.speed * this.face; this.ghost = true; if (t % 2 === 0) M.fx.trail(this, m.fx); } if (t === A1) { this.ghost = false; this.vx = 0; } break;
      case 'proj': if (t === A0) { M.spawnProj(this, m.proj); if (m.sfx && m.start >= 8) NF.audio.play(m.sfx); } break;
      case 'slam': if (t === A0) { M.spawnProj(this, { kind: 'wave', n: 1, speed: 11, dmg: m.dmg, chip: m.chip, stun: m.stun, bstun: m.bstun, kb: m.kb, r: 30, life: 60, level: 'low', launch: 1 }); M.shake(12); NF.audio.play('boom'); M.fx.crack(this.wj('haN')[0], NF.FLOOR); M.fx.dust(this.wj('haN')[0], NF.FLOOR, 24); } break;
      case 'eruption': if (t === A0) { M.spawnEruption(this, opp, m); NF.audio.play('fire'); } break;
      case 'teleport': if (t === 1) { M.fx.smoke(this.x, this.y - 100); this.hidden = A0 + 4; } if (t === A0) { const nx = NF.clamp(opp.x - opp.face * 120, NF.STAGE_L, NF.STAGE_R); this.x = nx; this.face = opp.x >= this.x ? 1 : -1; M.fx.smoke(this.x, this.y - 100); NF.audio.play('teleport'); } break;
      case 'clone': if (t === A0) { M.spawnClone(this, m); } break;
      case 'phantom': if (t === 1) { M.fx.smoke(this.x, this.y - 100); this.hidden = A0; } if (t === A0) { this.x = NF.clamp(opp.x - opp.face * 30, NF.STAGE_L, NF.STAGE_R); this.y = NF.FLOOR - 240; this.air = true; this.vy = 14; this.vx = 0; this.face = opp.x >= this.x ? 1 : -1; M.fx.smoke(this.x, this.y - 100); NF.audio.play('teleport'); } break;
    }
    if (m.fx && t === A0) M.fx.moveFx(this, m.fx);
    if (m.sfx && t === A0 && m.start >= 8 && m.type !== 'proj') NF.audio.play(m.sfx);
    // --- hit detection ---
    if (active && m.hit && opp.hittable()) {
      const hits = m.hits || 1, gap = Math.max(1, Math.floor(m.active / hits));
      if (this.hitCount < hits && (this.hitCount === 0 || t - this.lastHitT >= gap)) {
        const c = this.hitCircle(m);
        if (c && opp.hurt().some(h => (h[0] - c[0]) ** 2 + (h[1] - c[1]) ** 2 < (h[2] + c[2]) ** 2)) {
          const res = M.resolveHit(this, opp, m, c);
          this.hitCount++; this.lastHitT = t; this.connected = true; this.whiffed = false;
          if (res === 'block' && m.type === 'through') { }
        }
      }
    }
    // --- cancels (combo) ---
    if (this.connected && t >= A0 && t < END - 2 && m.cancel) {
      const b = inp.buf, dn = this.dirHeld(inp).down;
      let nx = null;
      if (b.special && m.cancel.includes('S')) { this.ctrl.consume('special'); nx = this.pickSpecial(inp); }
      else if (b.heavy && (m.cancel.includes('H') || m.cancel.includes('cH'))) { this.ctrl.consume('heavy'); nx = dn ? this.def.moves.cH : this.def.moves.H; }
      else if (b.light && (m.cancel.includes('L2') || m.cancel.includes('L1b') || m.cancel.includes('cL'))) {
        this.ctrl.consume('light');
        nx = dn ? this.def.moves.cL : (m.cancel.includes('L1b') && m.id === 'L1' ? this.def.moves.L1b : this.def.moves.L2);
      }
      if (b.ult && this.meter >= 100 && !this.air) { this.ctrl.consume('ult'); M.startUlt(this, opp); return; }
      if (nx && !(nx.kind === 'normal' && nx === m)) { this.startMove(nx, M); return; }
    }
    if (t >= END && !(this.air && (m.air || ['flykick', 'rise', 'phantom', 'spin'].includes(m.type)))) {
      this.state = this.air ? 'jump' : (m.crouch ? 'crouch' : 'idle'); this.st = 0; this.move = null; this.attacking = false; this.ghost = false;
    }
    if (this.air && m.type === 'airdash' && t >= END) { this.state = 'jump'; this.move = null; this.attacking = false; }
  }
  hittable() { return this.inv <= 0 && this.hidden <= 0 && !(this.state === 'down') && !(this.state === 'rise') && !(this.state === 'fall' && this.juggle >= 4) && !this.dead; }

  /* ---------------- pose ---------------- */
  updatePose(M, opp) {
    if (this.hitFlash > 0 && !this.frozen) this.hitFlash--;
    const d = this.def, Ps = d.poses, R = NF.rig;
    let target, k = .35;
    const base = this.air ? Ps.jump : (this.state === 'crouch' || (this.move && this.move.crouch) || this.blockCrouch && this.state === 'block') ? Ps.crouch : Ps.stance;
    switch (this.state) {
      case 'idle': case 'land': {
        const br = Math.sin(this.t * .09) * 2.2;
        target = R.add(Ps.stance, { hy: br + (this.state === 'land' ? 10 : 0), hn: [0, br * .8], hf: [0, br], lean: Math.sin(this.t * .045) * 1.5 });
        k = .25; break;
      }
      case 'walk': {
        this.walkPh += Math.abs(this.vx) * .055 * Math.sign(this.vx * this.face || 1);
        const sw = Math.sin(this.walkPh), cw = Math.cos(this.walkPh), st = 22;
        target = R.add(Ps.stance, { fn: [sw * st, -Math.max(0, cw) * 16], ff: [-sw * st, -Math.max(0, -cw) * 16], hy: -Math.abs(sw) * 4, lean: 3 * Math.sign(this.vx * this.face), hn: [0, sw * 3] });
        k = .4; break;
      }
      case 'crouch': target = this.blocking === 2 ? Ps.cblock : Ps.crouch; k = .35; break;
      case 'jump': { const up = this.vy < 0; target = R.add(Ps.jump, { lean: this.vx * this.face * .6 + (up ? 0 : 6) }); if (this.jumps === 2) target = R.add(target, { lean: 20 }); k = .3; break; }
      case 'block': target = this.blockCrouch ? Ps.cblock : Ps.block; k = .55; break;
      case 'hurt': target = this.air ? Ps.fall : (this.lowHurt ? Ps.hurtLow : Ps.hurt); k = .6; break;
      case 'fall': target = R.add(Ps.fall, { lean: NF.clamp(this.vy * 3, -40, 30) - 30 }); k = .3; break;
      case 'down': target = Ps.down; k = .3; break;
      case 'rise': target = Ps.rise; k = .3; break;
      case 'win': target = R.add(Ps.win, { hy: Math.sin(this.t * .15) * 3, hn: [0, Math.sin(this.t * .15) * 6] }); k = .2; break;
      case 'lose': target = Ps.down; k = .2; break;
      case 'intro': target = Ps.intro || Ps.stance; k = .2; break;
      case 'attack': {
        if (!this.move) { target = Ps.stance; k = .4; break; }
        const m = this.move, t = this.mt, A0 = m.start, A1 = m.start + m.active, END = A1 + m.rec;
        const b = this.moveAir || this.air ? Ps.jump : m.crouch ? Ps.crouch : Ps.stance;
        const W = R.add(b, m.w || {}), A = R.add(b, m.a || {});
        if (t < A0) { target = R.blend(b, W, NF.ease.out(t / A0)); k = .55; }
        else if (t < A1) {
          target = R.blend(W, A, NF.ease.snap(Math.min(1, (t - A0 + 1) / 2)));
          if (m.type === 'spin') { const sp = (t - A0) * .5; target = R.add(A, { fn: [Math.cos(sp) * 30, Math.sin(sp) * 20], ff: [-Math.cos(sp) * 30, -Math.sin(sp) * 20] }); this.spinA = sp; }
          if (m.type === 'rush') { const w = (t - A0) % 6 < 3; target = R.add(A, w ? { hf: [-80, 10] } : { hn: [-80, 10] }); }
          k = .8;
        } else { target = R.blend(A, b, NF.ease.inOut(Math.min(1, (t - A1) / m.rec))); k = .45; }
        break;
      }
      default: target = Ps.stance;
    }
    if (M.cine && this.cinePose) { target = this.cinePose; k = this.cineK || .5; }
    this.pose = R.blend(this.pose, target, k);
    this.pose.en = target.en ?? 1; this.pose.ef = target.ef ?? 1; this.pose.kn = target.kn ?? 1; this.pose.kf = target.kf ?? 1; this.pose.wpn = NF.lerp(this.pose.wpn || 0, target.wpn || 0, .4);
    this.J = R.solve(d.sk, this.pose);
    if (d.calcWpn) d.calcWpn(this, this.J);
    if (this.trailOn > 0) { this.trailOn--; if (this.t % 4 === 0 && this.trail.length < 4 && typeof document !== 'undefined' && !NF.headless) { const pool = NF.Fighter.pool(); this.trail.push({ x: this.x, y: this.y, face: this.face, cv: this.snapshot(R.copy(this.pose), this.def.trailTint || 'rgba(255,40,30,.8)', pool.pop()), life: 14 }); } }
    for (const tr of this.trail) { tr.life--; if (tr.life <= 0 && tr.cv) { const pool = NF.Fighter.pool(); if (pool.length < 40) pool.push(tr.cv); tr.cv = null; } }
    this.trail = this.trail.filter(tr => tr.life > 0);
  }

  /* ---------------- sprite snapshots (cheap afterimages / tints, no ctx.filter) ---------------- */
  snapshot(pose, tint, cv) {
    const d = this.def, s = this.sc, w = Math.round(560 * s / 1.2), h = Math.round(640 * s / 1.2);
    cv = cv || document.createElement('canvas'); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.translate(w / 2, h - 30);
    const fr = this.frozen, op = this.pose; this.frozen = true; this.pose = pose;
    const J = NF.rig.solve(d.sk, pose); if (d.calcWpn) d.calcWpn(this, J);
    try { this.drawBody(g, J); } finally { this.pose = op; this.frozen = fr; }
    if (tint) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
    cv._ox = w / 2; cv._oy = h - 30;
    return cv;
  }
  static pool() { return NF._spPool || (NF._spPool = []); }

  /* ---------------- drawing ---------------- */
  drawBody(ctx, J) {
    const S = NF.spr[this.def.id];
    if (S && NF.useSprites !== false) NF.sprites.draw(ctx, this, S); else this.def.draw(ctx, this, J);
  }
  draw(ctx, M) {
    const d = this.def;
    // shadow
    const sy = NF.FLOOR + 4, k = NF.clamp(1 - (NF.FLOOR - this.y) / 400, .3, 1);
    ctx.save(); ctx.globalAlpha = .45 * k * this.alpha; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(this.x, sy, 70 * this.sc * k, 12 * k, 0, 0, 7); ctx.fill(); ctx.restore();
    // afterimages
    for (const tr of this.trail) {
      if (!tr.cv) continue;
      ctx.save(); ctx.globalAlpha = tr.life / 14 * .45; ctx.translate(tr.x, tr.y); ctx.scale(tr.face, 1);
      ctx.drawImage(tr.cv, -tr.cv._ox, -tr.cv._oy); ctx.restore();
    }
    if (this.hidden > 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha * (this.inv > 0 && this.state === 'rise' && this.t % 4 < 2 ? .55 : 1);
    ctx.translate(this.x, this.y); ctx.scale(this.face, 1);
    if (this.spinA && this.state === 'attack' && this.move && this.move.type === 'spin') { ctx.translate(0, -110 * this.sc); ctx.scale(Math.cos(this.spinA * 1.6), 1); ctx.translate(0, 110 * this.sc); }
    this.drawBody(ctx, this.J);
    ctx.restore();
    if (this.hitFlash > 0 && NF.glow) {   // hit flash: one additive glow sprite (no re-render of the body)
      const c = this.wj('chest'), g = NF.glow.soft || NF.glow.hot, r = 150 * this.sc;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 * this.hitFlash / 3; ctx.drawImage(g, c[0] - r, c[1] - r, r * 2, r * 2); ctx.restore();
    }
  }
};
