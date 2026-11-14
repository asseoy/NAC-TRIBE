// The gates: one lashed-pole gate per tribe game, standing where the game happens, each with its own landmark.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geo } from './land.js';

export const GAMES = [
  { id: 'snapir', title: 'סנפיר', genre: 'הרפתקה בים', img: 'snapir', url: 'https://asseoy.github.io/snapir/', lat: 32.45, lon: 34.835, alt: 16, yaw: -1.2, place: 'חדרה', desc: 'כל חורף הכרישים באים למים החמים של תחנת הכוח. אתם כריש צעיר שהציל את רפסודת החניכים – ועכשיו כל הים מחכה לכם.', pc: true },
  { id: 'hamishlachat', title: 'האי של המשלחת', genre: 'הרפתקה וצלילה', img: 'mishlachat', url: 'https://asseoy.github.io/hamishlachat/', lat: 29.5, lon: 34.945, alt: 16, yaw: 0, place: 'אילת', desc: 'משלחת המחקר נעלמה. צוללים בשונית, אוספים פריטים, בונים ציוד ומגלים מה קרה לתמר.', pc: true },
  { id: 'hadrakon', title: 'הדרקון של הנשיא', genre: 'טיסה והרפתקה', img: 'hadrakon', url: 'https://asseoy.github.io/hadrakon/', lat: 32.72, lon: 35.06, alt: 14, yaw: 0.6, place: 'הכרמל', desc: 'בנינו דרקון מעמודים וחבלים, וברק החיה אותו. 8 מדורות, מרוץ נגד בית דני, סערה שחורה – ופרק חורף עם החנוכיון.', pc: true },
  { id: 'olam', title: 'עולם השבט', genre: 'בנייה ועולם פתוח', img: 'olam', url: 'https://asseoy.github.io/olam-hashevet/', lat: 33.24, lon: 35.7, alt: 18, yaw: 2.6, place: 'מתחת לחרמון', desc: 'עולם קוביות משלנו: נגב, גליל, חרמון וים. בונים מחנה מעמודים וחבלים – לבד או עם חברים אונליין.', pc: true },
  { id: 'chamshush', title: 'חמשוש', genre: 'עולם פתוח', img: 'chamshush', url: 'https://asseoy.github.io/chamshush/', lat: 31.97, lon: 34.9, alt: 13, yaw: -0.4, place: 'השכונה', desc: 'אתם החמשוש, והשביעסט לא מפסיק להתקשר. רוכבים בשכונה, מביאים טוסט, עושים משימות – אפשר גם עם חבר.', pc: true },
  { id: 'hamigdal', title: 'המגדל', genre: 'פרקור', img: 'migdal', url: 'https://asseoy.github.io/hamigdal/', lat: 31.62, lon: 34.98, alt: 13, yaw: 0.2, place: 'השפלה', desc: '50 קומות של עמודים, חבלים וקשירות. ריצה על קירות, סלטות ונדנוד על חבלים עד הפסגה.', pc: true },
  { id: 'halayla67', title: 'הלילה של ה־67', genre: 'משחק אימה', img: 'halayla67', url: 'https://asseoy.github.io/halayla67/', lat: 30.6, lon: 34.82, alt: 14, yaw: 1.0, place: 'מכתש רמון', desc: 'לילה בטיול חנוכה בדרום. יצאתם שלושה לעשות פיפי, ומשהו מחכה בחושך. עם פנס בלבד.', pc: true },
];

