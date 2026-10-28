/* הלוקר של הנשיא – crates and the collection.
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
  {n:'אגדי',     c:'#F3E03B',val:120,yrs:'לפני 2000'},
  {n:'מיתולוגי', c:'#FD1D1D',val:50, yrs:'2000–2005'},
  {n:'אפי',      c:'#c64bd8',val:20, yrs:'2006–2010'},
  {n:'נדיר',     c:'#8a63ff',val:9,  yrs:'2011–2015'},
  {n:'מיוחד',    c:'#3f86ff',val:4,  yrs:'2016–2020 או שנה לא ידועה'},
  {n:'רגיל',     c:'#b8b2aa',val:2,  yrs:'2021 והלאה'},
];
const ITEMS=LK_ITEMS.map((a,ix)=>({id:a[0],n:a[1],y:a[2],c:a[3],s:a[4],r:a[5],im:a[7],col:a[8],ix}));
const BYID=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const BYR=RAR.map((_,r)=>ITEMS.filter(i=>i.r===r));
const CRATES=[
  {k:'sak',     n:'שק בגדים',    d:'שקית זבל מלאה בגדים ישנים שמישהו פינה מהמחסן. 3 בגדים בכל שק.',price:160,bag:1,
   cats:['חולצות','סווצ׳רטים','מכנסיים','פליזים','סרבלים'],w:[.6,2.4,7,15,30,45]},
  {k:'mahsan',  n:'ארגז המחסן',   d:'ארגז העץ הקלאסי של השבט. כל פריט יכול לצאת.',price:100,w:[.8,3.2,9,17,30,40]},
  {k:'mahteret',n:'תיבת המחתרת',  d:'בלי פריטים רגילים, וסיכוי גבוה יותר לבגד ישן.',price:300,w:[1.5,6.5,15,32,45,0]},
  {k:'archive', n:'ארגז הארכיון', d:'רק פריטים מ־2010 ומטה: אפי ומעלה בלבד.',price:800,w:[6,24,70,0,0,0]},
];
const CR=Object.fromEntries(CRATES.map(c=>[c.k,c]));
const WEAR=[[.07,'חדש מהמחסן'],[.15,'כמעט חדש'],[.38,'נלבש במחנה'],[.45,'שרד חלוץ'],[1.01,'קרוע מהשטח']];
const wearName=w=>WEAR.find(x=>w<x[0])[1];

/* atlas thumbnails (8×8 per sheet) for the reel; full photos everywhere else */
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
  if(!s||typeof s!=='object'||s.v!==1){s={v:1,coins:0,xpSeen:0,inv:[],crates:{mahsan:2,mahteret:0,archive:0},daily:'',stats:{opened:0},fresh:1}}
  s.crates=s.crates||{};CRATES.forEach(c=>{s.crates[c.k]=Math.max(0,s.crates[c.k]|0)});
  if(!s.eco2){s.coins=Math.floor((s.coins||0)/10);s.eco2=1;s.xpRem=0}if(!s.eco3){s.coins=Math.min(120,Math.floor((s.coins||0)/2.5));s.eco3=1;s.xpRem=0}
  s.coins=Math.max(0,+s.coins||0);s.xpSeen=+s.xpSeen||0;s.stats=s.stats||{opened:0};
  s.inv=(Array.isArray(s.inv)?s.inv:[]).filter(x=>x&&BYID[x.i]);
  /* leftovers of the old skins / trades / missions / sets */
  ['eq','name','hist','day','streak','sets','setsSeen','seen'].forEach(k=>delete s[k]);
  return s;
}
function save(){if(lsOK){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}}
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
  rise:()=>{tone(120,1.1,'sawtooth',.07,600);noise(1.1,.06,300)},
  boom:()=>{tone(90,.6,'sine',.4,-60);noise(.5,.25,200)},
  win:r=>{const base=[[523,659,784,1047],[440,554,659,880],[392,494,587,784],[349,440,523,698],[330,415,494,659],[294,370,440,587]][r];base.forEach((f,i)=>tone(f,r<2?1.6:.9,'triangle',.13,0,i*.07));if(r<2){[1047,1319,1568,2093].forEach((f,i)=>tone(f,.9,'sine',.07,0,.35+i*.09));noise(.9,.08,4000,.1)}},
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
      if(p.t==='c'){g.beginPath();g.arc(0,0,p.s*dpr,0,7);g.fill()}else g.fillRect(-p.s*dpr,-p.s*.5*dpr,p.s*2*dpr,p.s*dpr)}
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
  rollCoins();const n=crateCount();$('#wCrates b').textContent=n;
  const bd=$('#crBadge');bd.hidden=!n;bd.textContent=n;
  if(bump){const el=$(bump==='coins'?'#wCoins':'#wCrates');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
}
const XP_PER_COIN=25;
function syncXP(){const xp=readXP();if(xp>S.xpSeen){const pool=(S.xpRem||0)+xp-S.xpSeen;S.xpSeen=xp;const d=Math.floor(pool/XP_PER_COIN);S.xpRem=pool-d*XP_PER_COIN;if(d>0){S.coins+=d;wallet('coins');toast(`+${fmt(d)} אסימונים מהמשחקים`,'gold');SND.coin()}save()}}

