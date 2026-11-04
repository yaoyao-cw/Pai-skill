function barrow(x,y){ const W = P(x+30,y,9), T = '#8d8f90', tray = [P(x-14,y-13,26),P(x+22,y-13,26),P(x+22,y+13,26),P(x-14,y+13,26)], fr = [P(x-14,y+13,26),P(x+22,y+13,26),P(x+10,y+9,12),P(x-6,y+9,12)], rt = [P(x+22,y-13,26),P(x+22,y+13,26),P(x+10,y+9,12),P(x+10,y-9,12)];
  pen([P(x-6,y+9,12),P(x-44,y+9,24)],1.3); pen([P(x+10,y+9,12),P(x+31,y,9)],1); pen([P(x-4,y+9,12),P(x-4,y+9,0)],1.1); pen([P(x-4,y-9,12),P(x-4,y-9,0)],1.1);
  flat(rt,T); rim(rt,.9,INK); flat(tray,'#7f7869'); rim(tray,1,INK); flat(fr,shadeOf(T)); rim(fr,.9,INK); for (let i = 0; i < 6; i++){ const q = P(x-8+i*6,y-5+(i%3)*6,27); out.push(`<circle cx="${n1(q[0])}" cy="${n1(q[1]-1)}" r="3" fill="#a3b08f" stroke="${INK}" stroke-width=".5"/>`); }
  const R = ringAt((a,b) => [W[0]+a*8,W[1]+b*8]); flat(R,'#3f3a39'); inkLoop(R,{w:.9,over:0}); dot(W[0],W[1],2.4,'#a6a4a4',.5); }
