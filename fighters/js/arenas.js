/* Three living arenas, drawn in world space with parallax. */
'use strict';
NF.arenas = (() => {
  const F = () => NF.FLOOR;
  // helper: layer with parallax p (0 = fixed to camera, 1 = world)
  function layer(ctx, cam, p, fn) { ctx.save(); ctx.translate(cam.x * (1 - p), cam.y * (1 - p) * .3); fn(); ctx.restore(); }
  function sky(ctx, cam, top, mid, bot) {
    const x0 = cam.x - 1400, w = 2800, y0 = cam.y - 900;
    const g = ctx.createLinearGradient(0, y0, 0, F() + 60); g.addColorStop(0, top); g.addColorStop(.6, mid); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, F() + 400 - y0);
  }
  const rnd = NF.hash;

  /* ================= 1. THE INFERNO ================= */
  const inferno = {
    id: 'inferno', name: 'THE INFERNO', he: 'התופת', thumb: ['#2a0303', '#ff4a10'],
    back(ctx, cam, t, fx) {
      sky(ctx, cam, '#050102', '#2a0605', '#7a1a08');
      // distant volcanoes
      layer(ctx, cam, .12, () => {
        for (let i = -3; i <= 3; i++) {
          const x = i * 520 + 60, h = 260 + rnd(i + 9) * 160;
          ctx.beginPath(); ctx.moveTo(x - 360, F() - 60); ctx.lineTo(x - 50, F() - 60 - h); ctx.lineTo(x + 60, F() - 60 - h); ctx.lineTo(x + 380, F() - 60); ctx.closePath();
          ctx.fillStyle = '#1a0606'; ctx.fill();
          // lava streak
          ctx.strokeStyle = `rgba(255,${80 + Math.sin(t * .05 + i) * 40 | 0},20,.7)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, F() - 60 - h); ctx.quadraticCurveTo(x + 30, F() - 60 - h * .5, x - 20, F() - 70); ctx.stroke();
          // crater glow
          const g = ctx.createRadialGradient(x + 5, F() - 60 - h, 0, x + 5, F() - 60 - h, 120); g.addColorStop(0, 'rgba(255,120,30,.55)'); g.addColorStop(1, 'rgba(255,40,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 120, F() - 180 - h, 240, 240);
        }
      });
      // mid rock pillars
      layer(ctx, cam, .45, () => {
        for (let i = -5; i <= 5; i++) {
          const x = i * 300 + rnd(i) * 80, h = 140 + rnd(i + 3) * 160, w = 70 + rnd(i + 5) * 60;
          ctx.beginPath(); ctx.moveTo(x - w, F() - 20); ctx.lineTo(x - w * .6, F() - 20 - h); ctx.lineTo(x + w * .4, F() - 30 - h * .9); ctx.lineTo(x + w, F() - 20); ctx.closePath();
          ctx.fillStyle = '#120404'; ctx.fill(); ctx.strokeStyle = 'rgba(255,60,20,.35)'; ctx.lineWidth = 2; ctx.stroke();
        }
      });
      // lava river behind the floor
      layer(ctx, cam, .8, () => {
        const y = F() - 26;
        const g = ctx.createLinearGradient(0, y - 20, 0, y + 30); g.addColorStop(0, '#ffcf50'); g.addColorStop(.4, '#ff5a10'); g.addColorStop(1, '#7a0a00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cam.x - 1500, y + 40);
        for (let x = cam.x - 1500; x <= cam.x + 1500; x += 30) ctx.lineTo(x, y + Math.sin(x * .02 + t * .08) * 5);
        ctx.lineTo(cam.x + 1500, y + 40); ctx.fill();
      });
      if (t % 3 === 0) fx.embers(cam.x + NF.rand(-700, 700), F() - 20, 1);
      if (t % 40 === 0) fx.flame(cam.x + NF.rand(-600, 600), F() - 30, 4, 1.4);
    },
    floor(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, F(), 0, F() + 200); g.addColorStop(0, '#2a0b08'); g.addColorStop(1, '#070202');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 1500, F(), 3000, 400);
      ctx.save(); ctx.strokeStyle = `rgba(255,90,20,${.5 + Math.sin(t * .05) * .2})`; ctx.lineWidth = 3; ctx.shadowColor = '#ff3000'; ctx.shadowBlur = 10;
      for (let i = -8; i <= 8; i++) { const x = i * 170 + rnd(i) * 60; ctx.beginPath(); ctx.moveTo(x, F() + 4); ctx.lineTo(x + 40, F() + 30); ctx.lineTo(x + 20, F() + 70); ctx.lineTo(x + 70, F() + 120); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#ff5a10'; ctx.fillRect(cam.x - 1500, F() - 2, 3000, 3);
    },
    front(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, F() - 300, 0, F() + 100); g.addColorStop(0, 'rgba(255,60,0,0)'); g.addColorStop(1, 'rgba(255,60,0,.10)');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 1500, F() - 300, 3000, 400);
    },
    light: 'rgba(255,90,30,.18)',
  };

  /* ================= 2. TRIBAL BATTLEGROUND ================= */
  const tribal = {
    id: 'tribal', name: 'TRIBAL BATTLEGROUND', he: 'מגרש השבט', thumb: ['#140406', '#d0141d'],
    back(ctx, cam, t, fx) {
      sky(ctx, cam, '#05060c', '#160a12', '#3a0c10');
      layer(ctx, cam, .05, () => {   // red moon
        const g = ctx.createRadialGradient(-260, 120, 0, -260, 120, 220); g.addColorStop(0, 'rgba(255,90,80,.9)'); g.addColorStop(.35, 'rgba(200,20,30,.6)'); g.addColorStop(1, 'rgba(120,0,10,0)');
        ctx.fillStyle = g; ctx.fillRect(-500, -120, 480, 480);
        ctx.fillStyle = '#e8303a'; ctx.beginPath(); ctx.arc(-260, 120, 70, 0, 7); ctx.fill();
        for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,220,220,${.3 + rnd(i) * .5})`; ctx.fillRect(-900 + rnd(i * 3) * 1800, -200 + rnd(i * 7) * 380, 2, 2); }
      });
      // forest silhouette
      layer(ctx, cam, .18, () => {
        ctx.fillStyle = '#0a0508'; ctx.beginPath(); ctx.moveTo(-1700, F() - 80);
        for (let x = -1700; x <= 1700; x += 40) ctx.lineTo(x, F() - 160 - rnd(x) * 120 - (Math.abs(x) % 120 < 40 ? 60 : 0));
        ctx.lineTo(1700, F() - 80); ctx.fill();
      });
      // giant flags on poles (waving)
      layer(ctx, cam, .4, () => {
        for (let i = -3; i <= 3; i++) {
          const x = i * 380, top = F() - 470;
          ctx.fillStyle = '#1a1214'; ctx.fillRect(x - 5, top, 10, 470);
          const col = i % 2 ? '#c8141c' : '#151012';
          ctx.beginPath(); ctx.moveTo(x + 5, top + 6);
          for (let k = 0; k <= 10; k++) { const fx2 = x + 5 + k * 22, fy = top + 6 + Math.sin(t * .07 + k * .6 + i) * 9 * k / 10; ctx.lineTo(fx2, fy); }
          for (let k = 10; k >= 0; k--) { const fx2 = x + 5 + k * 22, fy = top + 140 + Math.sin(t * .07 + k * .6 + i + .4) * 9 * k / 10 + (k === 10 ? -18 : 0); ctx.lineTo(fx2, fy); }
          ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
          if (NF.img.logo) { ctx.save(); ctx.globalAlpha = .9; ctx.translate(x + 115, top + 75 + Math.sin(t * .07 + 5 + i) * 6); ctx.drawImage(NF.img.logo, -48, -48, 96, 96); ctx.restore(); }
        }
      });
      // torches + crowd
      layer(ctx, cam, .65, () => {
        for (let i = -6; i <= 6; i++) {
          const x = i * 210 + 100, y = F() - 120;
          ctx.fillStyle = '#20140f'; ctx.fillRect(x - 4, y, 8, 100);
          for (let k = 0; k < 3; k++) { const r = 14 - k * 4, fl = Math.sin(t * .3 + i + k) * 3; ctx.beginPath(); ctx.ellipse(x + fl, y - 8 - k * 6, r * .7, r * 1.3, 0, 0, 7); ctx.fillStyle = ['#ff4010', '#ff9a20', '#ffe080'][k]; ctx.fill(); }
          const g = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 120); g.addColorStop(0, 'rgba(255,120,40,.25)'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 130, 240, 240);
        }
        for (let i = 0; i < 70; i++) {   // crowd
          const x = -1500 + i * 44 + rnd(i) * 20, h = 70 + rnd(i + 1) * 30, b = Math.abs(Math.sin(t * .12 + i)) * (6 + rnd(i) * 6);
          ctx.fillStyle = i % 3 ? '#140b0d' : '#1d0e10';
          ctx.beginPath(); ctx.ellipse(x, F() - 36 - h - b, 13, 14, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - 22, F() - 20); ctx.lineTo(x - 16, F() - 30 - h - b); ctx.lineTo(x + 16, F() - 30 - h - b); ctx.lineTo(x + 22, F() - 20); ctx.fill();
          if (i % 5 === 0) { ctx.strokeStyle = '#140b0d'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 12, F() - 20 - h - b); ctx.lineTo(x + 26, F() - 70 - h - b - Math.sin(t * .2 + i) * 8); ctx.stroke(); }
        }
      });
      if (t % 4 === 0) fx.embers(cam.x + NF.rand(-700, 700), F() - 100, 1, '#ff9a40');
    },
    floor(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, F(), 0, F() + 200); g.addColorStop(0, '#3a2018'); g.addColorStop(1, '#0c0605');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 1500, F(), 3000, 400);
      ctx.save(); ctx.strokeStyle = 'rgba(255,230,210,.25)'; ctx.lineWidth = 5; ctx.setLineDash([26, 18]);
      ctx.beginPath(); ctx.ellipse(0, F() + 40, 520, 50, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      ctx.fillStyle = 'rgba(200,20,30,.8)'; ctx.fillRect(cam.x - 1500, F() - 2, 3000, 3);
    },
    front(ctx, cam, t) { },
    light: 'rgba(255,120,60,.12)',
  };

  /* ================= 3. SHADOW TEMPLE ================= */
  const temple = {
    id: 'temple', name: 'THE SHADOW TEMPLE', he: 'מקדש הצל', thumb: ['#06040a', '#9a1030'],
    back(ctx, cam, t, fx) {
      sky(ctx, cam, '#020104', '#0d0610', '#1c0810');
      layer(ctx, cam, .1, () => {   // huge ring rune in the sky
        ctx.save(); ctx.translate(120, 120); ctx.rotate(t * .002);
        ctx.strokeStyle = `rgba(220,20,50,${.25 + Math.sin(t * .03) * .1})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 210, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 170, 0, 7); ctx.stroke();
        for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(176, -8); ctx.lineTo(204, 0); ctx.lineTo(176, 8); ctx.stroke(); }
        ctx.restore();
      });
      // ruins
      layer(ctx, cam, .35, () => {
        for (let i = -4; i <= 4; i++) {
          const x = i * 330, h = 360 + rnd(i + 2) * 120, broken = rnd(i + 11) > .5;
          ctx.fillStyle = '#0e080c'; ctx.fillRect(x - 40, F() - 40 - h, 80, h);
          ctx.fillRect(x - 56, F() - 60 - h, 112, 24);
          if (broken) { ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(x - 56, F() - 60 - h); ctx.lineTo(x + 10, F() - 90 - h); ctx.lineTo(x + 56, F() - 36 - h); ctx.fill(); }
          // glowing runes
          const a = .45 + Math.sin(t * .05 + i * 1.7) * .35;
          ctx.save(); ctx.shadowColor = '#ff1a3a'; ctx.shadowBlur = 16; ctx.strokeStyle = `rgba(255,30,60,${a})`; ctx.lineWidth = 3;
          for (let k = 0; k < 3; k++) { const ry = F() - 120 - h * .25 - k * 80; ctx.beginPath(); ctx.moveTo(x - 14, ry); ctx.lineTo(x, ry - 18); ctx.lineTo(x + 14, ry); ctx.moveTo(x, ry - 18); ctx.lineTo(x, ry + 14); ctx.stroke(); }
          ctx.restore();
        }
        // arch
        ctx.strokeStyle = '#0a060a'; ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(0, F() - 40, 300, Math.PI, 0); ctx.stroke();
      });
      // moving shadow figures
      layer(ctx, cam, .55, () => {
        for (let i = 0; i < 4; i++) {
          const x = ((t * (0.6 + i * .2) + i * 600) % 2600) - 1300, y = F() - 60;
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(x, y - 80, 30, 90, 0, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(255,40,60,.6)'; ctx.fillRect(x + 6, y - 140, 8, 3); ctx.fillRect(x - 12, y - 140, 8, 3);
        }
      });
      if (t % 2 === 0) fx.add({ t: 'ember', x: cam.x + NF.rand(-700, 700), y: F() - NF.rand(0, 400), vx: NF.rand(-.3, .3), vy: NF.rand(-.8, -.2), life: 80, max: 80, col: NF.pick(['#ff2a4a', '#a01030', '#ff6a80']), r: NF.rand(1, 2.6) });
    },
    floor(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, F(), 0, F() + 200); g.addColorStop(0, '#1a0e14'); g.addColorStop(1, '#030103');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 1500, F(), 3000, 400);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * 120, F()); ctx.lineTo(i * 220, F() + 300); ctx.stroke(); }
      ctx.save(); ctx.globalAlpha = .4 + Math.sin(t * .04) * .2; ctx.strokeStyle = '#d01a3a'; ctx.lineWidth = 3; ctx.shadowColor = '#ff1a3a'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(0, F() + 50, 300, 34, 0, 0, 7); ctx.stroke(); ctx.restore();
    },
    front(ctx, cam, t) {   // drifting fog
      for (let i = 0; i < 6; i++) {
        const x = ((t * .6 + i * 520) % 3000) - 1500 + cam.x * .2, y = F() - 20 + Math.sin(t * .01 + i) * 10;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 300); g.addColorStop(0, 'rgba(120,90,120,.16)'); g.addColorStop(1, 'rgba(60,40,60,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 300, y - 200, 600, 400);
      }
    },
    light: 'rgba(200,20,60,.14)',
  };

  return { LIST: [inferno, tribal, temple], byId: { inferno, tribal, temple } };
})();
