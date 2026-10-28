/* Effects: pooled particles, additive glow sprites, shockwaves, decals on the floor,
   floating text, screen shake, flashes, slow motion and camera zoom. No shadowBlur
   and no ctx.filter: glows are pre-rendered sprites drawn with 'lighter'. */
'use strict';
BD.fx = (() => {
  const P = [], RINGS = [], TEXT = [], STAINS = [];
  const glowCache = {};
  const S = { stop: 0, shake: 0, flash: 0, flashCol: '#fff', slow: 1, slowT: 0, zoom: 1, zoomT: 0, zx: 0, zy: 0, tint: null };
  function glow(col) {
    if (glowCache[col]) return glowCache[col];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return glowCache[col] = c;
  }
  function add(o) {
    if (P.length > api.cap) P.splice(0, P.length - api.cap);
    P.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, size: 4, col: '#fff', g: 0, drag: .98, kind: 'dot', rot: 0, vr: 0, add: false, grow: 0, bounce: 0 }, o, { max: o.life || 1 }));
  }
  const api = {
    S, glow, cap: 800,
    spark(x, y, n = 12, col = '#ffd54a', sp = 700) {
      for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(.2, 1) * sp; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: BD.rand(.2, .5), size: BD.rand(2, 4), col, g: 900, kind: 'streak', add: true }); }
    },
    stars(x, y, n = 6) {
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + BD.rand(-1.3, 1.3), v = BD.rand(250, 600); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: BD.rand(.5, .9), size: BD.rand(9, 15), col: '#ffe14d', g: 1200, kind: 'star', vr: BD.rand(-10, 10) }); }
    },
    smoke(x, y, n = 10, col = '#555', size = 30, rise = 60) {
      for (let i = 0; i < n; i++) add({ x: x + BD.rand(-20, 20), y: y + BD.rand(-20, 20), vx: BD.rand(-80, 80), vy: BD.rand(-rise * 2, -rise * .3), life: BD.rand(1, 2.2), size: BD.rand(size * .6, size * 1.3), grow: BD.rand(20, 50), col, drag: .96, kind: 'puff' });
    },
    fire(x, y, n = 8, sp = 200, big = 1) {
      for (let i = 0; i < n; i++) add({ x: x + BD.rand(-8, 8), y: y + BD.rand(-8, 8), vx: BD.rand(-sp, sp), vy: BD.rand(-sp * 1.4, sp * .2), life: BD.rand(.35, .8), size: BD.rand(14, 30) * big, grow: -10, col: BD.pick(['#ffb000', '#ff6a00', '#ff3d00', '#ffd54a']), g: -300, drag: .95, kind: 'flame', add: true });
    },
    debris(x, y, n = 10, cols = ['#8d6e63', '#5d4037', '#a1887f'], sp = 900, size = 9) {
      for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(.3, 1) * sp; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, life: BD.rand(.8, 1.6), size: BD.rand(size * .5, size * 1.4), col: BD.pick(cols), g: 1800, kind: 'chunk', rot: Math.random() * 6, vr: BD.rand(-14, 14), bounce: .4, drag: .99 }); }
    },
    shards(x, y, n = 18) { for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(200, 1100); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 300, life: BD.rand(.7, 1.4), size: BD.rand(8, 22), col: BD.pick(['#bfefff', '#e8fbff', '#8fd8f5']), g: 1700, kind: 'shard', rot: Math.random() * 6, vr: BD.rand(-12, 12), bounce: .3 }); } },
    drops(x, y, n, col, sp = 500, size = 6) { for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(.2, 1) * sp; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .4, life: BD.rand(.5, 1.1), size: BD.rand(size * .5, size * 1.3), col, g: 1600, kind: 'drop', stainCol: col }); } },
    confetti(x, y, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(200, 900); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 400, life: BD.rand(1.2, 2.2), size: BD.rand(6, 11), col: BD.pick(['#ff4d6d', '#ffd54a', '#4dd0e1', '#7cff6b', '#b388ff', '#fff']), g: 700, drag: .97, kind: 'conf', rot: Math.random() * 6, vr: BD.rand(-15, 15) }); } },
    coin(x, y, n = 3) { for (let i = 0; i < n; i++) add({ x, y, vx: BD.rand(-200, 200), vy: BD.rand(-700, -400), life: 1, size: 11, col: '#ffcc00', g: 1500, kind: 'coin', vr: BD.rand(-12, 12) }); },
    trail(x, y, col = '#fff', size = 10, life = .3) { add({ x, y, life, size, col, kind: 'glow', add: true, grow: -size / life }); },
    glowAt(x, y, size, col, life = .25) { add({ x, y, life, size, col, kind: 'glow', add: true }); },
    ring(x, y, R, col = '#fff', life = .45, w = 14) { RINGS.push({ x, y, R, col, life, max: life, w }); },
    text(x, y, t, col = '#fff', size = 34, life = 1.1, vy = -90) { TEXT.push({ x, y, t, col, size, life, max: life, vy, s: 0 }); if (TEXT.length > 30) TEXT.shift(); },
    stain(x, y, r, col, a = .55) { STAINS.push({ x, y, r, col, a }); if (STAINS.length > 120) STAINS.shift(); },
    // screen shake and white flashes follow the player's setting (off / gentle / strong), gentle by default
    // screen shake, camera punches and white flashes follow the player's setting: off (default) / gentle / strong
    shake(a) { const m = BD.save.d.shake2 ?? 0; if (!m) return; S.shake = m === 2 ? Math.min(1.6, S.shake + a) : Math.min(.3, S.shake + a * .15); },
    shakeTo(a) { const m = BD.save.d.shake2 ?? 0; if (m) S.shake = Math.max(S.shake, m === 2 ? a : Math.min(.3, a * .15)); },
    flash(a, col = '#fff') { const m = BD.save.d.shake2 ?? 0; S.flash = Math.max(S.flash, m === 2 ? a : Math.min(a * .4, m ? .25 : .12)); S.flashCol = col; },
    hitstop(t) { S.stop = Math.max(S.stop, t); },
    slowmo(t, k = .25) { S.slowT = Math.max(S.slowT, t); S.slowK = k; },
    zoom(z, t, x, y) { const m = BD.save.d.shake2 ?? 0; if (!m) return; S.zoom = m === 2 ? z : 1 + (z - 1) * .35; S.zoomT = t; S.zx = x; S.zy = y; },
    explosion(x, y, R, col = '#ffb000') {
      api.glowAt(x, y, R * 2.6, '#fff3c4', .18); api.glowAt(x, y, R * 2, col, .45);
      api.ring(x, y, R * 1.6, '#fff', .45, 20); api.ring(x, y, R * 1.1, col, .6, 10);
      api.fire(x, y, Math.round(R / 5), R * 2.2, R / 70);
      api.smoke(x, y - 10, Math.round(R / 10), '#3a3533', R * .5, 80);
      api.debris(x, y, Math.round(R / 10), ['#3b3b3b', '#6d4c41', '#ff7a00'], R * 8, 7);
      api.spark(x, y, Math.round(R / 6), '#ffe082', R * 9);
      api.stain(x, y, R * .55, '#000', .32);
      api.shake(R / 230); api.flash(Math.min(.6, R / 500), '#fff6d0');
    },
    note(x, y, n = 5) { for (let i = 0; i < n; i++) add({ x: x + BD.rand(-40, 40), y, vx: BD.rand(-120, 120), vy: BD.rand(-380, -200), life: BD.rand(1, 1.6), size: BD.rand(16, 24), col: '#141414', g: 120, drag: .98, kind: 'note', vr: BD.rand(-3, 3) }); },
    bubbles(x, y, n = 8, col = '#bfeaff') { for (let i = 0; i < n; i++) add({ x: x + BD.rand(-20, 20), y: y + BD.rand(-20, 20), vx: BD.rand(-60, 60), vy: BD.rand(-160, -40), life: BD.rand(.6, 1.3), size: BD.rand(4, 10), col, g: -60, drag: .97, kind: 'bubble' }); },
    paint(x, y, n, col, sp = 500) { for (let i = 0; i < n; i++) { const a = Math.random() * BD.TAU, v = BD.rand(.2, 1) * sp; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150, life: BD.rand(.4, .8), size: BD.rand(3, 8), col, g: 1500, kind: 'drop', stainCol: col }); } },
    ash(x, y, n = 10) { for (let i = 0; i < n; i++) add({ x: x + BD.rand(-60, 60), y: y + BD.rand(-40, 40), vx: BD.rand(-40, 40), vy: BD.rand(-120, -20), life: BD.rand(1.5, 3), size: BD.rand(2, 4), col: BD.pick(['#ff8a3d', '#555', '#888']), g: 30, drag: .99, kind: 'dot' }); },
    lines(x, y, n, ang, col = '#fff') { for (let i = 0; i < n; i++) { const a = ang + BD.rand(-.25, .25), v = BD.rand(900, 1600); add({ x: x + BD.rand(-30, 30), y: y + BD.rand(-30, 30), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: BD.rand(.12, .25), size: 3, col, kind: 'streak', add: true }); } },
    clear() { P.length = RINGS.length = TEXT.length = STAINS.length = 0; },
    update(dt, floorY) {
      if (S.stop > 0) { S.stop -= Math.max(dt, .016); S.slow = .04; }
      else if (S.slowT > 0) { S.slowT -= Math.max(dt, .008); S.slow = BD.lerp(S.slow, S.slowK || .25, .2); } else S.slow = BD.lerp(S.slow, 1, .08);
      if (S.zoomT > 0) S.zoomT -= dt; else S.zoom = BD.lerp(S.zoom, 1, .06);
      S.shake = Math.max(0, S.shake - dt * 1.8); S.flash = Math.max(0, S.flash - dt * 2.4);
      for (const p of P) {
        p.life -= dt; p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.size = Math.max(.5, p.size + p.grow * dt);
        if (p.y > floorY) {
          if (p.kind === 'drop') { api.stain(p.x, floorY - 2, p.size * 1.6, p.stainCol, .5); p.life = 0; }
          else if (p.bounce) { p.y = floorY; p.vy *= -p.bounce; p.vx *= .7; }
          else if (p.g > 0) { p.y = floorY; p.vy = 0; p.vx *= .9; }
        }
      }
      for (let i = P.length - 1; i >= 0; i--) if (P[i].life <= 0) P.splice(i, 1);
      for (let i = RINGS.length - 1; i >= 0; i--) { RINGS[i].life -= dt; if (RINGS[i].life <= 0) RINGS.splice(i, 1); }
      for (let i = TEXT.length - 1; i >= 0; i--) { const t = TEXT[i]; t.life -= dt; t.y += t.vy * dt; t.s = Math.min(1, t.s + dt * 8); if (t.life <= 0) TEXT.splice(i, 1); }
    },
    drawStains(x) { for (const s of STAINS) { x.globalAlpha = s.a; x.fillStyle = s.col; x.beginPath(); x.ellipse(s.x, s.y, s.r, s.r * .28, 0, 0, BD.TAU); x.fill(); } x.globalAlpha = 1; },
    draw(x) {
      for (const p of P) {
        const k = BD.clamp(p.life / p.max, 0, 1);
        if (p.add) x.globalCompositeOperation = 'lighter';
        x.globalAlpha = p.kind === 'puff' ? k * .55 : Math.min(1, k * 1.6);
        switch (p.kind) {
          case 'glow': case 'flame': { const s = p.size * (p.kind === 'flame' ? (.6 + k * .6) : 1); x.drawImage(glow(p.col), p.x - s, p.y - s, s * 2, s * 2); break; }
          case 'streak': x.strokeStyle = p.col; x.lineWidth = p.size; x.lineCap = 'round'; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); x.stroke(); break;
          case 'puff': x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.size, 0, BD.TAU); x.fill(); break;
          case 'chunk': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.col; x.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .7); x.restore(); break;
          case 'shard': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.col; x.beginPath(); x.moveTo(0, -p.size); x.lineTo(p.size * .4, 0); x.lineTo(0, p.size * .5); x.lineTo(-p.size * .35, 0); x.fill(); x.restore(); break;
          case 'drop': x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.size, 0, BD.TAU); x.fill(); break;
          case 'conf': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.col; x.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); x.restore(); break;
          case 'star': BD.draw.star(x, p.x, p.y, p.size, p.rot, p.col); break;
          case 'note': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.col; x.beginPath(); x.ellipse(0, 0, p.size * .38, p.size * .28, -.4, 0, BD.TAU); x.fill(); x.fillRect(p.size * .28, -p.size, 3, p.size); x.fillRect(p.size * .28, -p.size, p.size * .4, 4); x.restore(); break;
          case 'bubble': x.strokeStyle = p.col; x.lineWidth = 2; x.beginPath(); x.arc(p.x, p.y, p.size, 0, BD.TAU); x.stroke(); break;
          case 'coin': x.save(); x.translate(p.x, p.y); x.scale(Math.cos(p.rot), 1); x.fillStyle = '#ffcc00'; x.beginPath(); x.arc(0, 0, p.size, 0, BD.TAU); x.fill(); x.fillStyle = '#ffe680'; x.beginPath(); x.arc(-2, -2, p.size * .55, 0, BD.TAU); x.fill(); x.restore(); break;
          default: x.fillStyle = p.col; x.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        x.globalCompositeOperation = 'source-over';
      }
      x.globalAlpha = 1;
      for (const r of RINGS) {
        const k = 1 - r.life / r.max; x.globalAlpha = (1 - k) * .9; x.strokeStyle = r.col; x.lineWidth = r.w * (1 - k) + 1;
        x.beginPath(); x.arc(r.x, r.y, r.R * (.15 + k * .85), 0, BD.TAU); x.stroke();
      }
      x.globalAlpha = 1;
    },
    drawText(x) {
      x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const t of TEXT) {
        const k = t.life / t.max, s = t.size * (t.s < 1 ? 1.6 - .6 * t.s : 1);
        x.globalAlpha = Math.min(1, k * 2.5);
        x.font = `900 ${s}px Karantina, Rubik, sans-serif`;
        x.lineWidth = s * .16; x.strokeStyle = '#1a0d00'; x.lineJoin = 'round'; x.strokeText(t.t, t.x, t.y);
        x.fillStyle = t.col; x.fillText(t.t, t.x, t.y);
      }
      x.globalAlpha = 1;
    }
  };
  return api;
})();

/* small shared drawing helpers */
BD.draw = {
  star(x, cx, cy, r, rot, col) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = col; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * BD.TAU - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.lineWidth = 2; x.strokeStyle = '#7a5a00'; x.stroke(); x.restore();
  },
  rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); },
  bolt(x, x0, y0, x1, y1, col = '#bfe9ff', w = 5, jag = 40, seg = 10) {
    const pts = [[x0, y0]];
    for (let i = 1; i < seg; i++) { const t = i / seg; pts.push([BD.lerp(x0, x1, t) + BD.rand(-jag, jag), BD.lerp(y0, y1, t) + BD.rand(-jag * .3, jag * .3)]); }
    pts.push([x1, y1]);
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const [lw, c, a] of [[w * 4, col, .25], [w * 2, col, .5], [w, '#fff', 1]]) {
      x.globalAlpha = a; x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); pts.forEach(([a1, b1], i) => i ? x.lineTo(a1, b1) : x.moveTo(a1, b1)); x.stroke();
    }
    x.globalAlpha = 1; return pts;
  }
};