/* ---------------- collection ---------------- */
/* fixed sections built from the catalog categories (small categories are folded together) */
const GROUPS=[
  {k:'mit',  n:'חולצות מתקן',      f:i=>i.c==='חולצות'&&i.s.startsWith('מתקן')},
  {k:'shirt',n:'חולצות',           f:i=>i.c==='חולצות'},
  {k:'outer',n:'סווצ׳רטים ופליזים', f:i=>i.c==='סווצ׳רטים'||i.c==='פליזים'},
  {k:'pants',n:'מכנסיים וסרבלים',   f:i=>i.c==='מכנסיים'||i.c==='סרבלים'},
  {k:'scarf',n:'צעיפים',           f:i=>i.c==='צעיפים'||i.c==='חם צוואר'},
  {k:'hat',  n:'כובעים',           f:i=>i.c==='כובעים'},
  {k:'acc',  n:'אביזרים ושונות',    f:()=>true},
];
const yk=it=>it.y||9999;
ITEMS.forEach(it=>{it.g=GROUPS.find(g=>g.f(it)).k});
GROUPS.forEach(g=>{g.items=ITEMS.filter(i=>i.g===g.k).sort((a,b)=>a.r-b.r||yk(a)-yk(b)||a.n.localeCompare(b.n,'he'))});
const F={g:'all',own:true};
function ownMap(){const m={};S.inv.forEach(x=>(m[x.i]=m[x.i]||[]).push(x));return m}
const bestCopy=xs=>xs.slice().sort((a,b)=>(b.sg-a.sg)||(a.w-b.w))[0];
/* every copy except the best one of each item */
function dupesList(m){const out=[];for(const id in m){const xs=m[id];if(xs.length<2)continue;const keep=bestCopy(xs);xs.forEach(x=>{if(x!==keep)out.push(x)})}return out}
function cardHTML(it,xs){
  if(!xs)return `<div class="card miss r${it.r}"><div class="ph"><span>?</span></div><b>&nbsp;</b><small>${yrTxt(it)}</small><i class="rs"></i></div>`;
  return `<button class="card r${it.r}" data-id="${it.id}"><div class="ph"><img src="${imgSrc(it)}" alt="" loading="lazy" decoding="async"></div>${xs.length>1?`<em class="ct">×${xs.length}</em>`:''}${xs.some(z=>z.nw)?'<em class="nw">חדש</em>':''}<b>${esc(it.n)}</b><small>${yrTxt(it)} · ${RAR[it.r].n}</small><i class="rs"></i></button>`;
}
function renderCol(){
  const m=ownMap(),own=Object.keys(m).length;
  $('#colNum').textContent=own;$('#colTot').textContent=ITEMS.length;$('#colBar').style.transform=`scaleX(${own/ITEMS.length})`;
  $('#rarBars').innerHTML=RAR.map((r,i)=>{const t=BYR[i].length,n=BYR[i].filter(it=>m[it.id]).length;
    return `<div class="rb r${i}"><span><b>${r.n}</b><i>${n}/${t}</i></span><div class="pbar"><i style="transform:scaleX(${t?n/t:0})"></i></div></div>`}).join('');
  const d=dupesList(m),sb=$('#sellDupes');sb.hidden=!d.length;delete sb.dataset.ok;
  sb.textContent=`מכרו ${d.length} כפולים · +${fmt(d.reduce((a,x)=>a+valOf(x),0))}`;
  $$('#ownSeg button').forEach(b=>b.classList.toggle('on',(b.dataset.o==='1')===F.own));
  $('#cats').innerHTML=`<button data-g="all" class="${F.g==='all'?'on':''}">הכל<small>${own}/${ITEMS.length}</small></button>`+
    GROUPS.map(g=>`<button data-g="${g.k}" class="${F.g===g.k?'on':''}">${g.n}<small>${g.items.filter(i=>m[i.id]).length}/${g.items.length}</small></button>`).join('');
  const html=GROUPS.filter(g=>F.g==='all'||F.g===g.k).map(g=>{const n=g.items.filter(i=>m[i.id]).length,list=F.own?g.items.filter(i=>m[i.id]):g.items;
    if(!list.length)return '';
    return `<section class="cs"><h3>${g.n}<span>${n}/${g.items.length}</span></h3><div class="grid">${list.map(it=>cardHTML(it,m[it.id])).join('')}</div></section>`}).join('');
  $('#colList').innerHTML=html||(own?'<p class="empty">עוד אין לכם פריטים בקטגוריה הזו.</p>':'<p class="empty">האוסף ריק. פתחו ארגז כדי לקבל את הפריט הראשון!<br><button class="btn" data-go="crates">לארגזים ←</button></p>');
}
function sellDupes(b){const d=dupesList(ownMap());if(!d.length)return;const v=d.reduce((a,x)=>a+valOf(x),0);
  if(!b.dataset.ok){b.dataset.ok=1;b.textContent=`בטוח? לחצו שוב · +${fmt(v)}`;return}
  const del=new Set(d.map(x=>x.u));S.inv=S.inv.filter(x=>!del.has(x.u));S.coins+=v;save();
  const [x,y]=centerOf(b);FX.burst(x,y,30,['#F3E03B','#fff'],{t:'c',s:3,sp:8});SND.coin();wallet('coins');toast(`מכרתם ${d.length} כפולים וקיבלתם ${fmt(v)} אסימונים`,'gold');renderCol()}

