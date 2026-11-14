// המפה של הנשיא – fly the tribe dragon over the land; every tribe game waits behind a gate where it happens.
import * as THREE from 'three';
import { createLand, geo, toLatLon, coastLon, BOUNDS, KINNERET, DEADSEA } from './land.js';
import { createGates, GAMES } from './gates.js';
import { createDragon } from './dragon.js';
import { audio } from './audio.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer:coarse)').matches;
const G = { t: 0, night: false };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('hanasi:' + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('hanasi:' + k, JSON.stringify(v)); } catch { } } };

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 9000);
G.scene = scene; G.camera = camera;
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- sky + time of day (real Israel time) ----------
const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: V3(0.3, 0.5, -0.6).normalize() }, uSunC: { value: new THREE.Color() }, uNight: { value: 0 } };
const dome = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }',
  fragmentShader: `uniform vec3 uTop,uHor,uSunC,uSun; uniform float uNight; varying vec3 vD;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
    void main(){ vec3 d = normalize(vD); float h = d.y; vec3 col = mix(uHor, uTop, pow(max(h,0.), 0.5)); if (h < 0.) col = uHor*0.9;
      float s = max(dot(d, normalize(uSun)), 0.); col += uSunC * (pow(s, 600.)*4. + pow(s, 10.)*0.3) * (1.-uNight*0.7);
      if (uNight > 0.) { vec2 g = floor(vec2(atan(d.z, d.x)*180., h*180.)); float st = step(0.996, h21(g)) * smoothstep(0.02, 0.2, h); col += vec3(st) * uNight * (0.6 + 0.4*h21(g+3.)); }
      gl_FragColor = vec4(col, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
const hemi = new THREE.HemisphereLight(0xdfeeff, 0x7a6a50, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 900 }); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);
scene.fog = new THREE.Fog(0xcfdde8, 600, 3200);
const TOD = {
  day: { top: '#4f86c6', hor: '#d0e2ee', sun: '#fff2dc', si: 2.6, hi: 1.1, fog: '#cddde9', el: 0.75, az: 2.6, night: 0, label: 'יום' },
  sunset: { top: '#2e4a86', hor: '#f4a46c', sun: '#ff9550', si: 2.0, hi: 0.8, fog: '#e2a888', el: 0.08, az: 1.5, night: 0.15, label: 'שקיעה' },
  night: { top: '#050a18', hor: '#1c2a46', sun: '#9fb4ff', si: 0.55, hi: 0.42, fog: '#162238', el: 0.6, az: -1.8, night: 1, label: 'לילה' },
};
const israelHour = () => { try { return +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jerusalem' }).format(new Date()); } catch { return new Date().getHours(); } };
let todName = (h => h >= 6 && h < 16 ? 'day' : h >= 16 && h < 18 ? 'sunset' : 'night')(israelHour()), tod = TOD[todName];
const cur = {}; for (const k in tod) cur[k] = typeof tod[k] === 'string' && k !== 'label' ? new THREE.Color(tod[k]) : tod[k];
const setTod = n => { todName = n; tod = TOD[n]; $('tod').textContent = tod.label; };
$('tod').onclick = () => setTod(todName === 'day' ? 'sunset' : todName === 'sunset' ? 'night' : 'day');
function skyUpdate(dt) {
  const k = 1 - Math.exp(-1.5 * dt);
  for (const key in tod) { if (key === 'label') continue; const tv = tod[key]; if (typeof tv === 'string') cur[key].lerp(new THREE.Color(tv), k); else cur[key] += (tv - cur[key]) * k; }
  skyU.uTop.value.copy(cur.top); skyU.uHor.value.copy(cur.hor); skyU.uSunC.value.copy(cur.sun); skyU.uNight.value = cur.night;
  const sd = V3(Math.cos(cur.el) * Math.sin(cur.az), Math.sin(cur.el), Math.cos(cur.el) * Math.cos(cur.az)).normalize(); skyU.uSun.value.copy(sd);
  hemi.intensity = cur.hi; hemi.color.copy(cur.hor).lerp(new THREE.Color('#ffffff'), 0.5); sun.intensity = cur.si; sun.color.copy(cur.sun);
  scene.fog.color.copy(cur.fog); G.night = cur.night > 0.5;
  if (G.land) { G.land.cityMat.emissiveIntensity = cur.night * 0.32; G.land.cityMat.color.setScalar(1 - cur.night * 0.65); G.land.waterU.uSky.value.copy(cur.hor); G.land.waterU.uSun.value.copy(sd); G.land.waterU.uNight.value = cur.night; }
  const p = D ? D.root.position : V3(); sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sd, 400); dome.position.copy(camera.position);
}

// ---------- particles: flames, breath, sparks, spray, fireworks ----------
function spriteTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function particles(n, additive) {
  const geo2 = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  geo2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo2.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo2.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { map: { value: spriteTex() } },
    vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size * 700. / -mv.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); if (gl_FragColor.a < 0.004) discard; }' });
  const pts = new THREE.Points(geo2, mat); pts.frustumCulled = false; scene.add(pts);
  const P = []; for (let i = 0; i < n; i++) P.push({ life: 1, max: 1 }); let head = 0;
  return { emit(o) { const p = P[head]; head = (head + 1) % n; Object.assign(p, { life: 0, drag: 1, up: 0 }, o); },
    update(dt) { for (let i = 0; i < n; i++) { const p = P[i]; if (p.life >= p.max) { size[i] = 0; continue; } p.life += dt; const k = p.life / p.max, d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.up * dt; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; size[i] = p.s0 + (p.s1 - p.s0) * k; for (let c = 0; c < 4; c++) col[i * 4 + c] = p.c0[c] + (p.c1[c] - p.c0[c]) * k; }
      geo2.attributes.position.needsUpdate = geo2.attributes.color.needsUpdate = geo2.attributes.size.needsUpdate = true; } };
}
const fire = particles(touch ? 1200 : 2400, true), soft = particles(500, false);
G.fx = {
  flame(p, s, dt) { for (let k = 0; k < Math.ceil(dt * 50 * s); k++) fire.emit({ x: p.x + (Math.random() - 0.5) * 1.6 * s, y: p.y, z: p.z + (Math.random() - 0.5) * 1.6 * s, vx: (Math.random() - 0.5), vy: 3 + Math.random() * 3 * s, vz: (Math.random() - 0.5), max: 0.8 + Math.random() * 0.4, s0: 1.8 * s, s1: 0.3, drag: 0.6, up: 1.5, c0: [1, 0.75, 0.3, 0.85], c1: [1, 0.2, 0.02, 0] }); },
  spray(p) { soft.emit({ x: p.x, y: 0.3, z: p.z, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, max: 0.8, s0: 0.5, s1: 1.4, drag: 1, up: -4, c0: [1, 1, 1, 0.7], c1: [1, 1, 1, 0] }); },
  burst(p, n, col) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, b = Math.random() * 3.14, s = 8 + Math.random() * 16; fire.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * Math.sin(b) * s, vy: Math.cos(b) * s, vz: Math.sin(a) * Math.sin(b) * s, max: 1.6, s0: 1.4, s1: 0.1, drag: 1.1, up: -5, c0: [...col, 1], c1: [col[0], col[1] * 0.5, col[2] * 0.4, 0] }); } },
};

// ---------- build ----------
let D = null, L = null, GT = null;
const F = { pos: V3(), yaw: 0, pitch: 0, speed: 34, bank: 0, auto: null, paused: true, st: { turn: 0, climb: 0, speed: 34, boost: 0, brake: 0, flapRate: 0.6, dive: 0, breath: false } };
const camPos = V3();
async function boot() {
  try { await document.fonts.load('700 40px "Frank Ruhl Libre"'); } catch { }
  G.logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'logo.webp'; });
  await new Promise(r => setTimeout(r, 30));
  L = createLand(G); GT = createGates(G);
  D = createDragon(G); D.root.scale.setScalar(1.6);
  // clouds
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const cm = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.75, fog: true }); G.cloudMat = cm;
  for (let i = 0; i < 40; i++) { const c0 = geo(29.6 + Math.random() * 3.6, 34.1 + Math.random() * 1.8); for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(cm); s.position.set(c0.x + (Math.random() - 0.5) * 70, 170 + Math.random() * 60, c0.z + (Math.random() - 0.5) * 50); const sc = 40 + Math.random() * 50; s.scale.set(sc * 1.6, sc, 1); scene.add(s); } }
  // start over the coast, heading north
  const start = geo(31.86, 34.84); F.pos.set(start.x, 70, start.z); F.yaw = Math.PI; camPos.set(start.x, 900, start.z + 400);
  visited = new Set(store.get('mapVisited', [])); GT.gates.forEach(o => o.visited = visited.has(o.gm.id)); $('visitN').textContent = visited.size;
  setTod(todName); renderer.compile(scene, camera);
  $('btnGo').disabled = false; $('btnGo').textContent = 'להמריא ←';
  $('keysHelp').innerHTML = touch ? 'גוררים את האצבע על המסך כדי לנווט · "מהר" ו"אש" בצד · לוחצים על המפה הקטנה כדי לטוס לשער' : 'גוררים עם העכבר, או חיצים / WASD כדי לנווט · Shift מהר · רווח אש · לחיצה על המפה הקטנה טסה לשער';
  requestAnimationFrame(loop);
}
let visited = new Set(), introT = -1;
$('btnGo').onclick = () => { $('intro').classList.add('hidden'); $('hud').classList.remove('hidden'); if (touch) $('pad').classList.remove('hidden'); audio.init(); audio.setVol(0.6); introT = 0;
  $('hint').textContent = touch ? 'גררו כדי לנווט · לחצו על שער במפה הקטנה' : 'גררו עם העכבר או חיצים לנווט · Shift מהר · רווח אש'; setTimeout(() => $('hint').style.opacity = 0, 7000); };

// ---------- input: drag-joystick (touch + mouse), keys, buttons ----------
const inp = { keys: {}, drag: null, boost: false, fire: false };
addEventListener('keydown', e => { inp.keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); if (e.code === 'Escape') closePanel(); });
addEventListener('keyup', e => { inp.keys[e.code] = false; });
addEventListener('blur', () => { inp.keys = {}; inp.drag = null; });
const cvs = $('gl');
cvs.addEventListener('pointerdown', e => { if (F.paused) return; inp.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; F.auto = null; const j = $('joy'); j.classList.remove('hidden'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.firstChild.style.transform = ''; try { cvs.setPointerCapture(e.pointerId); } catch { } });
cvs.addEventListener('pointermove', e => { if (!inp.drag || e.pointerId !== inp.drag.id) return; inp.drag.x = e.clientX; inp.drag.y = e.clientY; const dx = clamp(e.clientX - inp.drag.x0, -55, 55), dy = clamp(e.clientY - inp.drag.y0, -55, 55); $('joy').firstChild.style.transform = `translate(${dx}px,${dy}px)`; });
const endDrag = e => { if (inp.drag && e.pointerId === inp.drag.id) { inp.drag = null; $('joy').classList.add('hidden'); } };
cvs.addEventListener('pointerup', endDrag); cvs.addEventListener('pointercancel', endDrag);
const hold = (el, key) => { el.addEventListener('pointerdown', e => { e.preventDefault(); inp[key] = true; el.classList.add('on'); }); const off = () => { inp[key] = false; el.classList.remove('on'); }; el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off); };
hold($('bBoost'), 'boost'); hold($('bFire'), 'fire');

// ---------- mini map ----------
const mini = $('miniC'), mx = mini.getContext('2d');
const toMini = (lat, lon) => [(lon - BOUNDS.lon0) / (BOUNDS.lon1 - BOUNDS.lon0) * mini.width, (BOUNDS.lat1 - lat) / (BOUNDS.lat1 - BOUNDS.lat0) * mini.height];
const miniBase = (() => { const c = document.createElement('canvas'); c.width = mini.width; c.height = mini.height; const g = c.getContext('2d'); g.fillStyle = '#1f4e66'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#7d8a5a'; g.beginPath(); g.moveTo(c.width, 0); for (let lat = BOUNDS.lat1; lat >= BOUNDS.lat0; lat -= 0.02) { const [x, y] = toMini(lat, Math.max(BOUNDS.lon0, coastLon(lat))); g.lineTo(x, y); } g.lineTo(c.width, c.height); g.closePath(); g.fill();
  const grd = g.createLinearGradient(0, 0, 0, c.height); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.45, 'rgba(0,0,0,0)'); grd.addColorStop(0.6, 'rgba(210,170,110,.65)'); grd.addColorStop(1, 'rgba(200,150,90,.8)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#1f4e66'; for (const e of [KINNERET, DEADSEA]) { const [x, y] = toMini(e.lat, e.lon); g.beginPath(); g.ellipse(x, y, e.rlon / (BOUNDS.lon1 - BOUNDS.lon0) * c.width, e.rlat / (BOUNDS.lat1 - BOUNDS.lat0) * c.height, 0, 0, 7); g.fill(); }
  { const pts = []; for (let lat = 29.56; lat >= 29.45; lat -= 0.01) pts.push(toMini(lat, 34.955 - (29.56 - lat) * 0.25)); g.strokeStyle = '#1f4e66'; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
  return c; })();
function drawMini() {
  mx.drawImage(miniBase, 0, 0);
  for (const o of GT.gates) { const [x, y] = toMini(o.gm.lat, o.gm.lon); mx.fillStyle = o.visited ? '#f3e03b' : '#111'; mx.strokeStyle = '#f3e03b'; mx.lineWidth = 2; mx.fillRect(x - 6, y - 6, 12, 12); mx.strokeRect(x - 6, y - 6, 12, 12); if (F.auto === o) { mx.strokeStyle = '#fff'; mx.strokeRect(x - 9, y - 9, 18, 18); } }
  const { lat, lon } = toLatLon(F.pos.x, F.pos.z), [x, y] = toMini(lat, lon), a = -F.yaw + Math.PI;
  mx.save(); mx.translate(x, y); mx.rotate(a); mx.fillStyle = '#fd1d1d'; mx.strokeStyle = '#000'; mx.lineWidth = 1.5; mx.beginPath(); mx.moveTo(0, -9); mx.lineTo(6, 7); mx.lineTo(0, 3); mx.lineTo(-6, 7); mx.closePath(); mx.fill(); mx.stroke(); mx.restore();
}
mini.addEventListener('pointerdown', e => { e.stopPropagation(); const r = mini.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * mini.width, py = (e.clientY - r.top) / r.height * mini.height; let best = null, bd = 30;
  for (const o of GT.gates) { const [x, y] = toMini(o.gm.lat, o.gm.lon), d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = o; } }
  if (best) { F.auto = best; cooldown.delete(best); $('near').textContent = 'טסים אל ' + best.gm.title + '…'; $('near').classList.remove('hidden'); audio.sfx('ring'); } });

// ---------- the panel ----------
let panelGate = null; const cooldown = new Map();
function openPanel(o) {
  panelGate = o; F.paused = true; F.auto = null; inp.drag = null; $('joy').classList.add('hidden'); $('near').classList.add('hidden');
  const g = o.gm; $('pImg').src = `../assets/pc/${g.img}.webp`; $('pGenre').textContent = g.genre; $('pTitle').textContent = g.title; $('pPlace').textContent = 'מחכה לך ב' + g.place; $('pDesc').textContent = g.desc; $('pGo').href = g.url;
  $('pNote').classList.toggle('hidden', !g.pc); $('panel').classList.remove('hidden'); audio.sfx('ignite');
  if (!o.visited) { o.visited = true; visited.add(g.id); store.set('mapVisited', [...visited]); $('visitN').textContent = visited.size; G.fx.burst(o.c.clone().add(V3(0, 14, 0)), 80, [1, 0.8, 0.3]);
    if (visited.size === GAMES.length) setTimeout(celebrate, 600); }
}
function closePanel() { if (!panelGate) return; cooldown.set(panelGate, G.t + 6); panelGate = null; $('panel').classList.add('hidden'); F.paused = false; }
$('pBack').onclick = closePanel;
$('panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') closePanel(); });
let fwT = 0;
function celebrate() { $('done').classList.remove('hidden'); fwT = 6; audio.sfx('win'); setTimeout(() => $('done').classList.add('hidden'), 5000); }

// ---------- flight ----------
const fwd = V3(), tmp = V3();
function fly(dt) {
  const k = inp.keys;
  let yawIn = 0, pitchIn = 0;
  if (inp.drag) { yawIn = -clamp((inp.drag.x - inp.drag.x0) / 55, -1, 1); pitchIn = -clamp((inp.drag.y - inp.drag.y0) / 55, -1, 1); }
  yawIn += ((k.KeyA || k.ArrowLeft) ? 1 : 0) - ((k.KeyD || k.ArrowRight) ? 1 : 0); pitchIn += ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);
  const boost = inp.boost || k.ShiftLeft || k.ShiftRight, breath = inp.fire || k.Space || k.KeyF;
  // autopilot toward a gate from the mini map
  if (F.auto) { tmp.subVectors(F.auto.c, F.pos); const want = Math.atan2(tmp.x, tmp.z); let dy = want - F.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; yawIn = clamp(dy * 2, -1, 1); const hd = Math.hypot(tmp.x, tmp.z); const wantY = hd > 120 ? Math.max(F.auto.c.y + 40, 90) : F.auto.c.y + 2; pitchIn = clamp((wantY - F.pos.y) / 30, -1, 1); }
  const yawRate = yawIn * 1.15; F.yaw += yawRate * dt;
  const targetPitch = clamp(pitchIn, -1, 1) * 0.55; F.pitch += (targetPitch - F.pitch) * (1 - Math.exp(-2.5 * dt));
  const target = boost || (F.auto && F.pos.distanceTo(F.auto.c) > 150) ? 80 : 36; F.speed += (target - F.speed) * (1 - Math.exp(-1.2 * dt));
  fwd.set(Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), Math.cos(F.yaw) * Math.cos(F.pitch));
  F.pos.addScaledVector(fwd, F.speed * dt);
  const floor = Math.max(0, L.heightAt(F.pos.x, F.pos.z)) + 9; if (F.pos.y < floor) { F.pos.y += (floor - F.pos.y) * Math.min(1, dt * 6); if (F.pitch < 0) F.pitch *= 0.9; }
  if (F.pos.y > 340) F.pos.y = 340;
  const b0 = geo(BOUNDS.lat1, BOUNDS.lon0), b1 = geo(BOUNDS.lat0, BOUNDS.lon1); if (F.pos.x < b0.x - 200 || F.pos.x > b1.x + 60 || F.pos.z < b0.z + 20 || F.pos.z > b1.z - 20) { F.yaw += dt * 1.4; F.pos.x = clamp(F.pos.x, b0.x - 200, b1.x + 60); F.pos.z = clamp(F.pos.z, b0.z + 20, b1.z - 20); }
  F.bank += (clamp(-yawRate * 0.55, -0.9, 0.9) - F.bank) * (1 - Math.exp(-4 * dt));
  D.root.position.copy(F.pos); D.root.quaternion.setFromEuler(new THREE.Euler(-F.pitch, F.yaw, F.bank, 'YXZ'));
  const st = F.st; st.turn = yawRate * 0.8; st.climb = clamp(F.pitch * 2, -1, 1); st.speed = F.speed; st.boost = boost ? 1 : 0; st.flapRate = boost ? 1 : F.pitch > 0.15 ? 0.8 : 0.45; st.dive = F.pitch < -0.35 ? 0.8 : 0; st.breath = breath;
  // gates: fly through (or near) to open
  for (const o of GT.gates) { const d = o.c.distanceTo(F.pos); if (d < 16 && !(cooldown.get(o) > G.t)) { openPanel(o); break; } }
  // nearby hint
  let near = null, nd = 1e9; for (const o of GT.gates) { const d = o.c.distanceTo(F.pos); if (d < nd) { nd = d; near = o; } }
  if (!F.auto) { const n = $('near'); if (nd < 160) { n.textContent = `${near.gm.title} · ${Math.round(nd * 0.2 * 10) / 10} ק״מ`; n.classList.remove('hidden'); } else n.classList.add('hidden'); }
}
function breathFx(dt) { if (!F.st.breath || !D.mouthWorld) return; const m = D.mouthWorld, f = D.headFwd; for (let i = 0; i < Math.ceil(dt * 260); i++) { const sp = 38 + Math.random() * 14; fire.emit({ x: m.x, y: m.y, z: m.z, vx: (f.x + (Math.random() - 0.5) * 0.24) * sp + fwd.x * F.speed, vy: (f.y + (Math.random() - 0.5) * 0.24) * sp + fwd.y * F.speed, vz: (f.z + (Math.random() - 0.5) * 0.24) * sp + fwd.z * F.speed, max: 0.6, s0: 1, s1: 8, drag: 2.4, up: 3, c0: [1, 0.62, 0.18, 0.45], c1: [0.75, 0.1, 0.02, 0] }); } }

// ---------- loop ----------
const clock = new THREE.Clock(); let lastFlap = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 20); G.t += dt;
  if (introT >= 0 && introT < 3.2) { introT += dt; if (introT >= 3.2) F.paused = false; }
  if (!F.paused) fly(dt); else if (D) { // hover in place while the panel / intro is up
    F.st.speed = 6; F.st.flapRate = 0.6; F.st.breath = false; F.st.turn = 0.3; D.root.position.copy(F.pos).add(V3(0, Math.sin(G.t * 2) * 0.5, 0)); D.root.quaternion.setFromEuler(new THREE.Euler(0, F.yaw, 0, 'YXZ')); }
  D.update(dt, F.st); breathFx(dt);
  const ph = Math.floor((D.flap - 0.4) / (Math.PI * 2)); if (ph !== lastFlap) { lastFlap = ph; if (introT >= 0) audio.flap(0.4 + F.st.boost * 0.4); }
  // camera
  const portrait = camera.aspect < 1, back = V3(-Math.sin(F.yaw), 0, -Math.cos(F.yaw)); const want = F.pos.clone().addScaledVector(back, (26 + F.speed * 0.12) * (portrait ? 1.7 : 1)).add(V3(0, (9 - F.pitch * 8) * (portrait ? 1.5 : 1), 0));
  const ch = Math.max(0, L.heightAt(want.x, want.z)) + 4; if (want.y < ch) want.y = ch;
  if (introT < 0) { const a = G.t * 0.04, c0 = geo(31.4, 35.0); camera.position.set(c0.x + Math.sin(a) * 700, 950, c0.z + Math.cos(a) * 900); camera.lookAt(c0.x, 0, c0.z); camPos.copy(camera.position); }
  else { const k = introT < 3.2 ? 1 - Math.exp(-2.2 * dt) : 1 - Math.exp(-6 * dt); camPos.lerp(want, k); camera.position.copy(camPos); camera.lookAt(F.pos.clone().addScaledVector(V3(Math.sin(F.yaw), 0, Math.cos(F.yaw)), 12)); camera.rotateZ(F.bank * 0.1); }
  camera.fov += ((58 + (camera.aspect < 1 ? 10 : 0) + Math.max(0, F.speed - 36) * 0.25) - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix();
  G.cam = camera.position;
  skyUpdate(dt); L.update(dt, G.t, camera); GT.update(dt, G.t); fire.update(dt); soft.update(dt);
  if (fwT > 0) { fwT -= dt; if (Math.random() < dt * 5) { const cols = [[1, 0.8, 0.2], [1, 0.3, 0.3], [0.4, 0.8, 1], [1, 1, 1]]; G.fx.burst(F.pos.clone().add(V3((Math.random() - 0.5) * 80, 30 + Math.random() * 30, (Math.random() - 0.5) * 80)), 90, cols[Math.floor(Math.random() * 4)]); } }
  audio.update(introT >= 0 && !F.paused ? F.speed * 0.6 : 0, F.st.breath, D.flap, false);
  if (introT >= 0) drawMini();
  renderer.render(scene, camera);
}
boot().catch(e => { console.error(e); $('btnGo').textContent = 'שגיאה: ' + e.message; });
window.__M = { G, F, get GT() { return GT; }, get D() { return D; }, openPanel, closePanel };
