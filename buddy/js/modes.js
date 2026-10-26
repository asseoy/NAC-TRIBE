/* The four modes, the challenge missions and the achievements. */
'use strict';
BD.MISSIONS = [
  { id: 'm1', name: 'חימום', desc: 'תגיעו ל־500 נקודות', goal: g => g.score / 500, reward: 40 },
  { id: 'm2', name: 'לזרוק לתקרה', desc: 'זרקו את הבובה לתקרה 3 פעמים', start: g => g.stat.ceil0 = BD.save.d.stats.ceil, goal: g => (BD.save.d.stats.ceil - g.stat.ceil0) / 3, reward: 50, allow: [] },
  { id: 'm3', name: 'קומבו ראשון', desc: 'קומבו של 10', goal: g => g.combo.best / 10, reward: 60 },
  { id: 'm4', name: 'שובר קרח', desc: 'הקפיאו ואז תנו מכה חזקה', goal: g => g.stat.specials.ice ? 1 : 0, reward: 80, allow: ['ice', 'hammer'] },
  { id: 'm5', name: 'תקיפה אווירית', desc: 'זרקו את הבובה לאוויר ופגעו בה עם טיל', goal: g => g.stat.specials.airstrike ? 1 : 0, reward: 90, allow: ['rocket', 'launcher'] },
  { id: 'm6', name: 'נוקאאוט', desc: 'הפילו את הבובה בנוקאאוט', goal: g => g.stat.kos, reward: 70 },
  { id: 'm7', name: 'פינבול', desc: 'בזריקה אחת: רצפה, קיר ותקרה', goal: g => g.stat.specials.pinball ? 1 : 0, reward: 90 },
  { id: 'm8', name: 'מהיר וחזק', desc: '2,000 נקודות ב־30 שניות', time: 30, goal: g => g.score / 2000, reward: 100 },
  { id: 'm9', name: 'קפיצה חשמלית', desc: 'חשמלו את הבובה כשהיא באוויר', goal: g => g.stat.specials.zapbounce ? 1 : 0, reward: 90, allow: ['lightning'] },
  { id: 'm10', name: 'טורנדו של אש', desc: 'פיצוץ בתוך טורנדו', goal: g => g.stat.specials.firenado ? 1 : 0, reward: 110, allow: ['tornado', 'grenade', 'dynamite'] },
  { id: 'm11', name: 'תוכנית החלל', desc: 'כבידה נמוכה ואז רקטות', goal: g => g.stat.specials.space ? 1 : 0, reward: 110, allow: ['gravity', 'rocket'] },
  { id: 'm12', name: 'אדים', desc: 'הציתו ואז כבו עם מים', goal: g => g.stat.specials.steam ? 1 : 0, reward: 80, allow: ['fire', 'water'] },
  { id: 'm13', name: 'יצירתי', desc: 'שלושה סוגי נשק בתוך 4 שניות', goal: g => g.stat.specials.creative ? 1 : 0, reward: 80 },
  { id: 'm14', name: 'קומבו 25', desc: 'קומבו של 25', goal: g => g.combo.best / 25, reward: 130 },
  { id: 'm15', name: 'מכת גמר', desc: 'הפעילו מכת גמר (קומבו 20)', goal: g => g.stat.fin, reward: 150 },
  { id: 'm16', name: 'הרס מוחלט', desc: '10,000 נקודות ב־60 שניות', time: 60, goal: g => g.score / 10000, reward: 180 },
  { id: 'm17', name: 'אל האופק', desc: 'הבובה נבלעת בחור שחור', goal: g => g.stat.specials.blackhole ? 1 : 0, reward: 140, allow: ['blackhole'] },
  { id: 'm18', name: 'פטרייה', desc: 'פצצה גרעינית אחת', goal: g => (g.stat.used.nuke ? 1 : 0), reward: 200, allow: ['nuke'] }
];
BD.ACH = [
  { id: 'a1', name: 'מכה ראשונה', desc: 'פגעתם בבובה', test: s => s.stats.hits >= 1, reward: 10 },
  { id: 'a2', name: 'אלף נקודות', desc: '1,000 נקודות נזק בסך הכל', test: s => s.stats.dmg >= 1000, reward: 20 },
  { id: 'a3', name: 'מאה אלף', desc: '100,000 נקודות נזק בסך הכל', test: s => s.stats.dmg >= 100000, reward: 150 },
  { id: 'a4', name: 'עד התקרה', desc: 'זריקה לתקרה', test: s => s.stats.ceil >= 1, reward: 15 },
  { id: 'a5', name: 'נוקאאוט', desc: 'נוקאאוט ראשון', test: s => (s.stats.ko || 0) >= 1, reward: 25 },
  { id: 'a6', name: 'עשרה נוקאאוטים', desc: '10 נוקאאוטים', test: s => (s.stats.ko || 0) >= 10, reward: 80 },
  { id: 'a7', name: 'קומבו 15', desc: 'קומבו של 15', test: s => s.stats.best >= 15, reward: 30 },
  { id: 'a8', name: 'קומבו 40', desc: 'קומבו של 40', test: s => s.stats.best >= 40, reward: 120 },
  { id: 'a9', name: 'אספן', desc: 'עשרה נשקים פתוחים', test: s => s.owned.length >= 10, reward: 60 },
  { id: 'a10', name: 'ארסנל', desc: '25 נשקים פתוחים', test: s => s.owned.length >= 25, reward: 200 },
  { id: 'a11', name: 'הכל פתוח', desc: 'כל הנשקים פתוחים', test: s => BD.WL.every(w => w.id === 'hand' || s.owned.includes(w.id)), reward: 500 },
  { id: 'a12', name: 'מכת גמר', desc: 'הפעלתם מכת גמר', test: s => (s.stats.fin || 0) >= 1, reward: 50 },
  { id: 'a13', name: 'קומבו מיוחד', desc: '5 קומבואים מיוחדים שונים', test: s => Object.keys(s.stats.sp || {}).filter(k => k !== 'ko').length >= 5, reward: 100 },
  { id: 'a14', name: 'משימות', desc: '10 אתגרים הושלמו', test: s => Object.keys(s.ch).length >= 10, reward: 120 },
  { id: 'a15', name: 'שורד', desc: 'סיבוב 5 בהישרדות', test: s => s.surv.best >= 5, reward: 100 },
  { id: 'a16', name: 'מלביש', desc: 'קניתם בובה חדשה', test: s => s.skins.length >= 2, reward: 30 }
];
BD.checkAch = function () {
  const s = BD.save.d;
  for (const a of BD.ACH) if (!s.ach[a.id] && a.test(s)) {
    s.ach[a.id] = 1; s.coins += a.reward; BD.save.write();
    BD.G.emit('ach', a);
  }
};

