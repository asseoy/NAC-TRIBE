/* The five fighters: look, skeleton, stats, poses and move lists. */
'use strict';
NF.chars = (() => {
  const R = NF.rig;
  const HR = 25.5;   // head radius (anime proportions)
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k); return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`; };

  /* ---------------- shared human poses (unscaled units, facing +x) ---------------- */
  const P = {
    stance: { hx: 0, hy: -98, lean: 10, head: -6, hn: [46, -166], hf: [24, -178], fn: [26, 0], ff: [-30, 0] },
    crouch: { hx: 0, hy: -62, lean: 24, head: -16, hn: [52, -118], hf: [30, -126], fn: [36, 0], ff: [-38, 0] },
    jump: { hx: 0, hy: -100, lean: 4, head: -4, hn: [40, -172], hf: [12, -178], fn: [24, -50], ff: [-18, -40] },
    block: { hx: -4, hy: -96, lean: -4, head: 8, hn: [36, -196], hf: [30, -178], fn: [26, 0], ff: [-32, 0] },
    cblock: { hx: -4, hy: -60, lean: 12, head: 4, hn: [36, -140], hf: [30, -122], fn: [36, 0], ff: [-38, 0] },
    hurt: { hx: -10, hy: -96, lean: -20, head: 22, hn: [-6, -150], hf: [-24, -140], fn: [30, 0], ff: [-34, 0] },
    hurtLow: { hx: -6, hy: -60, lean: -6, head: 20, hn: [10, -110], hf: [-10, -104], fn: [36, 0], ff: [-38, 0] },
    fall: { hx: -10, hy: -96, lean: -55, head: 30, hn: [-40, -170], hf: [-60, -140], fn: [40, -40], ff: [10, -20] },
    down: { hx: 0, hy: -18, lean: -88, head: 10, hn: [-60, -30], hf: [-90, -10], fn: [80, -6], ff: [60, 0], kn: 1, kf: 1 },
    rise: { hx: 0, hy: -60, lean: 30, head: -10, hn: [40, -40], hf: [10, -20], fn: [30, 0], ff: [-34, 0] },
    win: { hx: 0, hy: -100, lean: -4, head: -12, hn: [20, -270], hf: [-20, -150], fn: [24, 0], ff: [-26, 0], en: -1 },
    intro: { hx: 0, hy: -100, lean: 2, head: -2, hn: [30, -150], hf: [-6, -150], fn: [22, 0], ff: [-24, 0] },
  };

  /* --------------- generic normals (each char tweaks them) --------------- */
  function normals(o = {}) {
    const m = {
      L1: { name: 'ג׳אב', start: 4, active: 3, rec: 8, dmg: 5, stun: 14, bstun: 9, kb: [3, 0], hit: { j: 'haN', r: 26 }, meter: 4, sfx: 'whoosh', level: 'mid', w: { hn: [30, -172], lean: 6 }, a: { hn: [122, -172], lean: 18, hx: 8, fist: 1 }, cancel: ['L2', 'H', 'S'] },
      L2: { name: 'קרוס', start: 5, active: 3, rec: 10, dmg: 6, stun: 15, bstun: 10, kb: [4, 0], hit: { j: 'haF', r: 26 }, meter: 4, sfx: 'whoosh', level: 'mid', w: { hf: [10, -170], lean: 4 }, a: { hf: [128, -166], hn: [30, -170], lean: 24, hx: 14, ef: 1 }, cancel: ['H', 'S'] },
      H: { name: 'בעיטה', start: 9, active: 4, rec: 16, dmg: 11, stun: 20, bstun: 13, kb: [9, 0], hit: { j: 'ftN', r: 30 }, meter: 8, sfx: 'whooshBig', level: 'mid', w: { fn: [6, -60], lean: -4, hx: -6 }, a: { fn: [130, -140], lean: -16, hx: -4, ff: [-36, 0] }, cancel: ['S'] },
      cL: { name: 'בעיטה נמוכה', start: 4, active: 3, rec: 9, dmg: 4, stun: 13, bstun: 8, kb: [3, 0], hit: { j: 'ftN', r: 26 }, meter: 4, sfx: 'whoosh', level: 'low', crouch: 1, w: { fn: [20, -6] }, a: { fn: [118, -8], lean: 6, hx: -6 }, cancel: ['cL', 'cH', 'S'] },
      cH: { name: 'סוויפ', start: 9, active: 4, rec: 20, dmg: 9, stun: 24, bstun: 12, kb: [6, 0], hit: { j: 'ftN', r: 30 }, meter: 8, sfx: 'whooshBig', level: 'low', crouch: 1, knock: 1, w: { fn: [0, -10], lean: 30 }, a: { fn: [150, -6], lean: 34, hx: -14, hy: -40 }, cancel: ['S'] },
      jL: { name: 'אגרוף באוויר', start: 4, active: 6, rec: 6, dmg: 6, stun: 15, bstun: 10, kb: [3, 0], hit: { j: 'haN', r: 26 }, meter: 4, sfx: 'whoosh', level: 'high', air: 1, w: { hn: [30, -170] }, a: { hn: [100, -130], lean: 20 } },
      jH: { name: 'בעיטה באוויר', start: 6, active: 7, rec: 8, dmg: 10, stun: 18, bstun: 12, kb: [6, 0], hit: { j: 'ftN', r: 30 }, meter: 7, sfx: 'whooshBig', level: 'high', air: 1, w: { fn: [20, -60] }, a: { fn: [110, -50], lean: 14, ff: [-10, -40] } },
    };
    for (const k in o) m[k] = Object.assign({}, m[k] || {}, o[k]);
    return m;
  }

  /* ================= drawing: shared human body ================= */
  function torsoPts(J, s, shW, hipW) {
    const ux = Math.sin(J.lean), uy = -Math.cos(J.lean), px = -uy, py = ux;  // p = perpendicular (toward +x when upright)
    const c = J.chest, h = J.hip;
    return [[h[0] - px * hipW, h[1] - py * hipW], [h[0] + px * hipW, h[1] + py * hipW], [c[0] + px * shW + ux * 4, c[1] + py * shW + uy * 4], [c[0] - px * shW * .8 + ux * 6, c[1] - py * shW * .8 + uy * 6]];
  }
  function face(ctx, L, J, s, f) {
    const [x, y] = J.head, r = HR * s, a = J.headA;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const hurt = f && (f.state === 'hurt' || f.state === 'fall' || f.state === 'down');
    if (!L.masked) {
      // eyes (3/4 view): near eye big, far eye narrow
      const ey = -r * .05;
      for (const [ex, w] of [[r * .52, r * .28], [r * .04, r * .2]]) {
        ctx.beginPath(); ctx.ellipse(ex, ey, w, r * .18, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff6ee'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = R.INK; ctx.stroke();
        if (!hurt) { ctx.beginPath(); ctx.ellipse(ex + w * .25, ey + 1, w * .45, r * .16, 0, 0, Math.PI * 2); ctx.fillStyle = L.eye || '#8a1010'; ctx.fill(); ctx.beginPath(); ctx.arc(ex + w * .3, ey, r * .06, 0, 7); ctx.fillStyle = '#111'; ctx.fill(); ctx.beginPath(); ctx.arc(ex + w * .05, ey - r * .06, r * .045, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(ex - w * .7, ey - 3); ctx.lineTo(ex + w * .7, ey + 3); ctx.moveTo(ex - w * .7, ey + 3); ctx.lineTo(ex + w * .7, ey - 3); ctx.lineWidth = 2.5; ctx.stroke(); }
      }
      // angry brows
      ctx.beginPath(); ctx.moveTo(r * .2, -r * .38); ctx.lineTo(r * .85, -r * .22); ctx.moveTo(-r * .18, -r * .34); ctx.lineTo(r * .16, -r * .3);
      ctx.lineWidth = 4.5; ctx.strokeStyle = R.INK; ctx.lineCap = 'round'; ctx.stroke();
      // nose + mouth
      ctx.beginPath(); ctx.moveTo(r * .9, r * .02); ctx.lineTo(r * 1.0, r * .22); ctx.lineTo(r * .86, r * .26); ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      if (L.grin || (f && f.state === 'win')) { ctx.moveTo(r * .35, r * .5); ctx.quadraticCurveTo(r * .65, r * .72, r * .9, r * .48); ctx.fillStyle = '#fff'; ctx.fill(); }
      else if (hurt || (f && f.attacking)) { ctx.ellipse(r * .7, r * .55, r * .14, r * .12, 0, 0, 7); ctx.fillStyle = '#3a0608'; ctx.fill(); }
      else { ctx.moveTo(r * .45, r * .55); ctx.lineTo(r * .85, r * .52); }
      ctx.lineWidth = 2.5; ctx.stroke();
      // war paint
      if (L.paint) { ctx.beginPath(); ctx.moveTo(r * .2, r * .15); ctx.lineTo(r * .55, r * .3); ctx.moveTo(r * .25, r * .3); ctx.lineTo(r * .5, r * .4); ctx.lineWidth = 3.5; ctx.strokeStyle = '#c4161d'; ctx.stroke(); }
    }
    ctx.restore();
  }
  function headBase(ctx, L, J, s) {
    const [x, y] = J.head, r = HR * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
    ctx.beginPath();
    ctx.moveTo(-r * .9, -r * .5); ctx.quadraticCurveTo(-r * .2, -r * 1.25, r * .7, -r * .8);
    ctx.quadraticCurveTo(r * 1.15, -r * .3, r * 1.05, r * .2);
    ctx.quadraticCurveTo(r * 1.0, r * .75, r * .55, r * .95);
    ctx.quadraticCurveTo(-r * .3, r * 1.05, -r * .8, r * .45);
    ctx.quadraticCurveTo(-r * 1.1, 0, -r * .9, -r * .5);
    ctx.fillStyle = L.skin; ctx.fill();
    ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(-r * 1.0, r * .25, r * 1.05, r * 1.25, -.2, 0, 7); ctx.fillStyle = NF.darker(L.skin); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * .55, r * .38, r * .2, r * .1, 0, 0, 7); ctx.fillStyle = 'rgba(220,60,50,.28)'; ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = R.INK; ctx.stroke();
    // ear
    ctx.beginPath(); ctx.ellipse(-r * .3, r * .08, r * .16, r * .24, 0, 0, 7); ctx.fillStyle = L.skin; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  function hair(ctx, L, J, s, f) {
    const [x, y] = J.head, r = HR * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
    const sp = L.hair; if (!sp) { ctx.restore(); return; }
    ctx.beginPath(); ctx.moveTo(r * .8, -r * .45);
    const n = sp.spikes, t = (f && f.t) || 0;
    for (let i = 0; i <= n; i++) {
      const k = i / n, ang = -0.35 - k * 2.6, len = r * (sp.len + .35 * NF.hash(i * 7 + sp.seed)) * (1 + Math.sin(t * .1 + i) * .03);
      const bx = Math.cos(ang) * r * .95, by = Math.sin(ang) * r * .95;
      ctx.lineTo(bx + Math.cos(ang - .5) * len * .2, by + Math.sin(ang - .5) * len * .2);
      ctx.lineTo(Math.cos(ang - .15) * (r + len) - sp.sweep * k * r, Math.sin(ang - .15) * (r + len) + sp.droop * k * r);
    }
    ctx.lineTo(-r * .9, r * .3); ctx.lineTo(-r * .45, -r * .1); ctx.lineTo(r * .1, -r * .45); ctx.lineTo(r * .5, -r * .2); ctx.lineTo(r * .8, -r * .45);
    ctx.closePath(); ctx.fillStyle = sp.color; ctx.fill();
    ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(-r * .9, r * .1, r * 1.1, r * 1.2, 0, 0, 7); ctx.fillStyle = NF.darker(sp.color, .6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * .2, -r * 1.05); ctx.quadraticCurveTo(r * .35, -r * 1.15, r * .6, -r * .75); ctx.lineWidth = r * .14; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = R.INK; ctx.lineJoin = 'round'; ctx.stroke();
    if (sp.streak) { ctx.beginPath(); ctx.moveTo(-r * .2, -r * 1.1); ctx.quadraticCurveTo(-r * .9, -r * .7, -r * 1.4, -r * .2); ctx.lineWidth = 5; ctx.strokeStyle = sp.streak; ctx.stroke(); }
    ctx.restore();
  }
  function headband(ctx, L, J, s, txt) {
    const [x, y] = J.head, r = HR * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
    ctx.beginPath(); ctx.moveTo(-r * .95, -r * .55); ctx.quadraticCurveTo(r * .1, -r * .95, r * 1.0, -r * .55); ctx.lineTo(r * 1.05, -r * .3); ctx.quadraticCurveTo(r * .1, -r * .7, -r * .98, -r * .28); ctx.closePath();
    ctx.fillStyle = L.band || '#c8141c'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = R.INK; ctx.stroke();
    if (txt) { ctx.save(); ctx.translate(r * .35, -r * .58); ctx.rotate(.18); ctx.scale(.9, .9); ctx.fillStyle = '#120708'; ctx.font = `900 ${Math.round(r * .3)}px Rubik, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 0); ctx.restore(); }
    ctx.restore();
  }
  function arm(ctx, L, J, s, side, far, f) {
    const sh = J['sh' + side], el = J['el' + side], ha = J['ha' + side];
    const skin = far ? L.skinD : L.skin;
    R.limb(ctx, sh, el, 12 * s * (L.armK || 1), 10.2 * s * (L.armK || 1), skin, L.muscle ? .55 : 0, -1);
    R.limb(ctx, el, ha, 10.2 * s * (L.armK || 1), 8.6 * s * (L.armK || 1), skin, L.muscle ? .4 : 0, -1);
    // wrist wrap
    const dx = ha[0] - el[0], dy = ha[1] - el[1], d = Math.hypot(dx, dy) || 1;
    const w0 = [ha[0] - dx / d * 14 * s, ha[1] - dy / d * 14 * s];
    R.capsule(ctx, w0, [ha[0] - dx / d * 4 * s, ha[1] - dy / d * 4 * s], 10.8 * s, 10.8 * s, far ? L.wrapD : L.wrap, R.INK, 3);
    R.fist(ctx, ha, 11 * s * (L.fistK || 1), skin, L.glove ? (far ? shade(L.glove, .7) : L.glove) : null);
  }
  function leg(ctx, L, J, s, side, far) {
    const hp = J['hp' + side], kn = J['kn' + side], ft = J['ft' + side];
    const pants = far ? L.pantsD : L.pants, skin = far ? L.skinD : L.skin;
    R.limb(ctx, hp, kn, 15.5 * s, 12.5 * s, L.shortLegs ? skin : pants, L.muscle ? .35 : 0, 1);
    if (L.shortLegs) {  // shorts over the thigh
      const dx = kn[0] - hp[0], dy = kn[1] - hp[1];
      const m = [hp[0] + dx * L.shortLegs, hp[1] + dy * L.shortLegs];
      R.capsule(ctx, hp, m, 17 * s, 15.5 * s, pants, R.INK, 3.5);
      // ragged hem
      ctx.beginPath(); const nx = -dy, ny = dx, d = Math.hypot(nx, ny) || 1;
      for (let i = -2; i <= 2; i++) { const px = m[0] + nx / d * i * 6 * s, py = m[1] + ny / d * i * 6 * s; ctx.lineTo(px + dx / Math.hypot(dx, dy) * (i % 2 ? 7 : 0) * s, py + dy / Math.hypot(dx, dy) * (i % 2 ? 7 : 0) * s); }
      ctx.lineWidth = 3; ctx.strokeStyle = pants; ctx.stroke();
    }
    R.limb(ctx, kn, ft, 12.5 * s, 9.5 * s, L.shinSkin ? skin : pants, L.muscle ? .3 : 0, 1);
    R.boot(ctx, kn, ft, 9.8 * s, far ? L.bootD : L.boot, far ? '#5a0a0e' : '#a8121a');
  }
  function torso(ctx, L, J, s) {
    const pts = torsoPts(J, s, L.shW * s, L.hipW * s);
    if (L.crop) {  // skin torso with a crop top on the chest
      R.poly(ctx, pts, L.skin, 4, R.INK, [-L.shW * s * .95, 2]);
      const c = J.chest, h = J.hip, k = .45;
      const mid = [[NF.lerp(pts[0][0], pts[3][0], k), NF.lerp(pts[0][1], pts[3][1], k)], [NF.lerp(pts[1][0], pts[2][0], k), NF.lerp(pts[1][1], pts[2][1], k)]];
      R.poly(ctx, [mid[0], mid[1], pts[2], pts[3]], L.top, 4, R.INK, [-L.shW * s * .95, 2]);
      // abs line
      ctx.beginPath(); ctx.moveTo((h[0] + c[0]) / 2 + 6 * s, (h[1] + c[1]) / 2 + 8); ctx.lineTo(h[0] + 6 * s, h[1] - 6); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(80,20,10,.5)'; ctx.stroke();
    } else R.poly(ctx, pts, L.top, 4, R.INK, [-L.shW * s * .95, 2]);
    if (L.chestLine) { ctx.beginPath(); ctx.moveTo(J.chest[0] + 4 * s, J.chest[1] + 10 * s); ctx.quadraticCurveTo(J.chest[0] + 16 * s, J.chest[1] + 22 * s, J.chest[0] + 6 * s, J.chest[1] + 30 * s); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke(); }
    // belt / sash
    const h = J.hip, ux = Math.sin(J.lean), uy = -Math.cos(J.lean), px = -uy, py = ux, bw = L.hipW * s * 1.05;
    R.poly(ctx, [[h[0] - px * bw + ux * 2, h[1] - py * bw + uy * 2], [h[0] + px * bw + ux * 2, h[1] + py * bw + uy * 2], [h[0] + px * bw + ux * 14 * s, h[1] + py * bw + uy * 14 * s], [h[0] - px * bw + ux * 14 * s, h[1] - py * bw + uy * 14 * s]], L.belt, 3);
  }
  // chains helper: make once per fighter
  function ensure(f, key, n, seg) { if (!f.ch[key]) f.ch[key] = R.chain(n, seg); return f.ch[key]; }
  function chainStep(f, key, n, seg, ax, ay, opt) { const c = ensure(f, key, n, seg); if (!opt.frozen) R.stepChain(c, ax, ay, opt); return c; }

  /* world-space helper: chains live in WORLD space so they trail behind motion */
  function W(f, p) { return [f.x + p[0] * f.face, f.y + p[1]]; }

  /* ================= the five ================= */
  const L_WAR = { skin: '#d9915f', skinD: '#a8693f', top: '#151012', pants: '#1a1214', pantsD: '#0e090a', boot: '#1c1214', bootD: '#100a0b', belt: '#b5121b', wrap: '#1b1012', wrapD: '#0f090a', band: '#c8141c', muscle: 1, shortLegs: .78, shinSkin: 1, paint: 1, chestLine: 1, shW: 21, hipW: 13, armK: 1.15, fistK: 1.08,
    hair: { color: '#2a160f', spikes: 7, len: .55, seed: 3, sweep: .2, droop: .1 } };
  const L_GIRL = { skin: '#e2a173', skinD: '#b07650', top: '#c3161e', pants: '#171012', pantsD: '#0d0809', boot: '#1d1315', bootD: '#110b0c', belt: '#9e1018', wrap: '#191012', wrapD: '#0e090a', band: '#c8141c', crop: 1, shortLegs: .62, shinSkin: 1, paint: 1, shW: 16, hipW: 13, armK: .85, fistK: .85, glove: '#1a1012', eye: '#a3151b',
    hair: { color: '#1a0c0d', spikes: 6, len: .35, seed: 11, sweep: .5, droop: .5, streak: '#b8141c' } };
  const L_CHAOS = { skin: '#d79363', skinD: '#a3683f', top: '#141012', pants: '#1a1315', pantsD: '#0e0a0b', boot: '#1c1214', bootD: '#100a0b', belt: '#3a2a20', wrap: '#2a1517', wrapD: '#170c0d', shW: 18, hipW: 12.5, armK: .95, grin: 1, paint: 1, eye: '#b0151c',
    hair: { color: '#7e1a14', spikes: 9, len: .7, seed: 21, sweep: .6, droop: .2, streak: '#3a0d0b' } };
  const L_SHADOW = { skin: '#c08560', skinD: '#8f603f', top: '#120d0f', pants: '#161013', pantsD: '#0c0809', boot: '#1a1214', bootD: '#0e090a', belt: '#8c0f16', wrap: '#9a1119', wrapD: '#5e0a0f', masked: 1, shW: 18, hipW: 13, armK: .95, glove: '#140d0f' };
  for (const L of [L_WAR, L_GIRL, L_CHAOS, L_SHADOW]) { L.skinD = L.skinD || shade(L.skin, .7); }

  function drawHuman(ctx, f, J, L, extra) {
    const s = f.def.sk.scale;
    extra.back && extra.back(ctx, f, J, s);
    arm(ctx, L, J, s, 'F', 1, f);
    leg(ctx, L, J, s, 'F', 1);
    torso(ctx, L, J, s);
    extra.torso && extra.torso(ctx, f, J, s);
    leg(ctx, L, J, s, 'N', 0);
    R.capsule(ctx, J.chest, J.neck, 8 * s, 8 * s, L.skin, R.INK, 3.5);
    extra.preHead && extra.preHead(ctx, f, J, s);
    headBase(ctx, L, J, s);
    face(ctx, L, J, s, f);
    hair(ctx, L, J, s, f);
    extra.head && extra.head(ctx, f, J, s);
    arm(ctx, L, J, s, 'N', 0, f);
    extra.front && extra.front(ctx, f, J, s);
  }
  // local<->world for chains (drawing happens in local space, flipped by facing)
  const toLocal = (f, q) => [(q.x - f.x) * f.face, q.y - f.y];
  const chainLocal = (f, c) => c.pts.map(q => { const l = toLocal(f, q); return { x: l[0], y: l[1] }; });

  /* ---------- THE WARRIOR ---------- */
  const warrior = {
    id: 'warrior', name: 'THE WARRIOR', he: 'הלוחם', title: 'אגרופים של אש', color: '#e0241f',
    img: 'warrior', faceCrop: [0.18, 0.02, 0.62, 0.3],
    stats: { power: 8, speed: 7, defense: 7, range: 4, special: 7 },
    desc: 'קרב צמוד, קומבו חזקים ואגרופים בוערים. חזק מאוד מקרוב.',
    sk: { scale: 1.2, torso: 70, neck: 10, head: 30, shoulder: 30, hipW: 26, ua: 46, fa: 44, th: 54, sh: 54 },
    phys: { walk: 4.3, back: 3.2, jump: 17.5, gravity: .85, weight: 1, hp: 1000 },
    look: L_WAR,
    setup(f) { },
    draw(ctx, f, J) {
      const L = L_WAR;
      drawHuman(ctx, f, J, L, {
        back(ctx, f, J, s) {  // red hooded cape-vest: two ragged tails from the shoulders
          for (const [k, sh, w] of [['capeA', J.shF, 15], ['capeB', J.shN, 13]]) {
            const c = chainStep(f, k, 7, 15 * s, ...W(f, [sh[0] - 10 * s, sh[1] + 4]), { g: .55, damp: .9, wind: -f.face * .25, frozen: f.frozen });
            R.ribbon(ctx, chainLocal(f, c), w * s, w * 1.6 * s, k === 'capeA' ? '#8f0f15' : '#c3161e', k === 'capeA' ? 3 : 9, 1.3);
          }
        },
        torso(ctx, f, J, s) {  // sash tails hanging from the hip
          const h = J.hip, c = chainStep(f, 'sash', 5, 12 * s, ...W(f, [h[0] + 10 * s, h[1] + 8]), { g: .5, damp: .9, frozen: f.frozen });
          R.ribbon(ctx, chainLocal(f, c), 8 * s, 11 * s, '#c3161e', 5, 1);
        },
        preHead(ctx, f, J, s) {  // hood resting on the shoulders
          const n = J.neck; ctx.beginPath(); ctx.ellipse(n[0] - 14 * s, n[1] + 4 * s, 22 * s, 14 * s, -.3, 0, 7); ctx.fillStyle = '#a3121a'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = R.INK; ctx.stroke();
        },
        head(ctx, f, J, s) { headband(ctx, L, J, s, 'הנשיא'); },
      });
    },
    poses: {},
    moves: normals({
      L1: { dmg: 6 }, L2: { dmg: 7 },
      H: { name: 'בעיטה סיבובית', dmg: 13 },
    }),
    specials: [
      { id: 'S1', name: 'אגרוף אש', en: 'FIRE PUNCH', type: 'strike', start: 10, active: 5, rec: 18, dmg: 14, chip: 2, stun: 24, bstun: 14, kb: [12, -2], knock: 1, step: 9, hit: { j: 'haN', r: 34 }, meter: 10, fx: 'fireFist', sfx: 'fire', w: { hn: [10, -168], lean: 0, hx: -10 }, a: { hn: [140, -164], lean: 26, hx: 22, fist: 1 } },
      { id: 'S2', name: 'הלם קרקע', en: 'GROUND SLAM', type: 'slam', start: 18, active: 4, rec: 22, dmg: 12, chip: 2, stun: 22, bstun: 14, kb: [7, -9], level: 'low', meter: 10, sfx: 'boom', w: { hn: [20, -250], hf: [0, -250], hy: -110, lean: -6 }, a: { hn: [70, -10], hf: [50, -10], hy: -56, lean: 50, fn: [40, 0], ff: [-44, 0] } },
      { id: 'S3', name: 'אפרקאט דרקון', en: 'DRAGON UPPERCUT', type: 'rise', start: 4, active: 10, rec: 22, dmg: 13, chip: 2, stun: 30, bstun: 16, kb: [4, -17], launch: 1, inv: 8, rise: -16, adv: 3.2, hits: 2, hit: { j: 'haN', r: 32 }, meter: 10, fx: 'dragon', sfx: 'fire', w: { hy: -70, hn: [30, -110], lean: 20 }, a: { hn: [40, -280], hf: [-10, -170], lean: -6, hy: -104, fn: [20, -40], ff: [-10, 0], en: -1 } },
      { id: 'S4', name: 'ריצת זעם', en: 'RAGE DASH', type: 'dash', start: 6, active: 14, rec: 16, dmg: 11, chip: 1, stun: 22, bstun: 12, kb: [11, -3], knock: 1, speed: 16, hit: { j: 'shN', r: 46 }, meter: 9, fx: 'rageTrail', sfx: 'whooshBig', w: { lean: 30, hy: -82 }, a: { lean: 40, hy: -84, hn: [70, -150], hf: [40, -160], fn: [40, 0], ff: [-50, -20] } },
    ],
    ult: { id: 'red_rage', name: 'RED RAGE', he: 'זעם אדום' },
  };

  /* ---------- CRIMSON (the girl) ---------- */
  const girl = {
    id: 'girl', name: 'CRIMSON', he: 'קרימזון', title: 'סערת בעיטות', color: '#ff3a46',
    img: 'girl', faceCrop: [0.22, 0.08, 0.66, 0.32],
    stats: { power: 6, speed: 9, defense: 5, range: 6, special: 8 },
    desc: 'אקרובטית ומהירה. בעיטות באוויר, להבי אנרגיה ותנועה בלתי צפויה.',
    sk: { scale: 1.1, torso: 66, neck: 10, head: 29, shoulder: 26, hipW: 26, ua: 44, fa: 42, th: 56, sh: 56 },
    phys: { walk: 5.0, back: 3.9, jump: 18.5, gravity: .82, weight: .9, hp: 920, doubleJump: 1 },
    look: L_GIRL,
    setup(f) { },
    draw(ctx, f, J) {
      const L = L_GIRL;
      drawHuman(ctx, f, J, L, {
        back(ctx, f, J, s) {
          // long hair mass + ponytail
          const hd = J.head, c = chainStep(f, 'pony', 8, 13 * s, ...W(f, [hd[0] - 12 * s, hd[1] - 22 * s]), { g: .5, damp: .9, wind: -f.face * .4, frozen: f.frozen });
          R.ribbon(ctx, chainLocal(f, c), 13 * s, 6 * s, '#1a0c0d', 4, .7);
          ctx.save(); ctx.globalAlpha = .9; R.ribbon(ctx, chainLocal(f, c).slice(2), 4 * s, 2 * s, '#b8141c', 8, .4, 0); ctx.restore();
          const h = J.hip, s2 = chainStep(f, 'sashB', 6, 11 * s, ...W(f, [h[0] - 12 * s, h[1] + 6]), { g: .55, damp: .9, frozen: f.frozen });
          R.ribbon(ctx, chainLocal(f, s2), 10 * s, 14 * s, '#9e1018', 6, 1.2);
        },
        torso(ctx, f, J, s) {
          const h = J.hip, c = chainStep(f, 'sashF', 5, 11 * s, ...W(f, [h[0] + 8 * s, h[1] + 6]), { g: .55, damp: .9, frozen: f.frozen });
          R.ribbon(ctx, chainLocal(f, c), 9 * s, 13 * s, '#c3161e', 7, 1.1);
        },
        head(ctx, f, J, s) {
          headband(ctx, L, J, s, 'הנשיא');
          // bangs
          const [x, y] = J.head, r = HR * s; ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
          ctx.beginPath(); ctx.moveTo(r * .1, -r * .5); ctx.quadraticCurveTo(r * .9, -r * .55, r * .95, -r * .05); ctx.lineTo(r * .6, -r * .3); ctx.lineTo(r * .45, -r * .02); ctx.lineTo(r * .3, -r * .35); ctx.closePath();
          ctx.fillStyle = '#1a0c0d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = R.INK; ctx.stroke(); ctx.restore();
        },
      });
    },
    moves: normals({
      L1: { start: 3, rec: 7, dmg: 5 },
      H: { name: 'בעיטה גבוהה', start: 8, dmg: 11, a: { fn: [136, -170], lean: -24, hx: -8, ff: [-34, 0] } },
      jH: { name: 'בעיטת מספריים', active: 9, dmg: 11 },
    }),
    specials: [
      { id: 'S1', name: 'בעיטה ארגמנית', en: 'CRIMSON KICK', type: 'flykick', start: 8, active: 16, rec: 14, dmg: 12, chip: 2, stun: 22, bstun: 14, kb: [10, -6], knock: 1, vx: 13, vy: -9, hit: { j: 'ftN', r: 34 }, meter: 9, fx: 'crimsonTrail', sfx: 'whooshBig', w: { hy: -70, lean: 10, fn: [10, -30] }, a: { fn: [120, -70], ff: [-30, -50], lean: -10, hn: [0, -190], hf: [-30, -150] } },
      { id: 'S2', name: 'להבי אנרגיה', en: 'ENERGY BLADES', type: 'proj', start: 11, active: 2, rec: 20, proj: { kind: 'blade', n: 2, speed: 13, dmg: 6, chip: 1, stun: 16, bstun: 10, kb: [5, 0], r: 22, life: 80 }, meter: 8, sfx: 'zap', w: { hn: [-20, -190], hf: [-40, -170], lean: -14 }, a: { hn: [130, -160], hf: [110, -140], lean: 22, hx: 10 } },
      { id: 'S3', name: 'טורנדו מסתובב', en: 'SPINNING TORNADO', type: 'spin', start: 7, active: 30, rec: 16, dmg: 3, hits: 5, chip: 1, stun: 14, bstun: 9, kb: [4, -2], speed: 5, hit: { j: 'hip', r: 64, off: [0, -40] }, meter: 10, fx: 'tornado', sfx: 'whooshBig', w: { hy: -90, lean: 0 }, a: { fn: [110, -110], ff: [-110, -100], hn: [70, -200], hf: [-70, -200], hy: -110, lean: 0 } },
      { id: 'S4', name: 'זינוק אווירי', en: 'AIR DASH', type: 'airdash', start: 4, active: 12, rec: 10, dmg: 8, chip: 0, stun: 18, bstun: 10, kb: [8, -4], speed: 17, airOk: 1, inv: 6, hit: { j: 'haN', r: 34 }, meter: 6, fx: 'crimsonTrail', sfx: 'teleport', w: { lean: 30 }, a: { lean: 60, hn: [100, -150], hf: [80, -140], fn: [-30, -40], ff: [-60, -30] } },
    ],
    ult: { id: 'crimson_storm', name: 'CRIMSON STORM', he: 'סערה ארגמנית' },
  };

  /* ---------- CHAOS ---------- */
  const chaos = {
    id: 'chaos', name: 'CHAOS', he: 'כאוס', title: 'מהירות בלתי צפויה', color: '#ff5a2a',
    img: 'chaos', faceCrop: [0.3, 0.05, 0.72, 0.36],
    stats: { power: 6, speed: 10, defense: 4, range: 5, special: 8 },
    desc: 'הכי מהיר במשחק. קומבו מהירים, פצצות אנרגיה ותנועות מטורפות.',
    sk: { scale: 1.12, torso: 66, neck: 10, head: 29, shoulder: 28, hipW: 25, ua: 45, fa: 43, th: 54, sh: 54 },
    phys: { walk: 5.4, back: 4.3, jump: 18, gravity: .86, weight: .85, hp: 880 },
    look: L_CHAOS,
    setup(f) { },
    draw(ctx, f, J) {
      const L = L_CHAOS;
      drawHuman(ctx, f, J, L, {
        back(ctx, f, J, s) {
          const n = J.neck;
          for (const [k, w, sd, col] of [['scarfA', 12, 2, '#8e1016'], ['scarfB', 10, 6, '#c8161d']]) {
            const c = chainStep(f, k, 9, 15 * s, ...W(f, [n[0] - 6 * s, n[1] + 2]), { g: .25, damp: .9, wind: -f.face * (k === 'scarfA' ? 1.1 : .7), frozen: f.frozen });
            R.ribbon(ctx, chainLocal(f, c), w * s, w * .8 * s, col, sd, 1.4);
          }
        },
        torso(ctx, f, J, s) {  // chain on the belt
          const h = J.hip; ctx.beginPath(); ctx.moveTo(h[0] + 10 * s, h[1] + 8); ctx.quadraticCurveTo(h[0] - 4 * s, h[1] + 26 * s, h[0] - 16 * s, h[1] + 8); ctx.setLineDash([4, 3]); ctx.lineWidth = 3; ctx.strokeStyle = '#8c8c94'; ctx.stroke(); ctx.setLineDash([]);
        },
        preHead(ctx, f, J, s) {  // scarf wrap round the neck
          const n = J.neck; ctx.beginPath(); ctx.ellipse(n[0], n[1] + 2, 15 * s, 9 * s, J.lean, 0, 7); ctx.fillStyle = '#c8161d'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = R.INK; ctx.stroke();
        },
        head(ctx, f, J, s) {  // goggles on the forehead
          const [x, y] = J.head, r = HR * s; ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
          ctx.beginPath(); ctx.moveTo(-r * .9, -r * .55); ctx.quadraticCurveTo(r * .1, -r * .95, r * 1.0, -r * .6); ctx.lineWidth = 5; ctx.strokeStyle = '#2a1414'; ctx.stroke();
          for (const gx of [r * .15, r * .62]) { ctx.beginPath(); ctx.arc(gx, -r * .72, r * .26, 0, 7); ctx.fillStyle = '#5a0d10'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = R.INK; ctx.stroke(); ctx.beginPath(); ctx.arc(gx, -r * .72, r * .17, 0, 7); ctx.fillStyle = '#e0303a'; ctx.fill(); ctx.beginPath(); ctx.arc(gx - r * .06, -r * .78, r * .05, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
          ctx.restore();
        },
      });
    },
    moves: normals({
      L1: { start: 3, rec: 6, dmg: 4, cancel: ['L1b', 'L2', 'H', 'S'] },
      L2: { start: 4, rec: 8, dmg: 5 },
      H: { name: 'בעיטת סיבוב', start: 8, dmg: 10 },
    }),
    specials: [
      { id: 'S1', name: 'זינוק כאוס', en: 'CHAOS DASH', type: 'through', start: 5, active: 12, rec: 14, dmg: 9, chip: 1, stun: 20, bstun: 12, kb: [-6, -3], speed: 22, inv: 12, hit: { j: 'hip', r: 52, off: [0, -60] }, meter: 8, fx: 'chaosTrail', sfx: 'teleport', w: { lean: 30, hy: -80 }, a: { lean: 55, hy: -76, hn: [90, -130], hf: [-40, -120], fn: [30, 0], ff: [-70, -10] } },
      { id: 'S2', name: 'פצצת אנרגיה', en: 'ENERGY BOMB', type: 'proj', start: 12, active: 2, rec: 18, proj: { kind: 'bomb', n: 1, speed: 8, vy: -13, grav: .6, dmg: 13, chip: 2, stun: 24, bstun: 14, kb: [7, -10], r: 26, life: 120, boom: 90, knock: 1 }, meter: 9, sfx: 'blip', w: { hn: [-40, -150], lean: -12 }, a: { hn: [90, -230], lean: 16, hx: 6, en: -1 } },
      { id: 'S3', name: 'מכת ספירלה', en: 'SPINNING STRIKE', type: 'spin', start: 5, active: 24, rec: 18, dmg: 3, hits: 4, chip: 1, stun: 16, bstun: 9, kb: [3, -6], speed: 3, rise: -12, launch: 1, hit: { j: 'hip', r: 60, off: [0, -50] }, meter: 10, fx: 'chaosSpin', sfx: 'whooshBig', w: { hy: -70, lean: 20 }, a: { hn: [90, -200], hf: [-90, -190], fn: [60, -60], ff: [-60, -50], hy: -110 } },
      { id: 'S4', name: 'קומבו ברקים', en: 'LIGHTNING COMBO', type: 'rush', start: 6, active: 34, rec: 18, dmg: 3, hits: 6, chip: 1, stun: 14, bstun: 8, kb: [2, 0], speed: 7, hit: { j: 'haN', r: 42 }, meter: 12, fx: 'lightning', sfx: 'zap', w: { lean: 24 }, a: { hn: [130, -170], hf: [120, -150], lean: 26, hx: 12 } },
    ],
    ult: { id: 'chaos_combo', name: 'CHAOS COMBO', he: 'קומבו כאוס' },
  };

  /* ---------- SHADOW ---------- */
  const shadow = {
    id: 'shadow', name: 'SHADOW', he: 'הצל', title: 'קסם האופל', color: '#c01a3a',
    img: 'shadow', faceCrop: [0.32, 0.0, 0.72, 0.38],
    stats: { power: 7, speed: 7, defense: 6, range: 8, special: 10 },
    desc: 'שליטה בטווח בינוני. שיגור, כדורי אופל, שיבוטים ומכות מהצללים.',
    sk: { scale: 1.12, torso: 68, neck: 10, head: 29, shoulder: 28, hipW: 26, ua: 45, fa: 44, th: 55, sh: 55 },
    phys: { walk: 4.2, back: 3.6, jump: 17, gravity: .8, weight: .95, hp: 950 },
    look: L_SHADOW,
    setup(f) { },
    draw(ctx, f, J) {
      const L = L_SHADOW;
      const alpha = f.alpha ?? 1;
      drawHuman(ctx, f, J, L, {
        back(ctx, f, J, s) {
          const sh = J.chest;
          for (const [k, dx, w, col] of [['cloakA', -16, 22, '#6e0b12'], ['cloakB', -2, 18, '#9e111a'], ['cloakC', 10, 12, '#b5131d']]) {
            const c = chainStep(f, k, 8, 17 * s, ...W(f, [sh[0] + dx * s, sh[1] + 2]), { g: .55, damp: .91, wind: -f.face * .35, frozen: f.frozen });
            R.ribbon(ctx, chainLocal(f, c), w * s, w * 1.5 * s, col, k.length * 3 + dx, 1.6);
          }
        },
        head(ctx, f, J, s) {
          const [x, y] = J.head, r = HR * s; ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
          // mask over the lower face
          ctx.beginPath(); ctx.moveTo(-r * .2, r * .08); ctx.quadraticCurveTo(r * .7, r * .02, r * 1.08, r * .12); ctx.quadraticCurveTo(r * 1.0, r * .8, r * .5, r * .98); ctx.quadraticCurveTo(-r * .2, r * 1.0, -r * .3, r * .5); ctx.closePath();
          ctx.fillStyle = '#150e10'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = R.INK; ctx.stroke();
          // glowing eyes
          ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.ellipse(r * .58, -r * .14, r * .2, r * .07, -.15, 0, 7); ctx.ellipse(r * .1, -r * .12, r * .12, r * .05, -.15, 0, 7); ctx.fillStyle = '#ff4a52'; ctx.fill();
          ctx.shadowBlur = 0;
          // hood
          ctx.beginPath(); ctx.moveTo(r * 1.15, -r * .1); ctx.quadraticCurveTo(r * 1.2, -r * 1.25, -r * .1, -r * 1.35); ctx.quadraticCurveTo(-r * 1.0, -r * 1.3, -r * 1.55, -r * .5);
          ctx.quadraticCurveTo(-r * 1.6, r * .6, -r * 1.0, r * 1.25); ctx.lineTo(-r * .5, r * 1.0); ctx.quadraticCurveTo(-r * .8, r * .1, -r * .55, -r * .5); ctx.quadraticCurveTo(r * .2, -r * .95, r * .9, -r * .35); ctx.closePath();
          ctx.fillStyle = '#b3131d'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = R.INK; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * .95, -r * .3); ctx.quadraticCurveTo(r * .3, -r * 1.0, -r * .5, -r * .55); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5e0a0f'; ctx.stroke();
          ctx.restore();
        },
        front(ctx, f, J, s) {  // ever-burning hand flame (drawn as layered tongues)
          const h = J.haN, t = f.t;
          for (let i = 0; i < 4; i++) {
            const k = 1 - i * .22, sway = Math.sin(t * .25 + i) * 5 * s;
            ctx.beginPath(); ctx.moveTo(h[0] - 9 * s * k, h[1]); ctx.quadraticCurveTo(h[0] - 10 * s * k + sway, h[1] - 26 * s * k, h[0] + sway * 1.6, h[1] - 44 * s * k); ctx.quadraticCurveTo(h[0] + 12 * s * k + sway, h[1] - 22 * s * k, h[0] + 9 * s * k, h[1]); ctx.closePath();
            ctx.fillStyle = ['rgba(120,0,10,.55)', 'rgba(200,20,30,.6)', 'rgba(255,60,50,.7)', 'rgba(255,170,150,.8)'][i]; ctx.fill();
          }
        },
      });
    },
    moves: normals({
      H: { name: 'מכת צל', start: 9, dmg: 11, hit: { j: 'haN', r: 40 }, w: { hn: [-10, -190], lean: -8 }, a: { hn: [150, -150], lean: 24, hx: 10 } },
    }),
    specials: [
      { id: 'S1', name: 'שיגור צל', en: 'SHADOW TELEPORT', type: 'teleport', start: 8, active: 1, rec: 16, inv: 22, behind: 1, meter: 5, sfx: 'teleport', w: { hy: -84, lean: 10 }, a: { hy: -98, lean: 6 } },
      { id: 'S2', name: 'כדור אופל', en: 'DARK FIREBALL', type: 'proj', start: 12, active: 2, rec: 20, proj: { kind: 'dark', n: 1, speed: 10, dmg: 10, chip: 2, stun: 20, bstun: 14, kb: [7, -1], r: 30, life: 110 }, meter: 8, sfx: 'magic', w: { hn: [-20, -150], hf: [-30, -140], lean: -10 }, a: { hn: [130, -160], hf: [110, -150], lean: 24, hx: 10 } },
      { id: 'S3', name: 'שיבוט צל', en: 'SHADOW CLONE', type: 'clone', start: 10, active: 2, rec: 18, dmg: 10, chip: 1, stun: 20, bstun: 12, kb: [9, -4], knock: 1, meter: 9, sfx: 'magic', w: { hn: [30, -220], hf: [-10, -210], lean: -6 }, a: { hn: [100, -180], hf: [80, -180], lean: 14 } },
      { id: 'S4', name: 'מכת רפאים', en: 'PHANTOM STRIKE', type: 'phantom', start: 14, active: 8, rec: 20, dmg: 15, chip: 2, stun: 26, bstun: 16, kb: [9, -12], knock: 1, inv: 20, hit: { j: 'haN', r: 50 }, level: 'high', meter: 11, sfx: 'teleport', w: { hy: -84 }, a: { hn: [60, -40], hf: [40, -60], lean: 50, hy: -80 } },
    ],
    ult: { id: 'shadow_dimension', name: 'SHADOW DIMENSION', he: 'מימד הצל' },
  };

  /* ---------- THE RED DEVIL ---------- */
  const DEV = { skin: '#b8161c', skinD: '#7e0d12', dark: '#5c070b', horn: '#c41d22', cloth: '#1a0f10', wrap: '#2a1214' };
  const devStance = { hx: 0, hy: -86, lean: 26, head: -22, hn: [70, -140], hf: [40, -150], fn: [34, 0], ff: [-40, 0], wpn: 0 };
  const devil = {
    id: 'devil', name: 'THE RED DEVIL', he: 'שטן הנשיא', title: 'הקלשון של הגיהינום', color: '#ff2020',
    img: 'devil', faceCrop: [0.2, 0.3, 0.72, 0.62],
    stats: { power: 10, speed: 4, defense: 9, range: 9, special: 8 },
    desc: 'כבד, איטי וקטלני. קלשון עם טווח ענק, כדורי אש וגיהינום מתחת לרגליים.',
    sk: { scale: 1.3, torso: 74, neck: 8, head: 32, shoulder: 36, hipW: 30, ua: 50, fa: 46, th: 46, sh: 44 },
    phys: { walk: 3.0, back: 2.4, jump: 16, gravity: .95, weight: 1.35, hp: 1150 },
    stance: devStance,
    setup(f) { },
    calcWpn(f, J) {
      const s = f.def.sk.scale, ha = J.haN, el = J.elN, dx = ha[0] - el[0], dy = ha[1] - el[1];
      const wa = Math.atan2(dy, dx) + ((f.pose && f.pose.wpn) || 0) * NF.D2R, tx = Math.cos(wa), ty = Math.sin(wa);
      const butt = [ha[0] - tx * 70 * s, ha[1] - ty * 70 * s], tip = [ha[0] + tx * 150 * s, ha[1] + ty * 150 * s];
      J.wpn = tip; return { wa, butt, tip };
    },
    draw(ctx, f, J) {
      const s = f.def.sk.scale, K = R.INK;
      // tail
      const h = J.hip, c = chainStep(f, 'tail', 9, 13 * s, ...W(f, [h[0] - 24 * s, h[1]]), { g: -.15, damp: .9, wind: -f.face * .3, stiff: .5, dir: [-f.face, -.4], frozen: f.frozen });
      const tp = chainLocal(f, c);
      ctx.beginPath(); ctx.moveTo(tp[0].x, tp[0].y); for (const q of tp) ctx.lineTo(q.x, q.y);
      ctx.lineWidth = 10 * s; ctx.strokeStyle = K; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 6 * s; ctx.strokeStyle = DEV.skin; ctx.stroke();
      const e = tp[tp.length - 1], e2 = tp[tp.length - 2], a = Math.atan2(e.y - e2.y, e.x - e2.x);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a); R.poly(ctx, [[0, -12 * s], [24 * s, 0], [0, 12 * s], [6 * s, 0]], DEV.skin, 3); ctx.restore();
      // far arm + far leg
      R.limb(ctx, J.shF, J.elF, 15 * s, 13 * s, DEV.skinD, .5, -1); R.limb(ctx, J.elF, J.haF, 13 * s, 11 * s, DEV.skinD, .4, -1);
      R.capsule(ctx, J.haF, J.haF, 13 * s, 13 * s, DEV.skinD);
      R.limb(ctx, J.hpF, J.knF, 17 * s, 14 * s, DEV.skinD, .5, 1); R.limb(ctx, J.knF, J.ftF, 13 * s, 10 * s, DEV.skinD, 0, 1);
      R.boot(ctx, J.knF, J.ftF, 10 * s, '#3a0a0d', '#1a0506');
      // body: barrel chest
      const pts = torsoPts(J, s, 30 * s, 22 * s);
      R.poly(ctx, pts, DEV.skin);
      ctx.beginPath(); ctx.moveTo(J.chest[0] + 6 * s, J.chest[1] + 8 * s); ctx.quadraticCurveTo(J.chest[0] + 26 * s, J.chest[1] + 26 * s, J.chest[0] + 8 * s, J.chest[1] + 40 * s); ctx.lineWidth = 3; ctx.strokeStyle = DEV.dark; ctx.stroke();
      // loincloth
      const ux = Math.sin(J.lean), uy = -Math.cos(J.lean);
      R.poly(ctx, [[h[0] - 26 * s, h[1] - 4], [h[0] + 28 * s, h[1] - 4], [h[0] + 22 * s, h[1] + 34 * s], [h[0] + 6 * s, h[1] + 26 * s], [h[0] - 8 * s, h[1] + 40 * s], [h[0] - 24 * s, h[1] + 24 * s]], DEV.cloth, 3.5);
      R.poly(ctx, [[h[0] - 26 * s, h[1] - 6], [h[0] + 28 * s, h[1] - 6], [h[0] + 28 * s + ux * 12, h[1] - 6 + uy * 12], [h[0] - 26 * s + ux * 12, h[1] - 6 + uy * 12]], '#2a1416', 3);
      // near leg
      R.limb(ctx, J.hpN, J.knN, 18 * s, 15 * s, DEV.skin, .55, 1); R.limb(ctx, J.knN, J.ftN, 14 * s, 11 * s, DEV.skin, .2, 1);
      R.boot(ctx, J.knN, J.ftN, 11 * s, '#4a0c10', '#1a0506');
      // head
      const [x, y] = J.head, r = 26 * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(J.headA);
      // horns
      for (const [hx, k, col] of [[-r * .55, .9, '#8a0f14'], [r * .45, 1, DEV.horn]]) {
        ctx.beginPath(); ctx.moveTo(hx - r * .25 * k, -r * .55); ctx.quadraticCurveTo(hx - r * .5 * k, -r * 1.45, hx + r * .25 * k, -r * 2.0); ctx.quadraticCurveTo(hx + r * .05 * k, -r * 1.35, hx + r * .3 * k, -r * .62); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = K; ctx.stroke();
      }
      // pointed ear
      R.poly(ctx, [[-r * .5, -r * .1], [-r * 1.45, -r * .55], [-r * .6, r * .32]], DEV.skin, 3.5);
      ctx.beginPath(); ctx.ellipse(r * .1, 0, r * 1.0, r * .95, 0, 0, 7); ctx.fillStyle = DEV.skin; ctx.fill(); ctx.lineWidth = 4.5; ctx.strokeStyle = K; ctx.stroke();
      // headband "הנשיא"
      ctx.beginPath(); ctx.moveTo(-r * .85, -r * .45); ctx.quadraticCurveTo(r * .2, -r * .85, r * 1.08, -r * .4); ctx.lineTo(r * 1.1, -r * .12); ctx.quadraticCurveTo(r * .2, -r * .55, -r * .9, -r * .16); ctx.closePath();
      ctx.fillStyle = '#d0141d'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(r * .4, -r * .4); ctx.rotate(.12); ctx.fillStyle = '#120708'; ctx.font = `900 ${Math.round(r * .32)}px Rubik, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('הנשיא', 0, 0); ctx.restore();
      // brow ridge + eyes
      const glow = f.glowEyes || 0;
      ctx.beginPath(); ctx.moveTo(-r * .05, -r * .02); ctx.lineTo(r * 1.0, r * .02); ctx.lineWidth = 6; ctx.strokeStyle = DEV.dark; ctx.stroke();
      if (glow) { ctx.shadowColor = '#ffcf40'; ctx.shadowBlur = 20 * glow; }
      for (const [ex, w] of [[r * .65, r * .26], [r * .12, r * .18]]) {
        ctx.beginPath(); ctx.ellipse(ex, r * .14, w, r * .13, .12, 0, 7); ctx.fillStyle = glow ? '#ffe070' : '#fff1d0'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = K; ctx.stroke();
        ctx.beginPath(); ctx.arc(ex + w * .3, r * .16, r * .08, 0, 7); ctx.fillStyle = glow ? '#ff2000' : '#2a0b05'; ctx.fill();
      }
      ctx.shadowBlur = 0;
      // nose, snarl, fangs, goatee
      ctx.beginPath(); ctx.moveTo(r * 1.0, r * .2); ctx.quadraticCurveTo(r * 1.25, r * .42, r * 1.0, r * .5); ctx.lineWidth = 3; ctx.strokeStyle = K; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * .35, r * .62); ctx.quadraticCurveTo(r * .7, r * .52, r * 1.02, r * .66); ctx.lineWidth = 3.5; ctx.stroke();
      R.poly(ctx, [[r * .55, r * .58], [r * .62, r * .76], [r * .69, r * .57]], '#fff', 2); R.poly(ctx, [[r * .82, r * .59], [r * .88, r * .74], [r * .94, r * .6]], '#fff', 2);
      R.poly(ctx, [[r * .35, r * .75], [r * .95, r * .78], [r * .7, r * 1.35], [r * .55, r * 1.1]], '#1a0a0a', 2.5);
      ctx.restore();
      // near arm + trident
      R.limb(ctx, J.shN, J.elN, 16 * s, 14 * s, DEV.skin, .6, -1); R.limb(ctx, J.elN, J.haN, 14 * s, 12 * s, DEV.skin, .45, -1);
      const ha = J.haN, el = J.elN, dx = ha[0] - el[0], dy = ha[1] - el[1], d = Math.hypot(dx, dy) || 1;
      R.capsule(ctx, [ha[0] - dx / d * 16 * s, ha[1] - dy / d * 16 * s], [ha[0] - dx / d * 4 * s, ha[1] - dy / d * 4 * s], 13 * s, 13 * s, DEV.wrap, K, 3);
      // trident: angle = forearm direction rotated by pose.wpn
      const { wa, butt, tip } = devil.calcWpn(f, J);
      ctx.beginPath(); ctx.moveTo(butt[0], butt[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineWidth = 9 * s; ctx.strokeStyle = K; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 5 * s; ctx.strokeStyle = '#2a1a1a'; ctx.stroke();
      ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(wa);
      ctx.beginPath(); ctx.moveTo(-6 * s, -24 * s); ctx.lineTo(-6 * s, 24 * s); ctx.moveTo(-6 * s, -24 * s); ctx.lineTo(30 * s, -24 * s); ctx.moveTo(-6 * s, 24 * s); ctx.lineTo(30 * s, 24 * s); ctx.moveTo(-6 * s, 0); ctx.lineTo(42 * s, 0);
      ctx.lineWidth = 8 * s; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = 4.5 * s; ctx.strokeStyle = '#3a2222'; ctx.stroke();
      for (const yy of [-24, 0, 24]) R.poly(ctx, [[(yy ? 30 : 42) * s, (yy - 6) * s], [(yy ? 46 : 58) * s, yy * s], [(yy ? 30 : 42) * s, (yy + 6) * s]], '#2a1a1a', 3);
      ctx.restore();
      R.capsule(ctx, ha, ha, 14 * s, 14 * s, DEV.skin);
    },
    moves: normals({
      L1: { name: 'דקירת קלשון', start: 6, active: 4, rec: 11, dmg: 7, hit: { j: 'wpn', r: 30 }, w: { hn: [40, -150], wpn: 0 }, a: { hn: [110, -150], lean: 30, hx: 8, wpn: 0 } },
      L2: { name: 'מכת אגרוף', start: 7, rec: 12, dmg: 8, hit: { j: 'haF', r: 32 }, w: { hf: [0, -150] }, a: { hf: [120, -140], lean: 34, hx: 12 } },
      H: { name: 'הנפת קלשון', start: 12, active: 5, rec: 20, dmg: 15, stun: 22, kb: [11, -2], hit: { j: 'wpn', r: 40 }, w: { hn: [30, -230], lean: 10, wpn: -150 }, a: { hn: [100, -110], lean: 40, hx: 10, wpn: 30 } },
      cL: { hit: { j: 'ftN', r: 28 } },
      cH: { name: 'סוויפ זנב', dmg: 11 },
      jL: { hit: { j: 'wpn', r: 30 }, a: { hn: [90, -110], lean: 40, wpn: 30 } },
      jH: { dmg: 12 },
    }),
    specials: [
      { id: 'S1', name: 'פיצוץ גיהינום', en: 'HELLFIRE BLAST', type: 'proj', start: 16, active: 2, rec: 22, proj: { kind: 'fire', n: 1, speed: 8, dmg: 14, chip: 3, stun: 22, bstun: 16, kb: [9, -3], r: 40, life: 130, knock: 1 }, meter: 9, sfx: 'fireball', w: { hn: [-10, -170], hf: [-30, -160], lean: 0, wpn: -40 }, a: { hn: [120, -150], hf: [100, -140], lean: 36, hx: 12 } },
      { id: 'S2', name: 'קלשון השטן', en: "DEVIL'S TRIDENT", type: 'strike', start: 14, active: 6, rec: 22, dmg: 15, chip: 2, stun: 24, bstun: 16, kb: [14, -2], knock: 1, step: 6, hit: { j: 'wpn', r: 44 }, meter: 10, fx: 'tridentFlash', sfx: 'whooshBig', w: { hn: [10, -150], lean: 10, hx: -16, wpn: 0 }, a: { hn: [150, -140], lean: 46, hx: 30, wpn: 0 } },
      { id: 'S3', name: 'אדמת תופת', en: 'INFERNO GROUND', type: 'eruption', start: 14, active: 2, rec: 26, dmg: 16, chip: 3, stun: 28, bstun: 16, kb: [4, -16], launch: 1, delay: 26, meter: 10, sfx: 'fire', w: { hn: [40, -260], lean: -10, wpn: -90 }, a: { hn: [90, -20], lean: 46, hy: -70, wpn: 70 } },
      { id: 'S4', name: 'הסתערות שטנית', en: 'DEMONIC CHARGE', type: 'dash', start: 12, active: 22, rec: 20, dmg: 15, chip: 3, stun: 26, bstun: 16, kb: [14, -5], knock: 1, speed: 12, armor: 1, hit: { j: 'chest', r: 60 }, meter: 11, fx: 'fireTrail', sfx: 'fire', w: { lean: 50, hy: -76 }, a: { lean: 58, hy: -78, hn: [140, -110], hf: [90, -100], fn: [50, 0], ff: [-60, -10], wpn: 0 } },
    ],
    ult: { id: 'hell_mode', name: 'HELL MODE', he: 'מצב גיהינום' },
  };
  // devil-specific base poses (hunched)
  devil.poses = {
    stance: devStance,
    crouch: { hx: 0, hy: -58, lean: 34, head: -28, hn: [70, -100], hf: [40, -100], fn: [40, 0], ff: [-44, 0] },
    jump: { hx: 0, hy: -86, lean: 20, head: -16, hn: [60, -150], hf: [20, -150], fn: [30, -40], ff: [-24, -36] },
    block: { hx: -4, hy: -84, lean: 6, head: 4, hn: [50, -190], hf: [40, -170], fn: [34, 0], ff: [-40, 0], wpn: -70 },
    cblock: { hx: -4, hy: -58, lean: 20, head: 0, hn: [50, -130], hf: [40, -110], fn: [40, 0], ff: [-44, 0], wpn: -70 },
    win: { hx: 0, hy: -92, lean: 4, head: -20, hn: [30, -260], hf: [-20, -150], fn: [34, 0], ff: [-40, 0], en: -1, wpn: -90 },
  };

  const LIST = [devil, warrior, girl, chaos, shadow];
  for (const c of LIST) {
    c.poses = Object.assign({}, P, c.poses || {});
    if (c.stance) c.poses.stance = c.stance;
    for (const k in c.moves) { const m = c.moves[k]; m.id = k; m.kind = 'normal'; if (m.level === undefined) m.level = 'mid'; }
    for (const m of c.specials) { m.kind = 'special'; if (!m.level) m.level = 'mid'; }
    c.moves.L1b = Object.assign({}, c.moves.L1, { id: 'L1b', cancel: ['L2', 'H', 'S'] });
  }
  return { LIST, byId: Object.fromEntries(LIST.map(c => [c.id, c])), P, shade };
})();
