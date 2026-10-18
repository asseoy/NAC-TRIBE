/* Particles and screen effects (world space unless noted). */
'use strict';
/* pre-rendered glow sprites: drawing a cached image is far cheaper than a gradient per particle */
NF.glow = (() => {
  const mk = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; };
  return {
    hot: mk([[0, 'rgba(255,240,180,1)'], [.45, 'rgba(255,70,10,.8)'], [1, 'rgba(120,0,0,0)']]),
    warm: mk([[0, 'rgba(255,160,40,1)'], [.45, 'rgba(255,70,10,.8)'], [1, 'rgba(120,0,0,0)']]),
    dark: mk([[0, 'rgba(255,60,90,.9)'], [.5, 'rgba(120,0,40,.6)'], [1, 'rgba(30,0,10,0)']]),
    soft: mk([[0, 'rgba(255,120,40,.6)'], [1, 'rgba(255,40,0,0)']]),
  };
})();
NF.FX = class FX {
  constructor() { this.p = []; this.rings = []; this.cracks = []; this.texts = []; this.flash = 0; this.flashCol = '#fff'; this.max = 260; }
  clear() { this.p.length = 0; this.rings.length = 0; this.cracks.length = 0; this.texts.length = 0; this.flash = 0; }
  add(o) { if (this.p.length < this.max) this.p.push(o); }

  /* --- emitters --- */
  sparks(x, y, dir, col = '#ffd27a', n = 14, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + NF.rand(-1.1, 1.1), sp = NF.rand(4, 14) * power;
      this.add({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: NF.rand(10, 22), max: 22, col, w: NF.rand(2, 4.5) * power });
    }
  }
  burst(p, col = '#ff4020', n = 20) { for (let i = 0; i < n; i++) { const a = NF.rand(0, 6.28), sp = NF.rand(2, 9); this.add({ t: 'ember', x: p[0], y: p[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: NF.rand(16, 36), max: 36, col, r: NF.rand(2, 5) }); } }
  embers(x, y, n = 1, col) { for (let i = 0; i < n; i++) this.add({ t: 'ember', x: x + NF.rand(-20, 20), y, vx: NF.rand(-1, 1), vy: NF.rand(-3.5, -1), life: NF.rand(30, 70), max: 70, col: col || NF.pick(['#ff6a20', '#ffb030', '#ff3010']), r: NF.rand(1.5, 3.5) }); }
  flame(x, y, n = 3, scale = 1, col) {
    for (let i = 0; i < n; i++) this.add({ t: 'flame', x: x + NF.rand(-14, 14) * scale, y: y + NF.rand(-6, 6), vx: NF.rand(-1, 1), vy: NF.rand(-4, -1.5) * scale, life: NF.rand(18, 34), max: 34, r: NF.rand(10, 22) * scale, col });
  }
  smoke(x, y, n = 16, col = 'rgba(20,10,14,') { for (let i = 0; i < n; i++) { const a = NF.rand(0, 6.28), sp = NF.rand(.5, 4); this.add({ t: 'smoke', x: x + NF.rand(-30, 30), y: y + NF.rand(-60, 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .6, life: NF.rand(26, 50), max: 50, r: NF.rand(16, 40), col }); } }
  dust(x, y, n = 8) { for (let i = 0; i < n; i++) this.add({ t: 'smoke', x: x + NF.rand(-30, 30), y: y - NF.rand(0, 8), vx: NF.rand(-3, 3), vy: NF.rand(-1.6, -.2), life: NF.rand(18, 34), max: 34, r: NF.rand(8, 18), col: 'rgba(90,70,70,' }); }
  ring(x, y, col = '#fff', r0 = 10, r1 = 120, life = 18, w = 8) { this.rings.push({ x, y, col, r0, r1, life, max: life, w }); }
  crack(x, y) { const segs = []; for (let s = -1; s <= 1; s += 2) { let px = x, py = y; for (let i = 0; i < 6; i++) { const nx = px + s * NF.rand(20, 44), ny = y + NF.rand(-3, 6); segs.push([px, py, nx, ny]); if (Math.random() < .4) segs.push([nx, ny, nx + s * NF.rand(10, 26), ny + NF.rand(4, 14)]); px = nx; py = ny; } } this.cracks.push({ segs, life: 90, max: 90 }); }
  text(x, y, txt, col = '#fff', size = 40, life = 50) { this.texts.push({ x, y, txt, col, size, life, max: life }); }
  screenFlash(col = '#fff', a = .7) { this.flash = a; this.flashCol = col; }
  trail(f, kind) { f.trailOn = Math.max(f.trailOn, 6); const p = f.wj('chest'); if (kind === 'fireTrail' || kind === 'fireFist' || kind === 'dragon') this.flame(p[0], p[1] + 30, 2, 1); else this.embers(p[0], p[1] + 20, 2, kind === 'chaosTrail' || kind === 'lightning' ? '#ffb040' : '#ff2a3a'); }
  moveFx(f, kind) {
    const h = f.wj('haN'), c = f.wj('chest');
    switch (kind) {
      case 'fireFist': this.flame(h[0], h[1], 10, 1.1); this.burst(h, '#ff8a20', 14); this.ring(h[0], h[1], '#ff7a20', 8, 70, 12, 6); break;
      case 'dragon': this.flame(h[0], h[1], 14, 1.3); this.ring(c[0], c[1], '#ff5020', 10, 110, 16, 8); break;
      case 'rageTrail': this.ring(c[0], c[1], '#ff2020', 10, 90, 14, 7); this.smoke(c[0], c[1], 6, 'rgba(160,10,10,'); break;
      case 'crimsonTrail': this.ring(c[0], c[1], '#ff3040', 10, 100, 14, 6); break;
      case 'tornado': this.ring(c[0], c[1], '#ff3040', 20, 150, 20, 10); break;
      case 'chaosTrail': case 'chaosSpin': this.ring(c[0], c[1], '#ffb040', 10, 110, 14, 7); this.sparks(c[0], c[1], f.face, '#ffcf60', 10); break;
      case 'lightning': this.ring(c[0], c[1], '#fff2a0', 10, 90, 10, 5); break;
      case 'tridentFlash': { const w = f.J.wpn ? [f.x + f.J.wpn[0] * f.face, f.y + f.J.wpn[1]] : h; this.ring(w[0], w[1], '#ffdd60', 8, 90, 12, 6); this.flame(w[0], w[1], 6, .8); break; }
      case 'fireTrail': this.flame(c[0], c[1], 12, 1.3); break;
    }
  }

  update() {
    for (const q of this.p) {
      q.life--; q.x += q.vx; q.y += q.vy;
      if (q.t === 'spark') { q.vy += .5; q.vx *= .93; }
      else if (q.t === 'ember') { q.vy += .05; q.vx *= .98; q.vx += Math.sin(q.life * .3) * .1; }
      else if (q.t === 'flame') { q.vx *= .95; q.r *= .985; }
      else if (q.t === 'smoke') { q.vx *= .95; q.vy *= .97; q.r *= 1.012; }
      else if (q.t === 'debris') { q.vy += .6; if (q.y > NF.FLOOR) { q.y = NF.FLOOR; q.vy *= -.4; q.vx *= .6; } q.rot += q.vr; }
    }
    this.p = this.p.filter(q => q.life > 0);
    for (const r of this.rings) r.life--; this.rings = this.rings.filter(r => r.life > 0);
    for (const c of this.cracks) c.life--; this.cracks = this.cracks.filter(c => c.life > 0);
    for (const t of this.texts) { t.life--; t.y -= .8; } this.texts = this.texts.filter(t => t.life > 0);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - .06);
  }
  debris(x, y, n = 10, col = '#2a1a1a') { for (let i = 0; i < n; i++) this.add({ t: 'debris', x, y, vx: NF.rand(-7, 7), vy: NF.rand(-14, -4), life: NF.rand(40, 70), max: 70, s: NF.rand(4, 10), col, rot: 0, vr: NF.rand(-.3, .3) }); }

  drawBack(ctx) {
    for (const c of this.cracks) {
      ctx.save(); ctx.globalAlpha = Math.min(1, c.life / 30); ctx.lineCap = 'round';
      ctx.beginPath(); for (const s of c.segs) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
      ctx.strokeStyle = 'rgba(255,60,0,.35)'; ctx.lineWidth = 16; ctx.stroke();
      ctx.strokeStyle = '#ff5a10'; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const q of this.p) if (q.t === 'smoke') { ctx.globalAlpha = (q.life / q.max) * .5; ctx.fillStyle = q.col + '1)'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }
    for (const q of this.p) if (q.t === 'debris') { ctx.globalAlpha = Math.min(1, q.life / 20); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.col; ctx.fillRect(-q.s / 2, -q.s / 2, q.s, q.s * .7); ctx.restore(); }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.p) {
      const k = q.life / q.max;
      if (q.t === 'flame') {
        ctx.globalAlpha = k * .9;
        const sp = q.col === 'dark' ? NF.glow.dark : k > .6 ? NF.glow.hot : NF.glow.warm;
        ctx.drawImage(sp, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      } else if (q.t === 'spark') {
        ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.w; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 1.6, q.y - q.vy * 1.6); ctx.stroke();
      } else if (q.t === 'ember') {
        ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill();
      }
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max, rr = NF.lerp(r.r0, r.r1, NF.ease.out(k));
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * .9, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
    for (const t of this.texts) {
      ctx.save(); const k = t.life / t.max; ctx.globalAlpha = Math.min(1, k * 2);
      const sc = 1 + (1 - k) * .15 + (k > .85 ? (k - .85) * 3 : 0);
      ctx.translate(t.x, t.y); ctx.scale(sc, sc); ctx.font = `${t.size}px 'Bebas Neue', Impact, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 8; ctx.strokeStyle = '#120708'; ctx.strokeText(t.txt, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.txt, 0, 0); ctx.restore();
    }
  }
  drawScreen(ctx, W, H) { if (this.flash > 0) { ctx.save(); ctx.globalAlpha = this.flash; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
};