export function createGates(G) {
  const S = G.scene, L = G.land, tl = new THREE.TextureLoader();
  const woodM = new THREE.MeshStandardMaterial({ color: 0xa98250, roughness: 0.85 }), ropeM = new THREE.MeshStandardMaterial({ color: 0xcdb27e, roughness: 1 });
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), up = V3(0, 1, 0);
  const pole = (a, b, r) => { const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 7); const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()); g.applyQuaternion(q); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; };
  const lash = p => { const g = new THREE.TorusGeometry(0.75, 0.2, 4, 10); g.rotateX(Math.PI / 2); g.translate(p.x, p.y, p.z); return g; };
  const gates = [];
  for (const gm of GAMES) {
    const c = geo(gm.lat, gm.lon), ground = Math.max(0, L.heightAt(c.x, c.z)); c.y = ground + gm.alt;
    const grp = new THREE.Group(); grp.position.copy(c); grp.rotation.y = gm.yaw; S.add(grp);
    // two A-frame towers reaching down to the ground (or the water), a crossbar, a rope ring in the opening
    const P = [], R = [], foot = -gm.alt - 2, w = 13, top = 14;
    for (const sx of [-1, 1]) { const a = V3(sx * w, top, 0); P.push(pole(V3(sx * (w + 3), foot, -4), a, 0.7), pole(V3(sx * (w + 3), foot, 4), a, 0.7), pole(V3(sx * (w - 2), foot, 0), a, 0.55), pole(V3(sx * (w + 3), foot * 0.5, -2.2), V3(sx * (w + 3), foot * 0.5, 2.2), 0.4)); R.push(lash(a)); }
    P.push(pole(V3(-w - 2, top, 0), V3(w + 2, top, 0), 0.65)); P.push(pole(V3(-w, top - 1, 0), V3(0, top + 6, 0), 0.4), pole(V3(w, top - 1, 0), V3(0, top + 6, 0), 0.4));
    const pm = new THREE.Mesh(mergeGeometries(P), woodM); pm.castShadow = true; grp.add(pm, new THREE.Mesh(mergeGeometries(R), ropeM));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.45, 8, 40), new THREE.MeshStandardMaterial({ color: 0xcdb27e, emissive: 0xf3c040, emissiveIntensity: 0.4, roughness: 0.8 })); ring.position.y = 2; grp.add(ring);
    // the game's card as a banner, both sides
    const tex = tl.load(`../assets/pc/${gm.img}.webp`); tex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(23, 13.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })); frame.position.y = top + 13; grp.add(frame);
    for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(22, 12.4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); b.position.set(0, top + 13, s * 0.32); if (s < 0) b.rotation.y = Math.PI; grp.add(b); }
    P.length = 0; for (const sx of [-1, 1]) P.push(pole(V3(sx * 10, top + 0.5, 0), V3(sx * 10, top + 6.5, 0), 0.25)); grp.add(new THREE.Mesh(mergeGeometries(P), woodM));
    // fire bowls on both towers
    const fires = [-1, 1].map(sx => { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1c })); bowl.position.set(sx * w, top + 0.9, 0); grp.add(bowl); return bowl; });
    const lab = L.label(gm.title, c.clone().add(V3(0, top + 24, 0)), { color: '#f3e03b', scale: 1.1, far: 900, big: true });
    const o = { gm, grp, c, ring, fires, lab, visited: false };
    landmark(o); gates.push(o);
  }

  // ---------- landmarks ----------
  function landmark(o) {
    const id = o.gm.id, c = o.c;
    if (id === 'snapir') {
      const shore = geo(32.445, 34.935); const bm = new THREE.MeshStandardMaterial({ color: 0xd9d6cf }), red = new THREE.MeshStandardMaterial({ color: 0xc23a2a }), wht = new THREE.MeshStandardMaterial({ color: 0xf2f0ea });
      for (let i = 0; i < 4; i++) { const x = shore.x + 3, z = shore.z - 6 + i * 4, h = L.heightAt(x, z); for (let s = 0; s < 4; s++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 6, 10), s >= 2 ? (s % 2 ? wht : red) : bm); m.position.set(x, h + 3 + s * 6, z); m.castShadow = true; S.add(m); } }
      const fin = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 1.4), V3(0, 0, -1.4), V3(0, 3.2, -1.8)]), new THREE.MeshStandardMaterial({ color: 0x5f7889, side: THREE.DoubleSide })); fin.geometry.computeVertexNormals(); S.add(fin);
      o.anim = (t) => { const a = t * 0.35; fin.position.set(c.x - 20 + Math.cos(a) * 14, 0.1, c.z + Math.sin(a) * 14); fin.rotation.y = -a; if (Math.random() < 0.3) G.fx.spray(fin.position); };
    }
    if (id === 'hamishlachat') {
      const cols = [0xff7a6a, 0xffc04a, 0xc06aff, 0x4ad0c8]; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 6 + (i % 5) * 4, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r * 1.6; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + (i % 3) * 0.5, 0), new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.25 })); m.position.set(x, -0.6, z); S.add(m); }
      const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 6), new THREE.MeshStandardMaterial({ color: 0xf2f0ea })); boat.add(hull); const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({ color: 0xd8262b, side: THREE.DoubleSide })); flag.position.set(0, 2.2, 0); boat.add(flag);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); stripe.position.set(0, 2.2, 0.01); stripe.rotation.z = -0.55; boat.add(stripe); boat.position.set(c.x + 18, 0.4, c.z + 10); S.add(boat);
      o.anim = (t) => { boat.position.y = 0.4 + Math.sin(t * 1.5) * 0.15; boat.rotation.z = Math.sin(t * 1.1) * 0.05; };
    }
    if (id === 'hadrakon') {
      const P = []; for (const z of [-5, 5]) P.push(pole(V3(-6, 0, z), V3(0, 9, z), 0.5), pole(V3(6, 0, z), V3(0, 9, z), 0.5)); P.push(pole(V3(0, 9, -6), V3(0, 9, 6), 0.45));
      const m = new THREE.Mesh(mergeGeometries(P), woodM); const base = c.clone().add(V3(-26, 0, 8)); base.y = L.heightAt(base.x, base.z); m.position.copy(base); S.add(m);
      o.beacon = base.clone().add(V3(0, 11, 0));
    }
    if (id === 'olam') {
      const cols = [0x6aa84a, 0x8a5a34, 0x9a9a9a, 0xe0d090, 0x4a7ab8]; const cubes = [];
      for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.9, flatShading: true })); const a = i / 22 * 6.28; m.userData = { a, r: 18 + (i % 4) * 5, y: (i % 6) * 3 - 6, s: 0.15 + (i % 3) * 0.08 }; S.add(m); cubes.push(m); }
      o.anim = (t) => cubes.forEach(m => { const u = m.userData, a = u.a + t * u.s; m.position.set(c.x + Math.cos(a) * u.r, c.y + u.y + Math.sin(t + u.a) * 1.5, c.z + Math.sin(a) * u.r); m.rotation.set(t * 0.4 + u.a, t * 0.3, 0); });
    }
    if (id === 'chamshush') {
      const hm = [0xe8dccb, 0xd8c4a8, 0xf0ece4], roofs = new THREE.MeshStandardMaterial({ color: 0xb8582a });
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, r = 22 + (i % 2) * 6, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, h = L.heightAt(x, z); const b = new THREE.Mesh(new THREE.BoxGeometry(4, 3 + (i % 3) * 2.5, 4), new THREE.MeshStandardMaterial({ color: hm[i % 3] })); b.position.set(x, h + b.geometry.parameters.height / 2, z); b.rotation.y = -a; b.castShadow = true; S.add(b); }
      const rider = new THREE.Group(); const bike = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 12), new THREE.MeshStandardMaterial({ color: 0x222222 })); const bike2 = bike.clone(); bike.position.z = 0.8; bike2.position.z = -0.8; bike.rotation.y = bike2.rotation.y = Math.PI / 2; const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 8), new THREE.MeshStandardMaterial({ color: 0xc8161f })); body.position.y = 1.4; const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd29f7a })); head.position.y = 2.2; rider.add(bike, bike2, body, head); rider.scale.setScalar(1.6); S.add(rider);
      o.anim = (t) => { const a = t * 0.5, x = c.x + Math.cos(a) * 15, z = c.z + Math.sin(a) * 15; rider.position.set(x, L.heightAt(x, z) + 1, z); rider.rotation.y = -a; };
    }
    if (id === 'hamigdal') {
      const P = [], base = c.clone().add(V3(24, 0, -6)); base.y = L.heightAt(base.x, base.z);
      for (let l = 0; l < 9; l++) { const y0 = l * 8, y1 = y0 + 8, hw = 4.5 - l * 0.25; const A = [[hw, hw], [-hw, hw], [-hw, -hw], [hw, -hw]].map(([a, b]) => V3(a, y0, b)), B = A.map(p => V3(p.x * 0.94, y1, p.z * 0.94)); for (let i = 0; i < 4; i++) { P.push(pole(A[i], B[i], 0.35), pole(B[i], B[(i + 1) % 4], 0.25), pole(A[i], B[(i + 1) % 4], 0.18)); } }
      const m = new THREE.Mesh(mergeGeometries(P), woodM); m.position.copy(base); m.castShadow = true; S.add(m);
      const plats = []; for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 3.2), new THREE.MeshStandardMaterial({ color: 0x2f4fa0 })); S.add(p); plats.push(p); }
      o.anim = (t) => plats.forEach((p, i) => { const a = i * 0.8 + t * 0.2; p.position.set(base.x + Math.cos(a) * 9, base.y + 6 + i * 8, base.z + Math.sin(a) * 9); });
    }
    if (id === 'halayla67') {
      // the crater is always night: a dark dome you fly into, and two eyes in the dark
      const dome = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 16), new THREE.MeshBasicMaterial({ color: 0x0a0814, transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false, fog: false })); dome.position.copy(c).add(V3(0, -6, 0)); S.add(dome);
      const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff6c0 }); const eyes = new THREE.Group(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), eyeM); e.position.x = s * 0.9; eyes.add(e); } const eb = c.clone().add(V3(-18, 0, 14)); eb.y = L.heightAt(eb.x, eb.z) + 5; eyes.position.copy(eb); S.add(eyes);
      const shape = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 5, 4, 8), new THREE.MeshBasicMaterial({ color: 0x050505 })); shape.position.copy(eb).add(V3(0, -3, -0.6)); S.add(shape);
      o.fire = c.clone().add(V3(14, 0, -8)); o.fire.y = L.heightAt(o.fire.x, o.fire.z) + 0.5;
      o.anim = (t) => { eyes.visible = Math.sin(t * 0.7) > -0.6 && (Math.floor(t * 3) % 17 !== 0); eyes.lookAt(G.camera.position); dome.material.opacity = 0.5 + Math.sin(t * 0.5) * 0.06; };
      o.dome = dome;
    }
  }

  const Gt = { gates };
  Gt.update = (dt, t) => {
    for (const o of gates) {
      o.ring.rotation.z += dt * 0.4; o.ring.material.emissiveIntensity = (o.visited ? 0.9 : 0.4) + Math.sin(t * 3 + o.c.x) * 0.15 + (G.night ? 0.6 : 0);
      if (G.cam && G.cam.distanceTo(o.c) < 650) { for (const f of o.fires) { const w = f.getWorldPosition(new THREE.Vector3()); G.fx.flame(w.add(V3(0, 0.6, 0)), 0.55, dt); } if (o.beacon) G.fx.flame(o.beacon, 0.9, dt); if (o.fire) G.fx.flame(o.fire, 0.8, dt); }
      o.anim && o.anim(t);
    }
  };
  G.gates = Gt; return Gt;
}