/* ---------------- inspect ---------------- */
function inspect(it,x){
  const ov=$('#ovInspect');ov.hidden=false;
  const copies=S.inv.filter(z=>z.i===it.id);
  const views=it.im>1?`<div class="views">${Array.from({length:it.im},(_,j)=>`<button data-j="${j}" class="${j?'':'on'}" style="background-image:url(${imgSrc(it,j)})" aria-label="תמונה ${j+1}"></button>`).join('')}</div>`:'';
  const orig=(x.o||'').startsWith('trade:')?`טרייד עם ${esc(x.o.slice(6))}`:x.o==='daily'?'ארגז יומי':(CR[x.o]?CR[x.o].n:'הלוקר');
  ov.innerHTML=`<div class="insp r${it.r}"><button class="x" aria-label="סגירה">✕</button>
   <div class="tilt"><div class="tcard"><div class="tface"><img src="${imgSrc(it,0)}" alt="${esc(it.n)}">${x.sg?'<span class="sig">חתום ע״י ראש השבט</span>':''}</div>${it.im>1?`<div class="tface b"><img src="${imgSrc(it,1)}" alt=""></div>`:''}</div>${views}</div>
   <div class="info"><span class="rpill">${RAR[it.r].n} · ${RAR[it.r].yrs}</span><h3>${esc(it.n)}</h3>
    <div class="meta"><b>שנה:</b> ${it.y||'לא ידועה'} · <b>סוג:</b> ${esc(it.c)}${it.s?` · <b>תיקייה:</b> ${esc(it.s)}`:''}<br><b>מספר סידורי:</b> #${esc(x.u.toUpperCase())} · <b>הגיע מ:</b> ${orig}<br><b>מצב:</b> ${wearName(x.w)} · <b>שווי:</b> <span class="gold">${fmt(valOf(x))} אסימונים</span></div>
    ${copies.length>1?`<div class="dupes">יש לכם ${copies.length} עותקים: <span class="copies">${copies.map(z=>`<button data-cp="${z.u}" class="${z.u===x.u?'on':''}">${z.sg?'חתום · ':''}${wearName(z.w)}</button>`).join('')}</span></div>`:''}
    <div class="acts"><button class="btn ghost" data-a="sell">מכרו ל־${fmt(valOf(x))} אסימונים</button></div></div></div>`;
  const close=()=>{ov.hidden=true;ov.innerHTML=''};
  ov.onclick=e=>{if(e.target===ov||e.target.closest('.x'))close()};
  const tilt=$('.tilt',ov),card=$('.tcard',ov);
  tilt.onpointermove=e=>{if(e.pointerType!=='mouse')return;const b=card.getBoundingClientRect(),px=(e.clientX-b.left)/b.width,py=(e.clientY-b.top)/b.height;
    card.style.transform=`perspective(1000px) rotateY(${(px-.5)*16}deg) rotateX(${(.5-py)*12}deg)`};
  tilt.onpointerleave=()=>{card.style.transform=''};
  $$('.views button',ov).forEach(b=>b.onclick=e=>{e.stopPropagation();const j=+b.dataset.j;$$('.views button',ov).forEach(z=>z.classList.toggle('on',z===b));
    const swap=()=>{if(it.im===2)card.classList.toggle('back',j===1);else $('.tface img',ov).src=imgSrc(it,j)};
    card.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:170,easing:'ease-in'}).onfinish=()=>{swap();card.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:220,easing:'cubic-bezier(.3,1.4,.5,1)'})};SND.click()});
  $('[data-a=sell]',ov).onclick=e=>{const b=e.currentTarget;
    if(!b.dataset.ok){b.dataset.ok=1;b.textContent=`בטוח? לחצו שוב (+${fmt(valOf(x))})`;b.classList.remove('ghost');return}
    const v=valOf(x),[cx,cy]=centerOf(b);S.inv=S.inv.filter(z=>z.u!==x.u);S.coins+=v;save();
    FX.burst(cx,cy,30,['#F3E03B','#fff'],{t:'c',s:3,sp:8});SND.coin();wallet('coins');toast(`מכרתם את "${esc(it.n)}" וקיבלתם ${fmt(v)} אסימונים`,'gold');close();renderCol()};
  $$('[data-cp]',ov).forEach(b=>b.onclick=()=>{SND.click();inspect(it,copies.find(z=>z.u===b.dataset.cp))});
  let ch=false;copies.forEach(z=>{if(z.nw){delete z.nw;ch=true}});if(ch){save();const c=$(`#colList .card[data-id="${it.id}"] .nw`);if(c)c.remove()}
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
    <polyline class="cr-seam" points="20,84 100,124 180,84" fill="none" stroke="#F3E03B" stroke-width="4" stroke-linecap="round"/></svg>`;
  return `<svg viewBox="0 0 200 210" class="cr-body">
    <polygon points="20,84 100,44 180,84 100,124" fill="${c.in}"/>
    <g ${S_}><polygon points="20,84 100,124 100,200 20,160" fill="${c.l}"/><polygon points="100,124 180,84 180,160 100,200" fill="${c.r}"/></g>
    <g stroke="${c.pl}" stroke-width="2" opacity=".75"><line x1="20" y1="110" x2="100" y2="150"/><line x1="20" y1="136" x2="100" y2="176"/><line x1="100" y1="150" x2="180" y2="110"/><line x1="100" y1="176" x2="180" y2="136"/></g>
    <image href="img/logo.webp" x="22" y="4" width="56" height="46" transform="matrix(.8,.4,0,.8,20,84)" opacity=".95"/>
    <polygon points="20,126 100,166 100,178 20,138" fill="${c.band}" stroke="#0d0708" stroke-width="2"/><polygon points="100,166 180,126 180,138 100,178" fill="${c.band}" stroke="#0d0708" stroke-width="2"/><polygon points="100,166 180,126 180,138 100,178" fill="#000" opacity=".25"/>
    <g fill="#1a1416" stroke="#0d0708" stroke-width="2"><polygon points="20,84 28,88 28,164 20,160"/><polygon points="93,121 100,124 107,121 107,197 100,200 93,197"/><polygon points="172,88 180,84 180,160 172,164"/></g>
    <g fill="${c.bolt}"><circle cx="24" cy="96" r="2.2"/><circle cx="24" cy="150" r="2.2"/><circle cx="176" cy="96" r="2.2"/><circle cx="176" cy="150" r="2.2"/><circle cx="100" cy="134" r="2.2"/><circle cx="100" cy="188" r="2.2"/></g>
    <polygon points="100,124 180,84 180,160 100,200" fill="#000" opacity=".12"/></svg>`}
/* the clothes bag: a black bin bag, red drawstring knot, a sleeve poking out */
function bagSVG(){return `<svg viewBox="0 0 200 220" class="bag-svg"><defs><pattern id="bgstr" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(40)"><rect width="10" height="10" fill="#e32626"/><rect width="4" height="10" fill="#111"/></pattern></defs>
  <g class="bag-peek pk-leg"><path d="M50 170 C36 178 22 190 16 204 L32 211 C40 198 50 190 62 184 Z" fill="#3c5f94" stroke="#000" stroke-width="3"/><path d="M24 206 L36 199" stroke="#7aa0d8" stroke-width="2.5"/><path d="M40 182 L30 196" stroke="#2a4470" stroke-width="2" stroke-dasharray="3 3"/></g>
  <path class="bag-body" d="M30 122 C22 152 28 190 56 204 C82 216 120 216 146 204 C174 190 180 152 170 122 C162 98 140 86 122 82 L112 70 L88 70 L78 82 C60 86 38 98 30 122 Z" fill="#1d1d1d" stroke="#000" stroke-width="3"/>
  <path d="M52 112 C45 136 45 162 54 184" stroke="#4a4a4a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M142 104 C150 120 154 140 150 158" stroke="#3a3a3a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M70 96 C78 120 76 150 84 178 M104 92 C104 128 108 168 104 204 M126 96 C132 126 128 162 132 196" stroke="#0d0d0d" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M86 124 C96 118 108 122 118 116 M66 156 C80 150 92 158 106 152" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="122" r="3" fill="#777"/><circle cx="147" cy="112" r="2" fill="#666"/>
  <path d="M150 112 L158 106 L162 116 L170 112 L168 126 L156 132 Z" fill="#000"/>
  <g class="bag-peek pk-sleeve"><path d="M152 118 C168 104 186 100 196 108 L190 124 C180 120 168 124 158 132 Z" fill="#FD1D1D" stroke="#000" stroke-width="3"/><path d="M186 104 L182 122" stroke="#fff" stroke-width="3"/></g>
  <path d="M88 70 L84 56 L116 56 L112 70 Z" fill="#1d1d1d" stroke="#000" stroke-width="3"/><path d="M92 58 L94 70 M100 57 L100 70 M108 58 L106 70" stroke="#3a3a3a" stroke-width="2"/>
  <g class="bag-peek pk-scarf"><path d="M110 62 C122 50 134 56 132 70 L124 94 L114 76 Z" fill="url(#bgstr)" stroke="#000" stroke-width="2.5"/></g>
  <g class="bag-knot"><path d="M88 54 C70 38 56 42 60 54 C64 62 80 60 94 56 M112 54 C130 38 144 42 140 54 C136 62 120 60 106 56" fill="#e32626" stroke="#000" stroke-width="2.5"/><circle cx="100" cy="55" r="6.5" fill="#e32626" stroke="#000" stroke-width="2.5"/></g></svg>`}
const bagArt=()=>`<div class="cr bag"><i class="cr-shadow"></i>${bagSVG()}</div>`;
const crateArt=k=>CR[k].bag?bagArt():`<div class="cr cr-${k}"><i class="cr-shadow"></i>${crateSVG(k,'body')}${crateSVG(k,'lid')}</div>`;

/* ---------------- crates ---------------- */
function rollItem(cr){const w=cr.w,tot=w.reduce((a,b)=>a+b,0);let r=rnd()*tot,t=0;for(;t<w.length;t++){if((r-=w[t])<0)break}t=Math.min(t,5);
  const of=t=>cr.cats?BYR[t].filter(i=>cr.cats.includes(i.c)):BYR[t];let pool=of(t);while(!pool.length&&t<5)pool=of(++t);return pick(pool)}
function newInst(it,o){const age=it.y?clamp((2027-it.y)/35,0,1):.4;const w=clamp(rnd()*.55+age*.45*rnd()+age*.12,0,.999);
  return {u:uid(),i:it.id,w:+w.toFixed(4),sg:rnd()<.04?1:0,t:Date.now(),o,nw:1}}
function renderCrates(){
  const d=$('#daily');
  if(S.daily!==today())d.innerHTML=`<div class="dbox"><span>יומי</span><div><b>הארגז היומי מחכה</b><p>ארגז מחסן חינם, פעם ביום.</p></div><button class="btn gold" id="dailyBtn">קבלו ארגז</button></div>`;
  else{const t=new Date();t.setHours(24,0,0,0);const m=Math.ceil((t-Date.now())/60000);d.innerHTML=`<div class="dbox done"><span>מחר</span><div><b>הארגז היומי נלקח</b><p>הארגז הבא עוד ${Math.floor(m/60)} שעות ו־${m%60} דקות.</p></div></div>`}
  $('#crateList').innerHTML=CRATES.map(c=>{const tot=c.w.reduce((a,b)=>a+b,0),own=S.crates[c.k]||0;
    return `<div class="crt">${own?`<span class="own">יש לכם ${own}</span>`:''}
    <div class="crimg">${crateArt(c.k)}</div>
    <h3>${c.n}</h3><p>${c.d}</p>
    <div class="odds">${c.w.map((w,r)=>w?`<i class="r${r}" style="flex:${w}"></i>`:'').join('')}</div>
    <div class="oddt">${c.w.map((w,r)=>w?`<span class="r${r}">${RAR[r].n} ${(w/tot*100).toFixed(w/tot<.02?1:0)}%</span>`:'').join('')}</div>
    <div class="acts">${own?`<button class="btn gold" data-open="${c.k}">${c.bag?'פתחו שק':'פתחו ארגז'}</button>`:''}<button class="btn${own?' ghost':''}" data-buy="${c.k}" ${S.coins<c.price?'disabled':''}>קנו ופתחו · <span class="price">${fmt(c.price)}</span> אסימונים</button></div>
    ${!c.bag&&(own>=5||S.coins>=c.price*5)?`<button class="btn five" data-five="${c.k}">פתחו 5 בבת אחת${own>=5?'':`  · <span class="price">${fmt(c.price*5)}</span>`}</button>`:''}</div>`}).join('');
  const db=$('#dailyBtn');if(db)db.onclick=()=>{S.daily=today();S.crates.mahsan=(S.crates.mahsan||0)+1;save();const [x,y]=centerOf(db);FX.burst(x,y,50,['#F3E03B','#FD1D1D','#fff'],{up:1,sp:10});SND.coin();wallet('crates');toast('קיבלתם ארגז מחסן','gold');renderCrates()};
}
const shown=()=>$('#v-col').classList.contains('on')?'col':'crates';
const refresh=()=>{renderCrates();if(shown()==='col')renderCol()};
const resetOv=()=>{const ov=$('#ovOpen');ov.hidden=false;ov.classList.remove('lit','shake');$('#reelWrap').hidden=true;$('#win').hidden=true;$('#multi').hidden=true;$('#opSkip').hidden=false;return ov};
let opening=null;
function openCrate(k,buy){
  const c=CR[k];if(opening)return;if(c.bag)return openBag(buy);
  if(buy){if(S.coins<c.price){SND.err();toast('אין מספיק אסימונים. שחקו במשחקי השבט!');return}S.coins-=c.price}
  else{if(!(S.crates[k]>0))return;S.crates[k]--}
  const it=rollItem(c),x=newInst(it,k),first=!S.inv.some(z=>z.i===it.id);
  S.inv.push(x);S.stats.opened++;save();wallet();
  const ov=resetOv();ov.style.setProperty('--rc',RAR[it.r].c);
  const crate=prepCrate(k);
  const st={done:false,skip:false};opening=st;
  /* phase 1: the crate drops in, charges up (growing shake), then bursts open */
  tone(180,.25,'sine',.25,-90,.45);noise(.18,.15,300,.5);
  st.t0=setTimeout(()=>{crate.classList.add('charge');SND.rise()},650);
  st.t1=setTimeout(()=>{popCrate(crate);setTimeout(()=>reel(it,x,first,st),380)},1900);
}

/* opening the bag: it is thrown in, lands with a thud, rustles, the knot pops and three garments fly out */
function openBag(buy){
  const k='sak',c=CR[k];if(opening)return;
  if(buy){if(S.coins<c.price){SND.err();toast('אין מספיק אסימונים לשק');return}S.coins-=c.price}else{if(!(S.crates[k]>0))return;S.crates[k]--}
  const got=[];for(let i=0;i<3;i++){const it=rollItem(c),x=newInst(it,k);got.push({it,x,first:!S.inv.some(z=>z.i===it.id)&&!got.some(g=>g.it.id===it.id)});S.inv.push(x)}
  S.stats.opened++;save();wallet();
  got.sort((a,b)=>b.it.r-a.it.r);
  const ov=resetOv();ov.style.setProperty('--rc',RAR[got[2].it.r].c);
  const box=$('#opCrate');box.hidden=false;box.className='op-crate op-bag';box.innerHTML=bagArt();box.style.animation='none';void box.offsetWidth;box.style.animation='';
  const st={done:false,skip:false,multi:1};opening=st;
  st.t0=setTimeout(()=>{noise(.25,.35,120);tone(70,.3,'sine',.45,-30);box.classList.add('land')},520);
  st.t2=setTimeout(()=>{box.classList.add('rustle');for(let i=0;i<6;i++)noise(.09,.12,2500,i*.17)},900);
  st.t1=setTimeout(()=>{box.classList.remove('rustle');box.classList.add('burst-open');SND.boom();noise(.4,.2,1500);
    const [cx,cy]=centerOf(box);FX.burst(cx,cy-60,40,got.map(g=>g.it.col).concat(['#141414','#2c2c2c']),{up:1,spread:2.2,sp:11,s:6,g:.3});
    setTimeout(()=>dealBag(got,st),260)},2200);
  st.skipDeal=()=>dealBag(got,st);
}
function dealBag(got,st){
  if(st.dealt)return;clearTimeout(st.t2);
  const box=$('#opCrate'),from=box.getBoundingClientRect();
  deal(got,st,'sak');
  const [fx,fy]=[from.left+from.width/2,from.top+from.height*.3];
  $$('#multi .mc').forEach((el,i)=>{const b=el.getBoundingClientRect(),dx=fx-(b.left+b.width/2),dy=fy-(b.top+b.height/2),rot=(rnd()-.5)*90;
    el.style.animation='none';
    el.animate([{transform:`translate(${dx}px,${dy}px) scale(.25) rotate(${rot}deg)`,opacity:0},{transform:`translate(${dx*.45}px,${dy*.45-160}px) scale(.8) rotate(${rot/2}deg)`,opacity:1,offset:.45},{transform:'none',opacity:1}],{duration:750,delay:i*110,easing:'cubic-bezier(.3,.6,.3,1)',fill:'backwards'})});
  box.hidden=false;box.classList.add('gone');setTimeout(()=>{box.hidden=true},500);
}

function prepCrate(k){const crate=$('#opCrate');crate.hidden=false;crate.className='op-crate';crate.innerHTML=crateArt(k);
  crate.style.animation='none';void crate.offsetWidth;crate.style.animation='';return crate}
function popCrate(crate){crate.classList.remove('charge');crate.classList.add('pop');SND.boom();
  const fl=$('#opFlash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
  const [cx,cy]=centerOf(crate);FX.burst(cx,cy,70,['#c98a4a','#6b3f17','#F3E03B','#fff'],{sp:13,s:5})}
function reel(it,x,first,st){
  if(st.done)return;$('#opCrate').hidden=true;
  const wrap=$('#reelWrap'),R=$('#reel');wrap.hidden=false;
  const N=62,WIN=52,c=CR[x.o]||CR.mahsan;
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
      $('.reel-mark').style.background=RAR[it.r].c;
      tone(it.r<3?880:520,.25,'triangle',.14);setTimeout(()=>reveal(it,x,first,st,hit),st.skip?60:700)}}
  requestAnimationFrame(f);
}
function reveal(it,x,first,st,hit){
  if(st.done)return;st.done=true;opening=null;
  const from=hit&&!st.skip?hit.getBoundingClientRect():null;
  const ov=$('#ovOpen'),rw=$('#reelWrap');rw.classList.add('out');setTimeout(()=>{rw.hidden=true;rw.classList.remove('out','stop')},360);$('#opSkip').hidden=true;ov.classList.add('lit');
  const win=$('#win');win.hidden=false;win.className='win r'+it.r;
  const more=(S.crates[x.o]>0)||S.coins>=(CR[x.o]?.price||1e9);
  win.innerHTML=`<div class="stamp">${RAR[it.r].n}</div><div class="wc"><img src="${imgSrc(it)}" alt=""><div class="wi"><b>${esc(it.n)}</b><small>${esc(it.c)} · ${yrTxt(it)}</small></div></div>
    <div class="wtags"><span class="rpill r${it.r}">${RAR[it.r].n}</span><span>${wearName(x.w)}</span>${x.sg?'<span class="gold">חתום ע״י ראש השבט!</span>':''}${first?'<span class="gold">חדש באוסף</span>':'<span>כפול</span>'}</div>
    <div class="acts">${more?`<button class="btn gold" data-w="again">עוד ארגז</button><button class="btn ghost" data-w="lk">לאוסף</button>`:`<button class="btn gold" data-w="lk">לאוסף</button><button class="btn ghost" data-w="x">סגירה</button>`}</div>`;
  const wc=$('.wc',win);
  if(from){const to=wc.getBoundingClientRect();const sx=from.width/to.width,dx=from.left+from.width/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2);
    wc.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx})`},{transform:'translate(0,-30px) scale(1.08)',offset:.6},{transform:'none'}],{duration:800,easing:'cubic-bezier(.2,.9,.3,1)'})}
  else wc.animate([{transform:'scale(.3)',opacity:0},{transform:'none',opacity:1}],{duration:500,easing:'cubic-bezier(.2,1.4,.4,1)'});
  SND.win(it.r);const col=RAR[it.r].c;
  FX.burst(innerWidth/2,innerHeight*.45,it.r<2?120:it.r<4?60:30,[col,'#fff','#FD1D1D','#000'],{sp:it.r<2?13:9,s:5,l:1.8});
  if(it.r===0)FX.rain(140,['#FD1D1D','#F3E03B','#fff','#000']);
  if(it.r<=1){ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake')}
  win.onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;const a=b.dataset.w;closeOpen();
    if(a==='again')openCrate(x.o,!(S.crates[x.o]>0));else if(a==='lk')go('col')};
  renderCrates();
}

