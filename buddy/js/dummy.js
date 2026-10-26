/* The crash-test dummy: a 15-point ragdoll that tries to stand back up,
   with a painted face, status effects and cartoon marks instead of injuries. */
'use strict';
BD.SKINS = {
  crash: { name: 'בובת ריסוק', price: 0, body: '#f6c21c', dark: '#c79300', joint: '#232323', desc: 'הקלאסית הצהובה' },
  tribe: { name: 'דאמי הנשיא', price: 500, body: '#d3202a', dark: '#8e0f16', joint: '#111', stripes: true, desc: 'אדום־שחור, בצבעי השבט' },
  chrome: { name: 'רובו־דאמי', price: 1200, body: '#c9d3dc', dark: '#7d8a96', joint: '#3a4652', metal: true, desc: 'עשוי מתכת, נשמע כמו פח' },
  zombie: { name: 'זומבי־דאמי', price: 2000, body: '#8fcf6a', dark: '#5a8f3c', joint: '#2d3b22', desc: 'כבר מת, אז לא אכפת לו' },
  ninja: { name: 'נינג׳ה־דאמי', price: 3000, body: '#2b2b33', dark: '#16161b', joint: '#e53935', band: '#e53935', desc: 'שקט, מהיר, ועדיין חוטף' },
  gold: { name: 'דאמי זהב', price: 7500, body: '#ffd54a', dark: '#c99700', joint: '#8a6a00', shine: true, desc: 'כל מכה שווה פי 1.5 מטבעות', bonus: 1.5 }
};
BD.LINES = {
  hurt: ['איי!', 'אאוץ׳!', 'לא בפנים!', 'למה?!', 'אמאל׳ה!', 'זה כואב!', 'עוד פעם?!', 'הפסק!', 'אוי אוי אוי'],
  big: ['וואו!!!', 'זה היה חזק!', 'ראיתי את סבתא שלי', 'מי כיבה את האור?', 'אני רואה כוכבים'],
  taunt: ['זה כל מה שיש לך?', 'חחח לא הרגשתי', 'משעמם פה...', 'יאללה, תתאמץ', 'אני עוד עומד!'],
  scared: ['רגע רגע רגע!', 'לא את הפצצה!', 'בוא נדבר על זה', 'אני רוצה הביתה'],
  fly: ['אני עף!!!', 'ווייייי!', 'תורידו אותי!'],
  frozen: ['ק־ק־קר לי', 'ב־ב־ברררר'], burnt: ['משהו נשרף פה?', 'אה, זה אני'], zap: ['זזזזזזזזז', 'השיער שלי!'],
  wet: ['מגבת מישהו?'], dizzy: ['איפה אני?', 'כמה ציפורים...'], back: ['חזרתי!', 'אני מתוקן', 'נו, שוב?']
};
BD.Dummy = class {
  constructor(ph, x, floor) {
    this.ph = ph; this.mood = 'idle'; this.moodT = 0; this.blink = 0; this.look = [0, 0];
    this.stun = 0; this.frozen = 0; this.burn = 0; this.soot = 0; this.zap = 0; this.wet = 0; this.dizzy = 0; this.marks = [];
    this.say = null; this.sayT = 0; this.idleT = 0; this.air = 0; this.grabbed = null; this.dmg = 0; this.hp = 1;
    this.skin = BD.SKINS[BD.save.d.skin] || BD.SKINS.crash; this.ice = []; this.sq = { k: 0, a: 0, t: 0 }; this.hp = 1; this.maxHp = 700; this.ko = 0;
    this.build(x, floor);
  }
  build(x, floor) {
    const ph = this.ph, y = floor - 128, G = 'dummy', P = (dx, dy, r, m, name) => { const p = ph.particle(x + dx, y + dy, r, m, { group: G, rest: .35, fr: .7, name }); p.dummy = this; return p; };
    const J = this.j = {
      head: P(0, -152, 31, 4, 'head'), neck: P(0, -114, 9, 1.5), chest: P(0, -84, 27, 6, 'chest'), pelvis: P(0, -6, 24, 6, 'pelvis'),
      sL: P(-31, -98, 12, 1.5), sR: P(31, -98, 12, 1.5), eL: P(-42, -54, 10, 1.2), eR: P(42, -54, 10, 1.2), hL: P(-46, -12, 12, 1, 'hand'), hR: P(46, -12, 12, 1, 'hand'),
      pL: P(-16, 8, 13, 2), pR: P(16, 8, 13, 2), kL: P(-18, 64, 12, 1.8), kR: P(18, 64, 12, 1.8), fL: P(-21, 120, 13, 1.6, 'foot'), fR: P(21, 120, 13, 1.6, 'foot')
    };
    const L = (a, b, k = 1, kind = 'eq', len) => ph.link(J[a], J[b], { k, kind, len }), links = this.links = [];
    const add = (...a) => links.push(L(...a));
    [['head', 'neck'], ['neck', 'chest'], ['chest', 'pelvis'], ['chest', 'sL'], ['chest', 'sR'], ['sL', 'sR'], ['neck', 'sL'], ['neck', 'sR'], ['sL', 'eL'], ['eL', 'hL'], ['sR', 'eR'], ['eR', 'hR'],
      ['pelvis', 'pL'], ['pelvis', 'pR'], ['pL', 'pR'], ['pL', 'kL'], ['kL', 'fL'], ['pR', 'kR'], ['kR', 'fR'], ['sL', 'pelvis'], ['sR', 'pelvis'], ['chest', 'pL'], ['chest', 'pR']].forEach(([a, b]) => add(a, b));
    add('head', 'chest', .5);
    // keep the body from folding through itself
    add('head', 'pelvis', .6, 'min', 120); add('hL', 'chest', .3, 'min', 30); add('hR', 'chest', .3, 'min', 30);
    add('fL', 'pelvis', .4, 'min', 70); add('fR', 'pelvis', .4, 'min', 70); add('kL', 'chest', .3, 'min', 70); add('kR', 'chest', .3, 'min', 70);
    add('hL', 'sL', .3, 'min', 32); add('hR', 'sR', .3, 'min', 32); add('fL', 'pL', .3, 'min', 50); add('fR', 'pR', .3, 'min', 50);
    add('kL', 'kR', .2, 'min', 22); add('fL', 'fR', .2, 'min', 26); add('head', 'sL', .4, 'min', 36); add('head', 'sR', .4, 'min', 36);
    this.parts = Object.values(J);
  }
  remove() { this.parts.forEach(p => p.alive = false); this.links.forEach(c => c.alive = false); this.unfreezeLinks(); }
  get center() { return [this.j.chest.x, this.j.chest.y]; }
  nearest(x, y) { let b = null, bd = 1e9; for (const p of this.parts) { const d = Math.hypot(p.x - x, p.y - y) - p.r; if (d < bd) { bd = d; b = p; } } return [b, bd]; }
  speed() { let s = 0; for (const p of this.parts) { const [vx, vy] = this.ph.vel(p); s = Math.max(s, Math.hypot(vx, vy)); } return s; }
  onGround() { return this.parts.some(p => p.ground > 0); }
  talk(kind, force) {
    if (!force && this.sayT > 0 && Math.random() < .7) return;
    const l = BD.LINES[kind]; if (!l) return; this.say = BD.pick(l); this.sayT = 1.6;
    BD.audio.play('voice', { hurt: 'ow', big: 'scream', taunt: 'laugh', scared: 'scream', fly: 'wee', frozen: 'brr', burnt: 'ow', zap: 'scream', dizzy: 'hmm', back: 'laugh', wet: 'hmm' }[kind] || 'ow');
  }
  setMood(m, t = 1) { if (this.ko && m !== 'ko') return; this.mood = m; this.moodT = t; }
  /* cartoon squash: the head flattens along the blow for a moment */
  squashHit(p, vx, vy, f) { if (f < .15) return; this.sq = { k: Math.min(.45, f * .4), a: Math.atan2(vy, vx), t: .22 }; }
  /* f: impact strength 0..1+, from the game */
  react(f, x, y, mk) {
    this.idleT = 0;
    if (f > .25) this.stun = Math.max(this.stun, .35 + f * 1.4);
    if (f > .9) { this.dizzy = Math.max(this.dizzy, 2.5); this.setMood('dizzy', 2.5); if (Math.random() < .5) this.talk('big'); }
    else if (f > .15) { this.setMood(f > .5 ? 'scream' : 'hurt', .6 + f); if (Math.random() < .35) this.talk('hurt'); }
    if (x != null && (mk || f > .3)) this.mark(x, y, mk || (f > .8 ? 'crack' : 'bruise'));
    if (this.ko) this.setMood('ko', this.ko);
  }
  /* cartoon marks stick to the nearest limb segment */
  mark(x, y, kind, col) {
    const seg = this.segments(); let best = null, bd = 1e9;
    for (const s of seg) { const [a, b] = s; const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1; const t = BD.clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1); const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y); if (d < bd) { bd = d; best = { s: seg.indexOf(s), t }; } }
    if (!best || bd > 70) return;
    this.marks.push({ ...best, side: BD.rand(-.6, .6), kind, col, rot: Math.random() * 6, size: BD.rand(.8, 1.2) });
    if (this.marks.length > 28) this.marks.shift();
  }
  segments() { const J = this.j; return [[J.head, J.neck], [J.chest, J.pelvis], [J.sL, J.eL], [J.eL, J.hL], [J.sR, J.eR], [J.eR, J.hR], [J.pL, J.kL], [J.kL, J.fL], [J.pR, J.kR], [J.kR, J.fR]]; }
  repair() { this.ko = 0; this.mood = 'idle'; this.marks = []; this.soot = 0; this.burn = 0; this.wet = 0; this.zap = 0; this.dmg = 0; this.hp = 1; if (this.frozen) this.thaw(false); this.dizzy = 0; this.stun = 0; this.setMood('happy', 1.5); this.talk('back', true); }
  freeze(t = 4) {
    if (this.frozen) { this.frozen = Math.max(this.frozen, t); return; }
    this.frozen = t; this.burn = 0; this.setMood('frozen', t); this.talk('frozen', true);
    const ps = this.parts; this.ice = [];
    for (let i = 0; i < ps.length; i++) for (let k = i + 1; k < ps.length; k++) this.ice.push(this.ph.link(ps[i], ps[k], { k: .9 }));
    ps.forEach(p => { p.fr = .05; });
  }
  unfreezeLinks() { this.ice.forEach(c => c.alive = false); this.ice = []; }
  thaw(shatter) {
    this.frozen = 0; this.unfreezeLinks(); this.parts.forEach(p => p.fr = .7);
    if (shatter) { const [x, y] = this.center; BD.fx.shards(x, y, 34); BD.fx.shards(this.j.head.x, this.j.head.y, 12); BD.audio.play('shatter'); this.stun = 2; this.setMood('dizzy', 2); }
  }
  ignite(t = 3) { if (this.frozen) { this.thaw(false); BD.fx.smoke(...this.center, 8, '#cfe8ff', 26, 120); return; } this.burn = Math.max(this.burn, t); this.wet = 0; this.setMood('scream', t); this.talk('burnt'); }
  update(dt, input) {
    const J = this.j, ph = this.ph;
    if (this.flat > 0) { this.flat -= dt * 1.4; this.stun = Math.max(this.stun, .3); }
    if (this.sq.t > 0) { this.sq.t -= dt; this.sq.k *= .86; } else this.sq.k = 0;
    this.moodT -= dt; if (this.moodT <= 0 && this.mood !== 'idle') this.mood = this.dizzy > 0 ? 'dizzy' : 'idle';
    this.stun = Math.max(0, this.stun - dt); this.dizzy = Math.max(0, this.dizzy - dt); this.sayT -= dt; if (this.sayT <= 0) this.say = null;
    this.blink -= dt; if (this.blink < -0.12) this.blink = BD.rand(1.5, 4);
    this.wet = Math.max(0, this.wet - dt * .12);
    if (input) { const [cx, cy] = this.center; const dx = input.x - J.head.x, dy = input.y - J.head.y, d = Math.hypot(dx, dy) || 1; this.look = [dx / d, dy / d]; }
    if (this.frozen) { this.frozen -= dt; if (this.frozen <= 0) { this.thaw(false); BD.fx.drops(J.chest.x, J.chest.y, 14, '#9fdcff', 300, 5); } }
    if (this.burn > 0) {
      this.burn -= dt; this.soot = Math.min(1, this.soot + dt * .35);
      if (Math.random() < .6) { const p = BD.pick(this.parts); BD.fx.fire(p.x, p.y, 2, 90, .9); }
      if (Math.random() < .05) BD.audio.play('fire');
      // running around while on fire
      if (!this.stun && !this.grabbed) { const dir = Math.sin(performance.now() / 400) > 0 ? 1 : -1; J.pelvis.ax += dir * 2600; J.head.ay -= 2500; }
    }
    if (this.zap > 0) { this.zap -= dt; for (const p of this.parts) ph.push(p, BD.rand(-160, 160), BD.rand(-160, 160)); if (Math.random() < .3) BD.fx.spark(BD.pick(this.parts).x, BD.pick(this.parts).y, 3, '#bfe9ff', 400); }
    const ground = this.onGround();
    this.air = ground ? 0 : this.air + dt;
    if (this.air > .45 && !this.grabbed && Math.random() < .02) this.talk('fly');
    // standing up: gentle springs toward an upright pose, only when calm
    const calm = !this.stun && !this.frozen && !this.zap && !this.grabbed && !this.ko && !this.held && ground && ph.gScale > .3 && Math.abs(ph.gx) < .1;
    this.stand = BD.lerp(this.stand || 0, calm ? 1 : 0, calm ? dt * .9 : dt * 8);
    if (this.stand > .02) {
      const s = this.stand, px = J.pelvis.x, gy = ph.b.b, sway = Math.sin(performance.now() / 700) * (this.dizzy > 0 ? 22 : 5);
      const pull = (p, tx, ty, k) => { p.ax += (tx - p.x) * k * s; p.ay += (ty - p.y) * k * s; };
      const fy = gy - 13;
      pull(J.pelvis, (J.fL.x + J.fR.x) / 2, fy - 128, 260);
      pull(J.chest, px + sway * .5, fy - 206, 300); pull(J.head, px + sway, fy - 280, 340); pull(J.neck, px + sway * .7, fy - 242, 150);
      pull(J.fL, px - 22, fy, 60); pull(J.fR, px + 22, fy, 60); pull(J.kL, px - 19, fy - 56, 80); pull(J.kR, px + 19, fy - 56, 80);
      const breath = Math.sin(performance.now() / 500) * 4;
      pull(J.hL, px - 46, fy - 118 + breath, 40); pull(J.hR, px + 46, fy - 118 + breath, 40);
      // damp the wobble so he settles instead of jittering
      for (const p of this.parts) { p.px = BD.lerp(p.px, p.x, .02 * s); p.py = BD.lerp(p.py, p.y, .02 * s); }
    }
    if (calm && this.stand > .9) { this.idleT += dt; if (this.idleT > 9) { this.idleT = 0; this.talk('taunt'); this.setMood('smug', 1.6); } }
  }
  /* ---------- drawing ---------- */
  draw(x, t) {
    // flattened by something heavy: squash the whole body against the floor
    if (this.flat > 0) {
      const k = Math.min(1, this.flat), fy = BD.G.floor, cx = this.j.pelvis.x;
      x.save(); x.translate(cx, fy); x.scale(1 + k * .45, 1 - k * .6); x.translate(-cx, -fy); this.drawBody(x, t); x.restore();
    } else this.drawBody(x, t);
  }
  drawBody(x, t) {
    const J = this.j, S = this.skin, sootK = this.soot;
    const col = this.frozen ? '#9fd8f3' : S.body, dark = this.frozen ? '#5aa9cc' : S.dark;
    const mix = (c1, k) => k > 0 ? this.mixCol(c1, '#2a2522', k * .85) : c1;
    const body = mix(col, sootK), bodyD = mix(dark, sootK);
    const limb = (a, b, w, c = body) => {
      x.lineCap = 'round'; x.strokeStyle = '#141414'; x.lineWidth = w + 7; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      x.strokeStyle = c; x.lineWidth = w; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = w * .25; x.beginPath(); x.moveTo(a.x - w * .15, a.y - w * .15); x.lineTo(b.x - w * .15, b.y - w * .15); x.stroke();
    };
    const joint = p => { x.fillStyle = '#141414'; x.beginPath(); x.arc(p.x, p.y, 9, 0, BD.TAU); x.fill(); x.fillStyle = S.joint; x.beginPath(); x.arc(p.x, p.y, 6, 0, BD.TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(p.x - 2, p.y - 2, 2, 0, BD.TAU); x.fill(); };
    // electrocuted: the classic x-ray flash
    if (this.zap > 0 && Math.floor(t * 18) % 2 === 0) { this.drawSkeleton(x); return; }
    // back limbs
    limb(J.pL, J.kL, 26, bodyD); limb(J.kL, J.fL, 24, bodyD); this.foot(x, J.kL, J.fL, bodyD);
    limb(J.sL, J.eL, 22, bodyD); limb(J.eL, J.hL, 20, bodyD); this.hand(x, J.eL, J.hL, bodyD);
    joint(J.kL); joint(J.eL);
    // torso
    const tor = [J.sL, J.sR, J.pR, J.pL];
    x.fillStyle = '#141414'; x.beginPath(); this.blob(x, tor, 10); x.fill();
    x.fillStyle = body; x.beginPath(); this.blob(x, tor, 4); x.fill();
    if (S.band) { x.strokeStyle = S.band; x.lineWidth = 9; x.beginPath(); x.moveTo(BD.lerp(J.sL.x, J.pL.x, .62), BD.lerp(J.sL.y, J.pL.y, .62)); x.lineTo(BD.lerp(J.sR.x, J.pR.x, .62), BD.lerp(J.sR.y, J.pR.y, .62)); x.stroke(); }
    // the crash-test target on the chest
    this.target(x, J.chest.x, J.chest.y + 4, 13, Math.atan2(J.pelvis.y - J.chest.y, J.pelvis.x - J.chest.x) - Math.PI / 2);
    x.fillStyle = '#141414'; x.beginPath(); x.arc(J.pelvis.x, J.pelvis.y + 6, 7, 0, BD.TAU); x.fill();
    limb(J.neck, J.chest, 16, bodyD);
    if (S.stripes) { x.save(); x.beginPath(); this.blob(x, tor, 4); x.clip(); x.strokeStyle = '#141414'; x.lineWidth = 8; for (let i = 1; i < 4; i++) { const k = i / 4; x.beginPath(); x.moveTo(BD.lerp(J.sL.x, J.pL.x, k) - 10, BD.lerp(J.sL.y, J.pL.y, k)); x.lineTo(BD.lerp(J.sR.x, J.pR.x, k) + 10, BD.lerp(J.sR.y, J.pR.y, k)); x.stroke(); } x.restore(); }
    this.scarf(x, t);
    // front limbs
    limb(J.pR, J.kR, 26); limb(J.kR, J.fR, 24); this.foot(x, J.kR, J.fR, body);
    limb(J.sR, J.eR, 22); limb(J.eR, J.hR, 20); this.hand(x, J.eR, J.hR, body);
    joint(J.kR); joint(J.eR); joint(J.sR); joint(J.pR);
    this.drawMarks(x);
    this.drawHead(x, t, body);
    if (this.frozen) this.drawIce(x, t);
    if (this.wet > .05) { x.globalAlpha = this.wet * .5; x.fillStyle = '#5fb8ff'; for (const p of this.parts) { x.beginPath(); x.arc(p.x + 4, p.y + p.r * .6, 3, 0, BD.TAU); x.fill(); } x.globalAlpha = 1; }
    if (this.dizzy > 0) for (let i = 0; i < 3; i++) { const a = t * 4 + i * BD.TAU / 3; BD.draw.star(x, J.head.x + Math.cos(a) * 42, J.head.y - 38 + Math.sin(a) * 12, 10, a, '#ffe14d'); }
    if (this.say) this.drawSay(x);
  }
  /* the tribe scarf: red and black stripes, a knot and two tails that trail behind */
  scarf(x, t) {
    const J = this.j, a = J.sL, b = J.sR, n = J.neck;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x);
    x.save(); x.translate(BD.lerp(n.x, mx, .55), BD.lerp(n.y, my, .55)); x.rotate(ang);
    x.fillStyle = '#141414'; BD.draw.rr(x, -30, -10, 60, 20, 9); x.fill();
    x.fillStyle = BD.RED; BD.draw.rr(x, -27, -7, 54, 14, 7); x.fill();
    x.fillStyle = '#141414'; for (let i = -16; i <= 16; i += 16) x.fillRect(i - 2.5, -7, 5, 14);
    const [vx] = this.ph.vel(J.chest), fl = BD.clamp(-vx / 900, -1, 1), wav = Math.sin(t * 14) * 4;
    for (const s of [-1, 1]) {
      x.fillStyle = '#141414'; x.beginPath(); x.moveTo(s * 4, 4); x.lineTo(s * 14 + fl * 30, 34 + wav * s); x.lineTo(s * 2 + fl * 26, 38 - wav * s); x.closePath(); x.fill();
      x.fillStyle = BD.RED; x.beginPath(); x.moveTo(s * 4, 7); x.lineTo(s * 11 + fl * 28, 31 + wav * s); x.lineTo(s * 4 + fl * 25, 33 - wav * s); x.closePath(); x.fill();
    }
    x.fillStyle = '#141414'; x.beginPath(); x.arc(0, 4, 8, 0, BD.TAU); x.fill(); x.fillStyle = '#a8121b'; x.beginPath(); x.arc(0, 4, 5.5, 0, BD.TAU); x.fill();
    x.restore();
  }
  blob(x, pts, pad) {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    const P = pts.map(p => { const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1; return [p.x + dx / d * pad, p.y + dy / d * pad]; });
    x.moveTo((P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2);
    for (let i = 0; i < P.length; i++) { const a = P[(i + 1) % P.length], b = P[(i + 2) % P.length]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    x.closePath();
  }
  hand(x, e, h, c) { const a = Math.atan2(h.y - e.y, h.x - e.x); x.save(); x.translate(h.x, h.y); x.rotate(a); x.fillStyle = '#141414'; x.beginPath(); x.ellipse(4, 0, 15, 13, 0, 0, BD.TAU); x.fill(); x.fillStyle = c; x.beginPath(); x.ellipse(4, 0, 11, 9.5, 0, 0, BD.TAU); x.fill(); x.restore(); }
  foot(x, k, f, c) { const a = Math.atan2(f.y - k.y, f.x - k.x); x.save(); x.translate(f.x, f.y); x.rotate(a - Math.PI / 2); x.fillStyle = '#141414'; x.beginPath(); x.ellipse(f.x < k.x ? -6 : 6, 6, 21, 13, 0, 0, BD.TAU); x.fill(); x.fillStyle = '#2e2e2e'; x.beginPath(); x.ellipse(f.x < k.x ? -6 : 6, 5, 17, 9, 0, 0, BD.TAU); x.fill(); x.restore(); }
  target(x, cx, cy, r, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.fillStyle = '#141414'; x.beginPath(); x.arc(0, 0, r + 2.5, 0, BD.TAU); x.fill();
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#141414' : '#ffe14d'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, r, i * Math.PI / 2, (i + 1) * Math.PI / 2); x.fill(); }
    x.restore();
  }
  drawHead(x, t, body) {
    const J = this.j, h = J.head, a = Math.atan2(h.y - J.neck.y, h.x - J.neck.x) + Math.PI / 2, R = 31;
    x.save(); x.translate(h.x, h.y);
    if (this.sq.k > .01) { x.rotate(this.sq.a); x.scale(1 - this.sq.k, 1 + this.sq.k * .7); x.rotate(-this.sq.a); }
    x.rotate(a);
    x.fillStyle = '#141414'; x.beginPath(); x.ellipse(0, 0, R + 4, R + 6, 0, 0, BD.TAU); x.fill();
    x.fillStyle = body; x.beginPath(); x.ellipse(0, 0, R, R + 2, 0, 0, BD.TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.ellipse(-10, -14, 11, 7, -.5, 0, BD.TAU); x.fill();
    if (this.skin.metal) { x.strokeStyle = '#7d8a96'; x.lineWidth = 2; x.beginPath(); x.moveTo(-R, 4); x.lineTo(R, 4); x.stroke(); }
    if (this.skin.band) { x.fillStyle = this.skin.band; x.fillRect(-R, -16, R * 2, 9); }
    this.target(x, R - 8, -6, 7, 0);
    this.face(x, t);
    x.restore();
  }
  face(x, t) {
    const m = this.mood, [lx, ly] = this.look, burnt = this.soot > .6;
    const eye = (ex, kind) => {
      x.save(); x.translate(ex, -4);
      if (kind === 'x') { x.strokeStyle = '#141414'; x.lineWidth = 4; x.beginPath(); x.moveTo(-6, -6); x.lineTo(6, 6); x.moveTo(6, -6); x.lineTo(-6, 6); x.stroke(); }
      else if (kind === 'spiral') { x.strokeStyle = '#141414'; x.lineWidth = 2.5; x.beginPath(); for (let i = 0; i < 26; i++) { const aa = i * .55 + t * 9, rr = i * .32; x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } x.stroke(); }
      else if (kind === 'shut') { x.strokeStyle = '#141414'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(-7, 1); x.quadraticCurveTo(0, -5, 7, 1); x.stroke(); }
      else if (kind === 'closed') { x.strokeStyle = '#141414'; x.lineWidth = 3.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(-7, 0); x.lineTo(7, 0); x.stroke(); }
      else {
        const big = kind === 'wide' ? 10.5 : 8.5;
        x.fillStyle = '#fff'; x.strokeStyle = '#141414'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(0, 0, big, big + 1.5, 0, 0, BD.TAU); x.fill(); x.stroke();
        const pr = kind === 'wide' ? 3.6 : 4.6; x.fillStyle = burnt ? '#141414' : '#1c1c1c'; x.beginPath(); x.arc(lx * 3.5, ly * 3.5, pr, 0, BD.TAU); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(lx * 3.5 - 1.5, ly * 3.5 - 1.5, 1.3, 0, BD.TAU); x.fill();
        if (kind === 'lid') { x.fillStyle = this.skin.body; x.fillRect(-big - 2, -big - 3, big * 2 + 4, big * .9); x.strokeStyle = '#141414'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-big, -big * .1); x.lineTo(big, -big * .1); x.stroke(); }
      }
      x.restore();
    };
    let ek = 'n';
    if (m === 'dizzy') ek = 'spiral'; else if (m === 'hurt' || m === 'frozen') ek = 'shut'; else if (m === 'scream' || m === 'scared') ek = 'wide'; else if (m === 'smug') ek = 'lid'; else if (m === 'ko') ek = 'x';
    if (this.blink < 0 && ek === 'n') ek = 'closed';
    eye(-11, ek); eye(11, ek);
    // eyebrows
    x.strokeStyle = '#141414'; x.lineWidth = 3.5; x.lineCap = 'round';
    const br = { hurt: [3, -3], scream: [-4, 4], scared: [-5, 5], smug: [2, -1], frozen: [3, -3] }[m] || [0, 0];
    x.beginPath(); x.moveTo(-18, -19 + br[0]); x.lineTo(-5, -19 + br[1]); x.moveTo(18, -19 + br[0]); x.lineTo(5, -19 + br[1]); x.stroke();
    // mouth
    x.fillStyle = '#5a1515'; x.strokeStyle = '#141414'; x.lineWidth = 3;
    if (m === 'scream' || m === 'scared') { x.beginPath(); x.ellipse(0, 15, 8, 10 + Math.sin(t * 40) * 1.5, 0, 0, BD.TAU); x.fill(); x.stroke(); x.fillStyle = '#ff7b8a'; x.beginPath(); x.ellipse(0, 20, 5, 3, 0, 0, BD.TAU); x.fill(); }
    else if (m === 'hurt') { x.beginPath(); x.moveTo(-10, 17); for (let i = 0; i <= 4; i++) x.lineTo(-10 + i * 5, 17 + (i % 2 ? -4 : 0)); x.stroke(); }
    else if (m === 'frozen') { x.fillStyle = '#fff'; x.fillRect(-9, 12, 18, 7); x.strokeRect(-9, 12, 18, 7); x.beginPath(); x.moveTo(-9, 15.5 + Math.sin(t * 50)); x.lineTo(9, 15.5 + Math.sin(t * 50)); x.stroke(); }
    else if (m === 'happy' || m === 'smug') { x.beginPath(); x.moveTo(-10, 12); x.quadraticCurveTo(2, 24, 12, 10); x.stroke(); }
    else if (m === 'dizzy') { x.beginPath(); x.moveTo(-9, 16); x.quadraticCurveTo(-3, 11, 2, 16); x.quadraticCurveTo(7, 21, 10, 15); x.stroke(); }
    else { x.beginPath(); x.moveTo(-8, 15); x.quadraticCurveTo(0, 18, 8, 14); x.stroke(); }
  }
  drawMarks(x) {
    const seg = this.segments();
    for (const mk of this.marks) {
      const [a, b] = seg[mk.s]; if (!a || !b) continue;
      const px = BD.lerp(a.x, b.x, mk.t), py = BD.lerp(a.y, b.y, mk.t), ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      const X = px + nx * mk.side * 9, Y = py + ny * mk.side * 9;
      x.save(); x.translate(X, Y); x.rotate(mk.rot); x.scale(mk.size, mk.size);
      if (mk.kind === 'bruise') { x.globalAlpha = .55; x.fillStyle = '#6b3fa0'; x.beginPath(); x.ellipse(0, 0, 8, 6, 0, 0, BD.TAU); x.fill(); x.globalAlpha = 1; }
      else if (mk.kind === 'crack') { x.strokeStyle = '#141414'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(-9, -3); x.lineTo(-3, 1); x.lineTo(1, -4); x.lineTo(5, 2); x.lineTo(10, 0); x.moveTo(1, -4); x.lineTo(2, -9); x.stroke(); }
      else if (mk.kind === 'band') { x.fillStyle = '#f3dcc0'; x.strokeStyle = '#a58a6a'; x.lineWidth = 1.5; x.fillRect(-11, -4, 22, 8); x.strokeRect(-11, -4, 22, 8); x.fillStyle = '#d9bd9a'; x.fillRect(-3, -4, 6, 8); }
      else if (mk.kind === 'hole') { x.fillStyle = '#141414'; x.beginPath(); x.arc(0, 0, 4, 0, BD.TAU); x.fill(); x.strokeStyle = '#141414'; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const aa = i * 1.26; x.beginPath(); x.moveTo(Math.cos(aa) * 4, Math.sin(aa) * 4); x.lineTo(Math.cos(aa) * 8, Math.sin(aa) * 8); x.stroke(); } }
      else if (mk.kind === 'paint') { x.fillStyle = mk.col; x.beginPath(); for (let i = 0; i < 9; i++) { const aa = i / 9 * BD.TAU, rr = i % 2 ? 6 : 11; x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } x.fill(); }
      else if (mk.kind === 'acid') { x.fillStyle = '#7cff3b'; x.globalAlpha = .8; x.beginPath(); x.arc(0, 0, 6, 0, BD.TAU); x.fill(); x.fillStyle = '#3a7a14'; x.beginPath(); x.arc(2, 1, 2.5, 0, BD.TAU); x.fill(); x.globalAlpha = 1; }
      else if (mk.kind === 'soot') { x.globalAlpha = .6; x.fillStyle = '#1d1a18'; x.beginPath(); for (let i = 0; i < 10; i++) { const aa = i / 10 * BD.TAU, rr = i % 2 ? 7 : 12; x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * .7); } x.fill(); x.globalAlpha = 1; }
      else if (mk.kind === 'scratch') { x.strokeStyle = '#141414'; x.lineWidth = 2; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(-10, i * 5 - 2); x.lineTo(10, i * 5 + 2); x.stroke(); } }
      else if (mk.kind === 'bite') { x.strokeStyle = '#141414'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-9 + i * 6, -3); x.lineTo(-6 + i * 6, 3); x.lineTo(-3 + i * 6, -3); x.stroke(); } }
      x.restore();
    }
  }
  drawSkeleton(x) {
    const J = this.j; x.lineCap = 'round';
    const bone = (a, b) => { x.strokeStyle = '#eaf6ff'; x.lineWidth = 7; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); };
    x.fillStyle = 'rgba(120,200,255,.35)'; for (const p of this.parts) { x.beginPath(); x.arc(p.x, p.y, p.r + 10, 0, BD.TAU); x.fill(); }
    this.segments().forEach(([a, b]) => bone(a, b)); bone(J.sL, J.sR); bone(J.pL, J.pR);
    for (let i = 0; i < 4; i++) { const t = .2 + i * .18, cx = BD.lerp(J.chest.x, J.pelvis.x, t), cy = BD.lerp(J.chest.y, J.pelvis.y, t); x.beginPath(); x.ellipse(cx, cy, 20, 4, 0, 0, BD.TAU); x.strokeStyle = '#eaf6ff'; x.lineWidth = 4; x.stroke(); }
    x.fillStyle = '#eaf6ff'; x.beginPath(); x.arc(J.head.x, J.head.y, 26, 0, BD.TAU); x.fill();
    x.fillStyle = '#123'; x.beginPath(); x.arc(J.head.x - 9, J.head.y - 3, 6, 0, BD.TAU); x.arc(J.head.x + 9, J.head.y - 3, 6, 0, BD.TAU); x.fill();
  }
  drawIce(x, t) {
    let l = 1e9, r = -1e9, tp = 1e9, b = -1e9; for (const p of this.parts) { l = Math.min(l, p.x - p.r); r = Math.max(r, p.x + p.r); tp = Math.min(tp, p.y - p.r); b = Math.max(b, p.y + p.r); }
    l -= 14; r += 14; tp -= 14; b += 10;
    x.globalAlpha = .42; x.fillStyle = '#bfefff'; BD.draw.rr(x, l, tp, r - l, b - tp, 14); x.fill();
    x.globalAlpha = .9; x.strokeStyle = '#e9fbff'; x.lineWidth = 3; x.stroke();
    x.globalAlpha = .6; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(l + 14, tp + 22); x.lineTo(l + 30, tp + 12); x.moveTo(r - 30, b - 18); x.lineTo(r - 16, b - 32); x.stroke();
    x.globalAlpha = 1;
  }
  drawSay(x) {
    const h = this.j.head; x.font = '700 30px Karantina, "Frank Ruhl Libre", sans-serif';
    const w = Math.max(90, x.measureText(this.say).width + 36), X = h.x - w / 2, Y = h.y - 118; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#fff'; x.strokeStyle = '#141414'; x.lineWidth = 3; BD.draw.rr(x, X, Y, w, 44, 14); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(h.x - 8, Y + 43); x.lineTo(h.x, Y + 62); x.lineTo(h.x + 10, Y + 43); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.fillRect(h.x - 9, Y + 39, 20, 6);
    x.fillStyle = '#141414'; x.fillText(this.say, h.x, Y + 23);
  }
  mixCol(a, b, k) {
    const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
};
