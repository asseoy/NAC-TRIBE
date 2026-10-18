/* Cinematic ultimates. Each one is a scripted timeline that owns both fighters until it ends. */
'use strict';
NF.ult = (() => {
  const RG = NF.rig;
  const INTRO = 62;

  function ultHit(M, att, def, dmg, o = {}) {
    const m = Object.assign({ dmg, kind: 'ult', level: 'unblockable', stun: 40, kb: o.kb || [2, 0], knock: o.knock, launch: o.launch, meter: 0, fire: o.fire }, o);
    const was = def.state;
    M.resolveHit(att, def, m, o.at || [def.x, def.y - 120]);
    M.hitstop = o.stop ?? 3;
    if (!o.keepState && !def.dead) { def.state = was === 'fall' ? 'fall' : 'hurt'; def.stun = 60; }
  }
  // shared intro: freeze, zoom on the attacker's face, cut-in
  function base(M, att, def, spec) {
    const c = {
      t: 0, att, def, spec, hideHud: false, cam: null,
      update(M) {
        this.t++;
        const t = this.t;
        if (t === 1) { NF.audio.play('ultStart'); att.state = 'attack'; att.attacking = true; att.move = null; def.state = 'hurt'; def.stun = 999; att.inv = 999; def.vx = att.vx = 0; M.proj.length = 0; }
        if (t < INTRO) {
          const h = att.wj('head');
          this.cam = { x: h[0] + att.face * 40, y: h[1] + 40, z: 2.1, k: .18 };
          att.cinePose = RG.add(att.def.poses.stance, spec.charge || { lean: -6, hy: -6, hn: [30, -210], hf: [-20, -200], en: -1, ef: -1 });
          if (t % 3 === 0) M.fx.embers(att.x + NF.rand(-60, 60), NF.FLOOR - NF.rand(0, 200), 3, spec.col);
          if (t === 20) M.fx.ring(h[0], h[1], spec.col, 10, 220, 30, 12);
          spec.intro && spec.intro(M, att, def, t);
          return false;
        }
        const tt = t - INTRO + 1;
        const done = spec.script(M, att, def, tt, this);
        if (done || def.dead && tt > (spec.minLen || 0) + 40) { this.finish(M); return true; }
        return false;
      },
      finish(M) {
        att.state = 'idle'; att.attacking = false; att.inv = 10; att.cinePose = null; def.cinePose = null; att.hidden = 0; att.alpha = 1; att.glowEyes = 0;
        att.y = Math.min(att.y, NF.FLOOR); if (att.y < NF.FLOOR - 2) { att.air = true; att.state = 'jump'; }
        if (!def.dead) { def.state = 'fall'; def.air = true; def.knocked = true; def.vy = def.vy < -4 ? def.vy : -10; def.vx = att.face * 6; def.stun = 0; def.juggle = 4; }
        att.face = def.x >= att.x ? 1 : -1;
      },
      drawScreen(ctx, W, H, M) {
        const t = this.t;
        if (t < INTRO + 6) {
          // darken
          ctx.save(); ctx.globalAlpha = Math.min(.55, t / 20); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
          // cut-in band
          const k = t < 10 ? NF.ease.back(t / 10) : t > INTRO - 8 ? 1 - (t - INTRO + 8) / 14 : 1;
          if (k > 0) {
            ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.2));
            const y0 = H * .52, bh = 230, slide = (1 - k) * W * (att.idx === 0 ? -1 : 1);
            ctx.translate(slide, 0);
            ctx.beginPath(); ctx.moveTo(-50, y0 - bh / 2 + 40); ctx.lineTo(W + 50, y0 - bh / 2 - 40); ctx.lineTo(W + 50, y0 + bh / 2 - 40); ctx.lineTo(-50, y0 + bh / 2 + 40); ctx.closePath();
            const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#120708'); g.addColorStop(.5, spec.band || '#5e070c'); g.addColorStop(1, '#120708'); ctx.fillStyle = g; ctx.fill();
            ctx.save(); ctx.clip();
            // speed lines
            ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
            for (let i = 0; i < 40; i++) { const yy = y0 - bh / 2 + NF.hash(i + t * 3) * bh, x = ((NF.hash(i) * W * 2 + t * 70) % (W * 1.4)) - W * .2; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 160, yy - 6); ctx.stroke(); }
            // face crop of the original art
            const img = NF.img[att.def.img];
            if (img) {
              const c2 = att.def.faceCrop, sx = c2[0] * img.width, sy = c2[1] * img.height, sw = (c2[2] - c2[0]) * img.width, sh = (c2[3] - c2[1]) * img.height;
              const fh = bh + 120, fw = fh * sw / sh, fx = att.idx === 0 ? 40 + t * .6 : W - fw - 40 - t * .6;
              ctx.save(); if (att.idx === 1) { ctx.translate(fx + fw, 0); ctx.scale(-1, 1); ctx.translate(-fx, 0); }
              ctx.drawImage(img, sx, sy, sw, sh, fx, y0 - fh / 2, fw, fh); ctx.restore();
            }
            ctx.restore();
            ctx.lineWidth = 6; ctx.strokeStyle = spec.col; ctx.stroke();
            // name
            ctx.font = "120px 'Bebas Neue', Impact, sans-serif"; ctx.textAlign = att.idx === 0 ? 'right' : 'left'; ctx.textBaseline = 'middle';
            const nx = att.idx === 0 ? W - 60 - t * .8 : 60 + t * .8;
            ctx.lineWidth = 14; ctx.strokeStyle = '#120708'; ctx.strokeText(att.def.ult.name, nx, y0 - 10);
            const tg = ctx.createLinearGradient(0, y0 - 60, 0, y0 + 40); tg.addColorStop(0, '#fff6d0'); tg.addColorStop(.5, spec.col); tg.addColorStop(1, '#6a050a');
            ctx.fillStyle = tg; ctx.fillText(att.def.ult.name, nx, y0 - 10);
            ctx.font = "800 34px Rubik, sans-serif"; ctx.lineWidth = 6; ctx.strokeText(att.def.ult.he, nx, y0 + 70); ctx.fillStyle = '#fff'; ctx.fillText(att.def.ult.he, nx, y0 + 70);
            ctx.restore();
          }
        }
        spec.drawScreen && spec.drawScreen(ctx, W, H, M, this.t - INTRO, this);
      },
      drawBack(ctx, M) { spec.drawBack && spec.drawBack(ctx, M, this.t - INTRO, this); },
      drawWorld(ctx, M) { spec.drawWorld && spec.drawWorld(ctx, M, this.t - INTRO, this); },
    };
    return c;
  }
  const camY = z => NF.FLOOR - 270 / z;
  const wideCam = (att, def, z = 1, k = .1) => ({ x: (att.x + def.x) / 2, y: camY(z), z, k });

  /* ================= HELL MODE ================= */
  const hell = {
    col: '#ff3a10', band: '#6a0a04', charge: { lean: -10, hy: -10, hn: [40, -240], hf: [-30, -200], en: -1, wpn: -90 }, minLen: 170,
    intro(M, att, def, t) { att.glowEyes = Math.min(1, t / 30); if (t === 30) { M.fx.screenFlash('#ff2000', .35); M.shake(8); } },
    script(M, att, def, t, c) {
      c.cam = wideCam(att, def, .95, .08);
      att.cinePose = RG.add(att.def.poses.stance, { lean: 40, hy: -70, hn: [120, -20], wpn: 80 });
      if (t === 1) { M.fx.crack(att.x + att.face * 80, NF.FLOOR); M.shake(16); NF.audio.play('boom'); M.fx.screenFlash('#ff3000', .4); }
      // fissure crawling to the opponent
      const d = def.x - att.x, steps = 5;
      for (let i = 0; i < steps; i++) {
        const at = 14 + i * 16, x = att.x + d * (i + 1) / steps;
        if (t === at) { M.fx.crack(x, NF.FLOOR); M.fx.debris(x, NF.FLOOR, 8); M.shake(10); NF.audio.play('fire'); ultHit(M, att, def, 4, { fire: true, at: [def.x, def.y - 60] }); def.vx = 0; }
        if (t >= at && t < at + 26) M.fx.flame(x + NF.rand(-30, 30), NF.FLOOR - NF.rand(0, 260), 3, 1.7);
      }
      if (t > 20 && t < 100) { def.cinePose = RG.add(def.def.poses.hurt, { hy: -Math.min(80, (t - 20) * 2) }); def.y = NF.FLOOR - Math.min(90, (t - 20) * 2); }
      // the fire wave
      if (t === 104) { NF.audio.play('ultStart'); NF.audio.play('fire'); M.fx.screenFlash('#ffb040', .5); }
      if (t >= 104 && t < 150) { c.waveX = att.x + att.face * (t - 104) * 32; M.shake(6); if (t % 2 === 0) M.fx.flame(c.waveX, NF.FLOOR - NF.rand(0, 360), 4, 2.4); }
      if (t === 124) { ultHit(M, att, def, 30, { fire: true, launch: 1, kb: [14, -16], stop: 10, keepState: true }); def.air = true; def.vy = -16; def.vx = att.face * 10; M.fx.burst([def.x, def.y - 120], '#ffb040', 40); M.shake(24); }
      if (t > 124) { def.vy += .8; def.x += def.vx; def.y = Math.min(NF.FLOOR, def.y + def.vy); def.cinePose = def.def.poses.fall; }
      return t >= 170;
    },
    drawBack(ctx, M, t) {   // red-black hell sky over the arena
      if (t < -40) return; const a = Math.min(.75, (t + 40) / 50);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#1a0202'; ctx.fillRect(M.cam.x - 1600, -800, 3200, NF.FLOOR + 800);
      const g = ctx.createLinearGradient(0, NF.FLOOR - 400, 0, NF.FLOOR); g.addColorStop(0, 'rgba(255,40,0,0)'); g.addColorStop(1, 'rgba(255,80,0,.6)'); ctx.fillStyle = g; ctx.fillRect(M.cam.x - 1600, NF.FLOOR - 400, 3200, 400); ctx.restore();
    },
    drawWorld(ctx, M, t, c) {
      if (t >= 104 && t < 160 && c.waveX != null) {
        const x = c.waveX, f = c.att.face;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x - f * 400, 0, x + f * 60, 0); g.addColorStop(0, 'rgba(255,40,0,0)'); g.addColorStop(.7, 'rgba(255,120,20,.85)'); g.addColorStop(1, 'rgba(255,240,160,1)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - f * 420, NF.FLOOR);
        for (let i = 0; i <= 12; i++) { const yy = NF.FLOOR - i * 36, wob = Math.sin(t * .6 + i) * 24; ctx.lineTo(x + f * (60 - i * 8 + wob), yy); }
        ctx.lineTo(x - f * 420, NF.FLOOR - 430); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    },
    drawScreen(ctx, W, H, M, t) { if (t > 0 && t < 170) { ctx.save(); ctx.globalAlpha = .25; ctx.fillStyle = '#ff2000'; ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(0, 0, W, H); ctx.restore(); } },
  };

  /* ================= RED RAGE ================= */
  const rage = {
    col: '#ff2a1a', band: '#5a0606', charge: { lean: 4, hy: -16, hn: [40, -150], hf: [-10, -150], en: 1 }, minLen: 130,
    intro(M, att, def, t) { if (t % 2 === 0) M.fx.flame(att.x + NF.rand(-50, 50), NF.FLOOR - NF.rand(20, 220), 2, 1.3); if (t === 40) M.shake(10); },
    script(M, att, def, t, c) {
      const P = att.def.poses;
      if (t < 14) { c.cam = wideCam(att, def, 1.05, .15); att.x = NF.lerp(att.x, def.x - att.face * 105, .35); att.trailOn = 6; att.cinePose = RG.add(P.stance, { lean: 40, hn: [80, -150] }); if (t % 2 === 0) M.fx.flame(att.x, NF.FLOOR - 100, 3, 1.2); return false; }
      c.cam = { x: (att.x + def.x) / 2, y: camY(1.35), z: 1.35, k: .12 };
      if (t >= 14 && t < 84) {   // barrage
        const k = (t - 14) % 4, left = ((t - 14) >> 2) % 2;
        att.cinePose = RG.add(P.stance, left ? { hn: [140, -170 + NF.rand(-30, 30)], hf: [10, -170], lean: 24, hx: 12 } : { hf: [140, -165 + NF.rand(-30, 30)], hn: [20, -170], lean: 26, hx: 14 });
        att.trailOn = 4;
        if (k === 0) { ultHit(M, att, def, 1.5, { at: [def.x - att.face * 20, def.y - 150 + NF.rand(-40, 40)], stop: 1 }); M.fx.sparks(def.x - att.face * 30, def.y - 140 + NF.rand(-40, 40), -att.face, '#ffcf60', 6); M.fx.flame(def.x - att.face * 30, def.y - 140, 2, .8); }
        def.cinePose = RG.add(def.def.poses.hurt, { lean: -20 + Math.sin(t) * 6 }); def.x += att.face * .3;
        return false;
      }
      if (t >= 84 && t < 100) { att.cinePose = RG.add(P.crouch, { hn: [-20, -60], lean: 10 }); if (t === 84) { NF.audio.play('ultStart'); M.fx.ring(att.x, att.y - 100, '#ff3a10', 10, 160, 16, 10); } return false; }
      if (t === 100) {
        att.cinePose = RG.add(P.stance, { hn: [60, -300], hf: [-20, -160], lean: -8, en: -1, hy: -110 });
        M.fx.screenFlash('#fff', .9); M.shake(28); M.fx.burst([def.x, def.y - 160], '#ff8a20', 50); M.fx.ring(def.x, def.y - 140, '#ff4a10', 20, 300, 26, 16); M.fx.ring(def.x, def.y - 140, '#fff', 20, 200, 18, 8);
        ultHit(M, att, def, 26, { launch: 1, kb: [8, -22], stop: 14, keepState: true, fire: true });
        def.air = true; def.vy = -22; def.vx = att.face * 5; M.slow = .3;
      }
      if (t > 100) { def.vy += .9; def.x += def.vx; def.y = Math.min(NF.FLOOR, def.y + def.vy); def.cinePose = def.def.poses.fall; if (t === 118) M.slow = 1; }
      return t >= 140;
    },
    drawScreen(ctx, W, H, M, t) { if (t > 0 && t < 100) { ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); } },
  };

  /* ================= CRIMSON STORM ================= */
  const storm = {
    col: '#ff3a50', band: '#5c0712', charge: { lean: -4, hy: -4, hn: [60, -180], hf: [-40, -200] }, minLen: 150,
    script(M, att, def, t, c) {
      const P = att.def.poses;
      c.cam = { x: def.x, y: camY(1.25), z: 1.25, k: .1 };
      def.cinePose = RG.add(def.def.poses.hurt, { lean: Math.sin(t * .5) * 14 - 10 });
      if (t === 1) { M.fx.smoke(att.x, att.y - 100, 10, 'rgba(120,0,20,'); NF.audio.play('teleport'); c.pts = []; }
      if (t < 96) {
        if (t % 8 === 0) {
          const a = (t / 8) * 2.4, r = 150;
          const nx = def.x + Math.cos(a) * r, ny = Math.min(NF.FLOOR, def.y - 100 + Math.sin(a) * 120);
          c.pts.push([att.x, att.y - 110, nx, ny - 110, 18]);
          att.x = nx; att.y = ny; att.face = def.x >= att.x ? 1 : -1;
          att.cinePose = RG.add(t % 16 ? P.jump : P.stance, t % 16 ? { fn: [130, -120], lean: -14 } : { hn: [130, -160], lean: 24 });
          ultHit(M, att, def, 2.6, { at: [def.x, def.y - 130], stop: 2 }); NF.audio.play('whoosh', 1.4);
          M.fx.sparks(def.x, def.y - 130, -att.face, '#ff6a7a', 10);
        }
        for (const p of c.pts) p[4]--; c.pts = c.pts.filter(p => p[4] > 0);
        return false;
      }
      if (t === 96) { att.x = def.x - att.face * 130; att.y = NF.FLOOR; att.face = def.x >= att.x ? 1 : -1; M.slow = .28; NF.audio.play('whooshBig'); }
      if (t >= 96 && t < 130) {
        const sp = (t - 96) * .45;
        att.cinePose = RG.add(P.stance, { fn: [Math.cos(sp) * 130, -140 + Math.sin(sp) * 40], ff: [-30, 0], lean: -20, hn: [0, -220], hf: [-40, -160] });
        att.spinCine = sp; att.trailOn = 6;
        c.cam = { x: (att.x + def.x) / 2, y: camY(1.55) - 30, z: 1.55, k: .1 };
      }
      if (t === 124) { M.slow = 1; M.fx.screenFlash('#ffd0d8', .8); M.shake(24); M.fx.ring(def.x, def.y - 150, '#ff3a50', 20, 280, 24, 14); M.fx.burst([def.x, def.y - 150], '#ff3a50', 40); ultHit(M, att, def, 24, { launch: 1, kb: [16, -14], stop: 12, keepState: true }); def.air = true; def.vy = -14; def.vx = att.face * 14; }
      if (t > 124) { def.vy += .8; def.x += def.vx; def.y = Math.min(NF.FLOOR, def.y + def.vy); def.cinePose = def.def.poses.fall; }
      return t >= 160;
    },
    drawWorld(ctx, M, t, c) {
      if (!c.pts) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const p of c.pts) { const k = p[4] / 18; ctx.globalAlpha = k; ctx.strokeStyle = '#ff2a40'; ctx.lineWidth = 22 * k; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); ctx.strokeStyle = '#ffe0e4'; ctx.lineWidth = 6 * k; ctx.stroke(); }
      ctx.restore();
    },
  };

  /* ================= CHAOS COMBO ================= */
  const chaosU = {
    col: '#ff7a20', band: '#5a1804', charge: { lean: 20, hy: -60, hn: [70, -100], hf: [30, -60] }, minLen: 150,
    script(M, att, def, t, c) {
      const P = att.def.poses;
      c.cam = { x: def.x, y: camY(1.15), z: 1.15, k: .1 };
      def.cinePose = RG.add(def.def.poses.hurt, { lean: Math.sin(t * .7) * 18 - 8, head: Math.cos(t * .9) * 20 });
      if (t === 1) { att.hidden = 200; c.ghosts = []; NF.audio.play('teleport'); M.fx.smoke(att.x, att.y - 100, 12, 'rgba(160,60,0,'); }
      if (t < 100) {
        const n = Math.min(7, 1 + (t >> 3));
        c.ghosts = [];
        for (let i = 0; i < n; i++) { const a = t * .12 + i * Math.PI * 2 / 7, r = 170 - (t % 8) * 4; c.ghosts.push({ x: def.x + Math.cos(a) * r, y: Math.min(NF.FLOOR, def.y + Math.sin(a) * 60 - 10), face: Math.cos(a) > 0 ? -1 : 1, atk: (t + i * 3) % 12 < 4 }); }
        if (t % 5 === 0) { const g = c.ghosts[(t / 5) % c.ghosts.length | 0]; c.zap = [g.x, g.y - 120, def.x, def.y - 120, 6]; ultHit(M, att, def, 2.2, { at: [def.x, def.y - 120], stop: 1 }); M.fx.sparks(def.x, def.y - 120, -g.face, '#ffd060', 8); NF.audio.play('zap'); }
        if (c.zap) c.zap[4]--;
        return false;
      }
      if (t === 100) { c.ghosts = []; att.hidden = 0; att.x = def.x - att.face * 60; att.y = NF.FLOOR - 220; att.face = def.x >= att.x ? 1 : -1; att.cinePose = RG.add(P.jump, { hn: [40, -260], hf: [10, -250], en: -1, ef: -1 }); c.orb = 0; NF.audio.play('ultStart'); }
      if (t >= 100 && t < 140) { c.orb = (t - 100) / 40; c.cam = { x: def.x, y: camY(.9) - 60, z: .9, k: .1 }; if (t % 2 === 0) M.fx.embers(att.x + NF.rand(-80, 80), att.y - 300, 3, '#ff6a20'); }
      if (t === 140) { c.orb = 0; M.fx.screenFlash('#fff', 1); M.shake(32); NF.audio.play('boom'); M.fx.ring(def.x, def.y - 100, '#ff3a10', 20, 420, 30, 22); M.fx.ring(def.x, def.y - 100, '#fff', 10, 300, 20, 10); M.fx.burst([def.x, def.y - 100], '#ff5a20', 60); M.fx.flame(def.x, def.y - 100, 20, 2.6); M.fx.debris(def.x, NF.FLOOR, 18); ultHit(M, att, def, 22, { launch: 1, kb: [12, -18], stop: 14, keepState: true, fire: true }); def.air = true; def.vy = -18; def.vx = att.face * 9; att.y = NF.FLOOR; }
      if (t > 140) { def.vy += .85; def.x += def.vx; def.y = Math.min(NF.FLOOR, def.y + def.vy); def.cinePose = def.def.poses.fall; c.boom = (t - 140) / 30; }
      return t >= 172;
    },
    drawWorld(ctx, M, t, c) {
      const att = c.att, d = att.def;
      if (c.ghosts) for (const g of c.ghosts) {
        const key = g.atk ? 'gA' : 'gB';
        if (!c[key]) c[key] = att.snapshot(RG.add(d.poses.stance, g.atk ? { hn: [130, -160], lean: 26 } : { lean: 30 }), 'rgba(255,120,30,.7)');
        const cv = c[key];
        ctx.save(); ctx.globalAlpha = .6; ctx.translate(g.x, g.y); ctx.scale(g.face, 1); ctx.drawImage(cv, -cv._ox, -cv._oy); ctx.restore();
      }
      if (c.zap && c.zap[4] > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(c.zap[0], c.zap[1]); for (let i = 1; i < 6; i++) ctx.lineTo(NF.lerp(c.zap[0], c.zap[2], i / 6) + NF.rand(-14, 14), NF.lerp(c.zap[1], c.zap[3], i / 6) + NF.rand(-14, 14)); ctx.lineTo(c.zap[2], c.zap[3]); ctx.stroke(); ctx.restore(); }
      if (c.orb > 0) { const x = att.x, y = att.y - 300, r = 30 + c.orb * 110; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#fff8d0'); g.addColorStop(.4, '#ff6a20'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
      if (c.boom > 0 && c.boom < 1) { const x = c.def.x, y = NF.FLOOR - 120, r = 100 + c.boom * 700; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - c.boom; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ff6a20'); g.addColorStop(.7, 'rgba(200,0,0,.6)'); g.addColorStop(1, 'rgba(100,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
    },
  };

  /* ================= SHADOW DIMENSION ================= */
  const dim = {
    col: '#ff2a4a', band: '#2a0412', charge: { lean: -6, hy: -10, hn: [80, -170], hf: [-50, -180] }, minLen: 160,
    script(M, att, def, t, c) {
      c.cam = { x: def.x, y: camY(1.12), z: 1.12, k: .08 };
      def.cinePose = RG.add(def.def.poses.hurt, { lean: Math.sin(t * .3) * 10 - 10 });
      if (t === 1) { c.dim = 0; NF.audio.play('magic'); M.fx.smoke(att.x, att.y - 100, 14, 'rgba(40,0,20,'); c.portals = []; }
      c.dim = Math.min(1, t / 30);
      if (t === 24) att.hidden = 200;
      if (t >= 30 && t < 120) {
        if (t % 12 === 6) { const a = NF.rand(0, 6.28); c.portals.push({ x: def.x + Math.cos(a) * 200, y: def.y - 120 + Math.sin(a) * 120, a, t: 0 }); NF.audio.play('teleport'); }
        for (const p of c.portals) {
          p.t++;
          if (p.t === 8) { p.strike = 6; ultHit(M, att, def, 3.2, { at: [def.x, def.y - 120], stop: 2 }); M.fx.flame(def.x, def.y - 120, 4, 1, 'dark'); M.fx.sparks(def.x, def.y - 120, Math.cos(p.a) > 0 ? -1 : 1, '#ff3a5a', 10); }
          if (p.strike) p.strike--;
        }
        c.portals = c.portals.filter(p => p.t < 24);
        return false;
      }
      if (t === 124) { att.hidden = 0; att.x = def.x - att.face * 90; att.y = NF.FLOOR; att.face = def.x >= att.x ? 1 : -1; att.cinePose = RG.add(att.def.poses.stance, { hn: [150, -160], hf: [120, -150], lean: 30 }); NF.audio.play('boom'); M.fx.screenFlash('#ff1a3a', .9); M.shake(30); c.boom = 0.01; M.fx.ring(def.x, def.y - 120, '#000', 20, 380, 30, 26); M.fx.ring(def.x, def.y - 120, '#ff2a4a', 20, 320, 24, 10); ultHit(M, att, def, 22, { launch: 1, kb: [14, -16], stop: 14, keepState: true }); def.air = true; def.vy = -16; def.vx = att.face * 11; }
      if (t > 124) { def.vy += .8; def.x += def.vx; def.y = Math.min(NF.FLOOR, def.y + def.vy); def.cinePose = def.def.poses.fall; c.boom = (t - 124) / 30; c.dim = Math.max(0, 1 - (t - 140) / 20); }
      return t >= 165;
    },
    drawBack(ctx, M, t, c) {
      if (!c.dim) return;
      ctx.save(); ctx.globalAlpha = c.dim * .92; ctx.fillStyle = '#07020a'; ctx.fillRect(M.cam.x - 1600, -900, 3200, 2000);
      ctx.globalAlpha = c.dim * .6; ctx.strokeStyle = '#ff1a3a'; ctx.lineWidth = 2;
      for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(M.cam.x + i * 110 + Math.sin(t * .05 + i) * 20, -600); ctx.lineTo(M.cam.x + i * 60, NF.FLOOR + 300); ctx.stroke(); }
      ctx.translate(c.def.x, c.def.y - 140); ctx.rotate(t * .02);
      for (let r = 120; r < 700; r += 120) { ctx.globalAlpha = c.dim * (.5 - r / 1600); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
      ctx.restore();
    },
    drawWorld(ctx, M, t, c) {
      if (c.portals) for (const p of c.portals) {
        const k = Math.min(1, p.t / 6) * (p.t > 18 ? (24 - p.t) / 6 : 1);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 60 * k, 22 * k, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#ff2a4a'; ctx.lineWidth = 5; ctx.shadowColor = '#ff2a4a'; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore();
        if (p.strike) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ff3a5a'; ctx.lineWidth = 14 * p.strike / 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.def.x, c.def.y - 120); ctx.stroke(); ctx.restore(); }
      }
      if (c.boom > 0 && c.boom < 1) { const x = c.def.x, y = NF.FLOOR - 120, r = 100 + c.boom * 760; ctx.save(); ctx.globalAlpha = 1 - c.boom; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#000'); g.addColorStop(.45, 'rgba(20,0,8,.95)'); g.addColorStop(.75, 'rgba(255,20,60,.8)'); g.addColorStop(1, 'rgba(120,0,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
    },
  };

  const SPECS = { devil: hell, warrior: rage, girl: storm, chaos: chaosU, shadow: dim };
  return { start(M, att, def) { return base(M, att, def, SPECS[att.def.id]); }, SPECS };
})();
