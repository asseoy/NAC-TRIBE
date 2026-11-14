// The land between the sea and the desert, as a 3D relief map: real coastline, Carmel, Galilee, Golan, Hermon,
// the Jordan rift with the Kinneret and the Dead Sea, the Negev with Ramon crater, the Arava and the Gulf of Eilat.
// 1 unit = 200 m across; heights are exaggerated ×6 so the mountains read from the air.
import * as THREE from 'three';

const LON0 = 34.95, LAT0 = 31.4, KX = 473.5, KZ = 555, HY = 0.042;
export const geo = (lat, lon) => new THREE.Vector3((lon - LON0) * KX, 0, (LAT0 - lat) * KZ);
export const toLatLon = (x, z) => ({ lat: LAT0 - z / KZ, lon: LON0 + x / KX });
export const BOUNDS = { lat0: 29.45, lat1: 33.35, lon0: 34.0, lon1: 35.95 };

function makeNoise(seed) {
  const p = new Uint8Array(512); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const a = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], F2 = 0.366025, G2 = 0.211325;
  const n2 = (x, y) => { const sk = (x + y) * F2, i = Math.floor(x + sk), j = Math.floor(y + sk), t = (i + j) * G2, x0 = x - i + t, y0 = y - j + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const pts = [[x0, y0, 0, 0], [x0 - i1 + G2, y0 - j1 + G2, i1, j1], [x0 - 1 + 2 * G2, y0 - 1 + 2 * G2, 1, 1]]; let n = 0;
    for (const [px, py, oi, oj] of pts) { let tt = 0.5 - px * px - py * py; if (tt > 0) { const gg = g[p[(i + oi & 255) + p[j + oj & 255]] & 7]; tt *= tt; n += tt * tt * (gg[0] * px + gg[1] * py); } } return 70 * n; };
  const fbm = (x, y, o = 4) => { let a2 = 0, f = 1, w = 0.5, t = 0; for (let k = 0; k < o; k++) { a2 += n2(x * f, y * f) * w; t += w; f *= 2.03; w *= 0.5; } return a2 / t; };
  return { n2, fbm };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerpTable = (tab, v) => { if (v >= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (v >= tab[i][0]) { const [a0, b0] = tab[i - 1], [a1, b1] = tab[i]; return b1 + (b0 - b1) * (v - a1) / (a0 - a1); } return tab[tab.length - 1][1]; };

// coastline: longitude of the shore as a function of latitude (north → south)
const COAST = [[33.4, 35.11], [33.09, 35.1], [33.0, 35.09], [32.92, 35.07], [32.86, 35.045], [32.84, 35.02], [32.83, 34.965], [32.78, 34.955], [32.69, 34.94], [32.5, 34.895], [32.45, 34.88], [32.33, 34.855], [32.16, 34.795], [32.08, 34.77], [32.05, 34.752], [31.8, 34.64], [31.67, 34.55], [31.5, 34.43], [31.32, 34.24], [31.22, 34.08], [31.17, 33.95]];
export const coastLon = lat => lat < 31.17 ? 33.0 : lerpTable(COAST, lat);
// the Jordan rift: valley line and floor elevation (m)
const RIFT = [[33.4, 35.62], [33.1, 35.61], [32.82, 35.59], [32.5, 35.56], [32.0, 35.53], [31.53, 35.49], [31.2, 35.42], [31.0, 35.36], [30.5, 35.19], [30.0, 35.08], [29.55, 34.99], [29.3, 34.96]];
const RIFTH = [[33.4, 90], [33.1, 70], [32.9, -200], [32.82, -215], [32.5, -260], [31.85, -310], [31.53, -440], [31.2, -390], [31.0, -300], [30.5, 50], [30.0, 120], [29.6, 20], [29.3, 0]];
const riftLon = lat => lerpTable(RIFT, lat), riftH = lat => lerpTable(RIFTH, lat);
const g2 = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy));
export const KINNERET = { lat: 32.82, lon: 35.59, rlat: 0.095, rlon: 0.05, level: -210 };
export const DEADSEA = { lat: 31.52, lon: 35.49, rlat: 0.24, rlon: 0.065, level: -430 };
const inEll = (lat, lon, e, k = 1) => ((lat - e.lat) / (e.rlat * k)) ** 2 + ((lon - e.lon) / (e.rlon * k)) ** 2;