function post(x,y){ box(x-2,y-2,0,4,4,44,{left:'#b39b78',marks:false,ink:1}); box(x-13,y-7,44,26,14,12,{top:'#b5806f',left:'#b5806f',marks:false,ink:1}); const c = P(x-13,y-7,56), e = P(x+13,y-7,56); pen([P(x-13,y+7,56),[lerp(c[0],P(x+13,y+7,56)[0],.5),lerp(c[1],P(x+13,y+7,56)[1],.5)-5],P(x+13,y+7,56)],.8); rule([[P(x+13,y-3,52),P(x+13,y+3,52)]],INK,.8); }
function flower(x,y){ const q = P(x,y); line([q,[q[0],q[1]-11]],{w:.7,col:'#5f7355',over:0}); out.push(`<circle cx="${n1(q[0])}" cy="${n1(q[1]-12)}" r="2.1" fill="${['#c99aa0','#d8b878','#ece6d8'][Math.floor(x)%3]}" stroke="${INK}" stroke-width=".5"/>`); }
function draw(seed){
  begin(seed); OX = 700; OY = 500;
  /* a thick rounded slice of land, as the pack's boards */
  board(-16,-16,672,672,46,GRASS,'#c99a63',34);
  for (const k of [10,20,33]){ rule([[P(-16,656,-k),P(656,656,-k)],[P(656,656,-k),P(656,-16,-k)]],INK,.45,.55); }
  for (let i = 0; i < 70; i++){ const q = i%2 ? P(-10+rnd()*660,656,-3-rnd()*40) : P(656,-10+rnd()*660,-3-rnd()*40); out.push(`<ellipse cx="${n1(q[0])}" cy="${n1(q[1])}" rx="${n1(1+rnd()*2)}" ry="${n1(.7+rnd())}" fill="none" stroke="${INK}" stroke-width=".4"/>`); }
  rule(Array.from({length:520},() => { const q = P(rnd()*640+2,rnd()*640+2), s = rnd() < .5 ? -1 : 1; return [q,[q[0]+s*2,q[1]-5]]; }),'#5f7355',.6,.75);
  cast(40,40,186,118,120); cast(286,26,168,128,120); cast(366,214,70,58,50); for (const [x,y,r] of [[525,70,44],[602,84,38],[565,170,42]]) castDisc(x,y,r,60);
  cast(30,470,34,34,54); cast(30,536,34,34,54); cast(84,566,34,34,54); cast(262,244,96,33,30); castDisc(482,196,26,30); castDisc(262,622,7,40); layShades();
  stones([[150,180,15],[172,240,13],[200,282,15],[236,322,13],[276,352,15],[316,386,13],[352,426,15],[392,462,13],[430,500,15],[470,540,13],[510,574,14]]);
  garden(44,322,194,204);
  pond(492,330,104,76);

  put(40,40,() => farmhouse(40,40));
  put(286,26,() => barn(286,26));
  put(300,250,() => coop(366,214));
  put(150,264,() => laundry(52,264,244,264));
  for (const [x,y,r] of [[525,70,54],[602,84,46],[565,170,50]]) put(x,y,() => group(`class="apple-tree hit spring" data-x="${x}" data-y="${y}"`,() => tree(x,y,r)));
  put(520,120,() => { const a = P(512,134), b = P(528,92,70); line([a,b],{w:2,col:PAL.wood,amp:.2,over:0}); line([[a[0]+10,a[1]+4],[b[0]+10,b[1]+4]],{w:2,col:PAL.wood,amp:.2,over:0}); for (let i = 1; i < 6; i++){ const k = i/6; line([[lerp(a[0],b[0],k),lerp(a[1],b[1],k)],[lerp(a[0],b[0],k)+10,lerp(a[1],b[1],k)+4]],{w:1.3,col:PAL.wood,amp:.1,over:0}); } });
  put(494,170,() => { cyl(494,170,0,20,18,PAL.tan); for (let i = 0; i < 5; i++){ const q = P(484+i*5,164+(i%2)*10,20); dot(q[0],q[1],4,PAL.rose,.7); } });
  put(592,250,() => reeds(598,270)); put(450,410,() => reeds(420,388));
  put(40,540,() => { hive(30,470); }); put(44,560,() => hive(30,536)); put(80,570,() => hive(84,566)); put(100,590,() => { const q = P(60,520,70); group('id="bees"',() => { for (const [a,b] of [[0,0],[30,-16],[-22,-24]]) dot(q[0]+a,q[1]+b,2.6,PAL.gold,.6); }); });
  put(306,520,() => barrow(290,540));
  put(600,622,() => post(560,630));
  for (const [x,y] of [[60,200],[92,200],[122,204],[190,196],[218,198]]) put(x,y,() => flower(x,y));
  put(626,630,() => fence([[632,430],[632,628]]));
  put(340,620,() => fence([[316,632],[430,632]]));
  put(90,470,() => group('class="hit spring" data-say="boo"',() => scarecrow(84,470)));
  put(520,210,() => hay(482,196));
  put(248,520,() => bucket(258,520));

  put(254,462,() => group('id="farmer"',() => person(...P(254,462),{hair:'hat',shirt:PAL.sage,arm:'down',look:-1,size:.6,say:'carrots soon'})));
  who(164,292,{size:.6,hair:'bun',shirt:PAL.pink,apron:'#fffdf6',arm:'up',look:1,say:'dry by noon'});
  put(400,560,() => group('id="kid1"',() => person(...P(400,560),{kid:true,size:.66,hair:'short',shirt:PAL.gold,arm:'out',look:1,say:'wait for me!'})));
  put(372,516,() => group('id="kid2"',() => person(...P(372,516),{kid:true,size:.66,hair:'long',hairCol:'#7a4a2a',shirt:PAL.sky,arm:'up',look:1,say:'catch me!'})));
  who(444,454,{size:.6,hair:'short',hairCol:'#d3cbbf',shirt:PAL.rose,pants:PAL.blue,arm:'front',look:1,say:'nothing biting'});
  put(436,450,() => { const a = P(456,456,34), b = [a[0]+52,a[1]+2], c = [b[0]+6,b[1]+30]; line([[a[0]-8,a[1]+8],b],{w:1,col:PAL.wood,over:0}); line([b,c],{w:.5,over:0}); });
  who(330,176,{size:.6,hair:'short',shirt:PAL.blue,arm:'wave',look:1,say:'hay day'});
  for (const [x,y,c,l] of [[372,300,'#fbf7ec',1],[336,288,'#e8c99a',-1],[372,352,'#c98f5e',1],[556,596,'#fbf7ec',-1],[350,326,'#e8c99a',1]]) put(x,y,() => group('class="hen hit spring" data-say="cluck"',() => hen(x,y,c,l)));
  put(480,240,() => group('class="hit spring" data-say="moo"',() => cow(268,244)));
  put(262,622,() => windpump(262,622));
  for (const [x,y,l] of [[548,256,1],[586,232,-1],[610,272,1]]) put(x,y,() => group('class="hit spring" data-say="baa"',() => sheep(x-26,y-4)));
  for (const [i,[x,y,l]] of [[462,320,1],[532,352,-1],[486,368,1]].entries()) put(x,y,() => group(`class="duck hit" data-say="quack" data-i="${i}"`,() => duck(x,y,l)));
  put(340,590,() => group('id="dog" class="hit spring" data-say="woof"',() => dog(318,596)));
  put(226,158,() => group('class="hit spring" data-say="mrow"',() => cat(148,162)));

  flush();

  /* notes sit on the paper around the farm */
  out.push(`<text x="72" y="118" class="tt" font-size="16" fill="${INK}" letter-spacing="1.5">field notes · one summer morning</text>`);
  out.push(`<text x="68" y="196" class="tt" font-size="74" fill="${INK}" letter-spacing="-1">A small farm</text>`);
  for (const [px,py] of [[1000,1120],[1050,1170],[250,960],[290,1000],[1180,620]]) plus(px,py,6);
  ticks(...P(444,454,92),10,-2.4,-.8,3,9);
  label(72,300,'house','bread in the oven',[56,146,92]);
  label(72,450,'wash day','dry by noon',[66,264,52],'start',true);
  label(72,1006,'garden','cabbages, carrots',[110,526,3],'start',true);
  label(1340,300,'barn','hay up top',[392,92,136],'end');
  label(1340,452,'orchard','apples soon',[640,110,114],'end');
  label(1340,934,'pond','ducks, mostly',[548,376,3],'end');
  label(1340,1096,'hens','one is always out',[566,604,8],'end');
  finish();
}

