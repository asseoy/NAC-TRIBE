/* הלוקר של הנשיא – skins, locker, crates and live trades.
   Items come from the tribe catalog (items.js). Rarity = age: the older the item, the rarer it is.
   State lives in localStorage ('hanasi:locker'); coins come from the site's XP ('hanasi:xp'). */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const rnd=Math.random, pick=a=>a[(rnd()*a.length)|0], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>{const a=new Uint32Array(2);crypto.getRandomValues(a);return (a[0].toString(36)+a[1].toString(36)).slice(0,10)};
const fmt=n=>Math.round(n).toLocaleString('he-IL');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};

/* ---------------- data ---------------- */
const RAR=[
  {k:'leg', n:'אגדי',     stamp:'אגדי',     c:'#F3E03B',val:300,yrs:'לפני 2000'},
  {k:'myth',n:'מיתולוגי', stamp:'מיתולוגי', c:'#FD1D1D',val:120,yrs:'2000–2005'},
  {k:'epic',n:'אפי',      stamp:'אפי',      c:'#c64bd8',val:50, yrs:'2006–2010'},
  {k:'rare',n:'נדיר',     stamp:'נדיר',     c:'#8a63ff',val:22, yrs:'2011–2015'},
  {k:'spec',n:'מיוחד',    stamp:'מיוחד',    c:'#3f86ff',val:10, yrs:'2016–2020 או שנה לא ידועה'},
  {k:'new', n:'רגיל',     stamp:'רגיל',     c:'#b8b2aa',val:5,  yrs:'2021 והלאה'},
];
const ITEMS=LK_ITEMS.map((a,ix)=>({id:a[0],n:a[1],y:a[2],c:a[3],s:a[4],r:a[5],sl:a[6],im:a[7],col:a[8],ix}));
const BYID=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const BYR=RAR.map((_,r)=>ITEMS.filter(i=>i.r===r));
const SLOTS=[
  {k:'hat',  n:'כובע',          ic:'+',cats:'כובעים'},
  {k:'neck', n:'צעיף / חם צוואר',ic:'+',cats:'צעיפים, חם צוואר'},
  {k:'shirt',n:'חולצה',         ic:'+',cats:'חולצות'},
  {k:'outer',n:'שכבה עליונה',   ic:'+',cats:'סווצ׳רטים, פליזים, סרבלים'},
  {k:'pants',n:'מכנסיים',       ic:'+',cats:'מכנסיים'},
  {k:'acc',  n:'אביזר',         ic:'+',cats:'מגני זיעה, צמידים, חאקי ועוד'},
];
const CRATES=[
  {k:'mahsan',  n:'ארגז המחסן',   d:'ארגז העץ הקלאסי של השבט. כל פריט יכול לצאת.',price:100,
   w:[.8,3.2,9,17,30,40], wood:'linear-gradient(135deg,#b07a3f,#6b3f17)',trim:'#3a210b',band:'#d62b2f',cc:'#c98a4a'},
  {k:'mahteret',n:'תיבת המחתרת',  d:'בלי פריטים רגילים, וסיכוי גבוה יותר לבגד ישן.',price:300,
   w:[1.5,6.5,15,32,45,0], wood:'linear-gradient(135deg,#2a1b1f,#0b0607)',trim:'#d62b2f',band:'#f6be3c',cc:'#d62b2f'},
  {k:'archive', n:'ארגז הארכיון', d:'רק פריטים מ־2010 ומטה: אפי ומעלה בלבד.',price:800,
   w:[6,24,70,0,0,0], wood:'linear-gradient(135deg,#ffe28a,#b8790a)',trim:'#5a3a00',band:'#140a0b',cc:'#ffcc33'},
];
const CR=Object.fromEntries(CRATES.map(c=>[c.k,c]));
const RANKS=[[0,"חניך"],[400,"חניך ותיק"],[1200,"שכב״גיסט"],[2500,"מדריך"],[4500,"מרכז"],[7500,"מחתרת"],[11000,"פנאט על"]];
const rankOf=x=>{let r=RANKS[0][1];for(const [t,n] of RANKS)if(x>=t)r=n;return r};
const WEAR=[[.07,'חדש מהמחסן'],[.15,'כמעט חדש'],[.38,'נלבש במחנה'],[.45,'שרד חלוץ'],[1.01,'קרוע מהשטח']];
const wearName=w=>WEAR.find(x=>w<x[0])[1];

/* atlas thumbnails: 8×8 per sheet */
const thStyle=it=>{const a=(it.ix/64)|0,k=it.ix%64,c=k%8,r=(k/8)|0;return `background-image:url(img/atlas${a}.webp);background-position:${c/7*100}% ${r/7*100}%`};
const imgSrc=(it,j=0)=>`img/${it.id}_${j}.webp`;
const yrTxt=it=>it.y?String(it.y):'?';

/* ---------------- store ---------------- */
const KEY='hanasi:locker';
let lsOK=true;try{localStorage.setItem('__lk','1');localStorage.removeItem('__lk')}catch(e){lsOK=false}
const readXP=()=>{try{return JSON.parse(localStorage.getItem('hanasi:xp'))||0}catch(e){return 0}};
let S=null;
function load(){
  let s=null;if(lsOK){try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){}}
  if(!s||s.v!==1){s={v:1,name:'',coins:0,xpSeen:0,inv:[],eq:{},crates:{mahsan:2,mahteret:0,archive:0},daily:'',seen:{},hist:[],stats:{opened:0,traded:0},fresh:1}}
  s.sets=s.sets||{};if(!s.eco2){s.coins=Math.floor((s.coins||0)/10);s.eco2=1;s.xpRem=0}s.inv=(s.inv||[]).filter(x=>BYID[x.i]);
  for(const k in s.eq)if(!s.inv.some(x=>x.u===s.eq[k]))delete s.eq[k];
  return s;
}
function save(){if(lsOK){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}}
const inst=u=>S.inv.find(x=>x.u===u);
const valOf=x=>{const it=BYID[x.i];return Math.round(RAR[it.r].val*(x.sg?2:1)*(1.2-x.w*.4))};

/* ---------------- audio ---------------- */
const AU={ctx:null,on:true};
try{AU.on=localStorage.getItem('hanasi:lksnd')!=='0'}catch(e){}
function ac(){if(!AU.on)return null;if(!AU.ctx){try{AU.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(AU.ctx.state==='suspended')AU.ctx.resume();return AU.ctx}
function tone(f,d=.12,type='sine',v=.18,slide=0,delay=0){const c=ac();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.02)}
function noise(d=.3,v=.2,hp=800,delay=0){const c=ac();if(!c)return;const t=c.currentTime+delay,b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(rnd()*2-1)*(1-i/a.length);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp;g.gain.value=v;s.connect(f).connect(g).connect(c.destination);s.start(t)}
const SND={
  tick:p=>tone(1400+p*900,.03,'square',.05),
  click:()=>tone(660,.05,'triangle',.12),
  coin:()=>{tone(1320,.09,'square',.07);tone(1980,.16,'square',.06,0,.07)},
  equip:()=>{noise(.18,.12,2500);tone(300,.18,'sawtooth',.06,500)},
  rise:()=>{tone(120,1.1,'sawtooth',.07,600);noise(1.1,.06,300)},
  boom:()=>{tone(90,.6,'sine',.4,-60);noise(.5,.25,200)},
  lock:()=>{tone(220,.06,'square',.12);tone(440,.08,'square',.1,0,.06)},
  win:r=>{const base=[[523,659,784,1047],[440,554,659,880],[392,494,587,784],[349,440,523,698],[330,415,494,659],[294,370,440,587]][r];base.forEach((f,i)=>tone(f,r<2?1.6:.9,'triangle',.13,0,i*.07));if(r<2){[1047,1319,1568,2093].forEach((f,i)=>tone(f,.9,'sine',.07,0,.35+i*.09));noise(.9,.08,4000,.1)}},
  deal:()=>{[392,523,659,784,1047].forEach((f,i)=>tone(f,.5,'triangle',.12,0,i*.08))},
  err:()=>tone(160,.25,'square',.1,-40),
};

/* ---------------- particles (canvas) ---------------- */
const FX=(()=>{const cv=$('#fx'),g=cv.getContext('2d');let P=[],run=false,dpr=1;
  function size(){dpr=Math.min(1.5,devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr}
  const LOW=Math.min(innerWidth,innerHeight)<700, K=LOW?.3:.5;
  size();addEventListener('resize',size);
  function loop(){g.clearRect(0,0,cv.width,cv.height);P=P.filter(p=>p.l>0);
    for(const p of P){p.l-=1/60;p.vy+=p.g;p.vx*=p.dr;p.vy*=p.dr;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;
      const cs=Math.cos(p.a),sn=Math.sin(p.a);g.setTransform(cs,sn,-sn,cs,p.x*dpr,p.y*dpr);g.globalAlpha=clamp(p.l/p.L*1.6,0,1);g.fillStyle=p.c;
      if(p.t==='c'){g.beginPath();g.arc(0,0,p.s*dpr,0,7);g.fill()}else if(p.t==='s'){g.beginPath();g.moveTo(0,-p.s*2.4*dpr);g.lineTo(p.s*.5*dpr,0);g.lineTo(0,p.s*2.4*dpr);g.lineTo(-p.s*.5*dpr,0);g.closePath();g.moveTo(-p.s*2.4*dpr,0);g.lineTo(0,p.s*.5*dpr);g.lineTo(p.s*2.4*dpr,0);g.lineTo(0,-p.s*.5*dpr);g.fill()}else g.fillRect(-p.s*dpr,-p.s*.5*dpr,p.s*2*dpr,p.s*dpr)}
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
    if(P.length)requestAnimationFrame(loop);else{run=false;g.clearRect(0,0,cv.width,cv.height)}}
  return {burst(x,y,n,cols,o={}){n=Math.round(n*K);for(let i=0;i<n;i++){const a=o.up?(-Math.PI/2+(rnd()-.5)*(o.spread||1.6)):rnd()*7,sp=(o.sp||6)*(.35+rnd());
      P.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,g:o.g??.18,dr:o.dr??.985,a:rnd()*7,va:(rnd()-.5)*.35,s:(o.s||4)*(.5+rnd()),c:pick(cols),t:o.t||'r',l:(o.l||1.6)*(.6+rnd()*.6),L:o.l||1.6})}
      if(!run){run=true;requestAnimationFrame(loop)}},
    rain(n,cols){n=Math.round(n*K);for(let i=0;i<n;i++)P.push({x:rnd()*innerWidth,y:-20-rnd()*innerHeight*.6,vx:(rnd()-.5)*2,vy:2+rnd()*3,g:.05,dr:.995,a:rnd()*7,va:(rnd()-.5)*.3,s:4+rnd()*4,c:pick(cols),t:'r',l:3.5,L:3.5});if(!run){run=true;requestAnimationFrame(loop)}}};
})();
const centerOf=el=>{const b=el.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]};

