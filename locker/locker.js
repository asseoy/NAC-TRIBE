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
  {k:'leg', n:'אגדי',     stamp:'אגדי!!',      c:'#ffcc33',val:1000,yrs:'לפני 2000'},
  {k:'myth',n:'מיתולוגי', stamp:'מיתולוגי!',   c:'#ff4040',val:400, yrs:'2000–2005'},
  {k:'epic',n:'אפי',      stamp:'אפי!',        c:'#e040fb',val:160, yrs:'2006–2010'},
  {k:'rare',n:'נדיר',     stamp:'נדיר!',       c:'#8c5bff',val:70,  yrs:'2011–2015'},
  {k:'spec',n:'מיוחד',    stamp:'מיוחד',       c:'#3d82ff',val:30,  yrs:'2016–2020 או שנה לא ידועה'},
  {k:'new', n:'רגיל',     stamp:'חדש בלוקר',   c:'#a9b9c9',val:15,  yrs:'2021 והלאה'},
];
const ITEMS=LK_ITEMS.map((a,ix)=>({id:a[0],n:a[1],y:a[2],c:a[3],s:a[4],r:a[5],sl:a[6],im:a[7],col:a[8],ix}));
const BYID=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const BYR=RAR.map((_,r)=>ITEMS.filter(i=>i.r===r));
const SLOTS=[
  {k:'hat',  n:'כובע',          ic:'🧢',cats:'כובעים'},
  {k:'neck', n:'צעיף / חם צוואר',ic:'🧣',cats:'צעיפים, חם צוואר'},
  {k:'shirt',n:'חולצה',         ic:'👕',cats:'חולצות'},
  {k:'outer',n:'שכבה עליונה',   ic:'🧥',cats:'סווצ׳רטים, פליזים, סרבלים'},
  {k:'pants',n:'מכנסיים',       ic:'🩳',cats:'מכנסיים'},
  {k:'acc',  n:'אביזר',         ic:'⌚',cats:'מגני זיעה, צמידים, חאקי ועוד'},
];
const CRATES=[
  {k:'mahsan',  n:'ארגז המחסן',   d:'ארגז העץ הקלאסי של השבט. כל פריט יכול לצאת.',price:150,
   w:[.8,3.2,9,17,30,40], wood:'linear-gradient(135deg,#b07a3f,#6b3f17)',trim:'#3a210b',band:'#d62b2f',cc:'#c98a4a'},
  {k:'mahteret',n:'תיבת המחתרת',  d:'בלי פריטים רגילים, וסיכוי גבוה יותר לבגד ישן.',price:450,
   w:[1.5,6.5,15,32,45,0], wood:'linear-gradient(135deg,#2a1b1f,#0b0607)',trim:'#d62b2f',band:'#f6be3c',cc:'#d62b2f'},
  {k:'archive', n:'ארגז הארכיון', d:'רק פריטים מ־2010 ומטה: אפי ומעלה בלבד.',price:1200,
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
  if(!s||s.v!==1){s={v:1,name:'',coins:0,xpSeen:0,inv:[],eq:{},crates:{mahsan:3,mahteret:1,archive:0},daily:'',seen:{},hist:[],stats:{opened:0,traded:0},fresh:1}}
  s.inv=(s.inv||[]).filter(x=>BYID[x.i]);
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
  const LOW=Math.min(innerWidth,innerHeight)<700, K=LOW?.55:1;
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
function wallet(bump){
  $('#wCoins b').textContent=fmt(S.coins);$('#wCrates b').textContent=crateCount();$('#wRank').textContent=rankOf(readXP());
  const n=crateCount(),bd=$('#crBadge');bd.hidden=!n;bd.textContent=n;
  if(bump){const el=$(bump==='coins'?'#wCoins':'#wCrates');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
}
function syncXP(){const xp=readXP();if(xp>S.xpSeen){const d=xp-S.xpSeen;S.xpSeen=xp;S.coins+=d;save();wallet('coins');toast(`+${fmt(d)} אסימונים מנקודות הפנאט שצברתם במשחקים`,'gold');SND.coin()}}

/* ---------------- avatar ---------------- */
const eqItem=k=>{const x=S.eq[k]&&inst(S.eq[k]);return x?BYID[x.i]:null};
const PAT={hat:[106,22,140,74],neck:[128,138,64,104],shirt:[56,150,208,196],outer:[50,30,220,320],pants:[86,312,148,134],acc:[58,292,34,32]};
function pat(k,it){const [x,y,w,h]=PAT[k];return `<pattern id="pt-${k}" patternUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${it.col}"/><image href="${imgSrc(it)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></pattern>`}
const mir=pts=>pts.split(' ').map(p=>{const [x,y]=p.split(',');return (320-x)+','+y}).join(' ');
function figSVG(flash){
  const it={};SLOTS.forEach(s=>it[s.k]=eqItem(s.k));
  const fill=(k,def)=>it[k]?`url(#pt-${k})`:def;
  const O='stroke="#0a0506" stroke-width="3.5" stroke-linejoin="round"';
  const fl=k=>flash===k?' flashme':'';
  const P=(k,pts,def,extra='')=>`<polygon class="part g-${k}${fl(k)}" data-slot="${k}" points="${pts}" fill="${fill(k,def)}" ${O} ${extra}/>`;
  const sh=(pts,a)=>`<polygon points="${pts}" fill="${a>0?'#fff':'#000'}" opacity="${Math.abs(a)}" pointer-events="none"/>`;
  const skin='#d9a57b',skinD='#b98559';
  const sleeveL='104,158 74,238 98,250 118,198', foreL='78,236 64,318 84,324 98,248', longL='104,156 60,316 86,326 120,198';
  let s=`<svg viewBox="0 0 320 640" xmlns="http://www.w3.org/2000/svg"><defs>${SLOTS.map(x=>it[x.k]?pat(x.k,it[x.k]):'').join('')}
  <pattern id="stripes" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(35)"><rect width="16" height="16" fill="#c4161c"/><rect width="8" height="16" fill="#140a0b"/></pattern>
  <radialGradient id="shad"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="160" cy="590" rx="92" ry="16" fill="url(#shad)"/>`;
  /* hood (outer) behind head */
  if(it.outer)s+=`<path class="part g-outer${fl('outer')}" data-slot="outer" d="M112 162 C112 128 136 112 160 112 C184 112 208 128 208 162 Z" fill="url(#pt-outer)" ${O}/>${sh('112,162 160,112 136,120 118,140',-.3)}`;
  /* legs + shoes */
  s+=`<g class="breathe"><polygon points="98,436 148,436 142,560 106,560" fill="${skin}" ${O}/><polygon points="172,436 222,436 214,560 178,560" fill="${skin}" ${O}/>
  ${sh('98,436 122,436 116,560 106,560',-.15)}${sh('172,436 196,436 190,560 178,560',-.15)}
  <polygon points="102,552 146,552 152,584 84,584 88,566" fill="#151012" ${O}/><polygon points="174,552 218,552 232,566 236,584 168,584" fill="#151012" ${O}/>
  <polygon points="88,574 152,574 152,580 86,580" fill="#d62b2f"/><polygon points="168,574 234,574 236,580 168,580" fill="#d62b2f"/>`;
  /* pants */
  s+=P('pants','96,314 224,314 232,442 168,442 160,362 152,442 88,442','#1f2a44')+sh('96,314 160,314 160,362 152,442 88,442',-.18)+`<polyline points="160,330 160,362" stroke="#0a0506" stroke-width="2.5" fill="none" opacity=".6"/>`;
  /* torso */
  if(!it.outer){
    s+=P('shirt','104,156 216,156 228,328 92,328','#c8ad74')+sh('104,156 160,156 160,328 92,328',-.16)+sh('160,156 216,156 190,240',.07);
    s+=`<polygon points="144,156 160,178 176,156" fill="${skinD}" stroke="#0a0506" stroke-width="2.5"/>`;
  }else{
    s+=P('outer','98,152 222,152 234,338 86,338','#000')+sh('98,152 160,152 160,338 86,338',-.18);
    s+=`<polygon points="122,284 198,284 190,326 130,326" fill="#000" opacity=".22" pointer-events="none" stroke="#0a0506" stroke-width="2"/><line x1="160" y1="160" x2="160" y2="336" stroke="#0a0506" stroke-width="2.5" opacity=".7"/>
    <path d="M150 166 L146 214 M170 166 L174 214" stroke="#eee" stroke-width="3" stroke-linecap="round"/>`;
  }
  /* scarf */
  s+=`<g class="sway">`+P('neck','136,146 184,146 190,170 130,170',it.neck?'':'url(#stripes)')+P('neck','142,166 160,250 178,166',it.neck?'':'url(#stripes)')+sh('142,166 160,250 160,166',-.2)+`<circle cx="160" cy="192" r="9" fill="#e7c25a" stroke="#0a0506" stroke-width="3"/></g>`;
  /* arms */
  const arm=(side)=>{const m=side==='R'?mir:(x=>x);let a=`<g class="arm${side}">`;
    if(it.outer){a+=P('outer',m(longL),'#000')+sh(m('104,156 60,316 72,320 112,200'),-.15);}
    else{a+=`<polygon points="${m(foreL)}" fill="${skin}" ${O}/>`+P('shirt',m(sleeveL),'#c8ad74')+sh(m('104,158 74,238 86,244'),-.15);}
    a+=`<circle cx="${side==='R'?246:74}" cy="332" r="11" fill="${skin}" ${O}/>`;
    if(side==='L'&&it.acc)a+=P('acc','60,298 90,304 88,322 58,316','#000');
    return a+'</g>'};
  s+=arm('L')+arm('R')+'</g>';
  /* head */
  s+=`<g class="headbob"><polygon points="146,118 174,118 176,154 144,154" fill="${skinD}" ${O}/>
  <polygon points="160,30 192,42 204,78 198,112 178,132 160,138 142,132 122,112 116,78 128,42" fill="${skin}" ${O}/>
  ${sh('160,30 128,42 116,78 122,112 142,132 160,138 160,84',-.12)}${sh('160,30 192,42 204,78 160,84',.1)}
  <polygon points="134,86 150,82 152,90 136,92" fill="#fff" stroke="#0a0506" stroke-width="2"/><polygon points="186,86 170,82 168,90 184,92" fill="#fff" stroke="#0a0506" stroke-width="2"/>
  <circle cx="145" cy="88" r="3.2" fill="#140a0b"/><circle cx="175" cy="88" r="3.2" fill="#140a0b"/>
  <path d="M130 76 L152 72 M190 76 L168 72" stroke="#140a0b" stroke-width="4" stroke-linecap="round"/>
  <path d="M160 92 L154 108 L162 110" stroke="#9c6a43" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
  <path d="M146 120 Q162 128 176 116" stroke="#140a0b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if(it.hat)s+=P('hat','116,80 120,48 140,30 180,30 200,48 204,80')+`<polygon class="part g-hat" data-slot="hat" points="198,72 244,82 240,92 196,84" fill="url(#pt-hat)" ${O}/>`+sh('116,80 120,48 140,30 160,30 160,80',-.18);
  else s+=`<polygon class="part" data-slot="hat" points="120,74 124,46 142,30 178,30 196,46 200,74 186,58 160,52 134,60" fill="#1b1012" ${O}/>`;
  s+='</g>';
  /* hit areas for empty acc slot */
  if(!it.acc)s+=`<rect class="part" data-slot="acc" x="56" y="292" width="36" height="34" fill="transparent"/>`;
  return s+'</svg>';
}
function renderAvatar(flash){
  const fig=$('#fig');fig.innerHTML=figSVG(flash);if(flash){fig.classList.remove('pop');void fig.offsetWidth;fig.classList.add('pop')}
  let best=6,score=0;SLOTS.forEach(s=>{const x=S.eq[s.k]&&inst(S.eq[s.k]);if(x){score+=valOf(x);best=Math.min(best,BYID[x.i].r)}});
  $('#stage').style.setProperty('--glow',best<6?RAR[best].c:'#d62b2f');
  $('#avName').textContent=S.name||'צופה של הנשיא';
  $('#avScore').textContent=score?`ערך הלבוש: ${fmt(score)} אסימונים · ${rankOf(readXP())}`:'הדמות לובשת את מדי הבסיס. הלבישו אותה מהלוקר!';
  if(flash){const g=$$('.flashme',fig);g.forEach(p=>{const c=p.cloneNode();c.removeAttribute('class');c.setAttribute('class','flash');c.setAttribute('fill','#fff');c.removeAttribute('stroke');p.after(c)});
    const el=g[0];if(el){const [x,y]=centerOf(el);const r=eqItem(flash);FX.burst(x,y,40,[r?RAR[r.r].c:'#fff','#fff','#ffd75a'],{t:'s',s:3,sp:7,g:.05})}}
  fig.querySelectorAll('.part').forEach(p=>p.addEventListener('click',()=>openPicker(p.dataset.slot)));
  $('#slotList').innerHTML=SLOTS.map(s=>{const it=eqItem(s.k);
    return `<button class="slot ${it?'r'+it.r:''}" data-slot="${s.k}"><span class="sth" style="${it?`background-image:url(${imgSrc(it)})`:''}">${it?'':s.ic}</span><span><b>${s.n}</b>${it?`<small>${esc(it.n)}</small><small class="rn">${RAR[it.r].n} · ${yrTxt(it)}</small>`:`<small>ריק · ${s.cats}</small>`}</span></button>`}).join('');
}
function equip(u){const x=inst(u);if(!x)return;const it=BYID[x.i];S.eq[it.sl]=u;save();SND.equip();renderAvatar(it.sl);renderGrid()}
function unequip(k){delete S.eq[k];save();SND.click();renderAvatar();renderGrid()}

/* ---------------- locker grid ---------------- */
const F={cat:'הכל',q:'',sort:'rar',all:false};
const CATS=['הכל',...[...new Set(ITEMS.map(i=>i.c))]];
function cardHTML(it,x,o={}){
  const tags=[];if(x&&Object.values(S.eq).includes(x.u))tags.push('<i class="eq">לבוש</i>');if(x&&x.sg)tags.push('<i class="sg">✍ חתום</i>');if(o.count>1)tags.push(`<i class="ct">×${o.count}</i>`);
  return `<button class="card r${it.r}${o.miss?' miss':''}${o.sel?' sel':''}${o.newf?' new-flag':''}" ${x?`data-u="${x.u}"`:''} data-id="${it.id}" style="--i:${Math.min(o.i||0,40)}">
  <div class="th" style="${thStyle(it)}">${it.r<2&&!o.miss?'<i class="holo"></i>':''}</div><span class="yr">${yrTxt(it)}</span><span class="tg">${tags.join('')}</span>
  <div class="cb"><b>${esc(it.n)}</b><small>${o.sub||esc(it.c+(it.s?' · '+it.s:''))}</small></div><i class="rb"></i></button>`;
}
function sortFn(a,b){const A=BYID[a.i],B=BYID[b.i];
  if(F.sort==='rar')return A.r-B.r||(A.y||3000)-(B.y||3000)||(b.t-a.t);
  if(F.sort==='old')return (A.y||3000)-(B.y||3000)||A.r-B.r;
  if(F.sort==='new')return (B.y||0)-(A.y||0);
  return b.t-a.t}
function match(it){if(F.cat!=='הכל'&&it.c!==F.cat)return false;if(F.q){const q=F.q.trim();return (it.n+' '+it.c+' '+it.s+' '+it.y+' '+RAR[it.r].n).includes(q)}return true}
function renderGrid(){
  const own=new Set(S.inv.map(x=>x.i));
  $('#colNum').textContent=own.size;$('#colTot').textContent=ITEMS.length;$('#colBar').style.width=(own.size/ITEMS.length*100)+'%';
  $('#cats').innerHTML=CATS.map(c=>{const n=c==='הכל'?ITEMS.length:ITEMS.filter(i=>i.c===c).length,m=c==='הכל'?own.size:[...own].filter(id=>BYID[id].c===c).length;return `<button class="${F.cat===c?'on':''}" data-c="${c}">${c}<small>${m}/${n}</small></button>`}).join('');
  let html='';
  if(F.all){
    const cnt={};S.inv.forEach(x=>cnt[x.i]=(cnt[x.i]||0)+1);
    let list=ITEMS.filter(match);
    list.sort((a,b)=>F.sort==='old'?(a.y||3000)-(b.y||3000):F.sort==='new'?(b.y||0)-(a.y||0):a.r-b.r||(a.y||3000)-(b.y||3000));
    html=list.map((it,i)=>{const x=S.inv.find(z=>z.i===it.id);return cardHTML(it,x,{miss:!x,count:cnt[it.id],i})}).join('');
  }else{
    const list=S.inv.filter(x=>match(BYID[x.i])).sort(sortFn);
    html=list.map((x,i)=>cardHTML(BYID[x.i],x,{i,newf:x.nw})).join('');
  }
  $('#grid').innerHTML=html;
  $('#lkEmpty').hidden=!!S.inv.length||F.all;
}

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
    ${x&&!opts.view?`<div class="acts">${worn?`<button class="btn ghost" data-a="off">הורידו מהדמות</button>`:`<button class="btn gold" data-a="on">👕 לבשו על הדמות</button>`}<button class="btn ghost" data-a="rec">♻️ פירוק ל־${fmt(valOf(x))} אסימונים</button></div>`:''}
    ${dup?`<div class="dupes">יש לכם עוד ${dup} ${dup>1?'עותקים':'עותק'} של הפריט הזה.</div>`:''}</div></div>`;
  const close=()=>{ov.hidden=true;ov.innerHTML=''};
  ov.onclick=e=>{if(e.target===ov||e.target.closest('.x'))close()};
  const tilt=$('.tilt',ov),card=$('.tcard',ov);let flipped=false;
  tilt.onpointermove=e=>{const b=card.getBoundingClientRect(),px=(e.clientX-b.left)/b.width,py=(e.clientY-b.top)/b.height;
    card.style.transform=`${flipped?'rotateY(180deg) ':''}rotateY(${(px-.5)*(flipped?-22:22)}deg) rotateX(${(.5-py)*18}deg)`;
    $$('.tface',ov).forEach(f=>{f.style.setProperty('--gx',px*100+'%');f.style.setProperty('--gy',py*100+'%');f.style.setProperty('--ga',(px*180)+'deg')})};
  tilt.onpointerleave=()=>{card.style.transform=flipped?'rotateY(180deg)':''};
  $$('.views button',ov).forEach(b=>b.onclick=e=>{e.stopPropagation();const j=+b.dataset.j;$$('.views button',ov).forEach(z=>z.classList.toggle('on',z===b));
    if(it.im===2){flipped=j===1;card.style.transform=flipped?'rotateY(180deg)':''}else{$('.tface img',ov).src=imgSrc(it,j)}SND.click()});
  $$('[data-a]',ov).forEach(b=>b.onclick=()=>{const a=b.dataset.a;
    if(a==='on'){equip(x.u);close();go('avatar')}
    else if(a==='off'){unequip(it.sl);close()}
    else if(a==='rec'){if(!b.dataset.ok){b.dataset.ok=1;b.textContent=`בטוח? לחצו שוב (+${fmt(valOf(x))})`;b.classList.remove('ghost');return}
      const v=valOf(x),[cx,cy]=centerOf(b);S.inv=S.inv.filter(z=>z.u!==x.u);for(const k in S.eq)if(S.eq[k]===x.u)delete S.eq[k];S.coins+=v;save();
      FX.burst(cx,cy,30,['#ffd75a','#f6be3c','#fff3c0'],{t:'c',s:3,sp:8});SND.coin();wallet('coins');toast(`פירקתם את "${esc(it.n)}" וקיבלתם ${fmt(v)} אסימונים`,'gold');close();renderGrid();renderAvatar()}});
  if(x&&x.nw){delete x.nw;save()}
}

/* ---------------- picker (slot) ---------------- */
function openPicker(k){
  const sl=SLOTS.find(s=>s.k===k),ov=$('#ovPick');ov.hidden=false;
  const list=S.inv.filter(x=>BYID[x.i].sl===k).sort((a,b)=>BYID[a.i].r-BYID[b.i].r);
  ov.innerHTML=`<div class="sheet"><header><h3>${sl.ic} ${sl.n}</h3>${S.eq[k]?'<button class="btn ghost" data-off>הורידו</button>':''}<button class="btn ghost" data-x>סגירה</button></header>
   ${list.length?`<div class="grid small">${list.map((x,i)=>cardHTML(BYID[x.i],x,{i,sel:S.eq[k]===x.u})).join('')}</div>`:`<p class="empty">אין לכם עדיין ${sl.n} (${sl.cats}).<br><button class="btn" data-cr>לפתיחת ארגזים ←</button></p>`}</div>`;
  const close=()=>{ov.hidden=true;ov.innerHTML=''};
  ov.onclick=e=>{const c=e.target.closest('.card');
    if(c){equip(c.dataset.u);close();return}
    if(e.target.closest('[data-off]')){unequip(k);close();return}
    if(e.target.closest('[data-cr]')){close();go('crates');return}
    if(e.target===ov||e.target.closest('[data-x]'))close()};
}

/* ---------------- crates ---------------- */
function rollItem(cr){const w=cr.w,tot=w.reduce((a,b)=>a+b,0);let r=rnd()*tot,t=0;for(;t<w.length;t++){if((r-=w[t])<0)break}t=Math.min(t,5);
  let pool=BYR[t];while(!pool.length&&t<5)pool=BYR[++t];return pick(pool)}
function newInst(it,o){const age=it.y?clamp((2027-it.y)/35,0,1):.4;const w=clamp(rnd()*.55+age*.45*rnd()+age*.12,0,.999);
  return {u:uid(),i:it.id,w:+w.toFixed(4),sg:rnd()<.04?1:0,t:Date.now(),o,nw:1}}
function renderCrates(){
  const d=$('#daily');
  if(S.daily!==today())d.innerHTML=`<div class="dbox"><span style="font-size:40px">🎁</span><div><b>הארגז היומי מחכה!</b><p>ארגז מחסן חינם, פעם ביום.</p></div><button class="btn gold" id="dailyBtn">קבלו ארגז</button></div>`;
  else{const t=new Date();t.setHours(24,0,0,0);const m=Math.ceil((t-Date.now())/60000);d.innerHTML=`<div class="dbox" style="opacity:.75"><span style="font-size:34px">⏳</span><div><b>הארגז היומי נלקח</b><p>הארגז הבא עוד ${Math.floor(m/60)} שעות ו־${m%60} דקות.</p></div></div>`}
  $('#crateList').innerHTML=CRATES.map(c=>{const tot=c.w.reduce((a,b)=>a+b,0),own=S.crates[c.k]||0;
    return `<div class="crt" style="--cc:${c.cc}">${own?`<span class="own">יש לכם ${own}</span>`:''}
    <div class="mini3d"><div class="cube" style="--s:86px;--wood:${c.wood};--trim:${c.trim};--band:${c.band};--logo:url(img/logo.webp)"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i><i class="lid"></i></div></div>
    <h3>${c.n}</h3><p>${c.d}</p>
    <div class="odds">${c.w.map((w,r)=>w?`<i class="r${r}" style="flex:${w}"></i>`:'').join('')}</div>
    <div class="oddt">${c.w.map((w,r)=>w?`<span class="r${r}">${RAR[r].n} ${(w/tot*100).toFixed(w/tot<.02?1:0)}%</span>`:'').join('')}</div>
    <div class="acts">${own?`<button class="btn gold" data-open="${c.k}">פתחו ארגז</button>`:''}<button class="btn${own?' ghost':''}" data-buy="${c.k}" ${S.coins<c.price?'disabled':''}>קנו ופתחו · <span class="price">${fmt(c.price)}</span>🪙</button></div></div>`}).join('');
  const db=$('#dailyBtn');if(db)db.onclick=()=>{S.daily=today();S.crates.mahsan=(S.crates.mahsan||0)+1;save();const [x,y]=centerOf(db);FX.burst(x,y,50,['#ffd75a','#d62b2f','#fff'],{up:1,sp:10});SND.coin();wallet('crates');toast('קיבלתם ארגז מחסן! 📦','gold');renderCrates()};
}
let opening=null;
function openCrate(k,buy){
  const c=CR[k];if(opening)return;
  if(buy){if(S.coins<c.price){SND.err();toast('אין מספיק אסימונים. שחקו במשחקי השבט כדי לצבור עוד!');return}S.coins-=c.price}
  else{if(!(S.crates[k]>0))return;S.crates[k]--}
  const it=rollItem(c),x=newInst(it,k),first=!S.inv.some(z=>z.i===it.id);
  S.inv.push(x);S.stats.opened++;save();wallet();
  const ov=$('#ovOpen');ov.hidden=false;ov.classList.remove('lit','shake');ov.style.setProperty('--rc',RAR[it.r].c);
  const crate=$('#opCrate'),cube=$('.cube',crate);crate.hidden=false;crate.className='op-crate';crate.style.animation='none';void crate.offsetWidth;crate.style.animation='';
  cube.style.cssText=`--wood:${c.wood};--trim:${c.trim};--band:${c.band};--logo:url(img/logo.webp)`;
  $('#reelWrap').hidden=true;$('#win').hidden=true;$('#opSkip').hidden=false;
  const st={done:false,skip:false};opening=st;
  /* phase 1: the crate drops in, charges up (glow + growing shake), then bursts open */
  tone(180,.25,'sine',.25,-90,.45);noise(.18,.15,300,.5);
  st.t0=setTimeout(()=>{crate.classList.add('charge');SND.rise()},650);
  st.t1=setTimeout(()=>{crate.classList.remove('charge');crate.classList.add('pop');
    const b=document.createElement('i');b.className='burst';crate.append(b);SND.boom();
    const fl=$('#opFlash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
    const [cx,cy]=centerOf(crate);FX.burst(cx,cy,70,['#c98a4a','#6b3f17','#ffd75a','#fff'],{sp:13,s:5});
    setTimeout(()=>reel(it,x,first,st),380)},1900);
}
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
    <div class="wtags"><span class="rpill r${it.r}">${RAR[it.r].n}</span><span>${wearName(x.w)}</span>${x.sg?'<span style="color:#ffd75a">✍ חתום ע״י ראש השבט!</span>':''}${first?'<span style="color:#3ddc84">✦ חדש באוסף</span>':'<span>כפול</span>'}</div>
    <div class="acts"><button class="btn gold" data-w="wear">👕 לבשו עכשיו</button>${more?`<button class="btn" data-w="again">📦 עוד ארגז</button>`:''}<button class="btn ghost" data-w="lk">ללוקר</button></div>`;
  const wc=$('.wc',win);
  if(from){const to=wc.getBoundingClientRect();const sx=from.width/to.width,dx=from.left+from.width/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2);
    wc.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx})`,filter:'brightness(2)'},{transform:'translate(0,-30px) scale(1.08)',filter:'brightness(1.4)',offset:.6},{transform:'none',filter:'none'}],{duration:800,easing:'cubic-bezier(.2,.9,.3,1)'})}
  else wc.animate([{transform:'scale(.3) rotateY(180deg)',opacity:0},{transform:'none',opacity:1}],{duration:600,easing:'cubic-bezier(.2,1.4,.4,1)'});
  SND.win(it.r);const col=RAR[it.r].c;
  const [cx,cy]=[innerWidth/2,innerHeight*.45];
  FX.burst(cx,cy,it.r<2?160:it.r<4?90:50,[col,'#fff',col,'#ffd75a'],{sp:it.r<2?16:10,s:5,l:2.2});
  if(it.r<=2)FX.rain(it.r===0?260:it.r===1?160:80,[col,'#fff','#ffd75a','#d62b2f']);
  if(it.r<=1){ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake')}
  win.onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;const a=b.dataset.w;closeOpen();
    if(a==='wear'){equip(x.u);go('avatar')}else if(a==='again'){openCrate(x.o,!(S.crates[x.o]>0))}else go('locker')};
  renderCrates();renderGrid();
}
function closeOpen(){const ov=$('#ovOpen');ov.hidden=true;ov.classList.remove('lit','shake');$('#win').innerHTML='';if(opening){opening.done=true;clearTimeout(opening.t0);clearTimeout(opening.t1);opening=null}renderCrates();renderGrid()}
$('#opSkip').onclick=()=>{if(!opening)return;opening.skip=true;const st=opening;
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
    if(m.ask)trHello(false);if(!was){toast(`${esc(T.them.name)} נכנס לחדר!`,'gold');SND.deal()}trRender();return}
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
  tradeFx(give,get);
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
    setTimeout(()=>{FX.burst(innerWidth/2,innerHeight/2,140,['#3ddc84','#ffd75a','#fff','#d62b2f'],{sp:14,s:5});FX.rain(120,['#3ddc84','#ffd75a','#fff']);
      box.insertAdjacentHTML('beforeend','<div class="done">טרייד בוצע!</div>');SND.win(1)},1200);
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
  $('#trValMe').textContent=fmt(vm)+'🪙';$('#trValThem').textContent=fmt(vt)+'🪙';$('#trBal i').style.width=(vm+vt?vt/(vm+vt)*100:50)+'%';
  const sm=$('.tr-side.me'),sT=$('.tr-side.them');sm.classList.toggle('locked',T.me.lock);sm.classList.toggle('acc',T.me.acc);sT.classList.toggle('locked',!!th&&th.lock);sT.classList.toggle('acc',!!th&&th.acc);
  $('#trLockMe').textContent=T.me.acc?'✓ אישרתם':T.me.lock?'🔒 נעול':'פתוח · בחרו פריטים למטה';$('#trLockThem').textContent=!th?'':th.acc?'✓ אישר':th.lock?'🔒 נעול':'בוחר פריטים…';
  const lb=$('#trLockBtn');lb.disabled=!th||T.me.acc;lb.textContent=T.me.lock?'🔓 פתחו הצעה':'🔒 נעלו הצעה';
  const ab=$('#trAccept');ab.disabled=!(th&&T.me.lock&&th.lock&&!T.me.acc&&(T.me.offer.length||(th.offer||[]).length));ab.textContent=T.me.acc?'מחכים לחבר…':'🤝 אשרו טרייד';
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
$('#wCoins').onclick=()=>toast('🪙 כל נקודת פנאט במשחקי האתר שווה אסימון. קונים בהם ארגזים.');
$('#sndBtn').onclick=e=>{AU.on=!AU.on;e.currentTarget.textContent=AU.on?'🔊':'🔇';e.currentTarget.setAttribute('aria-pressed',AU.on);try{localStorage.setItem('hanasi:lksnd',AU.on?'1':'0')}catch(_){}if(AU.on)SND.click()};
$('#sndBtn').textContent=AU.on?'🔊':'🔇';
$('#grid').onclick=e=>{const c=e.target.closest('.card');if(!c)return;SND.click();const it=BYID[c.dataset.id];const x=c.dataset.u?inst(c.dataset.u):null;inspect(it,x)};
$('#cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;F.cat=b.dataset.c;SND.click();renderGrid()};
$('#q').oninput=e=>{F.q=e.target.value;renderGrid()};
$('#sort').onchange=e=>{F.sort=e.target.value;renderGrid()};
$('#allBtn').onclick=e=>{F.all=!F.all;e.currentTarget.setAttribute('aria-pressed',F.all);SND.click();renderGrid()};
$('#rarLegend').innerHTML=RAR.map((r,i)=>`<span class="r${i}"><i></i>${r.n} · ${r.yrs}</span>`).join('');
$('#slotList').onclick=e=>{const b=e.target.closest('.slot');if(b){SND.click();openPicker(b.dataset.slot)}};
$('#avRand').onclick=()=>{let any=false;SLOTS.forEach(s=>{const l=S.inv.filter(x=>BYID[x.i].sl===s.k);if(l.length){S.eq[s.k]=pick(l).u;any=true}});if(!any){toast('אין עדיין בגדים בלוקר. פתחו ארגז!');return}save();SND.equip();renderAvatar('shirt');const [x,y]=centerOf($('#fig'));FX.burst(x,y,60,['#ffd75a','#d62b2f','#fff'],{t:'s',sp:9,g:.04})};
$('#avClear').onclick=()=>{S.eq={};save();SND.click();renderAvatar()};
$('#avRename').onclick=()=>{const n=prompt('השם של הדמות שלכם:',S.name||'');if(n!=null){S.name=n.trim().slice(0,18);save();renderAvatar()}};
$('#crateList').onclick=e=>{const o=e.target.closest('[data-open]'),b=e.target.closest('[data-buy]');if(o)openCrate(o.dataset.open,false);else if(b)openCrate(b.dataset.buy,true)};
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
if(S.fresh){delete S.fresh;save();setTimeout(()=>toast('ברוכים הבאים ללוקר! קיבלתם 4 ארגזים במתנה 📦','gold'),600)}
syncXP();wallet();renderAvatar();renderCrates();renderGrid();renderTradeLobby();
addEventListener('focus',()=>{syncXP();wallet()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncXP();wallet()}});
const hm=location.hash.match(/^#trade-(\d{4})$/);
if(hm){go('trade');$('#trCode').value=hm[1];$('#trNote').textContent=`הוזמנתם לחדר ${hm[1]}. לחצו "הצטרפו".`}
else{let v='avatar';try{v=sessionStorage.getItem('lk:v')||(S.inv.length?'avatar':'crates')}catch(e){}go(v)}
if(window.__LK_TEST__)window.__lk={S:()=>S,ITEMS,openCrate,equip,go,save,trStart,T:()=>T};
})();