const TRACK = [[0,0],[0,0],[0,0]];
function init(ctx){
  const rotor = document.getElementById('rotor'), farmer = document.getElementById('farmer'), kid1 = document.getElementById('kid1'), kid2 = document.getElementById('kid2'), dogEl = document.getElementById('dog');
  const ducks = [...document.querySelectorAll('.duck')], puffs = [...document.querySelectorAll('.puff')], bees = document.getElementById('bees'), clouds = [...document.querySelectorAll('.cloud')], tint = document.getElementById('tint');
  const laid = new Set(), APPLES = 18;
  let eggs = 0, apples = 0, dusk = false;
  const tally = () => ctx.say(`${eggs} ${eggs === 1 ? 'egg' : 'eggs'} and ${apples} ${apples === 1 ? 'apple' : 'apples'} so far. Tap a hen or an apple tree.`);
  tally(); ctx.hint('every animal talks');
  ctx.button('dusk',function(){ dusk = !dusk; this.textContent = dusk ? 'morning' : 'dusk'; if (!dusk){ eggs = 0; apples = 0; laid.clear(); tally(); } tint.setAttribute('fill','#c98a5e'); tint.style.opacity = dusk ? .34 : 0; });
  const NS2 = 'http://www.w3.org/2000/svg';
  return { click(e){
      const hen = e.target.closest('.hen'), tree = e.target.closest('.apple-tree');
      if (hen){ const p = ctx.point(e); ctx.focus(p.x,p.y,1.9,2); if (dusk || laid.has(hen)){ ctx.bubble(p.x,p.y-20,dusk ? 'zzz' : 'tomorrow'); return true; } laid.add(hen); eggs++; const g = document.createElementNS(NS2,'ellipse'); g.setAttribute('cx',p.x+10); g.setAttribute('cy',p.y+12); g.setAttribute('rx',6); g.setAttribute('ry',7.5); g.setAttribute('fill','#fbf7ec'); g.setAttribute('stroke','#2f261e'); document.getElementById('fx').append(g); setTimeout(() => g.remove(),1400); ctx.hop(hen); ctx.bubble(p.x,p.y-20,'cluck'); tally(); return true; }
      if (tree){ const p = ctx.point(e); ctx.focus(p.x,p.y,1.9,2); if (apples >= APPLES){ ctx.bubble(p.x,p.y-20,'all picked'); return true; } apples++; const g = document.createElementNS(NS2,'circle'); g.setAttribute('cx',p.x); g.setAttribute('cy',p.y); g.setAttribute('r',6); g.setAttribute('fill','#d9676b'); g.setAttribute('stroke','#2f261e'); g.setAttribute('class','fall'); document.getElementById('fx').append(g); setTimeout(() => g.remove(),1100); tally(); return true; }
      return false; },
    tick(t){
      ducks.forEach((d,i) => { const a = t*.35+i*2.1; d.setAttribute('transform',`translate(${n1(Math.cos(a)*30)} ${n1(Math.sin(a*1.3)*12)})`); });
      puffs.forEach((p,i) => rising(p,(t*.16+i/6)%1,46,-150,.5,2));
      rotor.setAttribute('d',rotorPath(262,622,t*1.1));
      wander(farmer,[[254,462],[254,352],[116,352],[116,462]],t,20);
      wander(kid1,[[400,560],[300,560]],t,32,3); wander(kid2,[[372,516],[270,516]],t,34); wander(dogEl,[[318,596],[252,592]],t,30,8);
      clouds.forEach((c,i) => c.setAttribute('transform',`translate(${n1(Math.sin(t*.05+i*2)*38)} 0)`));
      if (bees) bees.setAttribute('transform',`translate(${n1(Math.sin(t*2.3)*16)} ${n1(Math.cos(t*3.1)*9)})`);
    } };
}