function openFive(k){
  const c=CR[k];if(opening)return;const own=S.crates[k]||0;
  if(own>=5)S.crates[k]-=5;else{if(S.coins<c.price*5){SND.err();toast('אין מספיק אסימונים לחמישה ארגזים');return}S.coins-=c.price*5}
  const got=[];for(let i=0;i<5;i++){const it=rollItem(c),x=newInst(it,k);got.push({it,x,first:!S.inv.some(z=>z.i===it.id)&&!got.some(g=>g.it.id===it.id)});S.inv.push(x)}
  S.stats.opened+=5;save();wallet();
  got.sort((a,b)=>b.it.r-a.it.r);const best=got[got.length-1].it.r;
  const ov=resetOv();ov.style.setProperty('--rc',RAR[best].c);
  const crate=prepCrate(k),st={done:false,skip:false,multi:1};opening=st;
  tone(180,.25,'sine',.25,-90,.45);noise(.18,.15,300,.5);
  st.t0=setTimeout(()=>{crate.classList.add('charge');SND.rise()},650);
  st.t1=setTimeout(()=>{popCrate(crate);setTimeout(()=>deal(got,st,k),380)},1900);
  st.skipDeal=()=>deal(got,st,k);
}
function deal(got,st,k){
  if(st.dealt)return;st.dealt=1;if(k!=='sak')$('#opCrate').hidden=true;$('#opSkip').hidden=true;
  const M=$('#multi');M.hidden=false;
  const again=k==='sak'?((S.crates.sak||0)>0||S.coins>=CR.sak.price?'<button class="btn" data-m="again">עוד שק</button>':''):((S.crates[k]||0)>=5||S.coins>=CR[k].price*5?'<button class="btn" data-m="again">עוד 5</button>':'');
  M.innerHTML=`<div class="mrow">${got.map((g,i)=>`<div class="mc r${g.it.r}" style="--d:${i*90}ms"><div class="mci"><div class="mcb"><img src="img/logo.webp" alt=""></div><div class="mcf"><img src="${imgSrc(g.it)}" alt=""><b>${esc(g.it.n)}</b><small>${RAR[g.it.r].n} · ${yrTxt(g.it)}</small>${g.first?'<em>חדש!</em>':''}</div></div></div>`).join('')}</div>
    <p class="mhint">לחצו על קלף כדי להפוך אותו</p><div class="acts" hidden><button class="btn gold" data-m="lk">לאוסף</button>${again}<button class="btn ghost" data-m="x">סגירה</button></div>`;
  got.forEach((_,i)=>setTimeout(()=>tone(500+i*60,.08,'triangle',.1),i*90));
  const cards=$$('.mc',M);let n=0;
  const flip=i=>{const el=cards[i];if(!el||el.classList.contains('open'))return;el.classList.add('open');n++;const r=got[i].it.r;
    setTimeout(()=>{const [x,y]=centerOf(el);FX.burst(x,y,r<2?90:r<3?55:25,[RAR[r].c,'#fff','#F3E03B'],{sp:r<2?12:8,s:4});SND.win(r);
      if(r<=1){const ov=$('#ovOpen');ov.classList.add('lit');ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake');r===0&&FX.rain(120,['#FD1D1D','#F3E03B','#fff','#000'])}},260);
    if(n===cards.length)setTimeout(()=>{$('.mhint',M).hidden=true;$('.acts',M).hidden=false;opening=null;st.done=true;renderCrates()},900)};
  M.onclick=e=>{const c=e.target.closest('.mc');if(c){flip(cards.indexOf(c));return}const b=e.target.closest('[data-m]');if(!b)return;const a=b.dataset.m;closeOpen();
    if(a==='lk')go('col');else if(a==='again'){k==='sak'?openBag(!(S.crates.sak>0)):openFive(k)}};
  /* auto-flip in order, the rarest last with a longer pause */
  st.timers=[];let t=900;cards.forEach((_,i)=>{t+=i===cards.length-1&&got[i].it.r<=2?1300:700;st.timers.push(setTimeout(()=>flip(i),t))});
}

function closeOpen(){const ov=$('#ovOpen');ov.hidden=true;ov.classList.remove('lit','shake');$('#win').innerHTML='';if(opening){opening.done=true;clearTimeout(opening.t0);clearTimeout(opening.t1);clearTimeout(opening.t2);(opening.timers||[]).forEach(clearTimeout);opening=null}$('#multi').hidden=true;$('#multi').innerHTML='';refresh()}
$('#opSkip').onclick=()=>{if(!opening)return;opening.skip=true;const st=opening;
  if(st.multi){clearTimeout(st.t0);clearTimeout(st.t1);clearTimeout(st.t2);st.skipDeal&&st.skipDeal();return}
  if(!$('#opCrate').hidden){clearTimeout(st.t0);clearTimeout(st.t1);$('#opCrate').hidden=true;const x=S.inv[S.inv.length-1];reel(BYID[x.i],x,!S.inv.slice(0,-1).some(z=>z.i===x.i),st)}};

/* ---------------- routing + events ---------------- */
function go(v){if(v!=='col')v='crates';$$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));$$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  if(v==='col')renderCol();else renderCrates();scrollTo({top:0,behavior:'smooth'});try{sessionStorage.setItem('lk:v',v)}catch(e){}}
$$('.tabs button').forEach(b=>b.onclick=()=>{SND.click();go(b.dataset.v)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(g.dataset.go)});
$('#wCrates').onclick=()=>go('crates');
$('#wCoins').onclick=()=>toast('כל 25 נקודות פנאט במשחקים = אסימון. ועוד אסימונים ממכירת כפולים.');
$('#sndBtn').onclick=e=>{AU.on=!AU.on;e.currentTarget.textContent=AU.on?'צליל':'שקט';e.currentTarget.setAttribute('aria-pressed',AU.on);try{localStorage.setItem('hanasi:lksnd',AU.on?'1':'0')}catch(_){}if(AU.on)SND.click()};
$('#sndBtn').textContent=AU.on?'צליל':'שקט';
$('#colList').onclick=e=>{const c=e.target.closest('button.card');if(!c)return;SND.click();const xs=S.inv.filter(z=>z.i===c.dataset.id);if(xs.length)inspect(BYID[c.dataset.id],bestCopy(xs))};
$('#cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;F.g=b.dataset.g;SND.click();renderCol()};
$('#ownSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;F.own=b.dataset.o==='1';SND.click();renderCol()};
$('#sellDupes').onclick=e=>sellDupes(e.currentTarget);
$('#crateList').onclick=e=>{const o=e.target.closest('[data-open]'),b=e.target.closest('[data-buy]'),f=e.target.closest('[data-five]');if(f)openFive(f.dataset.five);else if(o)openCrate(o.dataset.open,false);else if(b)openCrate(b.dataset.buy,true)};
$('#ovOpen').addEventListener('click',e=>{if(e.target.id==='ovOpen'&&$('#win').hidden===false)closeOpen()});
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('#ovOpen').hidden){if(opening)$('#opSkip').click();else closeOpen()}else{const o=$('#ovInspect');if(!o.hidden){o.hidden=true;o.innerHTML=''}}});

