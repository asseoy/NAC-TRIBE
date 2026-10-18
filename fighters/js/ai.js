/* Controllers: keyboard player, and an AI that only sees the past (human-like reaction delay). */
'use strict';
NF.KeyCtrl = class KeyCtrl {
  constructor(i) { this.i = i; this.last = null; }
  get() { const p = NF.input.P[this.i]; this.last = p; return p; }
  consume(a) { NF.input.consume(this.i, a); }
};

NF.AICtrl = class AICtrl {
  constructor(level) {
    const L = {
      easy: { react: 28, think: 12, block: .22, combo: .12, special: .18, anti: .1, punish: .15, ult: .3, jump: .05, aggro: .45, mistake: .35 },
      normal: { react: 16, think: 7, block: .58, combo: .55, special: .4, anti: .45, punish: .55, ult: .7, jump: .07, aggro: .6, mistake: .12 },
      hard: { react: 9, think: 4, block: .86, combo: .92, special: .55, anti: .8, punish: .9, ult: 1, jump: .06, aggro: .7, mistake: .03 },
    }[level] || {};
    this.L = L; this.level = level;
    this.held = {}; this.pressed = {}; this.buf = {}; this.last = { held: this.held };
    this.hist = []; this.plan = null; this.planT = 0; this.cool = 0; this.comboStep = 0;
  }
  consume(a) { this.buf[a] = 0; }
  press(a) { this.buf[a] = 8; }
  setDir(f, d) {   // d: {fwd, back, up, down}
    const r = f.face > 0;
    this.held.left = r ? !!d.back : !!d.fwd; this.held.right = r ? !!d.fwd : !!d.back;
    this.held.down = !!d.down; this.held.up = !!d.up;
  }
  get(f, opp, M) {
    // record what the opponent looks like now; act on what it looked like `react` frames ago
    const m = opp.move, A0 = m ? m.start : 0, A1 = m ? m.start + m.active : 0;
    this.hist.push({ x: opp.x, y: opp.y, air: opp.air, vx: opp.vx, state: opp.state, atk: opp.attacking, level: m ? m.level : null,
      phase: !m ? null : opp.mt < A0 ? 'start' : opp.mt < A1 ? 'active' : 'rec', reach: m && m.hit ? (m.hit.r || 30) * 2.6 + 90 : m && m.type === 'proj' ? 900 : 0, type: m ? m.type : null, proj: M.proj.filter(q => q.owner === opp).map(q => ({ x: q.x, vx: q.vx })) });
    if (this.hist.length > 60) this.hist.shift();
    const seen = this.hist[Math.max(0, this.hist.length - 1 - this.L.react)];
    for (const k in this.buf) if (this.buf[k] > 0) this.buf[k]--;
    this.pressed = {};
    if (M.phase !== 'fight') { this.setDir(f, {}); return this; }
    this.think(f, opp, M, seen);
    this.last = { held: this.held };
    return this;
  }
  think(f, opp, M, s) {
    const L = this.L, dist = Math.abs(s.x - f.x), id = f.def.id;
    const pref = { devil: 210, warrior: 120, girl: 150, chaos: 125, shadow: 300 }[id];
    const hasProj = ['devil', 'girl', 'shadow', 'chaos'].includes(id);
    if (this.cool > 0) this.cool--;

    // --- combo continuation (on confirmed hits only) ---
    if (f.state === 'attack' && f.move) {
      this.setDir(f, {});
      if (f.connected && Math.random() < L.combo * .5) {
        const mid = f.move.id;
        if (mid === 'L1' || mid === 'L1b') this.press('light');
        else if (mid === 'L2') this.press('heavy');
        else if (mid === 'cL') this.press(Math.random() < .5 ? 'light' : 'heavy');
        else if ((mid === 'H' || mid === 'cH') && Math.random() < L.special) { if (f.meter >= 100 && Math.random() < L.ult) this.press('ult'); else { this.setDir(f, this.pickSpecialDir(f, dist, 'combo')); this.press('special'); } }
      }
      return;
    }
    if (!f.canAct()) { // in stun: hold block direction for when it ends
      this.setDir(f, { back: true, down: s.level === 'low' }); return;
    }

    // --- defence: something is coming ---
    const threat = (s.atk && s.phase !== 'rec' && dist < s.reach) || s.proj.some(q => Math.sign(f.x - q.x) === Math.sign(q.vx) && Math.abs(f.x - q.x) < 360);
    if (threat && !f.air) {
      if (this.blocking || Math.random() < L.block) {
        this.blocking = 14;
        const projOnly = !s.atk;
        if (projOnly && hasProj && Math.random() < L.special * .5 && this.cool <= 0) { this.setDir(f, {}); this.press('special'); this.cool = 40; return; }   // fireball war
        if (projOnly && Math.random() < L.anti * .4) { this.setDir(f, { up: true, fwd: true }); this.press('up'); return; }
        this.setDir(f, { back: true, down: s.level === 'low' }); return;
      }
    }
    if (this.blocking > 0) { this.blocking--; this.setDir(f, { back: true, down: s.level === 'low' }); if (!threat && this.blocking < 8) this.blocking = 0; else return; }

    if (M.t % L.think !== 0 && this.plan) return this.runPlan(f, dist, pref);

    // --- punish whiffs ---
    if (s.atk && s.phase === 'rec' && dist < pref + 90 && Math.random() < L.punish) {
      this.setDir(f, dist > pref ? { fwd: true } : {});
      if (f.meter >= 100 && Math.random() < L.ult) { this.press('ult'); return; }
      if (Math.random() < .5) { this.setDir(f, this.pickSpecialDir(f, dist, 'punish')); this.press('special'); } else this.press(dist < 140 ? 'light' : 'heavy');
      return;
    }
    // --- anti-air ---
    if (s.air && dist < 240 && s.y < NF.FLOOR - 40 && Math.random() < L.anti) {
      if (id === 'warrior') { this.setDir(f, { down: true }); this.press('special'); }
      else if (id === 'chaos') { this.setDir(f, { down: true }); this.press('special'); }
      else if (id === 'shadow' && Math.random() < .5) { this.setDir(f, {}); this.press('special'); }
      else this.press('heavy');
      return;
    }
    // --- ultimate ---
    if (f.meter >= 100 && dist < 360 && Math.random() < L.ult * .25 && !s.air) { this.press('ult'); return; }
    // --- mistakes (easy AI wanders) ---
    if (Math.random() < L.mistake * .2) { this.plan = { kind: 'idle', t: 20 }; return; }
    // --- neutral game ---
    if (hasProj && dist > 330 && this.cool <= 0 && Math.random() < L.special * .6) { this.setDir(f, { fwd: id === 'girl' || id === 'shadow' }); if (id === 'devil' || id === 'chaos') this.setDir(f, id === 'chaos' ? { fwd: true } : {}); this.press('special'); this.cool = 60; return; }
    if (dist > pref + 60) {
      if (Math.random() < L.jump) { this.setDir(f, { fwd: true, up: true }); this.press('up'); this.plan = { kind: 'airatk', t: 30 }; return; }
      if (id === 'shadow' && dist > 420 && Math.random() < .08) { this.setDir(f, {}); this.press('special'); return; }
      this.plan = { kind: 'approach', t: 14 }; return this.runPlan(f, dist, pref);
    }
    if (dist < pref - 50 && id === 'shadow') { this.plan = { kind: 'retreat', t: 14 }; return this.runPlan(f, dist, pref); }
    // in range: attack
    if (Math.random() < L.aggro) {
      const r = Math.random();
      if (r < .45) { this.setDir(f, {}); this.press('light'); }
      else if (r < .65) { this.setDir(f, { down: true }); this.press(Math.random() < .6 ? 'light' : 'heavy'); }
      else if (r < .82) { this.setDir(f, {}); this.press('heavy'); }
      else { this.setDir(f, this.pickSpecialDir(f, dist, 'neutral')); this.press('special'); }
      return;
    }
    this.plan = { kind: Math.random() < .5 ? 'hover' : 'retreat', t: 10 };
    this.runPlan(f, dist, pref);
  }
  pickSpecialDir(f, dist, why) {
    const id = f.def.id;
    // returns direction held with the special button: {} = S1, fwd = S2, down = S3, back = S4
    const T = {
      devil: why === 'neutral' ? (dist > 180 ? { fwd: true } : { back: true }) : { fwd: true },
      warrior: dist < 150 ? (why === 'combo' ? {} : { down: true }) : { back: true },
      girl: dist < 170 ? { down: true } : {},
      chaos: dist < 150 ? { back: true } : {},
      shadow: dist < 160 ? { down: true } : { back: true },
    };
    return T[id] || {};
  }
  runPlan(f, dist, pref) {
    const p = this.plan; if (!p) return;
    if (--p.t <= 0) this.plan = null;
    switch (p.kind) {
      case 'approach': this.setDir(f, { fwd: true }); break;
      case 'retreat': this.setDir(f, { back: true }); break;
      case 'hover': this.setDir(f, dist > pref ? { fwd: true } : { back: true }); break;
      case 'airatk': this.setDir(f, { fwd: true }); if (f.air && f.vy > -4) { this.press(Math.random() < .5 ? 'heavy' : 'light'); this.plan = null; } break;
      default: this.setDir(f, {});
    }
  }
};
