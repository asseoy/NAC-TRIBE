/* The interface: loading, title screen, HUD, weapon dock with previews, shop,
   missions, achievements, settings and all the little celebrations. */
'use strict';
(() => {
  const G = BD.G, S = () => BD.save.d, $ = s => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const fmt = n => Math.round(n).toLocaleString('he-IL');
  const CATN = { hand: 'יד', melee: 'מכות', boom: 'פיצוצים', guns: 'נשקים', elem: 'איתני הטבע', crazy: 'משוגע' };

  /* ---------- weapon icons, drawn once from each weapon's own art ---------- */
  const iconCache = {};
  BD.iconOf = function (w, px = 112) {
    const k = w.id + px; if (iconCache[k]) return iconCache[k];
    const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
    x.translate(px / 2, px / 2);
    try { w.icon(x, px * .62, 0); } catch (e) { console.error('icon', w.id, e); }
    return iconCache[k] = c;
  };
  const iconCanvas = (w, px = 112) => { const c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(BD.iconOf(w, px), 0, 0); return c; };

  /* ---------- loading screen ---------- */
  function loading() {
    const bar = $('#ldBar'), txt = $('#ldTxt'), ic = $('#ldIcon').getContext('2d');
    let spin = 0, stop = false;
    (function anim() {
      if (stop) return; spin += .08; ic.setTransform(1, 0, 0, 1, 0, 0); ic.clearRect(0, 0, 160, 160); ic.translate(80, 80); ic.rotate(spin);
      for (let i = 0; i < 4; i++) { ic.fillStyle = i % 2 ? '#141414' : BD.YEL; ic.beginPath(); ic.moveTo(0, 0); ic.arc(0, 0, 60, i * Math.PI / 2, (i + 1) * Math.PI / 2); ic.fill(); }
      ic.lineWidth = 6; ic.strokeStyle = '#000'; ic.beginPath(); ic.arc(0, 0, 62, 0, BD.TAU); ic.stroke();
      requestAnimationFrame(anim);
    })();
    const steps = [
      ['פונטים', () => Promise.race([Promise.all([document.fonts.load('700 40px Karantina'), document.fonts.load('400 16px "Frank Ruhl Libre"')]), new Promise(r => setTimeout(r, 2500))])],
      ['מנוע הפיזיקה', () => { G.init($('#stage')); }],
      ['ציור החדר', () => { G.setArena('padded'); }],
      ['ציור הנשקים', () => new Promise(res => { let i = 0; (function chunk() { for (let k = 0; k < 8 && i < BD.WL.length; k++, i++) BD.iconOf(BD.WL[i]); bar.style.width = (60 + 35 * i / BD.WL.length) + '%'; if (i < BD.WL.length) setTimeout(chunk, 0); else res(); })(); })],
    ];
    let p = Promise.resolve();
    steps.forEach(([name, f], i) => { p = p.then(() => { txt.textContent = 'טוען: ' + name; bar.style.width = (i / steps.length * 60) + '%'; return f(); }); });
    return p.then(() => { bar.style.width = '100%'; txt.textContent = 'מוכן'; return new Promise(r => setTimeout(r, 250)); }).then(() => { stop = true; });
  }

  /* ---------- title screen with a live demo running behind it ---------- */
  function showTitle() {
    BD.audio.stopLoops();
    $('#title').classList.add('on'); $('#load').classList.remove('on');
    $('#hud').hidden = true; $('#dock').hidden = true; hideTip();
    $('#finBtn').hidden = true; $('#c4Btn').hidden = true; document.body.classList.remove('hand');
    $('#tCoins').textContent = fmt(S().coins);
    const done = Object.keys(S().ch).length; $('#chCount').textContent = done + ' / ' + BD.MISSIONS.length + ' משימות';
    $('#svBest').textContent = S().surv.best ? 'השיא שלכם: סיבוב ' + S().surv.best : 'הבובה מתחזקת בכל סיבוב';
    G.stop(); G.start('demo'); G.select('hand');
    BD.audio.music(true);
  }
  BD.MODES.demo = {
    name: 'demo', coinK: 0,
    start() { this.t = 1.2; },
    update(dt) {
      this.t -= dt; if (this.t > 0) return;
      this.t = BD.rand(1.8, 3);
      const list = BD.WL.filter(w => w.fireAt && !w.noChaos && !w.big), w = BD.pick(list), d = G.dummy; if (!w || !d || d.gone) return;
      const [cx, cy] = d.center;
      try { w.fireAt(BD.clamp(cx + BD.rand(-160, 160), 80, G.W - 80), BD.clamp(cy + BD.rand(-120, 60), 80, G.floor - 40)); } catch (e) { console.error(e); }
    }
  };
  function play(mode, opt = {}) {
    BD.audio.init();
    $('#title').classList.remove('on'); closeOv();
    $('#hud').hidden = false; $('#dock').hidden = false;
    G.stop(); G.resize();
    G.start(mode, opt);
    curCat = G.wpn && G.wpn.cat !== 'hand' ? G.wpn.cat : (mode === 'challenge' && opt.allow && opt.allow.length ? 'allow' : 'melee');
    renderDock(); updHud(true);
    if (!S().seen) { S().seen = true; BD.save.write(); toast('איך משחקים', 'בוחרים כלי למטה ולוחצים על החדר. עם היד תופסים את הבובה וזורקים.'); }
    if (mode === 'challenge') banner(BD.MODES.challenge.m.name, BD.MODES.challenge.m.desc);
    if (mode === 'survival') banner('סיבוב 1', 'תגיעו ל־' + fmt(BD.MODES.survival.target) + ' לפני שהזמן נגמר');
    if (mode === 'chaos') banner('כאוס!', 'כל הנשקים פתוחים. החדר משתגע');
  }

  /* ---------- HUD ---------- */
  let shownCoins = 0;
  function updHud(force) {
    const c = S().coins;
    if (force) shownCoins = c;
    if (shownCoins !== c) { shownCoins += Math.sign(c - shownCoins) * Math.max(1, Math.ceil(Math.abs(c - shownCoins) / 8)); }
    $('#coins b').textContent = fmt(shownCoins);
    const d = G.dummy; $('#hpFill').style.width = (d ? BD.clamp(d.hp, 0, 1) * 100 : 0) + '%';
    const info = $('#info'), m = G.mode, M = BD.MODES[m];
    let h = '';
    if (m === 'sandbox') h = `<div class="pill">נקודות <b>${fmt(G.score)}</b></div>`;
    else if (m === 'chaos') h = `<div class="pill">כאוס · <b>${fmt(G.score)}</b></div>`;
    else if (m === 'survival') h = `<div class="pill">סיבוב <b>${M.round}</b> · ${Math.ceil(M.time)} שנ׳ · <b>${fmt(Math.max(0, M.got || 0))}</b>/${fmt(M.target)}<span class="prog"><i style="width:${BD.clamp((M.got || 0) / M.target, 0, 1) * 100}%"></i></span></div>`;
    else if (m === 'challenge' && M.m) h = `<div class="pill">${M.m.name}${M.m.time ? ' · ' + Math.ceil(M.time) + ' שנ׳' : ''}<span class="prog"><i style="width:${M.prog * 100}%"></i></span></div>`;
    if (info._h !== h) { info.innerHTML = h; info._h = h; }
    $('#finBtn').hidden = !G.finisherReady();
    $('#gravVal').textContent = (S().gravity ?? 1) === 0 ? '0' : String(S().gravity ?? 1).replace('0.', '.');
    // combo meter
    const cb = $('#combo'), cn = G.combo.n;
    if (cn >= 2) { cb.classList.add('on'); cb.querySelector('i').style.setProperty('--k', BD.clamp(1 - (G.t - G.combo.last) / 2, 0, 1)); cb.querySelector('span').textContent = 'קומבו ×' + G.mult().toFixed(2).replace(/\.?0+$/, ''); }
    else cb.classList.remove('on');
  }
  setInterval(() => { if (G.running && G.mode !== 'demo') updHud(); }, 80);
  setInterval(() => { if (G.running && G.mode !== 'demo') { BD.checkAch(); S().stats.time = (S().stats.time || 0) + 1; } }, 1000);
  G.on('combo', c => { const b = $('#combo b'); if (c.n >= 2) { b.textContent = c.n; const cb = $('#combo'); cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); } });
  G.on('coins', () => { const c = $('#coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); markAfford(); });
  G.on('special', (id, sp) => { if (G.mode !== 'demo') banner(sp.name, sp.bonus ? '+' + fmt(sp.bonus * G.mult()) + ' נקודות' : ''); });
  G.on('ko', () => { if (G.mode !== 'demo') banner('נוקאאוט!', G.mode === 'survival' ? '' : '+40 מטבעות'); });
  G.on('finisher', () => { $('#finBtn').hidden = true; });
  G.on('ach', a => { toast('הישג: ' + a.name, a.desc + ' · +' + a.reward + ' מטבעות', true); BD.audio.play('unlock'); });
  G.on('round', (r, bonus) => { if (r > 1) { banner('סיבוב ' + r, '+' + bonus + ' מטבעות · הבובה מתחזקת'); BD.audio.play('unlock'); BD.fx.confetti(G.W / 2, G.H * .3, 40); } });
  G.on('missionDone', (m, first) => { BD.audio.play('unlock'); BD.fx.confetti(G.W / 2, G.H * .3, 70); setTimeout(() => results('המשימה הושלמה!', m.name + (first ? ' · +' + m.reward + ' מטבעות' : ' · כבר הושלמה בעבר'), true), 1100); });
  G.on('missionFail', m => { BD.audio.play('deny'); results('הזמן נגמר', m.name + ': ' + m.desc, false); });
  G.on('survivalOver', r => { BD.audio.play('ko'); results('הבובה שרדה', 'הגעתם לסיבוב ' + (r + 1) + ' · השיא: ' + S().surv.best, false); });
  G.on('c4', n => { $('#c4Btn').hidden = !n; $('#c4Btn').textContent = 'פוצץ (' + n + ')'; });
  G.on('select', w => { document.body.classList.toggle('hand', w.id === 'hand'); markSel(); if (G.mode !== 'challenge' || !G.opt.allow) {} });
  G.on('gravity', () => {});

  function banner(t, sub) {
    if (G.overlay) return;
    const b = $('#banner'); b.innerHTML = ''; const n = el('div', 'bn', t + (sub ? `<small>${sub}</small>` : '')); b.appendChild(n);
    clearTimeout(b._t); b._t = setTimeout(() => n.remove(), 1700);
  }
  function toast(t, s, y) {
    const n = el('div', 'toast' + (y ? ' y' : ''), `<b>${t}</b>${s || ''}`); $('#toasts').appendChild(n); setTimeout(() => n.remove(), 3300);
  }
  BD.toast = toast;

  /* ---------- weapon dock ---------- */
  let curCat = 'melee';
  const FAV = '<svg class="fv" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.6 4.4L18.5 21 12 16.8 5.5 21l2.1-7.6L2 9h7z"/></svg>';
  function renderCats() {
    const c = $('#cats'); c.innerHTML = '';
    const tabs = [];
    if (G.mode === 'challenge' && G.opt.allow && G.opt.allow.length) tabs.push(['allow', 'למשימה']);
    tabs.push(['fav', 'מועדפים'], ['recent', 'אחרונים']);
    BD.CATS.forEach(k => tabs.push([k.id, k.name]));
    for (const [id, name] of tabs) {
      const b = el('button', id === curCat ? 'on' : '', name); b.setAttribute('role', 'tab');
      b.onclick = () => { curCat = id; BD.audio.play('click'); renderDock(); }; c.appendChild(b);
    }
  }
  function listFor(cat) {
    const s = S();
    if (cat === 'fav') return s.fav.map(i => BD.W[i]).filter(Boolean);
    if (cat === 'recent') return s.recent.map(i => BD.W[i]).filter(Boolean);
    if (cat === 'allow') return (G.opt.allow || []).map(i => BD.W[i]).filter(Boolean);
    return BD.WL.filter(w => w.cat === cat);
  }
  function renderDock() {
    renderCats();
    const L = $('#wlist'); L.innerHTML = ''; L.scrollLeft = 0;
    const items = [BD.W.hand, ...listFor(curCat)];
    for (const w of items) L.appendChild(card(w));
    if (items.length === 1) L.appendChild(el('div', 'empty', curCat === 'fav' ? 'אין עדיין מועדפים. לחיצה ארוכה על כלי ואז "למועדפים".' : 'עוד לא השתמשתם בכלים.'));
    markSel(); markAfford();
  }
  function card(w) {
    const c = el('button', 'wc'); c.dataset.id = w.id; c.title = w.name;
    c.appendChild(iconCanvas(w, 112));
    c.appendChild(el('b', '', w.name));
    if (!G.canUse(w)) { c.classList.add('lock'); c.appendChild(el('span', 'pr', `<i class="cn"></i>${fmt(w.price)}`)); }
    if (S().fav.includes(w.id)) c.insertAdjacentHTML('beforeend', FAV);
    let lp = null, long = false;
    c.addEventListener('pointerdown', e => { long = false; if (e.pointerType !== 'mouse') lp = setTimeout(() => { long = true; showTip(w, c); }, 420); });
    c.addEventListener('pointerup', () => clearTimeout(lp));
    c.addEventListener('pointerleave', () => { clearTimeout(lp); clearTimeout(c._h); if (tipFor === w && !tipPinned) hideTip(); });
    c.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') c._h = setTimeout(() => showTip(w, c), 380); });
    c.addEventListener('click', () => {
      if (long) return;
      BD.audio.init();
      if (!G.canUse(w)) { showTip(w, c, true); BD.audio.play('click'); return; }
      G.select(w.id); BD.audio.play('click'); if (tipFor && tipPinned) hideTip();
    });
    return c;
  }
  function markSel() { document.querySelectorAll('.wc').forEach(c => c.classList.toggle('on', G.wpn && c.dataset.id === G.wpn.id)); }
  function markAfford() { const co = S().coins; document.querySelectorAll('.wc.lock').forEach(c => { const w = BD.W[c.dataset.id]; c.classList.toggle('afford', !!w && co >= w.price); }); }

  /* ---------- tooltip with a live preview of the weapon ---------- */
  let tipFor = null, tipPinned = false, tipRaf = 0;
  function showTip(w, anchor, pin) {
    const t = $('#tip'); tipFor = w; tipPinned = !!pin || !!anchor && matchMedia('(hover:none)').matches;
    const owned = G.canUse(w), fav = S().fav.includes(w.id), can = S().coins >= w.price;
    const meter = n => `<span class="m">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'f' : ''}"></i>`).join('')}</span>`;
    t.innerHTML = `<div class="tt"><canvas width="168" height="168"></canvas><div><div class="cat">${CATN[w.cat] || ''}</div><h3>${w.name}</h3></div></div>
      <p>${w.desc}</p>${w.tip ? `<p class="hint">טיפ: ${w.tip}</p>` : ''}
      <div class="meters"><span>עוצמה</span>${meter(w.power)}<span>בלגן</span>${meter(w.chaos)}</div>
      <div class="act">${owned ? `<button class="btn" data-a="use">לבחור</button>` : `<button class="btn" data-a="buy" ${can ? '' : 'disabled'}>לפתוח · ${fmt(w.price)}</button>`}
      ${w.id !== 'hand' ? `<button class="btn ghost" data-a="fav">${fav ? 'להוריד ממועדפים' : 'למועדפים'}</button>` : ''}
      ${tipPinned ? '<button class="btn ghost" data-a="x">סגירה</button>' : ''}</div>`;
    if (!owned && !can) t.querySelector('.act').insertAdjacentHTML('afterend', `<p class="hint">חסרים ${fmt(w.price - S().coins)} מטבעות. מרוויחים מטבעות מכל מכה.</p>`);
    t.hidden = false;
    // place it above the card (or beside the side dock)
    const r = anchor.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 10;
    if (y < 8) { y = Math.min(innerHeight - th - 8, r.top); x = r.left - tw - 10; if (x < 8) x = r.right + 10; }
    t.style.left = BD.clamp(x, 8, innerWidth - tw - 8) + 'px'; t.style.top = BD.clamp(y, 8, innerHeight - th - 8) + 'px';
    t.onpointerenter = () => { tipPinned = true; };
    t.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'use') { G.select(w.id); hideTip(); }
      if (a === 'buy') buy(w);
      if (a === 'fav') { const f = S().fav, i = f.indexOf(w.id); if (i >= 0) f.splice(i, 1); else f.push(w.id); BD.save.write(); hideTip(); renderDock(); }
      if (a === 'x') hideTip();
      BD.audio.play('click');
    });
    // spinning preview
    const cv = t.querySelector('canvas'), x2 = cv.getContext('2d'); cancelAnimationFrame(tipRaf);
    const t0 = performance.now();
    (function anim(now) {
      if (tipFor !== w) return; const k = (now - t0) / 1000;
      x2.setTransform(1, 0, 0, 1, 0, 0); x2.clearRect(0, 0, 168, 168); x2.translate(84, 90 + Math.sin(k * 3) * 5); x2.rotate(Math.sin(k * 2) * .15);
      const s = 1 + Math.sin(k * 4) * .04; x2.scale(s, s);
      try { w.icon(x2, 104, k); } catch (e) {}
      tipRaf = requestAnimationFrame(anim);
    })(t0);
  }
  function hideTip() { $('#tip').hidden = true; tipFor = null; tipPinned = false; cancelAnimationFrame(tipRaf); }
  document.addEventListener('pointerdown', e => { if (!$('#tip').hidden && !e.target.closest('#tip') && !e.target.closest('.wc')) hideTip(); });

  function buy(w) {
    const s = S(); if (s.coins < w.price || s.owned.includes(w.id)) { BD.audio.play('deny'); return; }
    s.coins -= w.price; s.owned.push(w.id); BD.save.write();
    hideTip(); updHud(true); renderDock(); G.select(w.id);
    celebrate(w.name, iconCanvas(w, 360), 'נפתח!');
  }
  function celebrate(name, canvas, stamp) {
    openOv(`<div class="unl"><h2>${name}</h2><div class="cv"></div><div class="stamp">${stamp}</div><div class="row" style="justify-content:center"><button class="btn" data-x>יאללה!</button></div></div>`, '', true);
    BD.audio.play('unlock');
    $('#ovBox .cv').appendChild(canvas);
    if (G.running) { BD.fx.confetti(G.W / 2, G.H * .4, 90); BD.fx.shake(.3); }
  }

  /* ---------- overlays ---------- */
  function openOv(html, cls, loud) {
    const o = $('#ov'), b = $('#ovBox'); b.className = 'box ' + (cls || ''); b.innerHTML = html; o.hidden = false;
    b.querySelectorAll('[data-x]').forEach(x => x.onclick = () => { BD.audio.play('click'); closeOv(); });
    if (G.running && G.mode !== 'demo') { if (G.P.down && G.wpn && G.wpn.up) { G.P.down = false; G.wpn.up(G.P); } G.paused = true; if (!loud) BD.audio.hold(true); }
    hideTip();
  }
  function closeOv() { $('#ov').hidden = true; if (G.running) G.paused = false; BD.audio.hold(false); }
  $('#ov').addEventListener('pointerdown', e => { if (e.target.id === 'ov' && !$('#ovBox').dataset.lock) closeOv(); });
  const X = '<button class="btn ghost x" data-x>סגירה</button>';

  function pauseMenu() {
    const M = BD.MODES[G.mode];
    openOv(`<h2>הפסקה</h2><p class="lead">${M.name}${G.mode === 'challenge' ? ' · ' + M.m.name + ': ' + M.m.desc : ''}</p>
      <div class="row"><button class="btn" data-x>להמשיך</button><button class="btn ghost" data-a="again">להתחיל מחדש</button>
      ${G.mode === 'challenge' ? '<button class="btn ghost" data-a="list">משימות</button>' : ''}
      <button class="btn ghost" data-a="shop">חנות</button><button class="btn ghost" data-a="settings">הגדרות</button><button class="btn ghost" data-a="home">למסך הראשי</button></div>`);
    bindOv();
  }
  function bindOv() {
    $('#ovBox').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      BD.audio.play('click'); const a = b.dataset.a;
      if (a === 'again') play(G.mode, G.opt);
      if (a === 'home') { closeOv(); showTitle(); }
      if (a === 'list') missions();
      if (a === 'shop') shop();
      if (a === 'settings') settings();
      if (a === 'ach') achievements();
    });
  }
  function results(title, sub, ok) {
    const M = BD.MODES[G.mode];
    openOv(`<h2>${title}</h2><p class="lead">${sub}</p>
      <div class="res"><div><b>${fmt(G.score)}</b><span>נקודות</span></div><div><b>${fmt(G.roundCoins || 0)}</b><span>מטבעות במשחק הזה</span></div>
      <div><b>${G.combo.best}</b><span>הקומבו הכי גבוה</span></div><div><b>${G.stat.kos}</b><span>נוקאאוטים</span></div></div>
      <div class="row">${G.mode === 'challenge' && ok ? '<button class="btn" data-a="next">למשימה הבאה</button>' : '<button class="btn" data-a="again">עוד פעם</button>'}
      ${G.mode === 'challenge' ? '<button class="btn ghost" data-a="list">כל המשימות</button>' : ''}<button class="btn ghost" data-a="free">להמשיך לשחק חופשי</button><button class="btn ghost" data-a="home">למסך הראשי</button></div>`);
    $('#ovBox').dataset.lock = 1;
    bindOv();
    const nx = $('#ovBox [data-a=next]'); if (nx) nx.onclick = () => { const i = BD.MISSIONS.indexOf(M.m), n = BD.MISSIONS.find((m, j) => j > i && !S().ch[m.id]) || BD.MISSIONS[(i + 1) % BD.MISSIONS.length]; startMission(n); };
    const fr = $('#ovBox [data-a=free]'); if (fr) fr.onclick = () => { delete $('#ovBox').dataset.lock; play('sandbox'); };
  }
  const _close = closeOv;
  function missions() {
    const s = S();
    openOv(`<h2>אתגרים</h2><p class="lead">כל משימה נותנת מטבעות בפעם הראשונה. במשימות מסוימות מקבלים כלים בהשאלה.</p><div class="grid" id="mlist"></div><div class="row">${X}</div>`);
    const L = $('#mlist');
    BD.MISSIONS.forEach((m, i) => {
      const d = !!s.ch[m.id], b = el('button', 'it' + (d ? ' done' : ''), `<span class="st">${d ? 'הושלם' : 'משימה ' + (i + 1)}</span><b>${m.name}</b><small>${m.desc}</small><span class="st">+${m.reward}</span>`);
      b.onclick = () => startMission(m); L.appendChild(b);
    });
  }
  function startMission(m) { delete $('#ovBox').dataset.lock; play('challenge', { mission: m.id, allow: m.allow || [] }); }
  function shop() {
    const s = S();
    const UP = [['hit', 'מכות חזקות', 'כל מכה ביד או בכלי מכות חזקה ב־20%', [150, 400, 900]], ['boom', 'פיצוצים גדולים', 'פיצוצים רחבים וחזקים יותר', [200, 500, 1100]], ['coin', 'מגנט מטבעות', '20% יותר מטבעות מכל מכה', [250, 600, 1300]]];
    openOv(`<h2>חנות</h2><p class="lead">יש לכם <b style="color:var(--yellow)">${fmt(s.coins)}</b> מטבעות. נשקים פותחים מהסרגל למטה.</p>
      <h3>שדרוגים</h3><div class="grid" id="ups"></div><h3>בובות</h3><div class="grid" id="skins"></div><div class="row">${X}</div>`);
    const U = $('#ups');
    for (const [k, n, d, prices] of UP) {
      const lv = s.up[k] || 0, pr = prices[lv];
      const b = el('div', 'it', `<b>${n}</b><small>${d}</small><span class="lv">${[0, 1, 2].map(i => `<i class="${i < lv ? 'f' : ''}"></i>`).join('')}</span>
        ${pr ? `<button class="btn" ${s.coins >= pr ? '' : 'disabled'}>שלב ${lv + 1} · ${fmt(pr)}</button>` : '<span class="st">מקסימום</span>'}`);
      const btn = b.querySelector('button'); if (btn) btn.onclick = () => { if (s.coins < pr) return; s.coins -= pr; s.up[k] = lv + 1; BD.save.write(); BD.audio.play('buy'); updHud(true); shop(); toast(n, 'שלב ' + (lv + 1) + ' נפתח', true); };
      U.appendChild(b);
    }
    const K = $('#skins');
    for (const [id, sk] of Object.entries(BD.SKINS)) {
      const own = s.skins.includes(id), on = s.skin === id;
      const b = el('div', 'it' + (on ? ' on' : ''), `<canvas width="300" height="220"></canvas><b>${sk.name}</b><small>${sk.desc}</small>
        ${on ? '<span class="st">בשימוש</span>' : own ? '<button class="btn ghost">ללבוש</button>' : `<button class="btn" ${s.coins >= sk.price ? '' : 'disabled'}>לקנות · ${fmt(sk.price)}</button>`}`);
      drawSkin(b.querySelector('canvas'), id);
      const btn = b.querySelector('button');
      if (btn) btn.onclick = () => {
        if (!own) { if (s.coins < sk.price) return; s.coins -= sk.price; s.skins.push(id); BD.audio.play('buy'); }
        s.skin = id; BD.save.write(); updHud(true);
        if (G.dummy) { G.dummy.skin = sk; }
        if (!own) { const c = document.createElement('canvas'); c.width = 300; c.height = 220; drawSkin(c, id); celebrate(sk.name, c, 'נפתח!'); } else shop();
      };
      K.appendChild(b);
    }
  }
  /* a still portrait of each dummy skin, posed with a throwaway physics world */
  function drawSkin(cv, id) {
    const x = cv.getContext('2d'), ph = new BD.Phys(); const old = BD.save.d.skin; BD.save.d.skin = id;
    const d = new BD.Dummy(ph, 150, 420); BD.save.d.skin = old;
    x.fillStyle = '#151515'; x.fillRect(0, 0, 300, 220);
    x.save(); x.translate(0, 8); x.scale(.5, .5); x.translate(150, -40); d.draw(x, 0); x.restore();
  }
  function achievements() {
    const s = S();
    openOv(`<h2>הישגים</h2><p class="lead">${Object.keys(s.ach).length} מתוך ${BD.ACH.length} · סה״כ ${fmt(s.stats.dmg)} נקודות נזק · ${fmt(s.stats.earned || 0)} מטבעות הורווחו</p><div class="grid" id="alist"></div><div class="row">${X}</div>`);
    for (const a of BD.ACH) { const d = !!s.ach[a.id]; $('#alist').appendChild(el('div', 'it' + (d ? ' done' : ' lockd'), `<span class="st">${d ? 'הושג' : '+' + a.reward}</span><b>${a.name}</b><small>${a.desc}</small>`)); }
  }
  function settings() {
    const s = S();
    openOv(`<h2>הגדרות</h2>
      <div class="setr"><label>אפקטים</label><input type="range" min="0" max="1" step=".05" value="${s.vol.sfx}" data-k="sfx"></div>
      <div class="setr"><label>מוזיקה</label><input type="range" min="0" max="1" step=".05" value="${s.vol.music}" data-k="music"></div>
      <div class="setr"><label>כבידה</label><input type="range" min="0" max="2" step=".1" value="${s.gravity ?? 1}" data-k="grav"><b id="gv" style="font:700 26px var(--display);min-width:3ch">${s.gravity ?? 1}</b></div>
      <div class="setr"><label>רעידות מסך</label><span class="shk">${[['כבוי', 0], ['עדין', 1], ['חזק', 2]].map(([n, v]) => `<button class="btn${(s.shake2 ?? 0) === v ? '' : ' ghost'}" data-sh="${v}">${n}</button>`).join('')}</span></div>
      <div class="row"><button class="btn ghost" data-a="mute">${s.muted ? 'להפעיל צליל' : 'להשתיק הכל'}</button><button class="btn ghost" data-a="ach">הישגים</button><button class="btn ghost" data-a="reset">איפוס התקדמות</button>${X}</div>`);
    $('#ovBox').querySelectorAll('input').forEach(i => i.oninput = () => {
      const v = +i.value; if (i.dataset.k === 'grav') { s.gravity = v; $('#gv').textContent = v; } else s.vol[i.dataset.k] = v;
      BD.audio.apply(); BD.save.write();
    });
    bindOv();
    $('#ovBox').querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { s.shake2 = +b.dataset.sh; BD.save.write(); if (s.shake2) { BD.fx.S.shake = 0; BD.fx.shake(.6); } settings(); });
    $('#ovBox [data-a=mute]').onclick = () => { s.muted = !s.muted; BD.audio.apply(); BD.save.write(); sndIcon(); settings(); };
    $('#ovBox [data-a=reset]').onclick = function () {
      if (!this.dataset.sure) { this.dataset.sure = 1; this.textContent = 'בטוח? לחצו שוב'; this.classList.remove('ghost'); return; }
      BD.save.reset(); closeOv(); showTitle(); toast('ההתקדמות אופסה', '');
    };
  }
  function sndIcon() { $('#sndBtn').classList.toggle('off', S().muted); }

  /* ---------- buttons and keys ---------- */
  function wire() {
    document.querySelectorAll('#title [data-mode]').forEach(b => b.onclick = () => { BD.audio.init(); BD.audio.play('click'); if (b.dataset.mode === 'challenge') missions(); else play(b.dataset.mode); });
    document.querySelectorAll('#title [data-open]').forEach(b => b.onclick = () => { BD.audio.init(); BD.audio.play('click'); ({ shop, ach: achievements, settings })[b.dataset.open](); });
    $('#menuBtn').onclick = () => { BD.audio.play('click'); pauseMenu(); };
    $('#slowBtn').onclick = function () { G.userSlow = !G.userSlow; this.setAttribute('aria-pressed', G.userSlow); BD.audio.play('click'); };
    $('#gravBtn').onclick = () => { const L = [1, .5, .2, 0, 1.6], s = S(), i = L.indexOf(s.gravity ?? 1); s.gravity = L[(i + 1) % L.length]; BD.save.write(); BD.audio.play('portal'); toast('כבידה: ' + s.gravity, s.gravity === 0 ? 'אפס כבידה, הכל מרחף' : s.gravity < 1 ? 'כבידה נמוכה' : s.gravity > 1 ? 'כבידה כבדה' : 'רגילה'); updHud(); };
    $('#sndBtn').onclick = () => { BD.audio.init(); const s = S(); s.muted = !s.muted; BD.audio.apply(); BD.save.write(); sndIcon(); };
    $('#fsBtn').onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement); };
    $('#finBtn').onclick = () => G.finisher();
    $('#c4Btn').onclick = () => BD.W.c4 && BD.W.c4.detonate && BD.W.c4.detonate();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!$('#ov').hidden) { if (!$('#ovBox').dataset.lock) closeOv(); } else if (G.running && G.mode !== 'demo') pauseMenu(); }
      if (!G.running || G.mode === 'demo' || !$('#ov').hidden) return;
      if (e.key === ' ' && G.finisherReady()) { e.preventDefault(); G.finisher(); }
      const n = +e.key; if (n >= 1 && n <= 9) { const c = document.querySelectorAll('.wc')[n - 1]; if (c) c.click(); }
      if (e.key === 'h' || e.key === 'ח') G.select('hand');
    });
    window.addEventListener('blur', () => { if (G.running && G.mode !== 'demo' && $('#ov').hidden) pauseMenu(); });
    sndIcon();
  }

  /* ---------- start ---------- */
  // a code on the main site unlocks everything: weapons, dummies and upgrades
  // code 6767 was deleted: its coins, weapons, skins and upgrades go back to the starting set
  try { const used = JSON.parse(localStorage.getItem('hanasi:codes') || '[]'), s = S();
    if (used.includes('d07164a628596323ebcf8796dee0e5c164620e0922b52483bc805f54416ee73c') && !s.rev6767) { s.rev6767 = 1; delete s.grantAll; s.coins = Math.max(0, (+s.coins || 0) - 999999);
      s.owned = ['bat', 'glove', 'grenade', 'pistol', 'fire', 'anvil']; s.skins = ['crash']; s.skin = 'crash'; s.up = { hit: 0, boom: 0, coin: 0 }; BD.save.write(); } } catch (e) {}
  if (S().grantAll) { const s = S(); s.owned = BD.WL.map(w => w.id).filter(i => i !== 'hand'); s.skins = Object.keys(BD.SKINS); s.up = { hit: 3, boom: 3, coin: 3 }; delete s.grantAll; BD.save.write(); }
  wire();
  loading().then(showTitle).catch(e => { console.error(e); $('#ldTxt').textContent = 'שגיאה בטעינה: ' + e.message; });
  if (location.hash.includes('test')) window.__BD = { BD, G, play, showTitle, shop, missions, settings, pauseMenu, closeOv };
})();
