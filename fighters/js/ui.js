/* Menus and screens (DOM overlay over the canvas). */
'use strict';
NF.ui = (() => {
  const root = document.getElementById('ui');
  const C = NF.chars.LIST, A = NF.arenas.LIST;
  const $ = (s, el = root) => el.querySelector(s);
  const S = { mode: 'pvc', diff: NF.store.get('diff', 'normal'), p: [0, 1], arena: null };
  let keyHandler = null;
  addEventListener('keydown', e => { NF.audio.init(); if (keyHandler) keyHandler(e); });
  addEventListener('pointerdown', () => NF.audio.init(), { once: false });

  function show(html, cls = 'screen fade') { root.innerHTML = `<div class="${cls}">${html}</div>`; keyHandler = null; return root.firstElementChild; }
  function menuNav(el, onBack) {
    const btns = [...el.querySelectorAll('button:not([disabled])')];
    let i = 0; const focus = () => { btns.forEach((b, k) => b.classList.toggle('hot', k === i)); };
    btns.forEach((b, k) => b.addEventListener('mouseenter', () => { i = k; focus(); NF.audio.play('blip'); }));
    focus();
    keyHandler = e => {
      if (['ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'].includes(e.code)) { i = (i + 1) % btns.length; focus(); NF.audio.play('blip'); e.preventDefault(); }
      else if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA'].includes(e.code)) { i = (i - 1 + btns.length) % btns.length; focus(); NF.audio.play('blip'); e.preventDefault(); }
      else if (['Enter', 'Space', 'KeyF', 'KeyK'].includes(e.code)) { e.preventDefault(); btns[i].click(); }
      else if (e.code === 'Escape' && onBack) onBack();
    };
  }
  function click(el, sel, fn) { el.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => { NF.audio.init(); NF.audio.play('confirm'); fn(b, e); })); }

  /* ================= main menu ================= */
  function mainMenu() {
    NF.app.toMenu(); NF.audio.music('menu');
    const el = show(`
      <div class="logo"><b>NAC FIGHTERS</b><span>BATTLE FOR HANASI</span></div>
      <div class="menu">
        <button class="mbtn" data-a="play">PLAY<small>קרב מהיר מול המחשב</small></button>
        <button class="mbtn" data-a="pvp">PLAYER VS PLAYER<small>שני שחקנים · מקלדת אחת</small></button>
        <button class="mbtn" data-a="pvc">PLAYER VS COMPUTER<small>בחרו רמה ויריב</small></button>
        <button class="mbtn" data-a="how">HOW TO PLAY<small>איך משחקים</small></button>
        <button class="mbtn" data-a="set">SETTINGS<small>סאונד ומקשים</small></button>
        <button class="mbtn ghost" data-a="back">← BACK TO TRIBE WEBSITE</button>
      </div>
      <div class="foot">שבט הנשיא · מחנאות מעל הכל</div>`);
    click(el, '[data-a]', b => {
      const a = b.dataset.a;
      if (a === 'play') { S.mode = 'pvc'; S.diff = S.diff || 'normal'; select(); }
      if (a === 'pvp') { S.mode = 'pvp'; select(); }
      if (a === 'pvc') { S.mode = 'pvc'; difficulty(); }
      if (a === 'how') how(mainMenu);
      if (a === 'set') settings(mainMenu);
      if (a === 'back') location.href = '../';
    });
    menuNav(el);
  }

  function difficulty() {
    const D = [['easy', 'EASY', 'תגובות איטיות, מכות בסיסיות'], ['normal', 'NORMAL', 'קומבו, חסימות ומהלכים מיוחדים'], ['hard', 'HARD', 'ריווח חכם, עונש על כל טעות']];
    const el = show(`<div class="panel"><h2>DIFFICULTY</h2><div class="diff">${D.map(([k, n, d]) => `<button class="dcard${S.diff === k ? ' hot' : ''}" data-d="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="mbtn ghost" data-b>← חזרה</button></div></div>`);
    click(el, '[data-d]', b => { S.diff = b.dataset.d; NF.store.set('diff', S.diff); select(); });
    click(el, '[data-b]', () => mainMenu());
    menuNav(el, mainMenu);
  }

  /* ================= character select ================= */
  function select() {
    NF.audio.music('select');
    const two = S.mode === 'pvp';
    const st = { cur: [S.p[0] ?? 0, S.p[1] ?? 1], lock: [false, false], picking: 0, arena: S.arena };
    const el = show(`
      <h1>CHOOSE YOUR FIGHTER</h1>
      <div class="side p1"><div class="tag">P1</div><canvas width="360" height="480"></canvas><div class="nm"></div><div class="stats"></div><div class="moves"></div></div>
      <div class="center">
        <div class="grid">${C.map((c, i) => `<button class="pcard" data-i="${i}" aria-label="${c.he}"><img src="assets/${c.img}.webp" alt=""><span>${c.name.replace('THE ', '')}</span></button>`).join('')}</div>
        <div class="hint" id="hint"></div>
        <div class="arenas">${A.map((a, i) => `<button class="acard" data-ar="${a.id}" style="background:linear-gradient(160deg,${a.thumb[0]},${a.thumb[1]})">${a.name}</button>`).join('')}<button class="acard" data-ar="" style="background:linear-gradient(160deg,#111,#333)">RANDOM</button></div>
      </div>
      <div class="side p2"><div class="tag">${two ? 'P2' : 'CPU · ' + S.diff.toUpperCase()}</div><canvas width="360" height="480"></canvas><div class="nm"></div><div class="stats"></div><div class="moves"></div></div>
      <div class="bottom"><button class="mbtn ghost" data-b>← חזרה</button><button class="mbtn" data-go disabled style="opacity:.4">FIGHT!</button></div>`, 'csel fade');
    const cards = [...el.querySelectorAll('.pcard')], sides = [$('.side.p1', el), $('.side.p2', el)];
    const keys = NF.input.binds;
    const sk = i => NF.input.keyName(keys[i].special);
    function fill(side, ci, pl) {
      const c = C[ci];
      side.querySelector('.nm').innerHTML = `${c.name}<small>${c.he} · ${c.title}</small>`;
      const lab = { power: 'כוח', speed: 'מהירות', defense: 'הגנה', range: 'טווח', special: 'מיוחד' };
      side.querySelector('.stats').innerHTML = Object.entries(c.stats).map(([k, v]) => `<i>${lab[k]}</i><div class="bar"><b style="width:${v * 10}%"></b></div>`).join('');
      const nk = sk(pl), dirs = ['', '→+', '↓+', '←+'];
      side.querySelector('.moves').innerHTML = c.specials.map((m, k) => `<div><span>${m.name} <small style="opacity:.6">${m.en}</small></span><em>${dirs[k]}${nk}</em></div>`).join('') + `<div class="u"><span>⚡ ${c.ult.name} · ${c.ult.he}</span><em>${NF.input.keyName(keys[pl].ult)}</em></div>`;
      NF.app.preview(pl, c);
    }
    function render() {
      cards.forEach((cd, i) => {
        cd.classList.toggle('h1', st.cur[0] === i); cd.classList.toggle('h2', st.cur[1] === i);
        cd.querySelectorAll('.who').forEach(w => w.remove());
        if (st.cur[0] === i) cd.insertAdjacentHTML('beforeend', '<i class="who a">P1</i>');
        if (st.cur[1] === i) cd.insertAdjacentHTML('beforeend', `<i class="who b">${two ? 'P2' : 'CPU'}</i>`);
      });
      fill(sides[0], st.cur[0], 0); fill(sides[1], st.cur[1], 1);
      sides.forEach((s, i) => { s.querySelector('.ready')?.remove(); if (st.lock[i]) s.insertAdjacentHTML('beforeend', '<div class="ready">READY!</div>'); });
      el.querySelectorAll('.acard').forEach(a => a.classList.toggle('hot', a.dataset.ar === (st.arena || '')));
      const done = st.lock[0] && st.lock[1], go = $('[data-go]', el);
      go.disabled = !done; go.style.opacity = done ? 1 : .4;
      $('#hint', el).innerHTML = two
        ? `P1: <kbd>${NF.input.keyName(keys[0].left)}</kbd><kbd>${NF.input.keyName(keys[0].right)}</kbd> ובחירה <kbd>${NF.input.keyName(keys[0].light)}</kbd> &nbsp;·&nbsp; P2: <kbd>←</kbd><kbd>→</kbd> ובחירה <kbd>${NF.input.keyName(keys[1].light)}</kbd>`
        : (st.picking === 0 ? 'בחרו את הלוחם שלכם' : st.lock[1] ? 'מוכנים! לחצו FIGHT או Enter' : 'עכשיו בחרו את היריב (או לחצו שוב לבחירה אקראית)');
    }
    function lock(pl) {
      if (st.lock[pl]) return; st.lock[pl] = true; NF.audio.play('confirm');
      NF.app.previewAct(pl);
      if (!two && pl === 0) { st.picking = 1; }
      render();
      if (st.lock[0] && st.lock[1]) setTimeout(() => { if (root.contains(el)) start(); }, 900);
    }
    function move(pl, d) { if (st.lock[pl]) return; st.cur[pl] = (st.cur[pl] + d + C.length) % C.length; NF.audio.play('blip'); render(); }
    function start() { if (!(st.lock[0] && st.lock[1])) return; S.p = st.cur.slice(); S.arena = st.arena; vs(); }
    cards.forEach((cd, i) => {
      cd.addEventListener('mouseenter', () => { const pl = two ? (st.lock[0] ? 1 : 0) : st.picking; if (!st.lock[pl]) { st.cur[pl] = i; render(); } });
      cd.addEventListener('click', () => { NF.audio.init(); const pl = two ? (st.lock[0] ? 1 : 0) : st.picking; st.cur[pl] = i; lock(pl); });
    });
    click(el, '[data-ar]', b => { st.arena = b.dataset.ar || null; render(); });
    click(el, '[data-b]', () => { if (st.lock[1]) { st.lock[1] = false; render(); } else if (st.lock[0]) { st.lock[0] = false; st.picking = 0; render(); } else (S.mode === 'pvc' ? difficulty() : mainMenu()); });
    $('[data-go]', el).addEventListener('click', start);
    keyHandler = e => {
      const b = NF.input.binds, c = e.code;
      const p1 = two || st.picking === 0 ? 0 : 1;
      if (c === b[0].left) move(p1, -1); else if (c === b[0].right) move(p1, 1);
      else if (c === b[0].light || (c === 'Enter' && !two)) { if (st.lock[0] && st.lock[1]) start(); else lock(p1); }
      else if (c === b[0].heavy) { if (st.lock[p1]) { st.lock[p1] = false; if (!two && p1 === 1) { } render(); } else if (!two && p1 === 1) { st.lock[0] = false; st.picking = 0; render(); } }
      if (two) {
        if (c === b[1].left) move(1, -1); else if (c === b[1].right) move(1, 1);
        else if (c === b[1].light) lock(1); else if (c === b[1].heavy) { st.lock[1] = false; render(); }
        if (c === 'Enter' && st.lock[0] && st.lock[1]) start();
      }
      if (c === 'Escape') { $('[data-b]', el).click(); }
      if (/Arrow|Space/.test(c)) e.preventDefault();
    };
    render();
  }

  /* ================= VS ================= */
  function vs() {
    const a = C[S.p[0]], b = C[S.p[1]];
    const ar = S.arena ? NF.arenas.byId[S.arena] : NF.pick(A); S.curArena = ar;
    NF.audio.music(null); NF.audio.play('ultStart'); setTimeout(() => NF.audio.play('fight'), 380);
    show(`<div class="vs"><div class="arena">${ar.name} · ${ar.he}</div>
      <div class="half a"><img src="assets/${a.img}.webp" alt=""></div><div class="half b"><img src="assets/${b.img}.webp" alt=""></div>
      <div class="nmA">${a.name}</div><div class="nmB">${b.name}</div><div class="big">VS</div></div>`, 'screen');
    setTimeout(() => game(), 2600);
  }

  /* ================= game ================= */
  function game() {
    root.innerHTML = '';
    const two = S.mode === 'pvp';
    const opts = {
      p1: C[S.p[0]], p2: C[S.p[1]], arena: S.curArena || A[0], mode: S.mode,
      c1: new NF.KeyCtrl(0), c2: two ? new NF.KeyCtrl(1) : new NF.AICtrl(S.diff),
      labels: two ? ['P1', 'P2'] : ['P1', 'CPU'],
      onEnd: win => setTimeout(() => result(win), 2400),
    };
    NF.app.startMatch(opts);
    NF.audio.music('battle');
    keyHandler = e => { if (e.code === 'Escape' || e.code === 'KeyP') pause(); };
  }
  function pause() {
    const M = NF.app.match; if (!M || M.phase === 'matchEnd') return;
    M.paused = true; NF.audio.music(null);
    const el = show(`<div class="pausebg"><div class="panel" style="text-align:center"><h2>PAUSED</h2><div class="menu">
      <button class="mbtn" data-a="res">RESUME</button><button class="mbtn" data-a="re">RESTART MATCH</button><button class="mbtn" data-a="how">HOW TO PLAY</button><button class="mbtn" data-a="set">SETTINGS</button><button class="mbtn" data-a="ch">CHANGE CHARACTER</button><button class="mbtn" data-a="mm">MAIN MENU</button></div></div></div>`, 'screen');
    const resume = () => { root.innerHTML = ''; M.paused = false; NF.input.clear(); NF.audio.music('battle'); keyHandler = e => { if (e.code === 'Escape' || e.code === 'KeyP') pause(); }; };
    click(el, '[data-a]', b => {
      const a = b.dataset.a;
      if (a === 'res') resume(); if (a === 're') game(); if (a === 'ch') { NF.app.stopMatch(); select(); } if (a === 'mm') mainMenu();
      if (a === 'how') how(pause); if (a === 'set') settings(pause);
    });
    menuNav(el, resume);
  }
  document.getElementById('tpause').addEventListener('click', () => pause());

  function result(win) {
    const M = NF.app.match; if (!M) return;
    const wdef = C[S.p[win]];
    const title = S.mode === 'pvp' ? `PLAYER ${win + 1} WINS!` : (win === 0 ? `${wdef.name} WINS!` : `${wdef.name} WINS!`);
    const sub = S.mode === 'pvc' ? (win === 0 ? 'ניצחתם את המחשב ברמת ' + S.diff.toUpperCase() + '!' : 'המחשב ניצח הפעם. עוד סיבוב?') : `${wdef.he} מנצח/ת ${M.wins[win]}–${M.wins[1 - win]}`;
    if (S.mode === 'pvc' && win === 0) { const k = 'wins:' + S.diff; NF.store.set(k, NF.store.get(k, 0) + 1); }
    NF.audio.music('victory');
    const el = show(`<div class="result"><img src="assets/${wdef.img}.webp" alt=""><div><h2>${title}</h2><p>${sub}</p><div class="menu">
      <button class="mbtn" data-a="re">REMATCH</button><button class="mbtn" data-a="ch">CHANGE CHARACTER</button><button class="mbtn" data-a="mm">MAIN MENU</button></div></div></div>`, 'screen');
    click(el, '[data-a]', b => { const a = b.dataset.a; if (a === 're') game(); if (a === 'ch') { NF.app.stopMatch(); select(); } if (a === 'mm') mainMenu(); });
    menuNav(el);
  }

  /* ================= how to play ================= */
  function how(back) {
    const b = NF.input.binds, k = NF.input.keyName;
    const rows = [['תזוזה', 'left', 'right'], ['קפיצה', 'up'], ['כריעה', 'down'], ['מכה קלה', 'light'], ['מכה חזקה', 'heavy'], ['מהלך מיוחד', 'special'], ['מכת על', 'ult']];
    const el = show(`<div class="panel"><h2>HOW TO PLAY</h2>
      <table class="keys"><tr><th></th><th>שחקן 1</th><th>שחקן 2</th></tr>${rows.map(([n, a, a2]) => `<tr><td>${n}</td><td><kbd>${k(b[0][a])}</kbd>${a2 ? ` <kbd>${k(b[0][a2])}</kbd>` : ''}</td><td><kbd>${k(b[1][a])}</kbd>${a2 ? ` <kbd>${k(b[1][a2])}</kbd>` : ''}</td></tr>`).join('')}</table>
      <h3>מהלכים מיוחדים</h3><p>לכל לוחם 4 מהלכים: <kbd>מיוחד</kbd> לבד · <kbd>קדימה + מיוחד</kbd> · <kbd>למטה + מיוחד</kbd> · <kbd>אחורה + מיוחד</kbd>. הרשימה המלאה מופיעה במסך בחירת הלוחם.</p>
      <h3>חסימה</h3><p>החזיקו <b>אחורה</b> (הרחק מהיריב) כדי לחסום. מכות נמוכות (סוויפ, הלם קרקע) חוסמים רק <b>בכריעה + אחורה</b>, ומכות מהאוויר רק <b>בעמידה</b>. מהלכים מיוחדים גורמים נזק קטן גם בחסימה.</p>
      <h3>קומבו</h3><p>כשמכה פוגעת אפשר לשרשר: קלה → קלה → חזקה → מיוחד. כל מכה נוספת בקומבו עושה קצת פחות נזק. מכות שמעיפות לאוויר מאפשרות להמשיך לפגוע באוויר.</p>
      <h3>מכת על</h3><p>המד מתחת לפס החיים מתמלא כשפוגעים וכשחוטפים. כשכתוב <b style="color:#ffcf40">ULTIMATE READY!</b> לחצו על מקש מכת העל, ואי אפשר לחסום אותה.</p>
      <p style="opacity:.7">הפסקה: <kbd>Esc</kbd> או <kbd>P</kbd>. בטלפון: ג׳ויסטיק משמאל וכפתורים מימין.</p>
      <div class="row"><button class="mbtn ghost" data-b>← חזרה</button></div></div>`);
    click(el, '[data-b]', () => back());
    menuNav(el, back);
  }

  /* ================= settings ================= */
  function settings(back) {
    const el = show(`<div class="panel"><h2>SETTINGS</h2>
      <div class="row"><label>מוזיקה <input type="range" min="0" max="1" step=".05" value="${NF.audio.vol.music}" data-v="music"></label><label>אפקטים <input type="range" min="0" max="1" step=".05" value="${NF.audio.vol.sfx}" data-v="sfx"></label></div>
      <h3>מקשים</h3><div id="kb"></div>
      <div class="row" style="margin-top:12px"><label><input type="checkbox" data-touch ${NF.store.get('touch', NF.input.isTouch) ? 'checked' : ''}> כפתורי מגע במסך</label><button class="mbtn ghost" data-reset>איפוס מקשים</button><button class="mbtn ghost" data-b>← חזרה</button></div></div>`);
    el.querySelectorAll('[data-v]').forEach(r => r.addEventListener('input', () => { NF.audio.setVol(r.dataset.v, +r.value); if (r.dataset.v === 'sfx') NF.audio.play('hitL'); }));
    $('[data-touch]', el).addEventListener('change', e => NF.store.set('touch', e.target.checked));
    const names = { left: 'שמאלה', right: 'ימינה', up: 'קפיצה', down: 'כריעה', light: 'קלה', heavy: 'חזקה', special: 'מיוחד', ult: 'מכת על' };
    const drawKb = () => {
      const b = NF.input.binds;
      $('#kb', el).innerHTML = `<table class="keys"><tr><th></th><th>שחקן 1</th><th>שחקן 2</th></tr>${NF.input.ACTIONS.map(a => `<tr><td>${names[a]}</td>${[0, 1].map(i => `<td><button class="kb" data-p="${i}" data-act="${a}">${NF.input.keyName(b[i][a])}</button></td>`).join('')}</tr>`).join('')}</table>`;
      el.querySelectorAll('.kb').forEach(btn => btn.addEventListener('click', () => { btn.classList.add('wait'); btn.textContent = '…'; const prev = keyHandler; keyHandler = null; NF.input.rebind(+btn.dataset.p, btn.dataset.act, () => { drawKb(); setTimeout(() => keyHandler = prev, 0); }); }));
    };
    drawKb();
    click(el, '[data-reset]', () => { NF.input.reset(); drawKb(); });
    click(el, '[data-b]', () => back());
    keyHandler = e => { if (e.code === 'Escape') back(); };
  }

  return { mainMenu, pause, S };
})();