/* ---------------- toast + wallet ---------------- */
function toast(t,cls=''){const d=document.createElement('div');d.className='toast '+cls;d.innerHTML=t;$('#toasts').append(d);setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},2600)}
function crateCount(){return Object.values(S.crates).reduce((a,b)=>a+b,0)}
let shownCoins=null,coinRaf=0;
function rollCoins(){const el=$('#wCoins b'),to=S.coins;if(shownCoins===null||Math.abs(to-shownCoins)<2){shownCoins=to;el.textContent=fmt(to);return}
  cancelAnimationFrame(coinRaf);const from=shownCoins,t0=performance.now(),d=Math.min(1200,300+Math.abs(to-from)/3);
  const f=n=>{const t=clamp((n-t0)/d,0,1),e=1-Math.pow(1-t,3);shownCoins=from+(to-from)*e;el.textContent=fmt(shownCoins);if(t<1)coinRaf=requestAnimationFrame(f);else shownCoins=to};coinRaf=requestAnimationFrame(f)}
function wallet(bump){
  rollCoins();$('#wCrates b').textContent=crateCount();$('#wRank').textContent=rankOf(readXP());
  const n=crateCount(),bd=$('#crBadge');bd.hidden=!n;bd.textContent=n;
  if(bump){const el=$(bump==='coins'?'#wCoins':'#wCrates');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
}
const XP_PER_COIN=10;
function syncXP(){const xp=readXP();if(xp>S.xpSeen){const pool=(S.xpRem||0)+xp-S.xpSeen;S.xpSeen=xp;const d=Math.floor(pool/XP_PER_COIN);S.xpRem=pool-d*XP_PER_COIN;if(d>0){S.coins+=d;wallet('coins');toast(`+${fmt(d)} אסימונים מהמשחקים`,'gold');SND.coin()}save()}}

/* ---------------- avatar ---------------- */
const eqItem=k=>{const x=S.eq[k]&&inst(S.eq[k]);return x?BYID[x.i]:null};
const PAT={hat:[110,30,142,74],neck:[126,146,68,110],shirt:[60,146,200,190],outer:[56,124,208,222],pants:[86,314,148,126],acc:[58,296,34,32]};
function pat(k,it){const [x,y,w,h]=PAT[k];return `<pattern id="pt-${k}" patternUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${it.col}"/><image href="${imgSrc(it)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></pattern>`}
const mirD=d=>d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,(m,x,y)=>(320-x)+' '+y);
/* the scout: smooth outlined shapes, every garment gets the item photo as its fabric + a soft volume shading on top */
function figSVG(flash){
  const it={};SLOTS.forEach(s=>it[s.k]=eqItem(s.k));
  const O='stroke="#140a0b" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"';
  const fl=k=>flash===k?' flashme':'';
  const G=(k,d,def)=>`<path class="part g-${k}${fl(k)}" data-slot="${k}" d="${d}" fill="${it[k]?`url(#pt-${k})`:def}" ${O}/><path d="${d}" fill="url(#vol)" pointer-events="none"/>`;
  const SK='#e0ad84',SKD='#c08c62',SKS='#a8744d';
  const skin=d=>`<path d="${d}" fill="${SK}" ${O}/><path d="${d}" fill="url(#vol)" pointer-events="none"/>`;
  let s=`<svg viewBox="0 0 320 640" xmlns="http://www.w3.org/2000/svg"><defs>${SLOTS.map(x=>it[x.k]?pat(x.k,it[x.k]):'').join('')}
  <linearGradient id="vol" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".38" stop-color="#000" stop-opacity="0"/><stop offset=".38" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
  <linearGradient id="khaki" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdb27a"/><stop offset="1" stop-color="#b39660"/></linearGradient>
  <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26324f"/><stop offset="1" stop-color="#1a2238"/></linearGradient>
  <pattern id="stripes" patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(38)"><rect width="18" height="18" fill="#c8161c"/><rect width="7" height="18" fill="#140a0b"/><rect x="7" width="2" height="18" fill="#f6be3c"/></pattern>
  <radialGradient id="shad"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="160" cy="592" rx="96" ry="15" fill="url(#shad)"/>`;
  /* hood resting on the shoulders (behind the head) */
  if(it.outer)s+=G('outer','M114 168 C112 138 134 124 160 124 C186 124 208 138 206 168 C192 158 128 158 114 168 Z','#000');
  /* legs, socks, shoes */
  const legL='M102 432 L148 432 C147 470 145 512 143 552 L109 552 C107 512 104 470 102 432 Z';
  s+=skin(legL)+skin(mirD(legL));
  s+=`<path d="M124 470 q6 8 0 16" stroke="${SKS}" stroke-width="2.5" fill="none"/><path d="M196 470 q-6 8 0 16" stroke="${SKS}" stroke-width="2.5" fill="none"/>`;
  const sock='M108 532 L144 532 L143 556 L109 556 Z';
  s+=`<path d="${sock}" fill="#f2ece4" ${O}/><path d="${mirD(sock)}" fill="#f2ece4" ${O}/><path d="M109 540 L144 540 M109 546 L144 546 M176 540 L211 540 M176 546 L211 546" stroke="#d62b2f" stroke-width="3"/>`;
  const shoe='M106 552 L146 552 C151 562 154 572 154 582 L80 582 C80 570 92 560 106 552 Z';
  s+=`<path d="${shoe}" fill="#1b1416" ${O}/><path d="${mirD(shoe)}" fill="#1b1416" ${O}/><path d="M78 580 L156 580 L156 592 L78 592 Z" fill="#f4f0ea" ${O}/><path d="${mirD('M78 580 L156 580 L156 592 L78 592 Z')}" fill="#f4f0ea" ${O}/>
  <path d="M112 560 l14 4 M110 566 l14 4 M208 560 l-14 4 M210 566 l-14 4" stroke="#f4f0ea" stroke-width="2.4" stroke-linecap="round"/><path d="M84 574 L152 574 M168 574 L236 574" stroke="#d62b2f" stroke-width="3"/>`;
  /* shorts */
  s+=G('pants','M96 316 L224 316 L233 432 L169 436 L160 362 L151 436 L87 432 Z','url(#navy)');
  s+=`<path d="M96 316 L224 316 L225 332 L95 332 Z" fill="#000" opacity=".3" pointer-events="none"/><path d="M160 334 L160 362 M120 340 l-4 40 M200 340 l4 40" stroke="#140a0b" stroke-width="2.2" opacity=".45" fill="none"/>`;
  /* torso */
  const shirt='M104 160 C122 151 138 149 146 149 L160 168 L174 149 C182 149 198 151 216 160 L225 236 C223 270 225 300 228 330 L92 330 C95 300 97 270 95 236 Z';
  const hood='M98 158 C120 146 140 143 160 145 C180 143 200 146 222 158 L231 236 C229 280 231 312 235 344 L85 344 C89 312 91 280 89 236 Z';
  if(!it.outer){
    s+=G('shirt',shirt,'url(#khaki)');
    s+=`<path d="M146 149 L160 170 L174 149" fill="${SKD}" ${O}/><path d="M138 150 L160 176 L182 150" fill="none" stroke="#140a0b" stroke-width="3" opacity=".55"/>`;
    if(!it.shirt)s+=`<path d="M112 196 L132 196 L132 214 L112 214 Z M188 196 L208 196 L208 214 L188 214 Z" fill="none" stroke="#7d6640" stroke-width="2.5"/><circle cx="160" cy="210" r="2.4" fill="#7d6640"/><circle cx="160" cy="240" r="2.4" fill="#7d6640"/><circle cx="160" cy="270" r="2.4" fill="#7d6640"/>`;
  }else{
    s+=G('outer',hood,'#000');
    s+=`<path d="M124 282 L196 282 L206 328 L114 328 Z" fill="#000" opacity=".25" stroke="#140a0b" stroke-width="2.4" pointer-events="none"/><path d="M85 334 L235 334" stroke="#000" stroke-width="7" opacity=".25"/>
    <path d="M150 168 C148 190 147 204 146 220 M170 168 C172 190 173 204 174 220" stroke="#f4f0ea" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="142" y="218" width="7" height="12" rx="2" fill="#c9c2b8"/><rect x="171" y="218" width="7" height="12" rx="2" fill="#c9c2b8"/>`;
  }
  /* neckerchief: tribe stripes by default, or the equipped scarf */
  const band='M132 150 C146 162 174 162 188 150 L192 168 C176 180 144 180 128 168 Z', tails='M146 172 L160 256 L174 172 C170 176 150 176 146 172 Z';
  s+=G('neck',tails,'url(#stripes)')+G('neck',band,'url(#stripes)')+`<rect x="150" y="180" width="20" height="16" rx="5" fill="#e9c35a" ${O}/><path d="M153 186 L167 186" stroke="#a37a1c" stroke-width="2"/>`;
  /* arms */
  const sleeveL='M106 160 C92 168 80 196 74 232 L100 244 C104 222 110 206 117 196 Z', armL='M78 230 C72 262 66 292 64 318 L85 324 C89 298 95 268 100 244 Z', longL='M102 158 C84 170 70 210 62 316 L90 324 C96 270 104 226 118 198 Z';
  const hand=x=>`<path d="M${x-12} 326 C${x-14} 340 ${x-8} 350 ${x+1} 350 C${x+11} 350 ${x+14} 338 ${x+11} 326 Z" fill="${SK}" ${O}/><path d="M${x+10} 330 q8 4 4 12" stroke="#140a0b" stroke-width="2.6" fill="${SK}"/>`;
  const arm=side=>{const m=side==='R'?mirD:(d=>d);let a='';
    if(it.outer)a+=G('outer',m(longL),'#000')+`<path d="${m('M62 308 L90 316 L90 326 L61 318 Z')}" fill="#000" opacity=".3" pointer-events="none"/>`;
    else a+=skin(m(armL))+G('shirt',m(sleeveL),'url(#khaki)')+`<path d="${m('M74 232 L100 244')}" stroke="#140a0b" stroke-width="5" opacity=".25"/>`;
    a+=side==='R'?hand(246):hand(74);
    if(side==='L')a+=it.acc?G('acc','M62 300 L88 306 L87 322 L60 316 Z',''):`<path class="part" data-slot="acc" d="M58 294 L92 302 L90 328 L56 320 Z" fill="transparent"/>`;
    return a};
  s+=arm('L')+arm('R');
  /* head */
  s+=`<path d="M147 132 L173 132 L175 160 L145 160 Z" fill="${SKD}" ${O}/>`;
  const ear=x=>`<ellipse cx="${x}" cy="98" rx="9" ry="13" fill="${SK}" ${O}/><path d="M${x} 92 q${x<160?4:-4} 6 0 12" stroke="${SKS}" stroke-width="2.4" fill="none"/>`;
  s+=ear(115)+ear(205);
  const head='M160 40 C197 40 207 66 206 94 C205 122 190 144 160 147 C130 144 115 122 114 94 C113 66 123 40 160 40 Z';
  s+=skin(head);
  s+=`<ellipse cx="135" cy="118" rx="9" ry="5" fill="#ff6b6b" opacity=".22"/><ellipse cx="185" cy="118" rx="9" ry="5" fill="#ff6b6b" opacity=".22"/>
  <path d="M128 84 Q140 76 152 82 M168 82 Q180 76 192 84" stroke="#2a1712" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="141" cy="98" rx="8" ry="6.5" fill="#fff" stroke="#140a0b" stroke-width="2"/><ellipse cx="179" cy="98" rx="8" ry="6.5" fill="#fff" stroke="#140a0b" stroke-width="2"/>
  <circle cx="143" cy="99" r="4" fill="#2b1a10"/><circle cx="181" cy="99" r="4" fill="#2b1a10"/><circle cx="144.5" cy="97.5" r="1.4" fill="#fff"/><circle cx="182.5" cy="97.5" r="1.4" fill="#fff"/>
  <path d="M161 104 Q156 116 163 118" stroke="${SKS}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M145 127 Q160 138 176 126" stroke="#140a0b" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M151 131 Q160 135 169 131" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`;
  if(it.hat){
    const crown='M114 90 C111 52 134 34 160 34 C188 34 210 52 206 90 C190 82 130 82 114 90 Z', brim='M196 84 C222 82 248 92 252 104 C232 106 210 98 192 92 Z';
    s+=G('hat',brim,'#000')+`<path d="${brim}" fill="#000" opacity=".25" pointer-events="none"/>`+G('hat',crown,'#000')+`<path d="M160 36 C150 50 144 66 142 86 M160 36 C170 50 176 66 178 86" stroke="#140a0b" stroke-width="2" opacity=".45" fill="none"/><circle cx="160" cy="35" r="5" fill="#140a0b"/>`;
  }else s+=`<path class="part" data-slot="hat" d="M114 92 C108 56 128 30 160 30 C196 28 214 56 206 92 L198 74 L191 86 L184 66 L172 78 L164 60 L153 76 L142 62 L134 82 L124 70 Z" fill="#2a1712" ${O}/><path d="M138 44 Q160 36 182 46" stroke="#fff" stroke-width="3" opacity=".15" fill="none"/>`;
  return s+'</svg>';
}
function renderAvatar(flash){
  const fig=$('#fig');fig.innerHTML=figSVG(flash);if(flash){fig.classList.remove('pop');void fig.offsetWidth;fig.classList.add('pop')}
  let best=6,score=0;SLOTS.forEach(s=>{const x=S.eq[s.k]&&inst(S.eq[s.k]);if(x){score+=valOf(x);best=Math.min(best,BYID[x.i].r)}});
  
  $('#avName').textContent=S.name||'צופה של הנשיא';
  $('#avScore').textContent=score?`ערך הלבוש: ${fmt(score)} אסימונים · ${rankOf(readXP())}`:'הדמות לובשת את מדי הבסיס. הלבישו אותה מהלוקר!';
  if(flash){const g=$$('.flashme',fig);g.forEach(p=>{const c=p.cloneNode();c.removeAttribute('class');c.setAttribute('class','flash');c.setAttribute('fill','#fff');c.removeAttribute('stroke');p.after(c)});
    const el=g[0];if(el){const [x,y]=centerOf(el);const r=eqItem(flash);FX.burst(x,y,40,[r?RAR[r.r].c:'#fff','#fff','#ffd75a'],{s:3,sp:7,g:.12})}}
  fig.querySelectorAll('.part').forEach(p=>p.addEventListener('click',()=>openPicker(p.dataset.slot)));
  $('#slotList').innerHTML=SLOTS.map(s=>{const it=eqItem(s.k);
    return `<button class="slot ${it?'r'+it.r:''}" data-slot="${s.k}"><span class="sth" style="${it?`background-image:url(${imgSrc(it)})`:''}">${it?'':s.ic}</span><span><b>${s.n}</b>${it?`<small>${esc(it.n)}</small><small class="rn">${RAR[it.r].n} · ${yrTxt(it)}</small>`:`<small>ריק · ${s.cats}</small>`}</span></button>`}).join('');
}
function equip(u){const x=inst(u);if(!x)return;const it=BYID[x.i];S.eq[it.sl]=u;save();SND.equip();renderAvatar(it.sl);renderGrid()}
function unequip(k){delete S.eq[k];save();SND.click();renderAvatar();renderGrid()}

/* ---------------- locker grid ---------------- */
const F={cat:'הכל',q:'',sort:'rar',mode:'mine'};
const CATS=['הכל',...[...new Set(ITEMS.map(i=>i.c))]];
function cardHTML(it,x,o={}){
  const tags=[];if(x&&Object.values(S.eq).includes(x.u))tags.push('<i class="eq">לבוש</i>');if(x&&x.sg)tags.push('<i class="sg">✍ חתום</i>');if(o.count>1)tags.push(`<i class="ct">×${o.count}</i>`);
  return `<button class="card r${it.r}${o.miss?' miss':''}${o.sel?' sel':''}${o.newf?' new-flag':''}" ${x?`data-u="${x.u}"`:''} data-id="${it.id}" style="--i:${Math.min(o.i||0,40)}">
  <div class="th" style="${thStyle(it)}">${it.r<2&&!o.miss?'<i class="holo"></i>':''}</div><span class="yr">${yrTxt(it)}</span><span class="tg">${tags.join('')}</span>
  <div class="cb"><b>${esc(it.n)}</b><small>${o.sub||esc(it.c+(it.s?' · '+it.s:''))}</small></div><i class="rb"></i><i class="gl"></i></button>`;
}
function sortFn(a,b){const A=BYID[a.i],B=BYID[b.i];
  if(F.sort==='rar')return A.r-B.r||(A.y||3000)-(B.y||3000)||(b.t-a.t);
  if(F.sort==='old')return (A.y||3000)-(B.y||3000)||A.r-B.r;
  if(F.sort==='new')return (B.y||0)-(A.y||0);
  return b.t-a.t}
function match(it){if(F.cat!=='הכל'&&it.c!==F.cat)return false;if(F.q){const q=F.q.trim();return (it.n+' '+it.c+' '+it.s+' '+it.y+' '+RAR[it.r].n).includes(q)}return true}
function bestOf(xs){return xs.slice().sort((a,b)=>(Object.values(S.eq).includes(b.u)-Object.values(S.eq).includes(a.u))||(b.sg-a.sg)||(a.w-b.w))[0]}
const secHTML=(r,n)=>`<div class="sec r${r}"><b>${RAR[r].n}</b><span>${RAR[r].yrs}</span><i>${n}</i></div>`;
function renderGrid(){
  const own=new Set(S.inv.map(x=>x.i));
  $('#colNum').textContent=own.size;$('#colTot').textContent=ITEMS.length;$('#colBar').style.width=(own.size/ITEMS.length*100)+'%';
  $$('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===F.mode));
  const setsMode=F.mode==='sets';$('#cats').hidden=setsMode;$('#rarLegend').hidden=setsMode;$('.lk-ctl input').hidden=setsMode;$('#sort').hidden=setsMode;
  const ready=SETS.filter(z=>!S.sets[z.k]&&setProg(z)>=z.items.length).length;const sb=$('#modeSeg [data-m=sets] em');sb.hidden=!ready;sb.textContent=ready;
  if(setsMode){$('#grid').innerHTML=renderSets();$('#lkEmpty').hidden=true;return}
  $('#cats').innerHTML=CATS.map(c=>{const n=c==='הכל'?ITEMS.length:ITEMS.filter(i=>i.c===c).length,m=c==='הכל'?own.size:[...own].filter(id=>BYID[id].c===c).length;return `<button class="${F.cat===c?'on':''}" data-c="${c}">${c}<small>${m}/${n}</small></button>`}).join('');
  const groups={};S.inv.forEach(x=>(groups[x.i]=groups[x.i]||[]).push(x));
  let list;
  if(F.mode==='all')list=ITEMS.filter(match).map(it=>({it,xs:groups[it.id]||[]}));
  else list=Object.keys(groups).map(id=>({it:BYID[id],xs:groups[id]})).filter(g=>match(g.it));
  const yy=g=>g.it.y||3000,tt=g=>Math.max(0,...g.xs.map(x=>x.t));
  list.sort((a,b)=>F.sort==='old'?yy(a)-yy(b)||a.it.r-b.it.r:F.sort==='new'?(b.it.y||0)-(a.it.y||0):F.sort==='got'?tt(b)-tt(a):a.it.r-b.it.r||yy(a)-yy(b));
  const secs=F.sort==='rar';let html='',last=-1,i=0;
  for(const g of list){if(secs&&g.it.r!==last){last=g.it.r;html+=secHTML(last,list.filter(z=>z.it.r===last).length)}
    const x=g.xs.length?bestOf(g.xs):null;html+=cardHTML(g.it,x,{miss:!x,count:g.xs.length,i:i++,newf:g.xs.some(z=>z.nw)})}
  $('#grid').innerHTML=html;
  $('#lkEmpty').hidden=!!S.inv.length||F.mode!=='mine';
}

/* ---------------- collections (sets) ---------------- */
const SETS=[
  {k:'old',  n:'דור המייסדים',        d:'כל הפריטים מלפני 2006',              f:i=>i.y&&i.y<2006, rw:{c:400,cr:'archive'}},
  {k:'mit0', n:'מתקני העשור הראשון',  d:'חולצות המתקן 2003–2010',             f:i=>i.s.startsWith('מתקן')&&i.y&&i.y<=2010, rw:{c:300,cr:'archive'}},
  {k:'mit1', n:'מתקני 2011–2015',     d:'חולצות המתקן 2011–2015',             f:i=>i.s.startsWith('מתקן')&&i.y>=2011&&i.y<=2015, rw:{c:200,cr:'mahteret'}},
  {k:'mit2', n:'מתקני 2016–2020',     d:'חולצות המתקן 2016–2020',             f:i=>i.s.startsWith('מתקן')&&i.y>=2016&&i.y<=2020, rw:{c:110,cr:'mahteret'}},
  {k:'mit3', n:'מתקני 2021 והלאה',    d:'חולצות המתקן מ־2021',                f:i=>i.s.startsWith('מתקן')&&i.y>=2021, rw:{c:70,cr:'mahsan'}},
  {k:'halutz',n:'חלוץ לדורותיו',      d:'כל חולצות החלוץ',                    f:i=>i.c==='חולצות'&&i.s==='חלוץ', rw:{c:100,cr:'mahteret'}},
  {k:'scarf',n:'צעיפי השכבות',        d:'כל הצעיפים',                         f:i=>i.c==='צעיפים', rw:{c:150,cr:'mahteret'}},
  {k:'hats', n:'מדף הכובעים',          d:'כל הכובעים',                         f:i=>i.c==='כובעים', rw:{c:110,cr:'mahteret'}},
  {k:'hood', n:'ארון הסווצ׳רטים',      d:'כל הסווצ׳רטים',                      f:i=>i.c==='סווצ׳רטים', rw:{c:120,cr:'mahteret'}},
  {k:'pants',n:'מכנסי השבט',           d:'כל המכנסיים',                        f:i=>i.c==='מכנסיים', rw:{c:80,cr:'mahsan'}},
  {k:'army', n:'פעולות בנים וצבא',     d:'כל חולצות הפעולות',                  f:i=>i.s.startsWith('פעולות'), rw:{c:100,cr:'mahteret'}},
  {k:'mht',  n:'המחתרת',               d:'כל חולצות המחתרת',                   f:i=>i.s==='מחתרת', rw:{c:60,cr:'mahsan'}},
  {k:'etgar',n:'אתגר',                 d:'כל חולצות האתגר',                    f:i=>i.s==='אתגר', rw:{c:50,cr:'mahsan'}},
  {k:'small',n:'הקטנים',               d:'מגני זיעה, צמידים, חאקי, תיקים ושונות',f:i=>['מגני זיעה','צמידים','חאקי','שונות','תיקים','חם צוואר'].includes(i.c), rw:{c:90,cr:'mahsan'}},
].map(z=>Object.assign(z,{items:ITEMS.filter(z.f)})).filter(z=>z.items.length);
function setProg(z){const own=new Set(S.inv.map(x=>x.i));return z.items.filter(i=>own.has(i.id)).length}
function renderSets(){
  return `<div class="sets">${SETS.map(z=>{const n=setProg(z),t=z.items.length,done=n>=t,got=S.sets[z.k],own=new Set(S.inv.map(x=>x.i));
    const show=z.items.slice().sort((a,b)=>own.has(b.id)-own.has(a.id)||a.r-b.r).slice(0,6);
    return `<div class="set${done?' done':''}${got?' got':''}"><div class="sth6">${show.map(i=>`<i class="${own.has(i.id)?'':'miss'} r${i.r}" style="${thStyle(i)}"></i>`).join('')}</div>
    <div class="sinfo"><b>${z.n}</b><small>${z.d}</small><div class="pbar"><i style="width:${n/t*100}%"></i></div><span class="snum">${n} / ${t}</span>
    <div class="srw">פרס: <b>${fmt(z.rw.c)}</b> אסימונים + ${CR[z.rw.cr].n}</div>
    ${got?'<span class="sdone">הפרס נאסף</span>':done?`<button class="btn gold" data-set="${z.k}">קבלו את הפרס</button>`:''}</div></div>`}).join('')}</div>`}
function claimSet(k,btn){const z=SETS.find(q=>q.k===k);if(!z||S.sets[k]||setProg(z)<z.items.length)return;S.sets[k]=1;S.coins+=z.rw.c;S.crates[z.rw.cr]=(S.crates[z.rw.cr]||0)+1;save();
  const [x,y]=centerOf(btn);FX.burst(x,y,100,['#F3E03B','#fff','#FD1D1D','#000'],{sp:12,s:5});SND.win(0);wallet('coins');toast(`השלמתם את "${z.n}"! קיבלתם ${fmt(z.rw.c)} אסימונים ו${CR[z.rw.cr].n}`,'gold');renderGrid()}
function checkSets(){SETS.forEach(z=>{if(!S.sets[z.k]&&!(S.setsSeen||{})[z.k]&&setProg(z)>=z.items.length){S.setsSeen=S.setsSeen||{};S.setsSeen[z.k]=1;save();toast(`השלמתם את האוסף "${z.n}". הפרס מחכה בלוקר ← אוספים`,'gold')}})}

/* ---------------- inspect ---------------- */
function inspect(it,x,opts={}){
  const ov=$('#ovInspect');ov.hidden=false;
  const dup=x?S.inv.filter(z=>z.i===it.id&&z.u!==x.u).length:0;
  const worn=x&&Object.values(S.eq).includes(x.u);
  const views=it.im>1?`<div class="views">${Array.from({length:it.im},(_,j)=>`<button data-j="${j}" class="${j?'':'on'}" style="background-image:url(${imgSrc(it,j)})" aria-label="תמונה ${j+1}"></button>`).join('')}</div>`:'';
  const orig=x?(x.o||'').startsWith('trade:')?`טרייד עם ${esc(x.o.slice(6))}`:x.o==='daily'?'ארגז יומי':(CR[x.o]?CR[x.o].n:'הלוקר'):'';
  ov.innerHTML=`<div class="insp r${it.r}"><button class="x" aria-label="סגירה">✕</button>
   <div class="tilt"><div class="tcard"><div class="tface"><img src="${imgSrc(it,0)}" alt="${esc(it.n)}">${it.r<2?'<i class="foil"></i>':''}<i class="glare"></i>${x&&x.sg?'<span class="sig">✍ ראש השבט</span>':''}</div>${it.im>1?`<div class="tface b"><img src="${imgSrc(it,1)}" alt=""><i class="glare"></i></div>`:''}</div>${views}</div>
   <div class="info"><span class="rpill">${RAR[it.r].n} · ${RAR[it.r].yrs}</span><h3>${esc(it.n)}</h3>
    <div class="meta"><b>שנה:</b> ${it.y||'לא ידועה'} · <b>סוג:</b> ${esc(it.c)}${it.s?` · <b>תיקייה:</b> ${esc(it.s)}`:''}<br>${x?`<b>מספר סידורי:</b> #${x.u.toUpperCase()} · <b>הגיע מ:</b> ${orig}<br><b>שווי:</b> <span style="color:var(--gold)">${fmt(valOf(x))} אסימונים</span>`:'<b>עוד לא בלוקר שלכם.</b> פתחו ארגזים או עשו טרייד כדי להשיג אותו.'}</div>
    ${x?`<div class="wear"><small>מצב: <b>${wearName(x.w)}</b> (${x.w.toFixed(3)})</small><div class="wb"><i style="right:calc(${x.w*100}% - 2px)"></i></div></div>`:''}
    ${x&&!opts.view?`<div class="acts">${worn?`<button class="btn ghost" data-a="off">הורידו מהדמות</button>`:`<button class="btn gold" data-a="on">לבשו על הדמות</button>`}<button class="btn ghost" data-a="rec">פירוק ל־${fmt(valOf(x))} אסימונים</button></div>`:''}
    ${dup&&!opts.view?`<div class="dupes">יש לכם ${dup+1} עותקים · <span class="copies">${S.inv.filter(z=>z.i===it.id).map(z=>`<button data-cp="${z.u}" class="${z.u===x.u?'on':''}">${z.sg?'✍ ':''}${wearName(z.w)}</button>`).join('')}</span></div>`:''}</div></div>`;
  const close=()=>{ov.hidden=true;ov.innerHTML=''};
  ov.onclick=e=>{if(e.target===ov||e.target.closest('.x'))close()};
  const tilt=$('.tilt',ov),card=$('.tcard',ov);let flipped=false;
  tilt.onpointermove=e=>{const b=card.getBoundingClientRect(),px=(e.clientX-b.left)/b.width,py=(e.clientY-b.top)/b.height;
    card.style.transform=`perspective(1000px) rotateY(${(px-.5)*22}deg) rotateX(${(.5-py)*18}deg)`;
    $$('.tface',ov).forEach(f=>{f.style.setProperty('--gx',px*100+'%');f.style.setProperty('--gy',py*100+'%');f.style.setProperty('--ga',(px*180)+'deg')})};
  tilt.onpointerleave=()=>{card.style.transform=''};
  $$('.views button',ov).forEach(b=>b.onclick=e=>{e.stopPropagation();const j=+b.dataset.j;$$('.views button',ov).forEach(z=>z.classList.toggle('on',z===b));
    const swap=()=>{if(it.im===2){flipped=j===1;card.classList.toggle('back',flipped)}else $('.tface img',ov).src=imgSrc(it,j)};
    card.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:170,easing:'ease-in'}).onfinish=()=>{swap();card.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:220,easing:'cubic-bezier(.3,1.4,.5,1)'})};SND.click()});
  $$('[data-a]',ov).forEach(b=>b.onclick=()=>{const a=b.dataset.a;
    if(a==='on'){equip(x.u);close();go('avatar')}
    else if(a==='off'){unequip(it.sl);close()}
    else if(a==='rec'){if(!b.dataset.ok){b.dataset.ok=1;b.textContent=`בטוח? לחצו שוב (+${fmt(valOf(x))})`;b.classList.remove('ghost');return}
      const v=valOf(x),[cx,cy]=centerOf(b);S.inv=S.inv.filter(z=>z.u!==x.u);for(const k in S.eq)if(S.eq[k]===x.u)delete S.eq[k];S.coins+=v;save();
      FX.burst(cx,cy,30,['#ffd75a','#f6be3c','#fff3c0'],{t:'c',s:3,sp:8});SND.coin();wallet('coins');toast(`פירקתם את "${esc(it.n)}" וקיבלתם ${fmt(v)} אסימונים`,'gold');close();renderGrid();renderAvatar()}});
  $$('[data-cp]',ov).forEach(b=>b.onclick=()=>{SND.click();inspect(it,inst(b.dataset.cp),opts)});
  if(x){let ch=false;S.inv.forEach(z=>{if(z.i===it.id&&z.nw){delete z.nw;ch=true}});if(ch)save()}
}

/* ---------------- picker (slot) ---------------- */
function openPicker(k){
  const sl=SLOTS.find(s=>s.k===k),ov=$('#ovPick');ov.hidden=false;
  const list=S.inv.filter(x=>BYID[x.i].sl===k).sort((a,b)=>BYID[a.i].r-BYID[b.i].r);
  ov.innerHTML=`<div class="sheet"><header><h3>${sl.n}</h3>${S.eq[k]?'<button class="btn ghost" data-off>הורידו</button>':''}<button class="btn ghost" data-x>סגירה</button></header>
   ${list.length?`<div class="grid small">${list.map((x,i)=>cardHTML(BYID[x.i],x,{i,sel:S.eq[k]===x.u})).join('')}</div>`:`<p class="empty">אין לכם עדיין ${sl.n} (${sl.cats}).<br><button class="btn" data-cr>לפתיחת ארגזים ←</button></p>`}</div>`;
  const close=()=>{ov.hidden=true;ov.innerHTML=''};
  ov.onclick=e=>{const c=e.target.closest('.card');
    if(c){equip(c.dataset.u);close();return}
    if(e.target.closest('[data-off]')){unequip(k);close();return}
    if(e.target.closest('[data-cr]')){close();go('crates');return}
    if(e.target===ov||e.target.closest('[data-x]'))close()};
}


/* ---------------- crate art: isometric SVG (no CSS 3D, so it looks the same on iPhone) ---------------- */
const CRA={mahsan:{t:'#cf9a5e',l:'#a46c37',r:'#76491f',pl:'#5a3517',band:'#d62b2f',bolt:'#2b2222',in:'#1c0e05'},
  mahteret:{t:'#3d2a2f',l:'#26181b',r:'#170e10',pl:'#4e333a',band:'#d62b2f',bolt:'#f6be3c',in:'#000'},
  archive:{t:'#ffe48f',l:'#e3ab2d',r:'#a9710b',pl:'#8a5a06',band:'#170a0b',bolt:'#fff6d0',in:'#2a1800'}};
function crateSVG(k,part){const c=CRA[k],S_='stroke="#0d0708" stroke-width="3" stroke-linejoin="round"';
  if(part==='lid')return `<svg viewBox="0 0 200 210" class="cr-lid"><g ${S_}>
    <polygon points="20,72 100,112 100,124 20,84" fill="${c.l}"/><polygon points="100,112 180,72 180,84 100,124" fill="${c.r}"/>
    <polygon points="20,72 100,32 180,72 100,112" fill="${c.t}"/></g>
    <g stroke="${c.pl}" stroke-width="2" opacity=".7"><line x1="47" y1="58" x2="127" y2="98"/><line x1="73" y1="45" x2="153" y2="85"/></g>
    <polygon points="54,55 66,49 146,89 134,95" fill="${c.band}" stroke="#0d0708" stroke-width="2"/>
    <g fill="${c.bolt}" stroke="#0d0708" stroke-width="1.5"><circle cx="30" cy="77" r="3"/><circle cx="170" cy="77" r="3"/><circle cx="100" cy="117" r="3"/><circle cx="100" cy="38" r="3"/></g>
    <polyline class="cr-seam" points="20,84 100,124 180,84" fill="none" stroke="#fff3b0" stroke-width="4" stroke-linecap="round"/></svg>`;
  return `<svg viewBox="0 0 200 210" class="cr-body"><defs><radialGradient id="crin-${k}"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".35" stop-color="#ffb02e" stop-opacity=".8"/><stop offset="1" stop-color="${c.in}"/></radialGradient></defs>
    <polygon class="cr-in" points="20,84 100,44 180,84 100,124" fill="url(#crin-${k})"/>
    <g ${S_}><polygon points="20,84 100,124 100,200 20,160" fill="${c.l}"/><polygon points="100,124 180,84 180,160 100,200" fill="${c.r}"/></g>
    <g stroke="${c.pl}" stroke-width="2" opacity=".75"><line x1="20" y1="110" x2="100" y2="150"/><line x1="20" y1="136" x2="100" y2="176"/><line x1="100" y1="150" x2="180" y2="110"/><line x1="100" y1="176" x2="180" y2="136"/></g>
    <image href="img/logo.webp" x="22" y="4" width="56" height="46" transform="matrix(.8,.4,0,.8,20,84)" opacity=".95"/>
    <polygon points="20,126 100,166 100,178 20,138" fill="${c.band}" stroke="#0d0708" stroke-width="2"/><polygon points="100,166 180,126 180,138 100,178" fill="${c.band}" stroke="#0d0708" stroke-width="2" style="filter:brightness(.75)"/>
    <g fill="#1a1416" stroke="#0d0708" stroke-width="2"><polygon points="20,84 28,88 28,164 20,160"/><polygon points="93,121 100,124 107,121 107,197 100,200 93,197"/><polygon points="172,88 180,84 180,160 172,164"/></g>
    <g fill="${c.bolt}"><circle cx="24" cy="96" r="2.2"/><circle cx="24" cy="150" r="2.2"/><circle cx="176" cy="96" r="2.2"/><circle cx="176" cy="150" r="2.2"/><circle cx="100" cy="134" r="2.2"/><circle cx="100" cy="188" r="2.2"/></g>
    <polygon points="100,124 180,84 180,160 100,200" fill="#000" opacity=".12"/></svg>`}
const crateArt=k=>`<div class="cr cr-${k}"><i class="cr-shadow"></i>${crateSVG(k,'body')}${crateSVG(k,'lid')}</div>`;

/* ---------------- crates ---------------- */
function rollItem(cr){const w=cr.w,tot=w.reduce((a,b)=>a+b,0);let r=rnd()*tot,t=0;for(;t<w.length;t++){if((r-=w[t])<0)break}t=Math.min(t,5);
  let pool=BYR[t];while(!pool.length&&t<5)pool=BYR[++t];return pick(pool)}
function newInst(it,o){const age=it.y?clamp((2027-it.y)/35,0,1):.4;const w=clamp(rnd()*.55+age*.45*rnd()+age*.12,0,.999);
  return {u:uid(),i:it.id,w:+w.toFixed(4),sg:rnd()<.04?1:0,t:Date.now(),o,nw:1}}
function renderCrates(){
  const d=$('#daily');
  if(S.daily!==today())d.innerHTML=`<div class="dbox"><span>יומי</span><div><b>הארגז היומי מחכה</b><p>ארגז מחסן חינם, פעם ביום.</p></div><button class="btn gold" id="dailyBtn">קבלו ארגז</button></div>`;
  else{const t=new Date();t.setHours(24,0,0,0);const m=Math.ceil((t-Date.now())/60000);d.innerHTML=`<div class="dbox" style="opacity:.75"><span>מחר</span><div><b>הארגז היומי נלקח</b><p>הארגז הבא עוד ${Math.floor(m/60)} שעות ו־${m%60} דקות.</p></div></div>`}
  $('#crateList').innerHTML=CRATES.map(c=>{const tot=c.w.reduce((a,b)=>a+b,0),own=S.crates[c.k]||0;
    return `<div class="crt" style="--cc:${c.cc}">${own?`<span class="own">יש לכם ${own}</span>`:''}
    <div class="crimg">${crateArt(c.k)}</div>
    <h3>${c.n}</h3><p>${c.d}</p>
    <div class="odds">${c.w.map((w,r)=>w?`<i class="r${r}" style="flex:${w}"></i>`:'').join('')}</div>
    <div class="oddt">${c.w.map((w,r)=>w?`<span class="r${r}">${RAR[r].n} ${(w/tot*100).toFixed(w/tot<.02?1:0)}%</span>`:'').join('')}</div>
    <div class="acts">${own?`<button class="btn gold" data-open="${c.k}">פתחו ארגז</button>`:''}<button class="btn${own?' ghost':''}" data-buy="${c.k}" ${S.coins<c.price?'disabled':''}>קנו ופתחו · <span class="price">${fmt(c.price)}</span> אסימונים</button></div>
    ${own>=5||S.coins>=c.price*5?`<button class="btn five" data-five="${c.k}">פתחו 5 בבת אחת${own>=5?'':`  · <span class="price">${fmt(c.price*5)}</span>`}</button>`:''}</div>`}).join('');
  const db=$('#dailyBtn');if(db)db.onclick=()=>{S.daily=today();S.crates.mahsan=(S.crates.mahsan||0)+1;save();const [x,y]=centerOf(db);FX.burst(x,y,50,['#ffd75a','#d62b2f','#fff'],{up:1,sp:10});SND.coin();wallet('crates');toast('קיבלתם ארגז מחסן','gold');renderCrates()};
}
let opening=null;
function openCrate(k,buy){
  const c=CR[k];if(opening)return;
  if(buy){if(S.coins<c.price){SND.err();toast('אין מספיק אסימונים. שחקו במשחקי השבט כדי לצבור עוד!');return}S.coins-=c.price}
  else{if(!(S.crates[k]>0))return;S.crates[k]--}
  const it=rollItem(c),x=newInst(it,k),first=!S.inv.some(z=>z.i===it.id);
  S.inv.push(x);S.stats.opened++;save();wallet();
  const ov=$('#ovOpen');ov.hidden=false;ov.classList.remove('lit','shake');ov.style.setProperty('--rc',RAR[it.r].c);
  const crate=prepCrate(k);
  $('#reelWrap').hidden=true;$('#win').hidden=true;$('#multi').hidden=true;$('#opSkip').hidden=false;
  const st={done:false,skip:false};opening=st;
  /* phase 1: the crate drops in, charges up (glow + growing shake), then bursts open */
  tone(180,.25,'sine',.25,-90,.45);noise(.18,.15,300,.5);
  st.t0=setTimeout(()=>{crate.classList.add('charge');SND.rise()},650);
  st.t1=setTimeout(()=>{popCrate(crate);setTimeout(()=>reel(it,x,first,st),380)},1900);
}
function prepCrate(k){const crate=$('#opCrate');crate.hidden=false;crate.className='op-crate';crate.innerHTML='<i class="op-glow"></i>'+crateArt(k);
  crate.style.animation='none';void crate.offsetWidth;crate.style.animation='';return crate}
function popCrate(crate){crate.classList.remove('charge');crate.classList.add('pop');
  const b=document.createElement('i');b.className='burst';crate.append(b);SND.boom();
  const fl=$('#opFlash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
  const [cx,cy]=centerOf(crate);FX.burst(cx,cy,70,['#c98a4a','#6b3f17','#ffd75a','#fff'],{sp:13,s:5})}
function reel(it,x,first,st){
  if(st.done)return;$('#opCrate').hidden=true;
  const wrap=$('#reelWrap'),R=$('#reel');wrap.hidden=false;
  const N=62,WIN=52,c=CR[x.o]||CRATES[0];
  const cards=[];for(let i=0;i<N;i++)cards.push(i===WIN?it:rollItem(c));
  R.innerHTML=cards.map(z=>`<div class="rc r${z.r}"><div class="th" style="${thStyle(z)}"></div><b>${esc(z.n)}</b><small>${RAR[z.r].n} · ${yrTxt(z)}</small></div>`).join('');
  const cw=R.firstElementChild.getBoundingClientRect().width+10;
  const target=WIN*cw+cw/2-10/2+(rnd()-.5)*cw*.7;
  wrap.classList.remove('stop','out');$('.reel-mark').style.cssText='';
  const dur=5600,t0=performance.now(),ov=cw*.16;let lastIdx=-1;
  const eo=t=>1-Math.pow(1-t,4),eio=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const posAt=t=>t<.9?eo(t/.9)*(target+ov):target+ov*(1-eio((t-.9)/.1));
  function f(now){if(st.done)return;let t=clamp((now-t0)/dur,0,1);if(st.skip)t=1;
    const pos=posAt(t);R.style.transform=`translate3d(${-pos}px,0,0)`;
    const idx=Math.floor((pos+cw/2)/cw);if(idx!==lastIdx){lastIdx=idx;SND.tick(1-t)}
    if(t<1)requestAnimationFrame(f);else{
      const hit=R.children[WIN];hit.classList.add('hit');wrap.classList.add('stop');
      const m=$('.reel-mark');m.style.background=RAR[it.r].c;m.style.boxShadow=`0 0 30px ${RAR[it.r].c}`;
      tone(it.r<3?880:520,.25,'triangle',.14);setTimeout(()=>reveal(it,x,first,st,hit),st.skip?60:700)}}
  requestAnimationFrame(f);
}
function reveal(it,x,first,st,hit){
  if(st.done)return;st.done=true;opening=null;
  const from=hit&&!st.skip?hit.getBoundingClientRect():null;
  const ov=$('#ovOpen'),rw=$('#reelWrap');rw.classList.add('out');setTimeout(()=>{rw.hidden=true;rw.classList.remove('out','stop')},360);$('#opSkip').hidden=true;ov.classList.add('lit');
  const win=$('#win');win.hidden=false;win.className='win r'+it.r;
  const more=(S.crates[x.o]>0)||S.coins>=(CR[x.o]?.price||1e9);
  win.innerHTML=`<div class="stamp">${RAR[it.r].stamp}</div><div class="wc"><img src="${imgSrc(it)}" alt=""><div class="wi"><b>${esc(it.n)}</b><small>${esc(it.c)} · ${yrTxt(it)}</small></div><i class="shine"></i></div>
    <div class="wtags"><span class="rpill r${it.r}">${RAR[it.r].n}</span><span>${wearName(x.w)}</span>${x.sg?'<span style="color:#ffd75a">✍ חתום ע״י ראש השבט!</span>':''}${first?'<span style="color:#F3E03B">חדש באוסף</span>':'<span>כפול</span>'}</div>
    <div class="acts"><button class="btn gold" data-w="wear">לבשו עכשיו</button>${more?`<button class="btn" data-w="again">עוד ארגז</button>`:''}<button class="btn ghost" data-w="lk">ללוקר</button></div>`;
  const wc=$('.wc',win);
  if(from){const to=wc.getBoundingClientRect();const sx=from.width/to.width,dx=from.left+from.width/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2);
    wc.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx})`,filter:'brightness(2)'},{transform:'translate(0,-30px) scale(1.08)',filter:'brightness(1.4)',offset:.6},{transform:'none',filter:'none'}],{duration:800,easing:'cubic-bezier(.2,.9,.3,1)'})}
  else wc.animate([{transform:'scale(.3) rotateY(180deg)',opacity:0},{transform:'none',opacity:1}],{duration:600,easing:'cubic-bezier(.2,1.4,.4,1)'});
  SND.win(it.r);const col=RAR[it.r].c;
  const [cx,cy]=[innerWidth/2,innerHeight*.45];
  FX.burst(cx,cy,it.r<2?120:it.r<4?60:30,[col,'#fff','#FD1D1D','#000'],{sp:it.r<2?13:9,s:5,l:1.8});
  if(it.r===0)FX.rain(140,['#FD1D1D','#F3E03B','#fff','#000']);
  if(it.r<=1){ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake')}
  win.onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;const a=b.dataset.w;closeOpen();
    if(a==='wear'){equip(x.u);go('avatar')}else if(a==='again'){openCrate(x.o,!(S.crates[x.o]>0))}else go('locker')};
  renderCrates();renderGrid();
}