export function createLand(G) {
  const S = G.scene, N = makeNoise(1948);
  // elevation in metres
  const elev = (lat, lon) => {
    const cl = coastLon(lat), d = (lon - cl) * 94.7;                       // km inland
    const inGulf = lat < 29.565 && Math.abs(lon - (34.955 - (29.56 - lat) * 0.25)) < 0.028 + (29.56 - lat) * 0.06;
    if (d < 0) return Math.max(-600, d * 35 - 15) + N.fbm(lon * 30, lat * 30) * 10;
    let h = Math.min(d * 9, 90) + N.fbm(lon * 12, lat * 12, 4) * 45 * sm(2, 12, d);
    // central mountain ridge (Judea + Samaria)
    const rl = 35.2 + (lat - 31.5) * 0.04; h += g2(lon - rl, 0, 0.13, 1) * sm(31.25, 31.55, lat) * (1 - sm(32.3, 32.6, lat)) * (900 - (lat - 31.6) * 250);
    // Carmel ridge
    { const t = Math.max(0, Math.min(1, (32.83 - lat) / 0.23)), cx = 34.98 + t * 0.17, cy = 32.83 - t * 0.23; h += g2(lon - cx, lat - cy, 0.045, 0.06) * 480; }
    h += g2(lon - 35.36, lat - 32.48, 0.04, 0.05) * 420;                 // Gilboa
    // Galilee hills + Meron
    h += g2(lon - 35.33, lat - 32.95, 0.2, 0.17) * 550 * sm(32.6, 32.75, lat); h += g2(lon - 35.41, lat - 33.0, 0.05, 0.05) * 700;
    // Golan plateau and Hermon
    const golan = sm(35.63, 35.72, lon) * sm(32.65, 32.75, lat); h = h * (1 - golan) + golan * (330 + Math.max(0, lat - 32.7) * 1300 + N.fbm(lon * 25, lat * 25) * 60);
    h += g2(lon - 35.86, lat - 33.42, 0.09, 0.08) * 2400;
    // east of the rift: the high plateau
    const rL = riftLon(lat), east = sm(rL + 0.05, rL + 0.12, lon); h = h * (1 - east * 0.3) + east * (850 + N.fbm(lon * 10, lat * 10) * 150) * (lat < 33.0 ? 1 : 0.6) * 0.75;
    // Negev
    if (lat < 31.4) { const neg = 1 - sm(31.2, 31.45, lat); h += neg * (200 + g2(lon - 34.9, lat - 30.65, 0.22, 0.32) * 520); }
    // Ramon crater: a rim and a deep floor
    { const e = ((lat - 30.6) / 0.075) ** 2 + ((lon - 34.82) / 0.045) ** 2; if (e < 2.5) { const r = Math.sqrt(e); h += r < 1 ? -(1 - r * r) * 380 : 0; h += Math.exp(-((r - 1.05) ** 2) / 0.02) * 120; } }
    h += g2(lon - 34.92, lat - 29.65, 0.07, 0.12) * 650;                // Eilat mountains
    // the rift valley cuts through everything
    const rw = lat < 30.5 ? 0.05 : 0.055, rk = Math.exp(-((lon - rL) ** 2) / (2 * rw * rw)); h = h * (1 - rk) + riftH(lat) * rk;
    // lakes and the gulf
    const ek = inEll(lat, lon, KINNERET); if (ek < 1.4) h = Math.min(h, KINNERET.level + 25 + (ek - 1) * 300); if (ek < 1) h = KINNERET.level - 40;
    const ed = inEll(lat, lon, DEADSEA); if (ed < 1.3) h = Math.min(h, DEADSEA.level + 20 + (ed - 1) * 400); if (ed < 1) h = DEADSEA.level - 60;
    if (inGulf) h = -150;
    return h;
  };
  const L = { elev, geo };
  L.heightAt = (x, z) => { const { lat, lon } = toLatLon(x, z); return elev(lat, lon) * HY; };
  L.HY = HY;

  // ---------- terrain mesh ----------
  const p0 = geo(BOUNDS.lat1, BOUNDS.lon0), p1 = geo(BOUNDS.lat0, BOUNDS.lon1);
  const W = p1.x - p0.x, D = p1.z - p0.z, SX = Math.round(W / 4.5), SZ = Math.round(D / 4.5);
  const g = new THREE.PlaneGeometry(W, D, SX, SZ); g.rotateX(-Math.PI / 2); g.translate((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const C = { coast: new THREE.Color('#9db86a'), green: new THREE.Color('#6f9147'), forest: new THREE.Color('#4f7338'), olive: new THREE.Color('#9a9a62'), sand: new THREE.Color('#e3c993'), desert: new THREE.Color('#cfa36b'), red: new THREE.Color('#b8693e'), salt: new THREE.Color('#ece8dc'), basalt: new THREE.Color('#5d5a46'), rock: new THREE.Color('#8f8574'), snow: new THREE.Color('#f4f6f8'), beach: new THREE.Color('#ead9a8'), shallow: new THREE.Color('#7fb7c0'), deep: new THREE.Color('#2a5f78'), crater: new THREE.Color('#9a5a4a') };
  const H = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { const { lat, lon } = toLatLon(pos.getX(i), pos.getZ(i)); H[i] = elev(lat, lon); pos.setY(i, H[i] * HY); }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), { lat, lon } = toLatLon(x, z), h = H[i], d = (lon - coastLon(lat)) * 94.7;
    const ix = i % (SX + 1), hx = ix < SX ? H[i + 1] : H[i - 1], hz = i + SX + 1 < pos.count ? H[i + SX + 1] : H[i - SX - 1], sl = Math.hypot(hx - h, hz - h) / 900;
    if (d < 0 || (lat < 29.565 && h < -100)) { c.copy(C.shallow).lerp(C.deep, sm(-5, -200, h)); }
    else {
      // north green → centre olive → south desert
      const south = 1 - sm(30.9, 31.6, lat), north = sm(32.3, 32.9, lat);
      c.copy(C.green).lerp(C.coast, sm(8, 0, d) * 0.7).lerp(C.olive, sm(200, 700, h) * (1 - north) * 0.7).lerp(C.forest, north * sm(200, 600, h) * 0.8);
      c.lerp(C.sand, south).lerp(C.desert, south * sm(300, 700, h));
      const rL = riftLon(lat), rk = Math.exp(-((lon - rL) ** 2) / (2 * 0.05 * 0.05)); if (lat < 31.4) c.lerp(C.red, rk * 0.7);
      if (inEll(lat, lon, DEADSEA) < 1.5) c.lerp(C.salt, 0.6);
      if (lon > 35.66 && lat > 32.7) c.lerp(C.basalt, 0.55);
      if (((lat - 30.6) / 0.075) ** 2 + ((lon - 34.82) / 0.045) ** 2 < 1) c.lerp(C.crater, 0.6);
      c.lerp(C.rock, Math.min(1, Math.max(0, (sl - 0.08) * 4)) * 0.7);
      if (h > 1900) c.lerp(C.snow, sm(1900, 2200, h));
      if (d < 1.2 && h < 25) c.lerp(C.beach, 0.8);
    }
    c.offsetHSL(0, 0, N.n2(x / 6, z / 6) * 0.025);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
  terrain.receiveShadow = true; S.add(terrain); L.terrain = terrain;

  // ---------- water ----------
  const waterU = { uTime: { value: 0 }, uSky: { value: new THREE.Color('#bcd6ea') }, uSun: { value: new THREE.Vector3(0.4, 0.6, 0.3) }, uNight: { value: 0 } };
  Object.assign(waterU, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
  const waterMat = (deep) => new THREE.ShaderMaterial({ uniforms: { ...waterU, uDeep: { value: new THREE.Color(deep) } }, fog: true, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSky, uDeep, uSun; uniform float uTime, uNight; varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vec3(sin(vW.x*0.15+uTime*1.3)*0.05 + sin(vW.z*0.31-uTime*0.9)*0.03, 1., cos(vW.z*0.17+uTime*1.1)*0.05));
        float fr = 0.04 + 0.96*pow(1.0 - max(dot(N,V),0.), 5.); vec3 col = mix(uDeep, uSky, fr*0.8);
        col += vec3(1.,0.95,0.85) * pow(max(dot(reflect(-V,N), normalize(uSun)),0.), 180.) * 2.2 * (1.-uNight);
        gl_FragColor = vec4(col, 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` });
  L.waterU = waterU;
  // the sea: a polygon west of the coastline (+ the gulf)
  { const sh = new THREE.Shape(); const far = -2400; sh.moveTo(far, p0.z - 400);
    for (let lat = BOUNDS.lat1 + 0.4; lat >= 31.17; lat -= 0.005) { const v = geo(lat, coastLon(lat) + 0.004); sh.lineTo(v.x, v.z); }
    const s1 = geo(31.17, 33.95); sh.lineTo(s1.x, s1.z); sh.lineTo(far, s1.z); sh.lineTo(far, p0.z - 400);
    const sg = new THREE.ShapeGeometry(sh); sg.rotateX(Math.PI / 2); const sea = new THREE.Mesh(sg, waterMat('#1f5d7c')); sea.position.y = 0; S.add(sea);
    const gs = new THREE.Shape(); const pts = []; for (let lat = 29.575; lat >= 29.3; lat -= 0.01) { const cx = 34.955 - (29.56 - lat) * 0.25, w = 0.03 + Math.max(0, 29.56 - lat) * 0.06; pts.push([lat, cx - w, cx + w]); }
    pts.forEach(([lat, a], i) => { const v = geo(lat, a); i ? gs.lineTo(v.x, v.z) : gs.moveTo(v.x, v.z); }); for (let i = pts.length - 1; i >= 0; i--) { const v = geo(pts[i][0], pts[i][2]); gs.lineTo(v.x, v.z); }
    const gg = new THREE.ShapeGeometry(gs); gg.rotateX(Math.PI / 2); const gulf = new THREE.Mesh(gg, waterMat('#1a6a86')); gulf.position.y = 0.05; S.add(gulf); }
  for (const [e, colr] of [[KINNERET, '#2f7f8f'], [DEADSEA, '#5a9aa0']]) { const c2 = geo(e.lat, e.lon), m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMat(colr)); m.rotation.x = -Math.PI / 2; m.scale.set(e.rlon * KX * 1.02, e.rlat * KZ * 1.02, 1); m.position.set(c2.x, e.level * HY, c2.z); S.add(m); }
  // the Jordan river, Kinneret → Dead Sea
  { const pts = []; for (let lat = KINNERET.lat - KINNERET.rlat + 0.005; lat >= DEADSEA.lat + DEADSEA.rlat - 0.01; lat -= 0.01) { const lon = riftLon(lat) + Math.sin(lat * 90) * 0.012; const v = geo(lat, lon); v.y = elev(lat, lon) * HY + 0.35; pts.push(v); }
    const pts2 = []; for (let lat = 33.25; lat >= KINNERET.lat + KINNERET.rlat - 0.005; lat -= 0.01) { const lon = riftLon(lat) + Math.sin(lat * 80) * 0.008; const v = geo(lat, lon); v.y = elev(lat, lon) * HY + 0.35; pts2.push(v); }
    for (const P of [pts, pts2]) { const curve = new THREE.CatmullRomCurve3(P); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, P.length * 3, 0.7, 4, false), new THREE.MeshStandardMaterial({ color: 0x3f8fa8, roughness: 0.3, emissive: 0x0a2a3a })); tube.scale.y = 0.4; tube.position.y = P[0].y * 0.6; S.add(tube); } }

  // ---------- cities ----------
  const CITIES = [['ירושלים', 31.778, 35.225, 3], ['תל אביב', 32.08, 34.79, 3], ['חיפה', 32.8, 35.0, 2.4], ['באר שבע', 31.25, 34.79, 2.2], ['אילת', 29.56, 34.955, 1.6], ['טבריה', 32.79, 35.53, 1.4], ['נתניה', 32.33, 34.865, 1.7], ['אשדוד', 31.8, 34.66, 1.8], ['נצרת', 32.7, 35.3, 1.5], ['צפת', 32.965, 35.5, 1.2], ['עכו', 32.925, 35.085, 1.1], ['קריית שמונה', 33.207, 35.57, 1.1], ['אשקלון', 31.67, 34.58, 1.5], ['חדרה', 32.44, 34.925, 1.3], ['דימונה', 31.07, 35.03, 1.1], ['מצפה רמון', 30.61, 34.8, 0.8], ['ערד', 31.26, 35.21, 0.9], ['בית שאן', 32.5, 35.5, 0.9]];
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.8, emissive: 0xff9a40, emissiveIntensity: 0 });
  const total = CITIES.reduce((a, c) => a + Math.round(c[3] * 26), 0);
  const city = new THREE.InstancedMesh(bGeo, bMat, total), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), cc = new THREE.Color(); let n = 0;
  const R = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(7);
  L.cities = [];
  for (const [name, lat, lon, size] of CITIES) { const c0 = geo(lat, lon); const cnt = Math.round(size * 26);
    for (let k = 0; k < cnt; k++) { const a = R() * 6.28, r = Math.sqrt(R()) * size * 4.5, x = c0.x + Math.cos(a) * r, z = c0.z + Math.sin(a) * r, hh = L.heightAt(x, z); if (hh < 0.2 && L.heightAt(x, z) < 0.2 && toLatLon(x, z).lon < coastLon(toLatLon(x, z).lat) + 0.005) { m4.makeScale(0, 0, 0); city.setMatrixAt(n++, m4); continue; }
      const tall = (1 - r / (size * 4.5)) * size * 2.2 + 0.6 + R() * 1.2; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 3); m4.compose(new THREE.Vector3(x, hh - 0.1, z), q, s.set(0.9 + R() * 0.8, tall, 0.9 + R() * 0.8)); city.setMatrixAt(n++, m4); city.setColorAt(n - 1, cc.setHSL(0.09, 0.15 + R() * 0.15, 0.78 + R() * 0.15)); }
    c0.y = L.heightAt(c0.x, c0.z); L.cities.push({ name, p: c0, size }); }
  city.count = n; city.castShadow = true; S.add(city); L.cityMat = bMat;

  // ---------- place-name labels ----------
  L.labels = [];
  L.label = (text, p, opts = {}) => {
    const cv = document.createElement('canvas'), fs = opts.big ? 64 : 46; const x = cv.getContext('2d'); x.font = `700 ${fs}px "Frank Ruhl Libre", serif`; const w = Math.ceil(x.measureText(text).width) + 30; cv.width = w; cv.height = fs + 26;
    const y = cv.getContext('2d'); y.font = `700 ${fs}px "Frank Ruhl Libre", serif`; y.textAlign = 'center'; y.textBaseline = 'middle'; y.direction = 'rtl';
    y.lineWidth = 8; y.strokeStyle = 'rgba(0,0,0,.75)'; y.strokeText(text, w / 2, cv.height / 2); y.fillStyle = opts.color || '#f1efeb'; y.fillText(text, w / 2, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false })); const k = (opts.scale || 1) * 0.11; sp.scale.set(w * k, cv.height * k, 1); sp.position.copy(p); sp.renderOrder = 5; S.add(sp);
    const o = { sp, p: p.clone(), far: opts.far || 700, near: opts.near || 0, base: sp.scale.clone() }; L.labels.push(o); return o;
  };
  for (const ct of L.cities) L.label(ct.name, ct.p.clone().add(new THREE.Vector3(0, 9 + ct.size * 3, 0)), { scale: 0.75 + ct.size * 0.12, far: 380 + ct.size * 120 });
  const NAT = [['הים התיכון', 31.9, 34.25, '#cfe8f6', 1.5], ['הכנרת', 32.82, 35.59, '#cfe8f6', 1], ['ים המלח', 31.5, 35.49, '#cfe8f6', 1.1], ['מפרץ אילת', 29.47, 34.94, '#cfe8f6', 0.9], ['החרמון', 33.33, 35.82, '#f3e03b', 1], ['הכרמל', 32.7, 35.05, '#f3e03b', 0.9], ['מכתש רמון', 30.6, 34.82, '#f3e03b', 0.9], ['הנגב', 30.95, 34.75, '#f3e03b', 1.2], ['הערבה', 30.3, 35.13, '#f3e03b', 0.9], ['הגליל', 33.02, 35.3, '#f3e03b', 1.1], ['הגולן', 32.98, 35.78, '#f3e03b', 1], ['הירדן', 32.2, 35.57, '#cfe8f6', 0.8]];
  for (const [t, lat, lon, colr, sc] of NAT) { const v = geo(lat, lon); v.y = Math.max(0, L.heightAt(v.x, v.z)) + 22; L.label(t, v, { color: colr, scale: sc, far: 1500, near: 260, big: true }); }

  L.update = (dt, t, cam) => {
    waterU.uTime.value = t;
    const ls = cam.aspect < 1 ? 0.62 : 1; for (const l of L.labels) { const d = cam.position.distanceTo(l.p); const a = (1 - sm(l.far * 0.75, l.far, d)) * (l.near ? sm(l.near * 0.7, l.near, d) : 1); l.sp.visible = a > 0.02; l.sp.material.opacity = a; const k = Math.max(1, d / 160); l.sp.scale.copy(l.base).multiplyScalar(Math.min(k, 3.2) * ls); }
  };
  G.land = L; return L;
}