/* ---------------- init ---------------- */
S=load();save();
/* code 2029 was stopped: take back the clothes it gave (unless code 1953, which also gives them, was used) */
try{const used=JSON.parse(localStorage.getItem('hanasi:codes')||'[]');
  if(used.includes('8f0f97e140e126a4404a09eb1e14a53b7c742701c4290a5d1702d14daec22ee8')&&!S.end2029){
    S.end2029=1;
    if(!used.includes('592fbed6f4ef4a643b0c5dec00a9a32f69a4027aedb972265cd9237b7b31d564')){
      localStorage.removeItem('hanasi:grant');
      // the code added the whole catalogue in one go: a burst of 'archive' items with the same time stamp
      const by={};S.inv.forEach(x=>{if(x.o==='archive'){const k=Math.floor(x.t/3000);(by[k]=by[k]||[]).push(x)}});
      const burst=new Set();Object.values(by).forEach(g=>{if(g.length>=20)g.forEach(x=>burst.add(x.u))});
      S.inv=S.inv.filter(x=>!burst.has(x.u));
    }
    save();
    setTimeout(()=>{const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:1rem';
      o.innerHTML='<div style="background:#000;border:3px solid #F3E03B;box-shadow:10px 10px 0 #FD1D1D;padding:2rem 2.4rem 1.6rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1.2rem"><b style="font-family:Karantina,sans-serif;font-size:clamp(3rem,10vw,5.5rem);line-height:.9;color:#F3E03B">דודו צוק נגמר לך</b><button type="button" style="font-family:Karantina,sans-serif;font-size:1.6rem;background:#FD1D1D;color:#fff;border:0;padding:.3rem 1.6rem 0;cursor:pointer">הבנתי</button></div>';
      o.querySelector('button').onclick=()=>o.remove();document.body.appendChild(o)},700);
  }}catch(e){}
