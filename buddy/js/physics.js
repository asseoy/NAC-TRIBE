/* Verlet physics: particles, distance links, rigid boxes made of four corners.
   Fixed sub-steps keep throws and explosions stable at any frame rate. */
'use strict';
BD.Phys = class {
  constructor() {
    this.ps = []; this.links = []; this.boxes = [];
    this.g = 2300; this.gScale = 1; this.gx = 0;
    this.b = { l: 0, r: 1600, t: 0, b: 900 };
    this.iters = 8; this.dt = 1 / 120; this.damp = .997;
    this.floorFric = .55; this.wallRest = .35; this.floorRest = .25;
    this.onImpact = null; this.onFloor = null;
    this.hazard = null;          // arena hook: (p) => called for particles touching the floor
  }
  particle(x, y, r, mass, o = {}) {
    const p = Object.assign({ x, y, px: x, py: y, r, mass, im: mass ? 1 / mass : 0, rest: .3, fr: .5, group: 0, body: null, pin: false, ax: 0, ay: 0, ground: 0, alive: true }, o);
    this.ps.push(p); return p;
  }
  link(a, b, o = {}) {
    const len = o.len != null ? o.len : Math.hypot(b.x - a.x, b.y - a.y);
    const c = Object.assign({ a, b, len, k: 1, kind: 'eq', alive: true }, o, { len });
    this.links.push(c); return c;
  }
  box(x, y, w, h, mass, o = {}) {
    const g = o.group || ('b' + Math.random());
    const ang = o.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) =>
      this.particle(x + u * ca - v * sa, y + u * sa + v * ca, 2, mass / 4, { group: g, rest: o.rest ?? .2, fr: o.fr ?? .6 }));
    const B = Object.assign({ kind: 'box', ps: pts, w, h, mass, group: g, alive: true, links: [] }, o);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) B.links.push(this.link(pts[i], pts[j], { k: 1 }));
    pts.forEach(p => p.body = B);
    this.boxes.push(B); return B;
  }
  kill(obj) {
    if (!obj) return;
    if (obj.kind === 'box') { obj.alive = false; obj.ps.forEach(p => p.alive = false); obj.links.forEach(c => c.alive = false); }
    else obj.alive = false;
  }
  push(p, vx, vy) { if (p.im) { p.px -= vx * this.dt; p.py -= vy * this.dt; } }
  vel(p) { return [(p.x - p.px) / this.dt, (p.y - p.py) / this.dt]; }
  setVel(p, vx, vy) { p.px = p.x - vx * this.dt; p.py = p.y - vy * this.dt; }
  /* a radial blast: lighter things fly further */
  blast(x, y, R, power, filter) {
    for (const p of this.ps) {
      if (!p.alive || !p.im || (filter && !filter(p))) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const f = power * Math.pow(1 - d / R, .6) / Math.sqrt(p.mass);
      this.push(p, dx / d * f, dy / d * f - f * .25);
    }
  }
  step() {
    const { dt, b } = this, gy = this.g * this.gScale, gx = this.gx * this.g;
    this.ps = this.ps.filter(p => p.alive);
    this.links = this.links.filter(c => c.alive);
    this.boxes = this.boxes.filter(x => x.alive);
    const ps = this.ps, n = ps.length;
    for (const p of ps) {
      if (p.pin || !p.im) { p.px = p.x; p.py = p.y; p.ax = p.ay = 0; continue; }
      let vx = (p.x - p.px) * this.damp, vy = (p.y - p.py) * this.damp;
      const sp = Math.hypot(vx, vy), max = 55;
      if (sp > max) { vx *= max / sp; vy *= max / sp; }
      p.px = p.x; p.py = p.y;
      const gm = p.noGrav ? 0 : 1;
      p.x += vx + (gx * gm + p.ax) * dt * dt;
      p.y += vy + (gy * gm + p.ay) * dt * dt;
      p.ax = p.ay = 0; p.ground = Math.max(0, p.ground - 1);
    }
    for (let it = 0; it < this.iters; it++) {
      const first = it === 0;
      for (const c of this.links) {
        const { a, b: q } = c; let dx = q.x - a.x, dy = q.y - a.y; const d = Math.hypot(dx, dy) || 1e-6;
        if (c.kind === 'min' && d >= c.len) continue;
        if (c.kind === 'max' && d <= c.len) continue;
        const w = a.im + q.im; if (!w) continue;
        const diff = (d - c.len) / d * c.k;
        dx *= diff; dy *= diff;
        a.x += dx * a.im / w; a.y += dy * a.im / w; q.x -= dx * q.im / w; q.y -= dy * q.im / w;
      }
      // round particles against each other
      for (let i = 0; i < n; i++) {
        const p = ps[i]; if (p.r < 3) continue;
        for (let j = i + 1; j < n; j++) {
          const q = ps[j]; if (q.r < 3 || p.group === q.group) continue;
          const dx = q.x - p.x, dy = q.y - p.y, rr = p.r + q.r;
          if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
          const d = Math.hypot(dx, dy); if (d >= rr || d === 0) continue;
          const w = p.im + q.im; if (!w) continue;
          if (first && this.onImpact) {
            const rvx = (q.x - q.px) - (p.x - p.px), rvy = (q.y - q.py) - (p.y - p.py), rel = Math.abs((rvx * dx + rvy * dy) / d) / dt;
            if (rel > 250) this.onImpact(p, q, rel, (p.x + q.x) / 2, (p.y + q.y) / 2);
          }
          const pen = (rr - d) / d;
          p.x -= dx * pen * p.im / w; p.y -= dy * pen * p.im / w; q.x += dx * pen * q.im / w; q.y += dy * pen * q.im / w;
        }
      }
      for (const B of this.boxes) this.boxCollide(B, first);
      // the walls of the arena
      for (const p of ps) {
        if (p.pin || !p.im) continue;
        const r = p.r;
        if (p.y + r > b.b) {
          const vy = p.y - p.py, vx = p.x - p.px;
          p.y = b.b - r;
          if (first) {
            if (vy / dt > 300 && this.onImpact) this.onImpact(p, null, vy / dt, p.x, b.b, 'floor');
            p.py = p.y + vy * p.rest * this.floorRest * 3;
            p.px = p.x - vx * (1 - this.floorFric * p.fr);
          } else p.py = Math.max(p.py, p.y);
          p.ground = 3;
          if (this.hazard) this.hazard(p);
        }
        if (p.y - r < b.t) { const vy = p.y - p.py; p.y = b.t + r; if (first) { if (-vy / dt > 300 && this.onImpact) this.onImpact(p, null, -vy / dt, p.x, b.t, 'ceil'); p.py = p.y + vy * this.wallRest; } }
        if (p.x - r < b.l) { const vx = p.x - p.px; p.x = b.l + r; if (first) { if (-vx / dt > 300 && this.onImpact) this.onImpact(p, null, -vx / dt, b.l, p.y, 'wall'); p.px = p.x + vx * this.wallRest; } }
        if (p.x + r > b.r) { const vx = p.x - p.px; p.x = b.r - r; if (first) { if (vx / dt > 300 && this.onImpact) this.onImpact(p, null, vx / dt, b.r, p.y, 'wall'); p.px = p.x + vx * this.wallRest; } }
      }
    }
  }
  /* push round particles (and other boxes' corners) out of a box */
  boxCollide(B, first) {
    const c = B.ps, N = [];
    let cx = 0, cy = 0; for (const p of c) { cx += p.x; cy += p.y; } cx /= 4; cy /= 4;
    for (let i = 0; i < 4; i++) {
      const a = c[i], q = c[(i + 1) % 4]; let nx = q.y - a.y, ny = -(q.x - a.x); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if ((a.x - cx) * nx + (a.y - cy) * ny < 0) { nx = -nx; ny = -ny; }
      N.push([nx, ny, l]);
    }
    const rad = Math.hypot(B.w, B.h) / 2 + 40;
    for (const p of this.ps) {
      if (p.group === B.group || !p.alive) continue;
      const pr = p.r < 3 ? 1 : p.r;
      if (Math.abs(p.x - cx) > rad + pr || Math.abs(p.y - cy) > rad + pr) continue;
      let best = -1e9, bi = -1;
      for (let i = 0; i < 4; i++) {
        const s = (p.x - c[i].x) * N[i][0] + (p.y - c[i].y) * N[i][1] - pr;
        if (s > 0) { bi = -1; break; }
        if (s > best) { best = s; bi = i; }
      }
      if (bi < 0) continue;
      const pen = -best, [nx, ny, len] = N[bi], a = c[bi], q = c[(bi + 1) % 4];
      let t = ((p.x - a.x) * (q.x - a.x) + (p.y - a.y) * (q.y - a.y)) / (len * len); t = BD.clamp(t, 0, 1);
      const eIm = (a.im * (1 - t) + q.im * t), w = p.im + eIm; if (!w) continue;
      if (first && this.onImpact && p.r >= 3) {
        const vb = ((a.x - a.px) * (1 - t) + (q.x - q.px) * t) * nx + ((a.y - a.py) * (1 - t) + (q.y - q.py) * t) * ny;
        const rel = Math.abs((p.x - p.px) * nx + (p.y - p.py) * ny - vb) / this.dt;
        if (rel > 250) this.onImpact(p, a, rel, p.x - nx * pr, p.y - ny * pr);
      }
      const mp = pen * p.im / w, mb = pen * eIm / w;
      p.x += nx * mp; p.y += ny * mp;
      a.x -= nx * mb * (1 - t) * 2 * (a.im ? 1 : 0); a.y -= ny * mb * (1 - t) * 2 * (a.im ? 1 : 0);
      q.x -= nx * mb * t * 2 * (q.im ? 1 : 0); q.y -= ny * mb * t * 2 * (q.im ? 1 : 0);
    }
  }
  boxAngle(B) { const [a, b] = B.ps; return Math.atan2(b.y - a.y, b.x - a.x); }
  boxCenter(B) { let x = 0, y = 0; for (const p of B.ps) { x += p.x; y += p.y; } return [x / 4, y / 4]; }
};
