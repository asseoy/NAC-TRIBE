/* NAC FIGHTERS — shared helpers. Everything lives on window.NF */
'use strict';
const NF = window.NF = {};

NF.W = 1280;            // logical stage width
NF.H = 720;             // logical stage height
NF.FLOOR = 640;         // ground line (world y, down is +)
NF.STAGE_L = -470;      // world bounds (camera centre is x=0)
NF.STAGE_R = 470;
NF.DT = 1 / 60;         // fixed simulation step

NF.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
NF.lerp = (a, b, t) => a + (b - a) * t;
NF.rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
NF.pick = arr => arr[(Math.random() * arr.length) | 0];
NF.sign = v => v < 0 ? -1 : 1;
NF.D2R = Math.PI / 180;

NF.ease = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  snap: t => 1 - Math.pow(1 - t, 4),
};

/* localStorage that never throws */
NF.store = {
  get(k, d) { try { const v = localStorage.getItem('nacf:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('nacf:' + k, JSON.stringify(v)); } catch (e) { } },
};

/* images */
NF.img = {};
NF.loadImages = (list) => Promise.all(list.map(([k, src]) => new Promise(res => {
  const im = new Image(); im.onload = () => { NF.img[k] = im; res(); }; im.onerror = () => res(); im.src = src;
})));

/* small seeded noise for stable jagged edges */
NF.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
