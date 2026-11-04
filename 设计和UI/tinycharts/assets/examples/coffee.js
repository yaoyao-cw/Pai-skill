/* the journey of one bean, told the way a statechart would: tags, routes and doodles beside them */
const bean = (x,y,col,r = 11) => { const c = blob(x,y,r,r*.72); fill(c,col,{amp:.2,dx:.3,dy:.3}); inkLoop(c,{w:1,amp:.2,over:0}); line([[x-r*.8,y+1],[x-r*.2,y-2.2],[x+r*.2,y+2.2],[x+r*.8,y-1]],{w:.8,amp:.1,over:0}); };
const sack = (sx,sy,col = PAL.tan) => lifeSack(sx,sy,1,col,'BEANS');
function tank(sx,sy){ const [x,y] = at(sx,sy); lifeTank(x,y,0,120,92,44); }
function dryBed(sx,sy){ const [x,y] = at(sx,sy), w = 170, d = 96, T = '#b39b78', o = {left:T,marks:false,ink:1}; for (const [a,b] of [[0,0],[w/2-3,0],[w-6,0],[0,d-6]]) box(x+a,y+b,0,6,6,46,o); box(x+6,y+1,14,w-12,4,5,o); box(x+1,y+6,14,4,d-12,5,o); box(x+6,y+d-5,14,w-12,4,5,o); box(x+w-5,y+6,14,4,d-12,5,o); for (const [a,b] of [[w/2-3,d-6],[w-6,d-6]]) box(x+a,y+b,0,6,6,46,o); for (const [a,b] of [[8,w/2-6],[w-8,w/2+6]]) lifePipe([P(x+a,y+d-3,16),P(x+b,y+d-3,42)],2.4,T); lifePipe([P(x+w-3,y+d-8,16),P(x+w-3,y+8,42)],2.4,T); block(x,y,44,w,d,9,{wall:T,deck:'#e8dfcb',t:5,sink:4,ink:1.2}); const zt = 53, bn = []; for (let r = 0; r < 4; r++){ const yy = y+18+r*20; flat([P(x+12,yy-6,zt),P(x+w-12,yy-6,zt),P(x+w-12,yy+6,zt),P(x+12,yy+6,zt)],'#d9b48e'); for (let i = 0; i < 9; i++) bn.push(P(x+18+i*(w-36)/8+rnd()*6,yy+(rnd()-.5)*7,zt)); } lifeDots(bn,3,2,'#b8804e',.5); rule([[P(x,y+d,47),P(x+w,y+d,47)],[P(x+w,y+d,47),P(x+w,y,47)]],INK,.5); }
const roaster = (sx,sy) => { const [x,y] = at(sx,sy), t = lifeRoaster(x,y,0,1,{stack:130}); for (let i = 0; i < 5; i++) out.push(`<g class="puff" data-x="${n1(t[0])}" data-y="${n1(t[1])}"><path d="M${n1(t[0]-4)} ${n1(t[1])}q6-8 1-14t5-12" fill="none" stroke="#8d8478" stroke-width=".9" stroke-linecap="round"/></g>`); };
function grinder(sx,sy){ const [x,y] = at(sx,sy), S = '#b6d0a8', o = {marks:false,ink:1.1}, cx = x+34, cy = y+26; box(x,y+2,0,70,58,6,{...o,left:'#e4dbcb'}); box(x+11,y+6,6,48,44,62,{...o,left:S}); box(x+23,y+50,6,24,14,24,{...o,left:'#e0cda8',top:'#efe7d8'}); box(x+29,y+50,34,12,9,12,{...o,left:'#dcd9d0'}); lifeTurn(cx-1,cy+2,68,[[10,0],[30,44]],'#dfeaee',{cap:'#d9b48e',seam:false}); const c = Array.from({length:18},(_,i) => { const t = i/18*6.283; return P(x+59,y+27+8*Math.cos(t),48+8*Math.sin(t)); }); flat(c,'#fffdf6'); rim(c,.8,INK); }
function counter(sx,sy){ const [x,y] = at(sx,sy), w = 300, d = 74, h = 76; lifeCounter(x,y,w,d,h,'#ece4d4',PAL.wood); lifeEspresso(x+40,y+12,h,1); lifeTurn(x+152,y+50,h,[[7,0],[8,4],[7,12],[8,15]],'#a6a4a4',{wall:1,sink:3,cap:'#fffdf6',seam:false}); lifeCup(x+176,y+30,h,8); lifeCup(x+204,y+30,h,8); lifeCup(x+196,y+56,h,8); const a = x+254, b = y+32; lifeTurn(a,b,h,[[13,0],[8,6],[5,9],[6,12],[31,14],[32,17]],'#fffdf6',{cap:'#f4efe4',ink:1}); lifeTurn(a,b,h+17,[[18,0],[18,12]],'#d3b67c',{cap:'#b98f62'}); pen(lifeArc(a,b,h+23,18,-45,135),.6); const c = P(a,b,h+18), dome = Array.from({length:21},(_,i) => { const t = Math.PI*(1+i/20); return [c[0]+33*Math.cos(t),c[1]+46*Math.sin(t)]; }); out.push(`<path d="${pathOf(dome)}Z" fill="#e9f0ea" fill-opacity=".4"/>`); pen(dome,1); pen(lifeArc(a,b,h+18,27,-45,135),.7); pen([[c[0]-22,c[1]-22],[c[0]-14,c[1]-36]],.7); lifeTurn(a,b,h+64,[[3,0],[4.4,3],[2,6]],'#c4a25c',{seam:false}); }
const cup = (cx,cy) => { const b = spline([[cx-10,cy-10],[cx+10,cy-10],[cx+8.6,cy],[cx+5,cy+7],[cx-5,cy+7],[cx-8.6,cy]],true,1.5); line([[cx+8,cy-6],[cx+14,cy-4],[cx+7,cy+2]],{w:1.6,amp:.1,over:0}); flat(b,'#fffdf6'); rim(b,.9,INK); const t = blob(cx,cy-10,10,3); flat(t,'#7a5233'); rim(t,.8,INK); out.push('<g class="bob">'); for (const s of [-3,4]) line([[cx+s,cy-16],[cx+s+3,cy-22],[cx+s-1,cy-28]],{w:.9,amp:.2,over:0}); out.push('</g>'); };