BD.MODES = {
  sandbox: { name: 'ארגז חול', coinK: 1 },
  /* a mission: one goal, sometimes a clock, sometimes borrowed weapons */
  challenge: {
    name: 'אתגרים', coinK: .6,
    start(o) {
      const G = BD.G, m = this.m = BD.MISSIONS.find(m => m.id === o.mission) || BD.MISSIONS[0];
      this.time = m.time || 0; this.done = false; this.fail = false; this.prog = 0;
      G.stat.ceil0 = BD.save.d.stats.ceil; if (m.start) m.start(G);
    },
    update(dt, rdt) {
      const G = BD.G, m = this.m; if (this.done || this.fail) return;
      if (G.finishing) return;
      this.prog = BD.clamp(m.goal(G) || 0, 0, 1);
      if (this.prog >= 1) {
        this.done = true; const S = BD.save.d, first = !S.ch[m.id];
        S.ch[m.id] = 1; if (first) G.addCoins(m.reward, 'mission');
        BD.save.write(); G.emit('missionDone', m, first);
        return;
      }
      if (m.time) { this.time -= rdt; if (this.time <= 0) { this.time = 0; this.fail = true; G.emit('missionFail', m); } }
    }
  },
  /* survival: every round he gets tougher and heals faster */
  survival: {
    name: 'הישרדות', coinK: .8,
    start() { this.round = 1; this.time = 30; this.got = 0; this.over = false; this.target = this.need(1); BD.G.emit('round', 1); },
    need(r) { return Math.round(600 + (r - 1) * 450 + (r - 1) * (r - 1) * 60); },
    armor() { return 1 / (1 + (this.round - 1) * .22); },
    regen() { return .015 + this.round * .012; },
    dmgK() { return 1; },
    update(dt, rdt) {
      const G = BD.G; if (this.over || G.finishing) return;
      this.got = G.score - (this.base || 0);
      if (this.got >= this.target) {
        const bonus = 10 + this.round * 8; G.addCoins(bonus, 'round');
        this.round++; this.base = G.score; this.time = 30; this.target = this.need(this.round);
        const S = BD.save.d; S.surv.best = Math.max(S.surv.best, this.round - 1); BD.save.write();
        G.emit('round', this.round, bonus);
        return;
      }
      this.time -= rdt;
      if (this.time <= 0) { this.time = 0; this.over = true; const S = BD.save.d; S.surv.best = Math.max(S.surv.best, this.round - 1); BD.save.write(); G.emit('survivalOver', this.round - 1); }
    }
  },
  /* chaos: the room fires random weapons by itself, gravity goes crazy */
  chaos: {
    name: 'כאוס', coinK: 1.2,
    start() { this.t = 2; this.gt = 9; },
    update(dt, rdt) {
      const G = BD.G; if (G.finishing) return;
      this.t -= dt; this.gt -= dt;
      if (this.t <= 0) {
        this.t = BD.rand(1.3, 2.6);
        const list = BD.WL.filter(w => w.fireAt && !w.noChaos);
        const w = BD.pick(list), d = G.dummy;
        const [cx, cy] = d && !d.gone ? d.center : [G.W / 2, G.floor - 200];
        const x = BD.clamp(cx + BD.rand(-220, 220), 60, G.W - 60), y = BD.clamp(cy + BD.rand(-200, 120), 60, G.floor - 30);
        try { w.fireAt(x, y); G.emit('chaosEvent', w); } catch (e) { console.error(w.id, e); }
      }
      if (this.gt <= 0) {
        this.gt = BD.rand(8, 13);
        const k = BD.pick([[0, -.6], [0, .25], [.8, .3], [-.8, .3], [0, 2]]);
        G.bendGravity(k[0], k[1], 3.5); BD.audio.play('portal');
        G.emit('chaosGravity', k);
      }
    }
  }
};
