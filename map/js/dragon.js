// The tribe dragon: lashed poles + rope + red sail-cloth, fully procedural animation.
// Spine: rigid chest, a neck that bends into turns, a tail that trails (verlet chain).
// Wings: pole spars (arm, forearm, 4 fingers) + cloth membranes rebuilt every frame from the bones.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }

export function createDragon(G, opts = {}) {
  const S = G.scene;
  // ---------- materials ----------
  const woodTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#a98250'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(60,35,15,${0.1 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 2; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.7, x + 2, h); g.stroke(); } });
  const ropeTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#cdb27e'; g.fillRect(0, 0, w, h); for (let y = -32; y < h + 32; y += 8) { g.strokeStyle = 'rgba(90,65,30,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 16); g.stroke(); } });
  const clothTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = opts.cloth || '#b3171f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x, 0, 1, h); }
    g.strokeStyle = 'rgba(60,0,0,.5)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }   // stitched panels
    g.fillStyle = opts.hem || 'rgba(243,224,59,.9)'; for (let x = 0; x < w; x += 16) g.fillRect(x, h - 8, 8, 8);   // hem
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
  const rope = new THREE.MeshStandardMaterial({ map: ropeTex, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.85, side: THREE.DoubleSide });
  const plate = new THREE.MeshStandardMaterial({ color: opts.plate || 0x8e1219, roughness: 0.6, metalness: 0.1, flatShading: true });
  const eyeM = new THREE.MeshStandardMaterial({ color: opts.eye || 0xffd23a, emissive: opts.eye || 0xffb000, emissiveIntensity: 3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a0d08, roughness: 0.6 });

  const root = new THREE.Group(); S.add(root);           // world transform from the flight model (at the chest)
  const D = { root, wings: {}, t: 0, flap: 0, flapSpeed: 0, pose: { glide: 1, fold: 0, brake: 0, boost: 0 }, jaw: 0, breath: 0 };

  // ---------- spine ----------
  // points in dragon-local space (z forward). neck: chest -> head, tail: chest back -> tip
  const NECK = 7, TAIL = 13, segLen = n => 0.75;
  const neckPts = [...Array(NECK + 1)].map((_, i) => new THREE.Vector3(0, 0.35 + i * 0.12, 1.4 + i * 0.72));
  const tailW = [...Array(TAIL + 1)].map(() => new THREE.Vector3());   // world space (verlet)
  const tailP = [...Array(TAIL + 1)].map(() => new THREE.Vector3());
  const tailLen = i => 0.95 - i * 0.035;
  // segment visual: 4 longitudinal poles + rope ring + cloth saddle + back plate, scaled by radius
  const pole = (r, len) => { const g = new THREE.CylinderGeometry(r, r, len, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); return g; };
  function segment(radius) {
    const g = new THREE.Group();
    for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const m = new THREE.Mesh(pole(radius * 0.12, 1), wood); m.position.set(x * radius * 0.7, y * radius * 0.6, 0); m.castShadow = true; g.add(m); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, radius * 0.1, 5, 12), rope); g.add(ring);
    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 1, 10, 1, true, -Math.PI * 0.62, Math.PI * 1.24), cloth); saddle.rotation.x = Math.PI / 2; saddle.position.z = 0.5; saddle.castShadow = true; g.add(saddle);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.32, radius * 0.9, 4), plate); fin.position.set(0, radius * 1.15, 0.45); fin.scale.set(0.4, 1, 1); g.add(fin);
    g.userData.r = radius;
    S.add(g); return g;
  }
  const neckSegs = [...Array(NECK)].map((_, i) => segment(0.55 - i * 0.035));
  const tailSegs = [...Array(TAIL)].map((_, i) => segment(0.62 - i * 0.042));

  // chest: a rigid barrel of poles + cloth, hips behind
  const chest = new THREE.Group(); root.add(chest);
  for (let i = 0; i < 4; i++) { const s = new THREE.Group(); const r = [0.72, 0.85, 0.85, 0.72][i]; for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [1.15, 0], [-1.15, 0]]) { const m = new THREE.Mesh(pole(0.08, 0.85), wood); m.position.set(x * r * 0.7, y * r * 0.62, 0); m.castShadow = true; s.add(m); }
    s.add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.07, 5, 14), rope)); const sk = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.85, 12, 1, true, -Math.PI * 0.7, Math.PI * 1.4), cloth); sk.rotation.x = Math.PI / 2; sk.position.z = 0.42; sk.castShadow = true; s.add(sk);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 4), plate); fin.position.set(0, r * 1.15, 0.4); fin.scale.set(0.4, 1, 1); s.add(fin);
    s.position.z = 1.4 - (i + 1) * 0.85; chest.add(s); }
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 2.4, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.9 })); belly.rotation.x = Math.PI / 2; belly.position.set(0, -0.2, -0.3); belly.scale.set(1, 0.85, 1); chest.add(belly);

  // ---------- head ----------
  const head = new THREE.Group(); head.scale.setScalar(1.35); S.add(head);
  const skullG = new THREE.ConeGeometry(0.62, 2.0, 6, 3); skullG.rotateX(Math.PI / 2); skullG.translate(0, 0, 0.65);
  { const pa = skullG.attributes.position; for (let i = 0; i < pa.count; i++) { const z = pa.getZ(i); pa.setY(i, pa.getY(i) * (z > 0.3 ? 0.62 : 1) + (z < 0 ? 0.1 : 0)); pa.setX(i, pa.getX(i) * 0.95); } skullG.computeVertexNormals(); }
  const skull = new THREE.Mesh(skullG, plate); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.22, -0.2); head.add(jaw);
  const jawM = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.75, 5, 1), plate); jawM.rotation.x = Math.PI / 2; jawM.position.z = 0.85; jawM.scale.set(1, 0.45, 1); jaw.add(jawM);
  const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 5, 1), new THREE.MeshStandardMaterial({ color: 0x3a0606, emissive: 0x600800, emissiveIntensity: 0.6 })); mouth.rotation.x = Math.PI / 2; mouth.position.set(0, 0.05, 0.85); mouth.scale.set(0.85, 0.3, 0.95); jaw.add(mouth);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), new THREE.MeshStandardMaterial({ color: 0xf1ead8 })); tooth.position.set(s * (0.28 - k * 0.04), 0.12, 0.4 + k * 0.28); jaw.add(tooth); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), eyeM); eye.position.set(s * 0.36, 0.22, 0.25); eye.scale.set(1, 0.7, 1.2); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.35), dark); brow.position.set(s * 0.36, 0.33, 0.25); brow.rotation.z = s * -0.35; head.add(brow);
    const horn = new THREE.Mesh(pole(0.07, 1.4), wood); horn.position.set(s * 0.32, 0.35, -0.25); horn.rotation.set(Math.PI * 0.85, s * 0.35, 0); head.add(horn);
    const hornR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 4, 8), rope); hornR.position.set(s * 0.32, 0.38, -0.2); hornR.rotation.y = Math.PI / 2; head.add(hornR);
    const nost = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), dark); nost.position.set(s * 0.12, 0.12, 1.55); head.add(nost);
  }
  const mouthLight = new THREE.PointLight(0xff7a20, 0, 18, 1.6); mouthLight.position.set(0, -0.1, 1.6); head.add(mouthLight);
  const eyeLight = new THREE.PointLight(0xffc040, 1.2, 6, 2); eyeLight.position.set(0, 0.3, 0.8); head.add(eyeLight);
  D.head = head; D.mouthLight = mouthLight;

  // ---------- tail banner with the tribe logo ----------
  let banner;
  { const t = canvasTex(256, 160, (g, w, h) => { g.fillStyle = opts.flagBg || '#f1efeb'; g.fillRect(0, 0, w, h); g.fillStyle = opts.flagStripe || '#a8121b'; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16); if (opts.flagText) { g.fillStyle = '#fff'; g.font = '700 54px Heebo, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(opts.flagText, w / 2, h / 2 + 4); } else if (G.logo) { const s = 110, hh = s * G.logo.height / G.logo.width; g.drawImage(G.logo, w / 2 - s / 2, h / 2 - hh / 2, s, hh); } });
    const bg = new THREE.PlaneGeometry(1.6, 1.0, 8, 4); bg.translate(0, 0, 0); banner = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 })); banner.castShadow = true; S.add(banner); banner.userData.base = Float32Array.from(bg.attributes.position.array); }

  // ---------- legs (tucked in flight, out when slow) ----------
  const legs = [];
  for (const [x, z, front] of [[0.6, 0.6, 1], [-0.6, 0.6, 1], [0.65, -1.9, 0], [-0.65, -1.9, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.45, z); chest.add(hip);
    const th = new THREE.Mesh(pole(0.09, 0.9), wood); th.rotation.x = Math.PI / 2; hip.add(th);
    const knee = new THREE.Group(); knee.position.set(0, -0.9, 0); hip.add(knee);
    const sh = new THREE.Mesh(pole(0.07, 0.8), wood); sh.rotation.x = Math.PI / 2; knee.add(sh);
    const foot = new THREE.Group(); foot.position.y = -0.8; knee.add(foot);
    for (const c of [-0.12, 0, 0.12]) { const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), dark); claw.rotation.x = Math.PI / 2; claw.position.set(c, 0, 0.15); foot.add(claw); }
    legs.push({ hip, knee, front });
  }

  // ---------- wings ----------
  // bones in chest-local space. Each wing: shoulder -> elbow -> wrist -> 4 finger tips; membrane between body line, arm and fingers.
  function makeWing(side) {
    const W = { side, spars: [], rings: [] };
    const sparMat = wood;
    const mk = (r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 1, 6), sparMat); m.castShadow = true; S.add(m); return m; };
    W.upper = mk(0.12); W.fore = mk(0.1); W.fingers = [mk(0.07), mk(0.065), mk(0.06), mk(0.055)];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 4, 10), rope); S.add(r); W.rings.push(r); }
    // membrane: 4 panels (body-edge->finger1, finger1->2, 2->3, 3->4), each a grid NU x NV
    const NU = 6, NV = 5, panels = 4, verts = panels * (NU + 1) * (NV + 1);
    const pos = new Float32Array(verts * 3), uv = new Float32Array(verts * 2), idx = [];
    for (let p = 0; p < panels; p++) for (let v = 0; v <= NV; v++) for (let u = 0; u <= NU; u++) {
      const i = p * (NU + 1) * (NV + 1) + v * (NU + 1) + u; uv[i * 2] = (p + u / NU) / panels * 2; uv[i * 2 + 1] = v / NV;
      if (u < NU && v < NV) { const a = i, b = i + 1, c = i + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    W.mesh = new THREE.Mesh(geo, cloth); W.mesh.castShadow = true; W.mesh.frustumCulled = false; S.add(W.mesh);
    W.NU = NU; W.NV = NV; W.panels = panels;
    W.j = { sh: new THREE.Vector3(), el: new THREE.Vector3(), wr: new THREE.Vector3(), tips: [0, 1, 2, 3].map(() => new THREE.Vector3()), hip: new THREE.Vector3(), mid: new THREE.Vector3() };
    return W;
  }
  D.wings.L = makeWing(1); D.wings.R = makeWing(-1);

  // ---------- per-frame helpers ----------
  const m4 = new THREE.Matrix4(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), e1 = new THREE.Euler();
  const toW = (v, out) => out.copy(v).applyMatrix4(root.matrixWorld);
  function placeBetween(mesh, a, b) { v1.subVectors(b, a); const len = v1.length() || 1e-4; mesh.position.addVectors(a, b).multiplyScalar(0.5); mesh.scale.set(1, len, 1); mesh.quaternion.setFromUnitVectors(UP, v1.divideScalar(len)); }
  function orientSeg(seg, a, b, upHint) { v1.subVectors(b, a); const len = v1.length() || 1e-4; seg.position.copy(a); m4.lookAt(b, a, upHint); seg.quaternion.setFromRotationMatrix(m4); seg.scale.set(1, 1, len); }
  const rot = (v, ax, ang) => v.applyAxisAngle(ax, ang);

  // wing pose in chest-local coordinates (side = +1 left, -1 right)
  function wingBones(W, t) {
    const s = W.side, P = D.pose;
    const ph = D.flap, flapAmp = 1 - P.glide * 0.85 - P.fold * 0.9;
    // downstroke when sin>0: shoulder angle (rotation about z axis, positive = up)
    const stroke = Math.sin(ph), up = Math.cos(ph);
    const shoulderUp = (0.15 + stroke * 0.95 * flapAmp) * (1 - P.fold * 0.4) + P.glide * 0.12 + P.brake * 0.5;
    const sweep = P.fold * 1.25 - P.brake * 0.55 + Math.max(0, -up) * 0.25 * flapAmp;         // back-sweep about y
    const elbowFold = 0.25 + P.fold * 1.6 + Math.max(0, up) * 0.75 * flapAmp - P.brake * 0.1;   // fold on the upstroke
    const wristFold = 0.2 + P.fold * 1.4 + Math.max(0, up) * 0.6 * flapAmp;
    const J = W.j, ax = new THREE.Vector3(0, 0, 1), ay = new THREE.Vector3(0, 1, 0);
    J.sh.set(s * 0.85, 0.55, 0.65);
    // upper arm points outward (+x for left)
    v2.set(s * 2.3, 0, 0); rot(v2, ax, s * shoulderUp); rot(v2, ay, s * sweep); J.el.copy(J.sh).add(v2);
    v3.set(s * 2.9, 0, 0); rot(v3, ay, s * (elbowFold * 0.9)); rot(v3, ax, s * (shoulderUp * 0.6 - 0.1)); rot(v3, ay, s * sweep * 0.6); J.wr.copy(J.el).add(v3);
    // fingers fan backward from the wrist
    const fanBase = [0.15, 0.6, 1.05, 1.5], lens = [4.6, 4.3, 3.7, 3.0];
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Vector3(s * lens[k], 0, 0); rot(f, ay, s * (fanBase[k] * (1 - P.fold * 0.55) + wristFold * 0.55 + sweep * 0.5)); rot(f, ax, s * (shoulderUp * 0.35 - 0.05 * k + Math.sin(ph - 0.6 - k * 0.15) * 0.18 * flapAmp));
      J.tips[k].copy(J.wr).add(f);
    }
    J.hip.set(s * 0.6, 0.35, -2.6); J.mid.set(s * 0.75, 0.45, -1.0);
  }
  function wingWorld(W, t) {
    wingBones(W, t);
    const J = W.j, w = {}; for (const k of ['sh', 'el', 'wr', 'hip', 'mid']) w[k] = toW(J[k], new THREE.Vector3()); w.tips = J.tips.map(p => toW(p, new THREE.Vector3()));
    placeBetween(W.upper, w.sh, w.el); placeBetween(W.fore, w.el, w.wr); W.fingers.forEach((m, k) => placeBetween(m, w.wr, w.tips[k]));
    W.rings[0].position.copy(w.sh); W.rings[1].position.copy(w.el); W.rings[2].position.copy(w.wr); W.rings.forEach(r => r.quaternion.copy(root.quaternion));
    // membrane panels: [edge A, edge B] lines from the wrist outward, with the trailing edge sagging/billowing
    const A = [[w.hip, w.mid, w.sh, w.el, w.wr], null], pos = W.mesh.geometry.attributes.position.array, NU = W.NU, NV = W.NV;
    const edges = [[w.hip, w.tips[3]], [w.tips[3], w.tips[2]], [w.tips[2], w.tips[1]], [w.tips[1], w.tips[0]]];
    const lead = [w.mid, w.wr, w.wr, w.wr];
    const air = new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion), billow = 0.25 + D.pose.boost * 0.2;
    for (let p = 0; p < 4; p++) {
      const [ea, eb] = edges[p];
      for (let v = 0; v <= NV; v++) for (let u = 0; u <= NU; u++) {
        const fu = u / NU, fv = v / NV;
        // panel: v=0 along the arm/wrist (leading), v=1 along the trailing edge between finger tips
        let base;
        if (p === 0) { const a = v1.copy(w.mid).lerp(w.wr, fu), b = v2.copy(ea).lerp(eb, fu); base = v3.copy(a).lerp(b, fv); }
        else { const b = v2.copy(ea).lerp(eb, fu); base = v3.copy(w.wr).lerp(b, fv); }
        const sag = Math.sin(fu * Math.PI) * Math.sin(fv * Math.PI) * billow * (p === 0 ? 1.4 : 1) + Math.sin(D.t * 9 + fu * 6 + p) * 0.04 * fv;
        base.addScaledVector(air, sag * (0.8 + Math.sin(D.flap) * 0.6));
        const i = (p * (NU + 1) * (NV + 1) + v * (NU + 1) + u) * 3; pos[i] = base.x; pos[i + 1] = base.y; pos[i + 2] = base.z;
      }
    }
    W.mesh.geometry.attributes.position.needsUpdate = true; W.mesh.geometry.computeVertexNormals();
  }

  // ---------- update ----------
  let tailInit = false;
  D.update = (dt, F) => {
    // F: flight state { turn (rad/s yaw rate), climb (-1..1), speed, boost, brake, flapRate, breath }
    D.t += dt;
    const P = D.pose;
    const tg = { glide: F.flapRate < 0.2 ? 1 : 0, fold: F.dive, brake: F.brake, boost: F.boost };
    for (const k in tg) P[k] += (tg[k] - P[k]) * (1 - Math.exp(-6 * dt));
    D.flapSpeed += ((F.flapRate > 0.2 ? 5.5 + F.flapRate * 4 + F.boost * 4 : 1.2) - D.flapSpeed) * (1 - Math.exp(-4 * dt));
    D.flap += D.flapSpeed * dt;
    // body bob from flapping (the downstroke lifts)
    const bob = Math.sin(D.flap - 0.5) * 0.18 * (1 - P.glide * 0.8);
    chest.position.y = bob; chest.rotation.x = -Math.cos(D.flap) * 0.04 * (1 - P.glide);
    root.updateMatrixWorld(true);

    // neck: from chest front curving toward the turn/climb, head leads
    const turn = Math.max(-1.5, Math.min(1.5, F.turn)), climb = F.climb;
    for (let i = 0; i <= NECK; i++) {
      const f = i / NECK, bend = f * f;
      neckPts[i].set(turn * 0.9 * bend + Math.sin(D.t * 1.7 + i * 0.5) * 0.04, 0.4 + bob * (1 - f) + i * 0.13 + climb * 0.8 * bend - P.fold * 0.35 * bend, 1.45 + i * 0.66 - Math.abs(turn) * 0.25 * bend);
    }
    const nW = neckPts.map(p => toW(p, new THREE.Vector3()));
    const upW = new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion);
    neckSegs.forEach((s, i) => orientSeg(s, nW[i], nW[i + 1], upW));
    // head at the end of the neck, looking a bit further into the turn; jaw opens to breathe
    head.position.copy(nW[NECK]);
    v1.subVectors(nW[NECK], nW[NECK - 1]).normalize();
    m4.lookAt(v2.copy(head.position).add(v1), head.position, upW); head.quaternion.setFromRotationMatrix(m4);
    q1.setFromAxisAngle(upW, turn * 0.15); head.quaternion.premultiply(q1);
    D.jaw += ((F.breath ? 0.55 : 0.05 + Math.max(0, Math.sin(D.t * 0.7)) * 0.04) - D.jaw) * (1 - Math.exp(-14 * dt)); jaw.rotation.x = D.jaw;
    mouthLight.intensity = F.breath ? 6 + Math.random() * 4 : 0;
    eyeM.emissiveIntensity = 2.5 + Math.sin(D.t * 3) * 0.5 + (F.breath ? 2 : 0);

    // tail: verlet chain trailing from the hips, with a lazy swim wave
    const base = toW(v1.set(0, 0.25 + bob, -2.75), new THREE.Vector3());
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(root.quaternion);
    if (!tailInit) { let p = base.clone(); for (let i = 0; i <= TAIL; i++) { tailW[i].copy(p); tailP[i].copy(p); p.addScaledVector(back, tailLen(i)); } tailInit = true; }
    tailW[0].copy(base); tailP[0].copy(base);
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion);
    for (let i = 1; i <= TAIL; i++) {
      const p = tailW[i], q = tailP[i]; const vx = (p.x - q.x) * 0.9, vy = (p.y - q.y) * 0.9, vz = (p.z - q.z) * 0.9; q.copy(p);
      p.x += vx; p.y += vy - 3 * dt * dt; p.z += vz;
      // spring toward straight-behind + swim wave
      const f = i / TAIL; v2.copy(tailW[i - 1]).addScaledVector(back, tailLen(i - 1)).addScaledVector(side, Math.sin(D.t * 2.2 - i * 0.55) * 0.12 * f).addScaledVector(upW, Math.sin(D.t * 1.6 - i * 0.4) * 0.05 * f);
      p.lerp(v2, 0.12 + (1 - f) * 0.25);
    }
    for (let it = 0; it < 3; it++) for (let i = 1; i <= TAIL; i++) { const a = tailW[i - 1], b = tailW[i]; v1.subVectors(b, a); const d = v1.length() || 1e-4; b.copy(a).addScaledVector(v1, tailLen(i - 1) / d); }
    tailSegs.forEach((s, i) => orientSeg(s, tailW[i], tailW[i + 1], upW));
    // banner at the tip, fluttering
    const tip = tailW[TAIL], pre = tailW[TAIL - 1]; v1.subVectors(tip, pre).normalize();
    banner.position.copy(tip).addScaledVector(v1, 0.75); m4.lookAt(tip, pre, upW); banner.quaternion.setFromRotationMatrix(m4); banner.rotateY(Math.PI / 2);
    { const pa = banner.geometry.attributes.position, b = banner.userData.base; for (let i = 0; i < pa.count; i++) { const x = b[i * 3] + 0.8; pa.array[i * 3 + 2] = Math.sin(x * 4 - D.t * 12) * 0.12 * x; } pa.needsUpdate = true; }

    // legs: tucked when fast, reaching down when slow/braking
    const out = Math.max(P.brake, 1 - Math.min(1, F.speed / 14));
    for (const L of legs) { L.hip.rotation.x = -1.2 * (1 - out) + (L.front ? -0.2 : 0.3) * out; L.knee.rotation.x = 1.4 * (1 - out) + (L.front ? 0.6 : -0.5) * out + Math.sin(D.t * 3 + L.hip.position.x) * 0.05; }

    wingWorld(D.wings.L, D.t); wingWorld(D.wings.R, D.t);
    D.mouthWorld = toW(v1.set(0, 0, 0), new THREE.Vector3()); head.localToWorld(D.mouthWorld.set(0, -0.1, 1.7));
    D.headFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(head.quaternion);
    D.wingTipL = D.wings.L.mesh && new THREE.Vector3(); D.wingTipR = new THREE.Vector3();
  };
  if (!opts.npc) G.dragon = D;
  return D;
}
