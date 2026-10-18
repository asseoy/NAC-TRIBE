/* AI-animated sprite sets (Wan 2.2 video -> frames -> atlas). When a character has a complete set,
   it is drawn from the atlas instead of the vector rig. The rig still runs underneath for hitboxes. */
'use strict';
NF.spr = {};
NF.sprites = {
  NEED: ['idle', 'L', 'H'],                      // minimum set before a character switches to sprites
  READY: false,                                  // flipped to true when the atlases are uploaded (avoids 404s before that)
  load(ids) {
    if (!this.READY && !/[?&]spr=1/.test(location.search)) return Promise.resolve();
    return Promise.all(ids.map(id => fetch(`assets/spr/${id}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(meta => {
      if (!meta || !this.NEED.every(a => meta.anims[a])) return;
      return new Promise(res => { const im = new Image(); im.onload = () => { NF.spr[id] = { meta, im }; res(); }; im.onerror = res; im.src = `assets/spr/${id}.webp`; });
    }).catch(() => null))).then(() => { if (!ids.every(id => NF.spr[id])) NF.spr = {}; });   // all five or none (no mixed art styles)
  },
  /* pick animation + frame for the fighter's current state */
  frame(f, S) {
    const A = S.meta.anims, m = f.move, n = a => A[a].f.length;
    const loop = (a, fps) => [a, Math.floor(f.t * fps / 60) % n(a)];
    const prog = (a, k) => [a, Math.min(n(a) - 1, Math.max(0, Math.floor(k * n(a))))];
    switch (f.state) {
      case 'attack': {
        if (!m) return loop('idle', 10);
        const a = m.kind === 'special' || m.kind === 'ult' ? (A.S ? 'S' : 'H') : /H/.test(m.id) ? 'H' : 'L';
        const pk = A[a].peak ?? Math.floor(n(a) / 2), A0 = m.start, A1 = A0 + m.active, END = A1 + m.rec, t = f.mt;
        let i;
        if (t < A0) i = Math.floor(pk * t / A0);
        else if (t < A1) i = pk;
        else i = pk + Math.floor((n(a) - 1 - pk) * Math.min(1, (t - A1) / Math.max(1, END - A1)));
        return [a, i];
      }
      case 'hurt': case 'block': return A.hurt ? prog('hurt', Math.min(.5, f.st / 24)) : ['idle', 0];
      case 'fall': return A.ko ? prog('ko', Math.min(.6, f.st / 30)) : ['idle', 0];
      case 'down': case 'lose': return A.ko ? ['ko', n('ko') - 1] : ['idle', 0];
      case 'rise': return A.ko ? prog('ko', 1 - f.st / 16) : loop('idle', 10);
      case 'intro': return A.intro ? prog('intro', Math.min(1, f.st / 100)) : loop('idle', 10);
      case 'win': return A.intro ? ['intro', 0] : loop('idle', 10);
      case 'walk': return loop('idle', 16);
      default: return loop('idle', 10);
    }
  },
  /* draw in fighter-local space (origin at the feet, +x = facing direction) */
  draw(ctx, f, S, forced) {
    const [a, i] = forced || this.frame(f, S), r = S.meta.anims[a].f[i] || S.meta.anims[a].f[0];
    const k = (f.def.sprH || 330) * f.sc / 1.2 / S.meta.h;     // scale atlas pixels -> world units
    let sy = 1, rot = 0, dy = 0;
    if (f.state === 'crouch' || (f.state === 'block' && f.blockCrouch) || (f.move && f.move.crouch)) sy = .78;
    if (f.state === 'jump' || (f.air && f.state === 'attack')) { rot = NF.clamp(f.vy * .012, -.25, .25); }
    if (f.state === 'walk') dy = -Math.abs(Math.sin(f.t * .25)) * 6;
    const A = S.meta.anims;   // fallbacks until the hurt / ko clips exist: lean back, lie down
    if (!A.hurt && (f.state === 'hurt' || (f.state === 'block' && !f.blockCrouch))) rot = f.state === 'hurt' ? -.22 : -.08;
    if (!A.ko && (f.state === 'fall' || f.state === 'down' || f.state === 'lose' || f.state === 'rise')) {
      const k2 = f.state === 'fall' ? Math.min(1, f.st / 20) : f.state === 'rise' ? 1 - f.st / 16 : 1;
      rot = -1.45 * k2; dy = 0;
      ctx.save(); ctx.translate(-60 * k2, -40 * k2); ctx.rotate(rot); ctx.scale(k, k);
      ctx.drawImage(S.im, r[0], r[1], r[2], r[3], r[4], r[5], r[2], r[3]); ctx.restore(); return;
    }
    ctx.save();
    ctx.translate(0, dy); if (rot) { ctx.translate(0, -150); ctx.rotate(rot); ctx.translate(0, 150); }
    ctx.scale(k, k * sy);
    ctx.drawImage(S.im, r[0], r[1], r[2], r[3], r[4], r[5], r[2], r[3]);
    ctx.restore();
  },
};