function openFive(k){
  const c=CR[k];if(opening)return;const own=S.crates[k]||0;
  if(own>=5)S.crates[k]-=5;else{if(S.coins<c.price*5){SND.err();toast('אין מספיק אסימונים לחמישה ארגזים');return}S.coins-=c.price*5}
  const got=[];for(let i=0;i<5;i++){const it=rollItem(c),x=newInst(it,k);got.push({it,x,first:!S.inv.some(z=>z.i===it.id)&&!got.some(g=>g.it.id===it.id)});S.inv.push(x)}
  S.stats.opened+=5;save();wallet();
  got.sort((a,b)=>b.it.r-a.it.r);const best=got[got.length-1].it.r;
  const ov=$('#ovOpen');ov.hidden=false;ov.classList.remove('lit','shake');ov.style.setProperty('--rc',RAR[best].c);
  $('#reelWrap').hidden=true;$('#win').hidden=true;$('#opSkip').hidden=false;const M=$('#multi');M.hidden=true;
  const crate=prepCrate(k),st={done:false,skip:false,multi:1};opening=st;
  tone(180,.25,'sine',.25,-90,.45);noise(.18,.15,300,.5);
  st.t0=setTimeout(()=>{crate.classList.add('charge');SND.rise()},650);
  st.t1=setTimeout(()=>{popCrate(crate);setTimeout(()=>deal(got,st,k),380)},1900);
  st.skipDeal=()=>deal(got,st,k);
}
function deal(got,st,k){
  if(st.dealt)return;st.dealt=1;$('#opCrate').hidden=true;$('#opSkip').hidden=true;
  const M=$('#multi');M.hidden=false;
  M.innerHTML=`<div class="mrow">${got.map((g,i)=>`<div class="mc r${g.it.r}" style="--d:${i*90}ms"><div class="mci"><div class="mcb"><img src="img/logo.webp" alt=""></div><div class="mcf"><img src="${imgSrc(g.it)}" alt=""><b>${esc(g.it.n)}</b><small>${RAR[g.it.r].n} · ${yrTxt(g.it)}</small>${g.first?'<em>חדש!</em>':''}</div></div></div>`).join('')}</div>
    <p class="mhint">לחצו על קלף כדי להפוך אותו</p><div class="acts" hidden><button class="btn gold" data-m="lk">ללוקר</button>${(S.crates[k]||0)>=5||S.coins>=CR[k].price*5?'<button class="btn" data-m="again">עוד 5</button>':''}<button class="btn ghost" data-m="x">סגירה</button></div>`;
  [0,1,2,3,4].forEach(i=>setTimeout(()=>tone(500+i*60,.08,'triangle',.1),i*90));
  const cards=$$('.mc',M);let n=0;
  const flip=i=>{const el=cards[i];if(!el||el.classList.contains('open'))return;el.classList.add('open');n++;const g=got[i],r=g.it.r;
    setTimeout(()=>{const [x,y]=centerOf(el);FX.burst(x,y,r<2?90:r<3?55:25,[RAR[r].c,'#fff','#ffd75a'],{sp:r<2?12:8,s:4});SND.win(r);
      if(r<=1){const ov=$('#ovOpen');ov.classList.add('lit');ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake');r===0&&FX.rain(120,['#FD1D1D','#F3E03B','#fff','#000'])}},260);
    if(n===cards.length)setTimeout(()=>{$('.mhint',M).hidden=true;$('.acts',M).hidden=false;opening=null;st.done=true;renderCrates();renderGrid()},900)};
  M.onclick=e=>{const c=e.target.closest('.mc');if(c){flip(cards.indexOf(c));return}const b=e.target.closest('[data-m]');if(!b)return;const a=b.dataset.m;closeOpen();
    if(a==='lk')go('locker');else if(a==='again')openFive(k)};
  /* auto-flip in order, the rarest last with a longer pause */
  st.timers=[];let t=900;cards.forEach((_,i)=>{t+=i===cards.length-1&&got[i].it.r<=2?1300:700;st.timers.push(setTimeout(()=>flip(i),t))});
}

function closeOpen(){const ov=$('#ovOpen');ov.hidden=true;ov.classList.remove('lit','shake');$('#win').innerHTML='';if(opening){opening.done=true;clearTimeout(opening.t0);clearTimeout(opening.t1);(opening.timers||[]).forEach(clearTimeout);opening=null}$('#multi').hidden=true;$('#multi').innerHTML='';renderCrates();renderGrid();checkSets()}
$('#opSkip').onclick=()=>{if(!opening)return;opening.skip=true;const st=opening;
  if(st.multi){clearTimeout(st.t0);clearTimeout(st.t1);st.skipDeal&&st.skipDeal();return}
  if(!$('#opCrate').hidden){clearTimeout(st.t0);clearTimeout(st.t1);$('#opCrate').hidden=true;const x=S.inv[S.inv.length-1];reel(BYID[x.i],x,!S.inv.slice(0,-1).some(z=>z.i===x.i),st)}};

/* ---------------- trade ---------------- */
const NET={SRC:['https://unpkg.com/mqtt@5.3.5/dist/mqtt.min.js','https://cdn.jsdelivr.net/npm/mqtt@5.3.5/dist/mqtt.min.js'],
  BROKERS:['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'],
  load(){if(window.mqtt)return Promise.resolve();return this.SRC.reduce((p,src)=>p.catch(()=>new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onload=()=>window.mqtt?res():rej();sc.onerror=rej;document.head.appendChild(sc)})),Promise.reject())},
  async open(inbox,onData){await this.load();const R={cs:[],seen:new Set(),up:false};
    await new Promise(res=>{let done=false;const fin=()=>{if(!done){done=true;res()}};
      this.BROKERS.forEach(u=>{let c;try{c=mqtt.connect(u,{clean:true,connectTimeout:8000,reconnectPeriod:3000,keepalive:30})}catch(e){return}R.cs.push(c);
        c.on('connect',()=>{c.subscribe(inbox,{qos:1});R.up=true;setTimeout(fin,400)});
        c.on('message',(t,buf)=>{let m;try{m=JSON.parse(String(buf))}catch(e){return}if(!m||!m._i||R.seen.has(m._i))return;R.seen.add(m._i);onData(m)});c.on('error',()=>{})});
      setTimeout(fin,9000)});
    if(!R.up){R.cs.forEach(c=>{try{c.end(true)}catch(e){}});throw new Error('net')}
    R.send=(topic,m)=>{const txt=JSON.stringify(Object.assign({},m,{_i:uid()+Date.now().toString(36)}));R.cs.forEach(c=>{try{if(c.connected)c.publish(topic,txt,{qos:1})}catch(e){}})};
    R.close=()=>R.cs.forEach(c=>{try{c.end(true)}catch(e){}});return R}};
let T=null;
const pub=x=>({u:x.u,i:x.i,w:x.w,sg:x.sg});
const myName=()=>S.name||'צופה';
function trSend(t,o={}){if(T&&T.R)T.R.send(`nachanasi/lk1/${T.code}/${T.role==='h'?'g':'h'}`,Object.assign({t},o))}
function trState(){trSend('st',{offer:T.me.offer.map(u=>pub(inst(u))).filter(Boolean),lock:T.me.lock,acc:T.me.acc})}
function trHello(ask){trSend('hi',{ask,name:myName(),rank:rankOf(readXP()),inv:S.inv.map(pub),offer:T.me.offer.map(u=>pub(inst(u))),lock:T.me.lock,acc:T.me.acc})}
async function trStart(role,code){
  if(T)trLeave(true);
  if(!S.name){const n=prompt('איך לקרוא לכם בטרייד?','');if(n&&n.trim()){S.name=n.trim().slice(0,18);save()}}
  code=code||String(1000+((rnd()*9000)|0));
  T={role,code,me:{offer:[],lock:false,acc:false},them:null,going:false,dealt:'',seen:0};
  $('#trNote').textContent='מתחברים לשרתי הטרייד…';
  try{T.R=await NET.open(`nachanasi/lk1/${code}/${role}`,trOn)}catch(e){$('#trNote').textContent='אין חיבור לאינטרנט או ששרתי הטרייד חסומים. נסו שוב.';T=null;SND.err();return}
  $('#trLobby').hidden=true;$('#trRoom').hidden=false;$('#trCodeShow').textContent=code;$('#trMe').textContent=myName();
  history.replaceState(null,'',`#trade-${code}`);
  T.hb=setInterval(()=>{if(!T)return;if(!T.them)trHello(true);else trSend('pg');trRenderStatus()},2500);
  trHello(true);trRender();
  toast(role==='h'?`החדר נפתח! שלחו לחבר את הקוד ${code}`:'מצטרפים לחדר…');
}
function trOn(m){if(!T)return;T.seen=Date.now();
  if(m.t==='hi'){const was=!!T.them;T.them=Object.assign(T.them||{},{name:m.name||'חבר',rank:m.rank,inv:m.inv||[],offer:m.offer||[],lock:!!m.lock,acc:!!m.acc});
    if(m.ask)trHello(false);if(!was){toast(`${esc(T.them.name)} נכנס לחדר`,'gold');SND.deal()}trRender();return}
  if(!T.them)return;
  if(m.t==='st'){const old=(T.them.offer||[]).map(z=>z.u).sort().join();const nu=(m.offer||[]).map(z=>z.u).sort().join();
    T.them.offer=m.offer||[];T.them.lock=!!m.lock;T.them.acc=!!m.acc;if(m.inv)T.them.inv=m.inv;
    if(old!==nu&&(T.me.lock||T.me.acc)){T.me.lock=false;T.me.acc=false;trState();toast('החבר שינה את ההצעה, ההצעה שלכם נפתחה מחדש')}
    trRender();trCheck();return}
  if(m.t==='em'){emote(m.e,false);return}
  if(m.t==='go'&&T.role==='g'){if(m.h===dealHash()&&T.me.acc&&T.them.acc&&T.dealt!==m.h){T.dealt=m.h;for(let i=0;i<3;i++)setTimeout(()=>trSend('gook',{h:m.h}),i*400);trExec()}return}
  if(m.t==='gook'&&T.role==='h'){if(m.h===dealHash()&&T.dealt!==m.h){T.dealt=m.h;clearInterval(T.goI);trExec()}return}
  if(m.t==='bye'){toast(`${esc(T.them.name)} יצא מהחדר`);T.them=null;T.me.lock=T.me.acc=false;trRender()}
}
function dealHash(){if(!T||!T.them)return'';const mine=T.me.offer.slice().sort().join(','),th=T.them.offer.map(z=>z.u).sort().join(',');return T.role==='h'?mine+'|'+th:th+'|'+mine}
function trCheck(){if(!T||T.role!=='h'||!T.them)return;
  if(T.me.acc&&T.them.acc&&!T.going){const h=dealHash();if(T.dealt===h)return;T.going=true;let n=0;clearInterval(T.goI);T.goI=setInterval(()=>{if(++n>8||T.dealt===h){clearInterval(T.goI);T.going=false;return}trSend('go',{h})},700);trSend('go',{h})}}
function trExec(){
  const give=T.me.offer.map(inst).filter(Boolean),get=(T.them.offer||[]).filter(z=>BYID[z.i]);
  if(give.length!==T.me.offer.length){toast('משהו השתבש בטרייד, הוא בוטל');return}
  const gu=new Set(give.map(z=>z.u));S.inv=S.inv.filter(z=>!gu.has(z.u));for(const k in S.eq)if(gu.has(S.eq[k]))delete S.eq[k];
  const now=Date.now();get.forEach(z=>{const u=S.inv.some(q=>q.u===z.u)?uid():z.u;S.inv.push({u,i:z.i,w:z.w,sg:z.sg?1:0,t:now,o:'trade:'+T.them.name,nw:1})});
  S.hist.unshift({d:now,w:T.them.name,g:give.map(z=>z.i),r:get.map(z=>z.i)});S.hist=S.hist.slice(0,30);S.stats.traded++;save();
  tradeFx(give,get);setTimeout(checkSets,4000);
  T.me={offer:[],lock:false,acc:false};T.them.offer=[];T.them.lock=T.them.acc=false;T.going=false;
  setTimeout(()=>{if(T){trSend('st',{offer:[],lock:false,acc:false,inv:S.inv.map(pub)});trRender()}},300);
  renderGrid();renderAvatar();wallet();
}
function tradeFx(give,get){
  const ov=$('#ovTradeFx');ov.hidden=false;ov.innerHTML='<div class="tfx"></div>';const box=$('.tfx',ov);let n=3;
  const step=()=>{if(n>0){box.innerHTML=`<div class="cd">${n}</div>`;SND.tick(.8);tone(440+n*110,.15,'square',.1);n--;setTimeout(step,800)}else fly()};
  const fly=()=>{box.innerHTML='';SND.deal();
    const mk=(z,i,dir,len)=>{const it=BYID[z.i],d=document.createElement('div');d.className='fc r'+it.r;d.style.backgroundImage=`url(${imgSrc(it)})`;
      const y=innerHeight/2+(i-(len-1)/2)*60,x0=dir>0?innerWidth*.15:innerWidth*.85,x1=dir>0?innerWidth*.85:innerWidth*.15;
      d.style.left=x0+'px';d.style.top=y+'px';box.append(d);
      d.animate([{transform:'translate(0,0) scale(.6) rotate(0)',opacity:0},{transform:`translate(${(x1-x0)/2}px,${-90*dir}px) scale(1.25) rotate(${dir*12}deg)`,opacity:1,offset:.5},{transform:`translate(${x1-x0}px,0) scale(1) rotate(0)`,opacity:1}],{duration:1300,delay:i*90,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'})};
    give.forEach((z,i)=>mk(z,i,-1,give.length));get.forEach((z,i)=>mk(z,i,1,get.length));
    setTimeout(()=>{FX.burst(innerWidth/2,innerHeight/2,120,['#FD1D1D','#F3E03B','#fff','#000'],{sp:13,s:5});
      box.insertAdjacentHTML('beforeend','<div class="done">טרייד בוצע</div>');SND.win(1)},1200);
    setTimeout(()=>{ov.hidden=true;ov.innerHTML=''},3600)};
  step();
}
function emote(e,mine){const d=document.createElement('div');d.className='fly-emote';d.textContent=e;const side=mine?$('.tr-side.me'):$('.tr-side.them');const [x,y]=side?centerOf(side):[innerWidth/2,innerHeight/2];d.style.left=(x-23)+'px';d.style.top=(y-23)+'px';document.body.append(d);setTimeout(()=>d.remove(),1900);if(!mine)tone(880,.1,'triangle',.1)}
function trRenderStatus(){if(!T)return;const st=$('#trStat');if(!T.them){st.textContent='מחכה שהחבר יצטרף…';st.className='';return}
  const ok=Date.now()-T.seen<15000;st.textContent=ok?`מחובר · ${T.them.rank||''}`:'לא מגיב…';st.className=ok?'ok':''}
let trTab='mine';
function trRender(){
  if(!T)return;const th=T.them;
  $('#trThem').textContent=th?th.name:'מחכה לחבר…';$('#trThem2').textContent=th?th.name:'החבר';trRenderStatus();
  const offerHTML=(list,mine)=>{const cards=list.map((z,i)=>{const it=BYID[z.i];return it?cardHTML(it,z,{i,sub:RAR[it.r].n}):''}).join('');return cards+Array.from({length:Math.max(0,3-list.length)},()=>'<div class="slotph"></div>').join('')};
  const mineL=T.me.offer.map(inst).filter(Boolean);
  $('#trOfferMe').innerHTML=offerHTML(mineL,true);$('#trOfferThem').innerHTML=th?offerHTML(th.offer||[],false):'';
  const vm=mineL.reduce((a,z)=>a+valOf(z),0),vt=th?(th.offer||[]).reduce((a,z)=>a+(BYID[z.i]?valOf(z):0),0):0;
  $('#trValMe').textContent=fmt(vm);$('#trValThem').textContent=fmt(vt);$('#trBal i').style.width=(vm+vt?vt/(vm+vt)*100:50)+'%';
  const sm=$('.tr-side.me'),sT=$('.tr-side.them');sm.classList.toggle('locked',T.me.lock);sm.classList.toggle('acc',T.me.acc);sT.classList.toggle('locked',!!th&&th.lock);sT.classList.toggle('acc',!!th&&th.acc);
  $('#trLockMe').textContent=T.me.acc?'אישרתם':T.me.lock?'נעול':'פתוח · בחרו פריטים למטה';$('#trLockThem').textContent=!th?'':th.acc?'אישר':th.lock?'נעול':'בוחר פריטים…';
  const lb=$('#trLockBtn');lb.disabled=!th||T.me.acc;lb.textContent=T.me.lock?'פתחו הצעה':'נעלו הצעה';
  const ab=$('#trAccept');ab.disabled=!(th&&T.me.lock&&th.lock&&!T.me.acc&&(T.me.offer.length||(th.offer||[]).length));ab.textContent=T.me.acc?'מחכים לחבר…':'אשרו טרייד';
  $$('.tr-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===trTab));
  const g=$('#trGrid');
  if(trTab==='mine'){const sel=new Set(T.me.offer);g.innerHTML=S.inv.slice().sort(sortFn).map((x,i)=>cardHTML(BYID[x.i],x,{i,sel:sel.has(x.u)})).join('')||'<p class="empty">הלוקר שלכם ריק.</p>'}
  else g.innerHTML=th?(th.inv||[]).filter(z=>BYID[z.i]).sort((a,b)=>BYID[a.i].r-BYID[b.i].r).map((z,i)=>cardHTML(BYID[z.i],null,{i})).join('')||'<p class="empty">הלוקר של החבר ריק.</p>':'<p class="empty">מחכים שהחבר יצטרף…</p>';
}
function trToggle(u){if(!T||T.me.acc)return;const i=T.me.offer.indexOf(u);
  if(i>=0)T.me.offer.splice(i,1);else{if(T.me.offer.length>=9){toast('אפשר עד 9 פריטים בטרייד אחד');return}T.me.offer.push(u)}
  T.me.lock=false;SND.click();trState();trRender()}
function trLeave(silent){if(!T)return;trSend('bye');clearInterval(T.hb);clearInterval(T.goI);const R=T.R;setTimeout(()=>R&&R.close(),300);T=null;
  $('#trRoom').hidden=true;$('#trLobby').hidden=false;$('#trNote').textContent='';history.replaceState(null,'',location.pathname);renderTradeLobby();if(!silent)SND.click()}
function renderTradeLobby(){const h=S.hist;$('#trHist').innerHTML=h.length?'<h4>טריידים אחרונים</h4>'+h.slice(0,8).map(x=>`<div>${new Date(x.d).toLocaleDateString('he-IL')} · עם <b>${esc(x.w)}</b>: נתתם ${x.g.length}, קיבלתם ${x.r.length} ${x.r.map(i=>BYID[i]?`<span class="r${BYID[i].r}" style="color:var(--rc)">${esc(BYID[i].n)}</span>`:'').join(', ')}</div>`).join(''):''}

/* ---------------- routing + events ---------------- */
function go(v){$$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));$$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  if(v==='locker')renderGrid();if(v==='crates')renderCrates();if(v==='avatar')renderAvatar();if(v==='trade'){T?trRender():renderTradeLobby()}scrollTo({top:0,behavior:'smooth'});try{sessionStorage.setItem('lk:v',v)}catch(e){}}
$$('.tabs button').forEach(b=>b.onclick=()=>{SND.click();go(b.dataset.v)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(g.dataset.go)});
$('#wCrates').onclick=()=>go('crates');
$('#wCoins').onclick=()=>toast('כל 10 נקודות פנאט במשחקים = אסימון אחד. קונים בהם ארגזים.');
$('#sndBtn').onclick=e=>{AU.on=!AU.on;e.currentTarget.textContent=AU.on?'צליל':'שקט';e.currentTarget.setAttribute('aria-pressed',AU.on);try{localStorage.setItem('hanasi:lksnd',AU.on?'1':'0')}catch(_){}if(AU.on)SND.click()};
$('#sndBtn').textContent=AU.on?'צליל':'שקט';
$('#grid').onclick=e=>{const c=e.target.closest('.card');if(!c)return;SND.click();const it=BYID[c.dataset.id];const x=c.dataset.u?inst(c.dataset.u):null;inspect(it,x)};
$('#cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;F.cat=b.dataset.c;SND.click();renderGrid()};
$('#q').oninput=e=>{F.q=e.target.value;renderGrid()};
$('#sort').onchange=e=>{F.sort=e.target.value;renderGrid()};
$('#modeSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;F.mode=b.dataset.m;SND.click();renderGrid()};
$('#grid').addEventListener('click',e=>{const b=e.target.closest('[data-set]');if(b){e.stopPropagation();claimSet(b.dataset.set,b)}},true);
/* hover tilt on cards (mouse only) */
if(matchMedia('(hover:hover) and (pointer:fine)').matches){let cur=null;
  $('#grid').addEventListener('pointermove',e=>{const c=e.target.closest('.card');if(cur&&cur!==c){cur.style.transform='';cur=null}if(!c)return;cur=c;const b=c.getBoundingClientRect(),px=(e.clientX-b.left)/b.width-.5,py=(e.clientY-b.top)/b.height-.5;
    c.style.transform=`perspective(600px) rotateY(${px*14}deg) rotateX(${-py*14}deg) translateY(-4px) scale(1.03)`;c.style.setProperty('--mx',(px+.5)*100+'%');c.style.setProperty('--my',(py+.5)*100+'%')});
  $('#grid').addEventListener('pointerleave',()=>{if(cur){cur.style.transform='';cur=null}})}
$('#rarLegend').innerHTML=RAR.map((r,i)=>`<span class="r${i}"><i></i>${r.n} · ${r.yrs}</span>`).join('');
$('#slotList').onclick=e=>{const b=e.target.closest('.slot');if(b){SND.click();openPicker(b.dataset.slot)}};
$('#avRand').onclick=()=>{let any=false;SLOTS.forEach(s=>{const l=S.inv.filter(x=>BYID[x.i].sl===s.k);if(l.length){S.eq[s.k]=pick(l).u;any=true}});if(!any){toast('אין עדיין בגדים בלוקר. פתחו ארגז!');return}save();SND.equip();renderAvatar('shirt');const [x,y]=centerOf($('#fig'));FX.burst(x,y,60,['#ffd75a','#d62b2f','#fff'],{sp:9,g:.12})};
$('#avClear').onclick=()=>{S.eq={};save();SND.click();renderAvatar()};
$('#avRename').onclick=()=>{const n=prompt('השם של הדמות שלכם:',S.name||'');if(n!=null){S.name=n.trim().slice(0,18);save();renderAvatar()}};
$('#crateList').onclick=e=>{const o=e.target.closest('[data-open]'),b=e.target.closest('[data-buy]'),f=e.target.closest('[data-five]');if(f)openFive(f.dataset.five);else if(o)openCrate(o.dataset.open,false);else if(b)openCrate(b.dataset.buy,true)};
$('#ovOpen').addEventListener('click',e=>{if(e.target.id==='ovOpen'&&$('#win').hidden===false)closeOpen()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#ovOpen').hidden){if(opening)$('#opSkip').click();else closeOpen()}else{['#ovInspect','#ovPick'].forEach(s=>{const o=$(s);if(!o.hidden){o.hidden=true;o.innerHTML=''}})}}});
/* trade events */
$('#trHost').onclick=()=>{SND.click();trStart('h')};
$('#trJoin').onclick=()=>{const c=$('#trCode').value.replace(/\D/g,'');if(c.length!==4){SND.err();$('#trNote').textContent='הקוד הוא 4 ספרות';return}SND.click();trStart('g',c)};
$('#trCode').onkeydown=e=>{if(e.key==='Enter')$('#trJoin').click()};
$('#trLeave').onclick=()=>trLeave();
$('#trShare').onclick=()=>{const url=`${location.origin}${location.pathname}#trade-${T.code}`;const txt=`בואו לטרייד בלוקר של הנשיא! קוד החדר: ${T.code}\n${url}`;
  if(navigator.share)navigator.share({text:txt}).catch(()=>{});else open('https://wa.me/?text='+encodeURIComponent(txt),'_blank')};
$('#trGrid').onclick=e=>{const c=e.target.closest('.card');if(!c)return;if(trTab==='mine'&&c.dataset.u)trToggle(c.dataset.u);else inspect(BYID[c.dataset.id],null,{view:1})};
$('#trOfferMe').onclick=e=>{const c=e.target.closest('.card');if(c&&c.dataset.u)trToggle(c.dataset.u)};
$('#trOfferThem').onclick=e=>{const c=e.target.closest('.card');if(c&&T&&T.them){const z=T.them.offer.find(q=>q.u===c.dataset.u);if(z)inspect(BYID[z.i],Object.assign({o:'trade:'+T.them.name,t:Date.now()},z),{view:1})}};
$$('.tr-tabs button').forEach(b=>b.onclick=()=>{trTab=b.dataset.t;SND.click();trRender()});
$('#trLockBtn').onclick=()=>{if(!T||!T.them)return;T.me.lock=!T.me.lock;T.me.acc=false;SND.lock();trState();trRender()};
$('#trAccept').onclick=()=>{if(!T||!T.them||!T.me.lock||!T.them.lock)return;T.me.acc=true;SND.lock();trState();trRender();trCheck()};
$('#emotes').onclick=e=>{const b=e.target.closest('button');if(!b||!T)return;emote(b.textContent,true);trSend('em',{e:b.textContent})};
addEventListener('pagehide',()=>{if(T)trSend('bye')});

/* ---------------- init ---------------- */
S=load();
if(S.fresh){delete S.fresh;save();setTimeout(()=>toast('ברוכים הבאים ללוקר! קיבלתם 2 ארגזים במתנה','gold'),600)}
syncXP();wallet();renderAvatar();renderCrates();renderGrid();renderTradeLobby();
addEventListener('focus',()=>{syncXP();wallet()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncXP();wallet()}});
const hm=location.hash.match(/^#trade-(\d{4})$/);
if(hm){go('trade');$('#trCode').value=hm[1];$('#trNote').textContent=`הוזמנתם לחדר ${hm[1]}. לחצו "הצטרפו".`}
else{let v='avatar';try{v=sessionStorage.getItem('lk:v')||(S.inv.length?'avatar':'crates')}catch(e){}go(v)}
if(window.__LK_TEST__)window.__lk={S:()=>S,ITEMS,openCrate,equip,go,save,trStart,T:()=>T};
})();
