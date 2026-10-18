/* Skeletal rig: poses are IK targets (hands/feet) + hip/torso/head params, solved every frame.
   Local space: the fighter faces +x, y grows downward, origin = point on the floor between the feet. */
'use strict';
NF.rig = (() => {
  const { lerp } = NF;

  /* ---------- poses ---------- */
  // A pose: { hx, hy, lean, head, hn:[x,y], hf:[x,y], fn:[x,y], ff:[x,y], kn:+1/-1 (knee bend), en/ef (elbow bend), sq (squash) }
  const KEYS2 = ['hn', 'hf', 'fn', 'ff'];
  const KEYS1 = ['hx', 'hy', 'lean', 'head', 'sq', 'wpn', 'tail', 'spread'];
  function blend(a, b, t) {
    const o = {};
    for (const k of KEYS1) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, t);
    for (const k of KEYS2) { const A = a[k] || [0, 0], B = b[k] || [0, 0]; o[k] = [lerp(A[0], B[0], t), lerp(A[1], B[1], t)]; }
    o.en = t < .5 ? (a.en ?? 1) : (b.en ?? 1); o.ef = t < .5 ? (a.ef ?? 1) : (b.ef ?? 1);
    o.kn = t < .5 ? (a.kn ?? 1) : (b.kn ?? 1); o.kf = t < .5 ? (a.kf ?? 1) : (b.kf ?? 1);
    o.fist = t < .5 ? a.fist : b.fist; o.face = t < .5 ? a.face : b.face;
    return o;
  }
  function copy(p) { return blend(p, p, 0); }
  function add(p, d) { const o = copy(p); for (const k in d) { if (Array.isArray(d[k])) o[k] = [o[k][0] + d[k][0], o[k][1] + d[k][1]]; else if (typeof d[k] === 'number') o[k] = (o[k] || 0) + d[k]; else o[k] = d[k]; } return o; }

  /* ---------- 2-bone IK ---------- */
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
    const max = (l1 + l2) * 0.998, min = Math.abs(l1 - l2) + 1;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < min) { const k = min / (d || 1); dx *= k; dy *= k; d = min; }
    const a = Math.atan2(dy, dx);
    const c = NF.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const b = Math.acos(c) * bend;
    const mx = ax + Math.cos(a - b) * l1, my = ay + Math.sin(a - b) * l1;
    return { mx, my, ex: ax + dx, ey: ay + dy };
  }

  /* ---------- solve joints (local space) ---------- */
  function solve(sk, p) {
    const s = sk.scale || 1, J = {};
    const sq = 1 + (p.sq || 0);
    J.hip = [p.hx * s, p.hy * s];
    const lean = (p.lean || 0) * NF.D2R;
    const tl = sk.torso * s / sq, ux = Math.sin(lean), uy = -Math.cos(lean);
    J.chest = [J.hip[0] + ux * tl, J.hip[1] + uy * tl];
    J.neck = [J.chest[0] + ux * sk.neck * s, J.chest[1] + uy * sk.neck * s];
    const ha = lean + (p.head || 0) * NF.D2R;
    J.headA = ha;
    J.head = [J.neck[0] + Math.sin(ha) * sk.head * s, J.neck[1] - Math.cos(ha) * sk.head * s];
    // shoulders sit just below the chest top, spread sideways in depth (near/far)
    const sh = sk.shoulder * s;
    J.shN = [J.chest[0] + ux * -8 * s + sh * 0.35, J.chest[1] + uy * -8 * s + 2];
    J.shF = [J.chest[0] + ux * -8 * s - sh * 0.35, J.chest[1] + uy * -8 * s - 2];
    J.hpN = [J.hip[0] + sk.hipW * s * 0.3, J.hip[1]];
    J.hpF = [J.hip[0] - sk.hipW * s * 0.3, J.hip[1]];
    const ua = sk.ua * s, fa = sk.fa * s, th = sk.th * s, sn = sk.sh * s;
    const A = ik(J.shN[0], J.shN[1], p.hn[0] * s, p.hn[1] * s, ua, fa, -(p.en ?? 1)); J.elN = [A.mx, A.my]; J.haN = [A.ex, A.ey];
    const B = ik(J.shF[0], J.shF[1], p.hf[0] * s, p.hf[1] * s, ua, fa, -(p.ef ?? 1)); J.elF = [B.mx, B.my]; J.haF = [B.ex, B.ey];
    const C = ik(J.hpN[0], J.hpN[1], p.fn[0] * s, p.fn[1] * s, th, sn, (p.kn ?? 1)); J.knN = [C.mx, C.my]; J.ftN = [C.ex, C.ey];
    const D = ik(J.hpF[0], J.hpF[1], p.ff[0] * s, p.ff[1] * s, th, sn, (p.kf ?? 1)); J.knF = [D.mx, D.my]; J.ftF = [D.ex, D.ey];
    J.lean = lean;
    return J;
  }

  /* ---------- verlet chains (capes, tails, hair, scarves) ---------- */
  function chain(n, seg) { const pts = []; for (let i = 0; i < n; i++) pts.push({ x: 0, y: i * seg, px: 0, py: i * seg }); return { pts, seg, init: false }; }
  function stepChain(c, ax, ay, opt = {}) {
    const g = opt.g ?? 0.6, damp = opt.damp ?? 0.93, wind = opt.wind ?? 0, stiff = opt.stiff ?? 0, dir = opt.dir || [0, 1];
    const P = c.pts;
    if (!c.init) { for (let i = 0; i < P.length; i++) { P[i].x = P[i].px = ax + dir[0] * c.seg * i; P[i].y = P[i].py = ay + dir[1] * c.seg * i; } c.init = true; }
    P[0].x = ax; P[0].y = ay;
    for (let i = 1; i < P.length; i++) {
      const q = P[i], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp;
      q.px = q.x; q.py = q.y;
      q.x += vx + wind + dir[0] * stiff; q.y += vy + g + dir[1] * stiff;
    }
    for (let it = 0; it < 3; it++) for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - c.seg) / d;
      if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * .5; a.y += dy * k * .5; b.x -= dx * k * .5; b.y -= dy * k * .5; }
    }
    P[0].x = ax; P[0].y = ay;
  }
  function shiftChain(c, dx, dy) { for (const q of c.pts) { q.x += dx; q.px += dx; q.y += dy; q.py += dy; } }

  /* ---------- drawing primitives (comic outline) ---------- */
  const INK = '#120708';
  /* cel shading: a darker copy of the shape shifted away from the light (light comes from front-top = +x,-y) */
  const shadeCache = {};
  function darker(col, k = .68) {
    if (shadeCache[col + k]) return shadeCache[col + k];
    let r, g, b;
    if (col[0] === '#') { const n = parseInt(col.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    else { const m = col.match(/\d+/g); if (!m) return null; [r, g, b] = m.map(Number); }
    return (shadeCache[col + k] = `rgb(${r * k | 0},${g * k | 0},${b * k | 0})`);
  }
  NF.darker = darker;
  function capPath(ctx, a, b, r1, r2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    const s = Math.asin(NF.clamp((r1 - r2) / d, -1, 1));
    ctx.beginPath();
    ctx.arc(a[0], a[1], r1, ang + Math.PI / 2 + s, ang - Math.PI / 2 - s);
    ctx.arc(b[0], b[1], r2, ang - Math.PI / 2 - s, ang + Math.PI / 2 + s);
    ctx.closePath();
  }
  function capsule(ctx, a, b, r1, r2, fill, ink = INK, lw = 4, shade = true) {
    capPath(ctx, a, b, r1, r2);
    ctx.fillStyle = fill; ctx.fill();
    if (shade && NF.shading !== false && r1 > 4) {
      const sh = darker(fill); if (sh) {
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        let nx = -dy / d, ny = dx / d; if (nx - ny * .5 > 0) { nx = -nx; ny = -ny; }   // side away from the light
        ctx.save(); ctx.clip();
        const o = Math.max(r1, r2) * .62;
        capPath(ctx, [a[0] + nx * o * 1.6, a[1] + ny * o * 1.6], [b[0] + nx * o * 1.6, b[1] + ny * o * 1.6], r1 * 1.25, r2 * 1.25);
        ctx.fillStyle = sh; ctx.fill();
        // thin highlight on the lit side
        ctx.beginPath(); ctx.moveTo(a[0] - nx * r1 * .55, a[1] - ny * r1 * .55); ctx.lineTo(b[0] - nx * r2 * .55, b[1] - ny * r2 * .55);
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = Math.max(1.5, r1 * .22); ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
        capPath(ctx, a, b, r1, r2);
      }
    }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // muscle-ish limb: bulge toward one side
  function limb(ctx, a, b, r1, r2, fill, bulge = 0, side = 1, lw = 4) {
    capsule(ctx, a, b, r1, r2, fill, INK, lw);
    if (bulge) {
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * side, ny = dx / d * side;
      const mx = (a[0] + b[0]) / 2 + nx * (r1 * .55), my = (a[1] + b[1]) / 2 + ny * (r1 * .55);
      ctx.beginPath(); ctx.ellipse(mx, my, d * .32, r1 * bulge, Math.atan2(dy, dx), 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw * .8; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  function poly(ctx, pts, fill, lw = 4, ink = INK, shadeDir) {
    const path = (ox = 0, oy = 0) => { ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy); ctx.closePath(); };
    path();
    if (fill) {
      ctx.fillStyle = fill; ctx.fill();
      const sh = shadeDir && NF.shading !== false && darker(fill);
      if (sh) { ctx.save(); ctx.clip(); path(shadeDir[0], shadeDir[1]); ctx.fillStyle = sh; ctx.fill(); ctx.restore(); path(); }
    }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // ragged cloth along a chain: width w, torn hem
  function ribbon(ctx, pts, w0, w1, fill, seed = 1, torn = 1, lw = 3.5) {
    if (pts.length < 2) return;
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, t = i / (pts.length - 1), w = lerp(w0, w1, t);
      L.push([pts[i].x - dy / d * w, pts[i].y + dx / d * w]); R.push([pts[i].x + dy / d * w, pts[i].y - dx / d * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    // torn tips
    const e = pts[pts.length - 1], ln = L[L.length - 1], rn = R[R.length - 1], teeth = 4;
    for (let k = 1; k < teeth; k++) {
      const t = k / teeth, x = lerp(ln[0], rn[0], t), y = lerp(ln[1], rn[1], t);
      const dx = e.x - pts[pts.length - 2].x, dy = e.y - pts[pts.length - 2].y, d = Math.hypot(dx, dy) || 1;
      const j = (k % 2 ? 1 : -.2) * torn * (10 + 14 * NF.hash(seed + k));
      ctx.lineTo(x + dx / d * j, y + dy / d * j);
    }
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function fist(ctx, p, r, fill, glove) {
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fillStyle = glove || fill; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[0] - r * .5, p[1] - r * .1); ctx.lineTo(p[0] + r * .6, p[1] - r * .1); ctx.lineWidth = 2; ctx.stroke();
  }
  function boot(ctx, knee, ft, r, fill, sole = '#2a0a0c', toe = 1) {
    const dx = ft[0] - knee[0], dy = ft[1] - knee[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const top = [ft[0] - ux * r * 2.4, ft[1] - uy * r * 2.4];
    capsule(ctx, top, ft, r * 1.05, r * 1.1, fill);
    // foot pointing forward (+x local) relative to shin
    const fx = -uy * toe, fy = ux * toe;   // perpendicular to shin
    const sgn = fx >= 0 ? 1 : -1;
    const tip = [ft[0] + Math.abs(fx) * r * 2.2 * sgn + (fx === 0 ? r * 2 : 0), ft[1] + fy * r * 2.2 * sgn];
    capsule(ctx, ft, tip, r * 1.05, r * .75, fill);
    ctx.beginPath(); ctx.moveTo(ft[0] - r, ft[1] + r * .9); ctx.lineTo(tip[0] + r * .4, tip[1] + r * .7); ctx.lineWidth = 4; ctx.strokeStyle = sole; ctx.stroke();
  }

  return { blend, copy, add, solve, ik, chain, stepChain, shiftChain, capsule, limb, poly, ribbon, fist, boot, INK };
})();