function step(x,y,text){ const w = Math.max(92,text.length*14.6+30); tag(x-w/2,y,w,text,tagN++); return w; }
const words = (x,y,s,anchor = 'start') => out.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" class="it" font-size="18.5" fill="${INK}" letter-spacing=".5">${s}</text>`);
function kettle(x,y){ const q = P(x,y), M = '#dcd9d0'; ground(blob(q[0]-8,q[1]+4,30,12)); lifePipe(spline([P(x+12,y+14,7),[q[0]-30,q[1]-2],[q[0]-44,q[1]-22],[q[0]-46,q[1]-40],[q[0]-60,q[1]-46]],false,3),2.6,M); lifeTurn(x,y,0,[[18,0],[20,2],[20,16],[16,27],[11,31],[11,33]],M,{cap:'#efe7d8',seam:false}); lifePipe(spline([P(x+15,y-15,26),[q[0]+36,q[1]-30],[q[0]+38,q[1]-14],P(x+16,y-16,8)],false,3),2.6,'#b39b78'); }
function dripper(x,y){ const q = P(x,y); ground(blob(q[0]-6,q[1]+4,26,10)); lifeTurn(x,y,0,[[15,0],[18,2],[18,10],[14,22],[9,30],[10,34]],'#dfeaee',{cap:'#dfeaee',seam:false}); flat(hull([...lifeArc(x,y,1,15,0,360,16),...lifeArc(x,y,9,17.4,0,360,16)]),'#c9a27c'); rim(lifeArc(x,y,9,17.4,0,360,18),.6,INK); lifeTurn(x,y,35,[[6,0],[24,22],[25,24]],'#fffdf6',{wall:1.6,sink:6,cap:'#d9b48e',seam:false}); }
function moka(x,y){ const q = P(x,y), M = '#dcd9d0'; ground(blob(q[0]-6,q[1]+4,28,11)); lifePipe([P(x+15,y-15,50),[q[0]+36,q[1]-52],[q[0]+37,q[1]-46],[q[0]+31,q[1]-22]],3.2,'#b39b78'); lifeTurn(x,y,0,[[19,0],[17,3],[12,24],[10,26],[12,29],[18,52],[20,54]],M,{cap:M,seam:false}); lifeTurn(x,y,54,[[19,0],[17,2],[5,10],[2,11],[4,16]],M,{cap:'#efe7d8',seam:false}); const a = P(x-13.4,y+13.4,53), sp = [a,[a[0]-9,a[1]-3],[a[0]+2,a[1]+10]]; flat(sp,M); rim(sp,.8,INK); }
function pl(sx,sy,w,d,h = 50){ const [x,y] = at(sx,sy); board(x-14,y-14,w+28,d+28,7,'#efe9da','#c8bfa9',12); cast(x,y,w,d,h); layShades(); }
const small = (x,y,s) => out.push(`<text x="${x}" y="${y}" class="it" font-size="15.5" fill="#5e4c3d">${s}</text>`);
/* thin dotted lines from each picture to the step it shows, drawn first so pictures and boxes sit on top */
const links = (...ps) => ps.forEach(p => out.push(`<path class="link" d="M${p.map(q => q.join(' ')).join('L')}" fill="none" stroke="#a89c8a" stroke-width="1.7" stroke-dasharray="0.1 5.6" stroke-linecap="round" stroke-linejoin="round"/>`));
function draw(seed){
  begin(seed); OX = 700; OY = 300;
  out.push(`<text x="72" y="88" class="tt" font-size="16" fill="${INK}" letter-spacing="1.5">field notes · one bean</text>`);
  out.push(`<text x="68" y="164" class="tt" font-size="70" fill="${INK}" letter-spacing="-1">One cup</text>`);
  out.push(`<text x="72" y="202" class="it" font-size="22" fill="${INK}" letter-spacing=".8">from the branch to your hand</text>`);
  const O = k => `class="spring obj" data-k="${k}"`;
  /* each picture to its step (tree: picked, tank: washed, drying bed: dried, roaster: roasted, grinder: ground, café: brewed); move these with the pictures */
  links([[553, 140], [300, 440]],[[686, 295], [905, 385]],[[678, 455], [958, 505]],[[547, 614], [432, 614], [248, 722]],[[554, 956], [262, 1030]],[[686, 1115], [985, 1062]]);
  group(O(0),() => { const [x,y] = at(232,520); pl(232,520,120,110,16); const s = P(x+26,y+22); ground(blob(s[0]-8,s[1]+4,74,26)); group('class="crown"',() => lifeShrub(s[0],s[1],200,{nodes:7})); person(...P(x+72,y-34),{hair:'hat',shirt:PAL.sage,arm:'up',look:-1,say:'only the red ones'}); const a = x+56, b = y+66; lifeTurn(a,b,0,[[13,0],[21,24],[23,28]],'#b39b78',{cap:'#8c4a40',wall:2,sink:5,ink:1}); rule([-45,-20,5,30,55,80,105,130].map(d => { const t = d*.01745; return [P(a+13*Math.cos(t),b+13*Math.sin(t),1),P(a+22.5*Math.cos(t),b+22.5*Math.sin(t),27)]; }),INK,.45,.8); for (const z of [7,13,19]) pen(lifeArc(a,b,z,lerp(13,23,z/28),-45,135),.45); const c = []; for (let i = 0; i < 26; i++){ const t = rnd()*6.283, r = 18*Math.sqrt(rnd()); c.push(P(a+r*Math.cos(t),b+r*Math.sin(t),25+rnd()*4)); } lifeDots(c,3,2.6,'#c8574a',.5); });
  small(392,520,'red means ripe'); bean(376,514,PAL.rose,6);
  group(O(1),() => { pl(960,350,146,92,40); tank(960,350); person(1148,444,{hair:'cap',cap:PAL.blue,shirt:PAL.rose,arm:'hold',look:-1,say:'floaters out!'}); ticks(980,276,10,-2.2,-1,3,9); });
  group(O(2),() => { pl(1110,590,170,96,40); dryBed(1110,590); group('class="bob"',() => person(1000,606,{hair:'bun',shirt:PAL.gold,apron:'#fffdf6',arm:'wave',look:1,say:'rake, rake, rake'})); lifePipe([[1016,490],[1072,560]],1.8,'#a0683a'); const r = [1072,560]; lifePipe([[r[0]-13,r[1]-7.5],[r[0]+13,r[1]+7.5]],2.6,'#8e7c68'); rule(Array.from({length:7},(_,i) => { const k = (i-3)*4; return [[r[0]+k*C,r[1]+k*S],[r[0]+k*C-1.5,r[1]+k*S+4]]; }),INK,.8); });
  ticks(1120,520,18,-2.6,-.5,5,12); dot(1120,500,12,PAL.gold,1.1);
  group(O(3),() => { pl(226,812,168,70,70); roaster(226,812); person(112,866,{hair:'short',shirt:PAL.sky,arm:'down',look:1,say:'listen for the crack'}); });
  group(O(4),() => { sack(1170,838); sack(1262,852,'#c9a97e'); sack(1218,914,PAL.tan); });
  group(O(5),() => { pl(232,1110,72,62,60); grinder(232,1110); ticks(244,980,10,-2.6,-.6,4,12); });
  group(O(6),() => { const [cx,cy] = at(1012,1104); board(cx-14,cy-14,328,102,7,'#efe9da','#c8bfa9',12); cast(cx,cy,300,74,60); layShades(); person(1196,1168,{hair:'bun',shirt:PAL.sage,apron:'#fffdf6',arm:'wave',look:-1,say:'name for the cup?'}); counter(1012,1104); });
  { const [cx,cy] = at(1012,1104), t = P(cx+176,cy+30,94); for (let i = 0; i < 3; i++) out.push(`<g class="wisp" data-x="${n1(t[0])}" data-y="${n1(t[1])}"><path d="M${n1(t[0]-2)} ${n1(t[1])}q4-6 0-10t3-9" fill="none" stroke="#8d8478" stroke-width=".9" stroke-linecap="round"/></g>`); }
  { const [x,y] = at(120,1300); dripper(x,y); moka(...at(44+150,1328)); kettle(...at(286,1330)); small(90,1362,'pour over, moka, kettle'); }
  group('id="guest"',() => person(860,1316,{hair:'hat',cap:PAL.rose,shirt:PAL.sky,arm:'front',look:1,say:'still deciding'}));
  for (const [px,py] of [[500,1250],[740,1236],[770,1290],[450,420],[900,250]]) plus(px,py);
  const X = 620, ys = [110,270,430,590,930,1090];
  route([X,ys[0]+58],[X,ys[1]-9]); words(X+16,ys[0]+115,'pulp comes off');
  route([X,ys[1]+58],[X,ys[2]-9]); words(X+16,ys[1]+115,'a long sunbath');
  route([X,ys[2]+58],[X,ys[3]-9]); words(X+16,ys[2]+115,'heat, until it cracks');
  route([X-30,ys[3]+56],[470,752],true); route([X+30,ys[3]+56],[770,752],true);
  words(486,ys[3]+112,'[if you like fruit]'); words(788,ys[3]+112,'[if you like bold]');
  route([470,812],[X-30,ys[4]-9],false); route([770,812],[X+30,ys[4]-9],false);
  words(X+50,ys[4]-26,'a day or two later');
  route([X,ys[4]+58],[X,ys[5]-9]); words(X+16,ys[4]+115,'just before brewing');
  route([X,ys[5]+58],[X,1204]); words(X-16,ys[5]+106,'careful, hot','end');
  out.push(`<path id="trail" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`);
  step(X,ys[0],'picked'); step(X,ys[1],'washed'); step(X,ys[2],'dried'); step(X,ys[3],'roasted');
  step(470,760,'light'); step(770,760,'dark'); step(X,ys[4],'ground'); step(X,ys[5],'brewed');
  bean(372,790,'#c9985c',13); bean(346,776,'#c9985c',10); bean(868,790,'#4a2f1d',13); bean(894,776,'#4a2f1d',10);
  group('class="spring obj who hit" data-k="7" data-say="careful, hot"',() => figure(620,1350,{hair:'short',shirt:PAL.tan,arm:'wave',look:0,hold:(cx,sh) => cup(cx+32,sh-34)}));
  group('id="token"',() => { bean(0,0,'#d8554f',15); });
  finish();
}
const STOPS = {
  picked:{at:[620,110],k:0,say:'Coffee starts as a red fruit. The bean is the seed inside.'},
  washed:{at:[620,270],k:1,say:'The fruit comes off and the seed goes into water.'},
  dried:{at:[620,430],k:2,say:'The seeds dry slowly in the sun and get raked again and again.'},
  roasted:{at:[620,590],k:3,say:'Heat turns the bean brown. Listen for the first crack. Which way?'},
  light:{at:[470,760],k:4,say:'A light roast keeps more of the bean’s own flavour.'},
  dark:{at:[770,760],k:4,say:'A dark roast tastes more of the roasting itself.'},
  ground:{at:[620,930],k:5,say:'Grind just before brewing. Ground coffee goes stale faster.'},
  brewed:{at:[620,1090],k:6,say:'Hot water carries the flavour out of the grounds.'},
  cup:{at:[620,1204],k:7,say:'Careful, hot. That bean came a long way.'}
};
const COL = {picked:'#d8554f',washed:'#c8cf8a',dried:'#b9c27e',roasted:'#a9743f',ground:'#7a4e2a',brewed:'#6b4226',cup:'#6b4226'};
function init(ctx){
  const puffs = [...document.querySelectorAll('.puff')], wisps = [...document.querySelectorAll('.wisp')], trail = document.getElementById('trail'), guest = document.getElementById('guest');
  const token = document.getElementById('token'), objs = [...document.querySelectorAll('.obj')], body = token.querySelector('path');
  const ROASTED = new Set(['light','dark','ground','brewed','cup']);
  let name = 'picked', from = STOPS.picked.at, path = [from], d = 0, roast = 'light', moving = false, auto = false, autoT = 0, inked = [];
  const seat = p0 => { const p = onRoute(p0); token.setAttribute('transform',`translate(${p[0]} ${p[1]})`); if (inked.length) { inked.push(p); trail.setAttribute('d','M'+inked.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')); } };
  const finale = () => { [...document.querySelectorAll('#art .who')].sort((a,b) => a.getBBox().y-b.getBBox().y).forEach((w,i) => setTimeout(() => ctx.hop(w),i*130)); };
  const paint = () => { objs.forEach(o => o.classList.toggle('on',+o.dataset.k === STOPS[name].k)); ctx.say(name === 'cup' ? (roast === 'dark' ? 'Careful, hot. Bold, as you asked.' : 'Careful, hot. Fruity, as you asked.') : STOPS[name].say); body.setAttribute('fill',ROASTED.has(name) ? (roast === 'dark' ? '#3f2615' : '#b98144') : COL[name]); };
  const legs = {roasted:{light:[[590,646],[470,646],[470,760]],dark:[[650,646],[770,646],[770,760]]},light:[[470,921],[590,921],[620,930]],dark:[[770,921],[650,921],[620,930]]};
  function go(next,via){ if (moving) return; moving = true; path = [STOPS[name].at,...(via||[]),STOPS[next].at]; d = 0; name = next; ctx.clear(); }
  const step1 = () => { if (name === 'roasted'){ roast = roast === 'light' ? 'dark' : 'light'; go(roast,legs.roasted[roast].slice(0,-1)); return; } const nxt = {picked:'washed',washed:'dried',dried:'roasted',light:'ground',dark:'ground',ground:'brewed',brewed:'cup'}[name]; go(nxt,legs[name] && !Array.isArray(legs[name][0][0]) ? legs[name].slice(0,-1) : null); };
  function menu(){ ctx.clear(); if (auto) return;
    if (name === 'roasted'){ ctx.button('light roast',() => { roast = 'light'; go('light',legs.roasted.light.slice(0,-1)); }); ctx.button('dark roast',() => { roast = 'dark'; go('dark',legs.roasted.dark.slice(0,-1)); }); return; }
    if (name === 'cup'){ ctx.button('another cup',reset); return; }
    const nxt = {picked:'washed',washed:'dried',dried:'roasted',light:'ground',dark:'ground',ground:'brewed',brewed:'cup'}[name];
    ctx.button('next stop',() => go(nxt,legs[name] && !Array.isArray(legs[name][0][0]) ? legs[name].slice(0,-1) : null));
    if (name === 'picked') ctx.button('play it all',() => { auto = true; autoT = .5; ctx.clear(); }); }
  function reset(){ name = 'picked'; inked = []; trail.removeAttribute('d'); seat(STOPS.picked.at); inked = [STOPS.picked.at]; paint(); menu(); }
  ctx.hint('tap people too'); reset();
  return { tick(t,dt){ puffs.forEach((p,i) => rising(p,(t*.2+i/5)%1,30,-84,.5,1.7)); wisps.forEach((p,i) => rising(p,(t*.3+i/3)%1,10,-54,.4,1)); wander(guest,[[0,0],[46,-20]],t,14);
    if (auto && !moving){ autoT -= dt; if (autoT <= 0){ autoT = .9; step1(); } }
    if (!moving) return; d += dt*1.5; const n = path.length-1, u = Math.min(n,d*n/Math.max(1,n*.55)), i = Math.min(n-1,Math.floor(u)), f = u-i, e = f*f*(3-2*f); { const here = [lerp(path[i][0],path[i+1][0],e),lerp(path[i][1],path[i+1][1],e)]; seat(here); ctx.focus(here[0],here[1],1.8); } if (u >= n){ moving = false; { const e = STOPS[name].at; ctx.focus(e[0],e[1],1.8,auto ? 0 : name === 'cup' ? 3 : 2.6); } if (name === 'cup'){ auto = false; finale(); } paint(); menu(); } } };
}
