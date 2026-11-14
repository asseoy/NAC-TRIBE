// All sound is synthesized with WebAudio: wind by speed, wing beats, fire breath roar, one-shot effects, a soft camp-guitar-ish drone.
let ctx, master, windG, windF, fireG, musicG;
function noiseBuf(sec = 2) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = w * 0.5 + l * 3; } return b; }
function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf(); s.loop = true; s.start(); return s; }

export const audio = {
  vol: 0.8,
  init() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = audio.vol; master.connect(ctx.destination);
    // wind
    windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.Q.value = 0.7; windG = ctx.createGain(); windG.gain.value = 0;
    loopNoise().connect(windF); windF.connect(windG); windG.connect(master);
    // breath
    const fF = ctx.createBiquadFilter(); fF.type = 'lowpass'; fF.frequency.value = 900; fireG = ctx.createGain(); fireG.gain.value = 0;
    loopNoise().connect(fF); fF.connect(fireG); fireG.connect(master);
    // music: slow chord pad (Am F C G), very quiet
    musicG = ctx.createGain(); musicG.gain.value = 0.05; musicG.connect(master);
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]];
    let ci = 0; const play = () => { const t = ctx.currentTime; for (const f of chords[ci % 4]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 6); o.connect(g); g.connect(musicG); o.start(t); o.stop(t + 6.2); } ci++; };
    play(); setInterval(play, 5000);
  },
  setVol(v) { audio.vol = v; if (master) master.gain.value = v; },
  update(speed, breath, flapPhase, storm) {
    if (!ctx) return; const t = ctx.currentTime;
    windG.gain.setTargetAtTime(0.04 + Math.min(1, speed / 60) * 0.35 + (storm ? 0.25 : 0), t, 0.2);
    windF.frequency.setTargetAtTime(300 + speed * 18, t, 0.2);
    fireG.gain.setTargetAtTime(breath ? 0.55 : 0, t, 0.05);
    musicG.gain.setTargetAtTime(storm ? 0.015 : 0.05, t, 1);
  },
  flap(power) { if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(0.5); f.type = 'lowpass'; f.frequency.value = 500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * power, t + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.4); },
  sfx(name) {
    if (!ctx) return; const t = ctx.currentTime;
    const tone = (f, d, type = 'sine', v = 0.2, at = 0, f2) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + d); g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(v, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + at + d); o.connect(g); g.connect(master); o.start(t + at); o.stop(t + at + d + 0.05); };
    const burst = (d, freq, v, type = 'lowpass') => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(d + 0.1); f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.1); };
    if (name === 'radio') { burst(0.12, 2500, 0.15, 'bandpass'); tone(1200, 0.06, 'square', 0.04); }
    if (name === 'ring') { tone(660, 0.25, 'triangle', 0.25); tone(990, 0.35, 'triangle', 0.2, 0.08); }
    if (name === 'ignite') { burst(1.2, 700, 0.8); tone(110, 1.2, 'sawtooth', 0.12, 0, 55); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, 'triangle', 0.15, 0.25 + i * 0.12)); }
    if (name === 'pickup') { tone(520, 0.15, 'square', 0.1); tone(780, 0.2, 'square', 0.1, 0.1); }
    if (name === 'cheer') { burst(1.6, 1800, 0.35, 'bandpass'); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'triangle', 0.15, i * 0.1)); }
    if (name === 'thunder') { burst(2.8, 220, 1.2); burst(0.3, 3000, 0.4, 'highpass'); }
    if (name === 'poof') { burst(0.5, 1200, 0.5); tone(300, 0.4, 'sine', 0.15, 0, 80); }
    if (name === 'win') { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.7, 'triangle', 0.18, i * 0.15)); }
    if (name === 'lose') { [392, 330, 262].forEach((f, i) => tone(f, 0.5, 'triangle', 0.18, i * 0.2)); }
  },
};
