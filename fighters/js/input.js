/* Keyboard (by physical key code, so a Hebrew layout works too) + touch controls. */
'use strict';
NF.input = (() => {
  const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'ult'];
  const DEFAULT = [
    { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', light: 'KeyF', heavy: 'KeyG', special: 'KeyH', ult: 'KeyR' },
    { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', light: 'KeyK', heavy: 'KeyL', special: 'Semicolon', ult: 'KeyO' },
  ];
  let binds = NF.store.get('binds', null) || JSON.parse(JSON.stringify(DEFAULT));
  const down = new Set();
  const edges = new Set();          // codes pressed since last poll
  const touch = { left: 0, right: 0, up: 0, down: 0, light: 0, heavy: 0, special: 0, ult: 0 };
  const touchEdges = new Set();
  let listening = null;             // remap callback

  addEventListener('keydown', e => {
    if (listening) { e.preventDefault(); const cb = listening; listening = null; cb(e.code); return; }
    if (!down.has(e.code)) edges.add(e.code);
    down.add(e.code);
    if (NF.inGame && /^(Arrow|Space)/.test(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => down.delete(e.code));
  addEventListener('blur', () => { down.clear(); });

  /* per-player state with a short press buffer (for cancels and combos) */
  function make() { return { held: {}, pressed: {}, buf: {} }; }
  const P = [make(), make()];
  function poll() {
    for (let i = 0; i < 2; i++) {
      const b = binds[i], p = P[i];
      for (const a of ACTIONS) {
        const h = down.has(b[a]) || (i === 0 && touch[a] > 0);
        const pr = edges.has(b[a]) || (i === 0 && touchEdges.has(a));
        p.held[a] = h; p.pressed[a] = pr;
        if (pr) p.buf[a] = 8; else if (p.buf[a] > 0) p.buf[a]--;
      }
    }
    edges.clear(); touchEdges.clear();
  }
  function consume(i, a) { P[i].buf[a] = 0; }
  function anyPressed(codes) { for (const c of edges) if (!codes || codes.includes(c)) return c; return null; }

  /* --- touch: left stick + buttons (player 1) --- */
  function setupTouch() {
    const el = document.getElementById('touch'), stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let sid = null, cx = 0, cy = 0;
    const set = (dx, dy) => {
      const m = 46, len = Math.hypot(dx, dy), k = len > m ? m / len : 1;
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      const L = dx < -16, R = dx > 16, U = dy < -26, D = dy > 22;
      if (U && !touch.up) touchEdges.add('up');
      touch.left = L ? 1 : 0; touch.right = R ? 1 : 0; touch.up = U ? 1 : 0; touch.down = D ? 1 : 0;
    };
    stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(e.clientX - cx, e.clientY - cy); e.preventDefault(); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === sid) set(e.clientX - cx, e.clientY - cy); });
    const end = e => { if (e.pointerId === sid) { sid = null; set(0, 0); } };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    el.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); touch[k] = 1; touchEdges.add(k); b.classList.add('on'); NF.audio.init(); });
      const up = () => { touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  }
  const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches;

  function keyName(code) {
    if (!code) return '—';
    const m = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: 'רווח', ShiftLeft: 'Shift', ShiftRight: 'Shift R', Enter: 'Enter', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=' };
    if (m[code]) return m[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
    return code;
  }
  return {
    ACTIONS, P, poll, consume, setupTouch, isTouch, keyName, anyPressed,
    get binds() { return binds; },
    rebind(i, a, cb) { listening = code => { binds[i][a] = code; NF.store.set('binds', binds); cb(code); }; },
    reset() { binds = JSON.parse(JSON.stringify(DEFAULT)); NF.store.set('binds', binds); },
    isDown: c => down.has(c),
    clear() { down.clear(); edges.clear(); for (const k in touch) touch[k] = 0; },
  };
})();