/* code 6767 was deleted: take back its 999,999 coins and the whole-collection grant it added (items that came in one burst after it went live) */
try{const used=JSON.parse(localStorage.getItem('hanasi:codes')||'[]');
  if(used.includes('d07164a628596323ebcf8796dee0e5c164620e0922b52483bc805f54416ee73c')&&!S.rev6767){
    S.rev6767=1;S.coins=Math.max(0,(+S.coins||0)-999999);
    try{const g=JSON.parse(localStorage.getItem('hanasi:grant')||'null');if(g&&g.lockerAll)localStorage.removeItem('hanasi:grant')}catch(e){}
    const cut=Date.parse('2026-10-26T18:00:00Z'),by={};S.inv.forEach(x=>{if(x.o==='archive'&&x.t>=cut){const k=Math.floor(x.t/3000);(by[k]=by[k]||[]).push(x)}});
    const burst=new Set();Object.values(by).forEach(g=>{if(g.length>=20)g.forEach(x=>burst.add(x.u))});
    S.inv=S.inv.filter(x=>!burst.has(x.u));save();
  }}catch(e){}
/* a code on the main site can grant the whole collection */
try{const g=JSON.parse(localStorage.getItem('hanasi:grant')||'null');if(g&&g.lockerAll){let n=0;ITEMS.forEach(it=>{if(!S.inv.some(x=>x.i===it.id)){S.inv.push(newInst(it,'archive'));n++}});localStorage.removeItem('hanasi:grant');save();if(n)setTimeout(()=>toast(`קיבלתם את כל הבגדים: ${n} פריטים חדשים באוסף`,'gold'),900)}}catch(e){}
if(S.fresh){delete S.fresh;save();setTimeout(()=>toast('ברוכים הבאים ללוקר! קיבלתם 2 ארגזים במתנה','gold'),600)}
syncXP();wallet();
let v0='crates';try{v0=sessionStorage.getItem('lk:v')||'crates'}catch(e){}go(v0);
addEventListener('focus',()=>{syncXP();wallet()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncXP();wallet()}});
if(window.__LK_TEST__)window.__lk={S:()=>S,ITEMS,openCrate,go,save};
})();
