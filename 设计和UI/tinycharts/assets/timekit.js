
/* the Time view: a tape pulled out in the order things happen. Each numbered stretch is one step, a longer stretch is a longer wait, and each step stands on its own stretch with its name beside it */
function lifeDraw(seed,c){
  begin(seed); OX = 700; OY = 700; const [X0,Y0] = at(150,410), LEN = 1060, TAIL = 46, W = 34, SS = c.stages, sum = SS.reduce((a,s) => a+Math.log10(s.sec),0), k = (LEN-SS.length*96)/sum; c.X0 = X0; c.Y0 = Y0; const [dx,dy] = at(1040,190), [sx,sy] = at(90,640), T2 = 760, [bx,by] = at(1000,1085), total = SS.reduce((a,s) => a+s.sec,0); c.sx = sx; c.sy = sy;
  out.push(`<text x="72" y="118" class="tt" font-size="16" fill="${INK}" letter-spacing="1.5">${c.small}</text><text x="68" y="196" class="tt" font-size="74" fill="${INK}" letter-spacing="-1">${c.big}</text><text x="72" y="236" class="it" font-size="21" fill="${INK}" letter-spacing=".6">the longer the stretch, the longer the wait (not to scale)</text>`);
  let a = 0; SS.forEach(s => { s.a = a; a += 96+Math.log10(s.sec)*k; s.b = a; s.m = (s.a+s.b)/2; });
  let tt = 0; SS.forEach(s => { s.t0 = tt; tt += s.sec/total*T2; s.t1 = tt; });
  shades.push([P(X0,Y0+W),P(X0+LEN+TAIL,Y0+W),P(X0+LEN+TAIL,Y0+W+12),P(X0,Y0+W+12)],[P(sx,sy+16),P(sx+T2,sy+16),P(sx+T2,sy+26),P(sx,sy+26)]); cast(dx,dy,320,240,16); cast(bx,by,350,190,14);
  SS.forEach((s,i) => { const y = Y0-150; s.at = [X0+s.m,y]; const g = P(...s.at); shades.push(blob(g[0]-10,g[1]+12,48,20)); });
  layShades();
  lifeDesk(dx,dy,c); lifeRule(sx,sy,T2,c); lifeSip(bx,by,c);
  { const p = P(X0-34,Y0-6); person(p[0],p[1],{hair:'short',shirt:PAL.sage,arm:'front',look:1,size:.8,say:'keep pulling'}); }
  { const q = [P(X0+LEN,Y0-W),P(X0+LEN+TAIL,Y0-W),P(X0+LEN+TAIL,Y0+W),P(X0+LEN,Y0+W)]; fill(q,'#f1e6bd',{amp:.12,dx:.1,dy:.1}); inkLoop(q,{w:1.2,amp:.2,over:0}); }
  SS.forEach((s,i) => { const q = [P(X0+s.a,Y0-W),P(X0+s.b,Y0-W),P(X0+s.b,Y0+W),P(X0+s.a,Y0+W)]; out.push(`<g class="lifeS hit" data-i="${i}">`); fill(q,i%2 ? '#e6d5a2' : '#f1e6bd',{amp:.12,dx:.1,dy:.1}); inkLoop(q,{w:1.2,amp:.2,over:0}); for (let t = s.a+16; t < s.b-8; t += 16){ line([P(X0+t,Y0-W),P(X0+t,Y0-W+9)],{w:.5,amp:.05,over:0}); line([P(X0+t,Y0+W),P(X0+t,Y0+W-9)],{w:.5,amp:.05,over:0}); } const n = P(X0+s.m,Y0); out.push(`<circle cx="${n1(n[0])}" cy="${n1(n[1])}" r="17" fill="#fffdf6" stroke="${INK}" stroke-width="1.3"/><text x="${n1(n[0])}" y="${n1(n[1]+7)}" text-anchor="middle" class="tt" font-size="20" fill="${RED}">${i+1}</text></g>`); });
  box(X0-14,Y0-W-4,0,14,W*2+8,6,{left:'#8a7a58',top:'#a89a78',marks:false,ink:1.2}); lifeDots([P(X0-7,Y0-W+6,6),P(X0-7,Y0+W-6,6)],2,1.3,'#c4a25c',.5); { const hx = X0+LEN+TAIL, s = [[hx,Y0-W-3,3],[hx,Y0+W+3,3]]; box(hx,Y0-44,0,70,88,52,{left:'#c9b37a',top:'#e3d3a0',marks:false,ink:1.5}); { const f = [P(hx,Y0+44,0),P(hx+70,Y0+44,0),P(hx+70,Y0+44,52),P(hx,Y0+44,52)]; flat(f,'#b79a68'); rim(f,1,INK); } lifeTurn(hx+36,Y0,52,[[34,0],[32,3]],'#c9b37a',{cap:'#e3d3a0',seam:false}); rim(lifeArc(hx+36,Y0,55,24,0,360,24),.6,'#b79a68'); lifeTurn(hx+36,Y0,55,[[7,0],[6,4]],'#a6a4a4',{cap:'#d9cfbf',seam:false}); lifeDots([[6,6],[64,6],[6,82],[64,82]].map(([u,v]) => P(hx+u,Y0-44+v,52)),1.8,1.2,'#8a7a58',.5); const q = [P(hx+70,Y0+30,8),P(hx+70,Y0-30,8),P(hx+70,Y0-30,44),P(hx+70,Y0+30,44)]; rim(q,.7,'#7d5234'); boards([P(hx,Y0+44,6),P(hx+70,Y0+44,6),P(hx+70,Y0+44,14),P(hx,Y0+44,14)],16,INK,.4); }
  SS.forEach((s,i) => { const [x,y] = s.at; dash(P(x,Y0-W),P(x,y+36),'#a8987c'); put(x,y,() => group(`class="spring lifeO hit" data-i="${i}"`,() => s.art(x,y))); const p = P(X0+s.m,Y0+W); out.push(`<g class="lifeL hit" data-i="${i}"><text x="${n1(p[0]-16)}" y="${n1(p[1]+34)}" text-anchor="end" class="tt" font-size="25" fill="${INK}">${s.tag}</text><text x="${n1(p[0]-16)}" y="${n1(p[1]+60)}" text-anchor="end" class="it" font-size="20" fill="${RED}">${s.show}</text></g>`); });
  flush();
  { const q = [[60,1150],[470,1142],[476,1346],[66,1354]]; fill(q,'#fffdf6',{amp:.3}); inkLoop(q,{w:1.1,amp:.4,over:0}); line([[230,1134],[300,1142]],{w:10,col:'#e8d9a8',amp:.2,over:0}); out.push(`<text id="lifeT" x="84" y="1228" class="tt" font-size="40" fill="${RED}"></text><text id="lifeN" x="86" y="1270" class="it" font-size="21" fill="${INK}"></text><text x="86" y="1322" class="it" font-size="14" fill="#7a6a58">${c.source}</text>`); }
  for (const [a,b] of [[1330,600],[1270,680],[730,110],[64,700],[500,1150],[760,1340],[230,1110]]) plus(a,b);
  group('id="token" style="display:none"',() => c.token(0,0));
  finish();
}
// what the empty corners hold: a desk that counts the wait, the same tape at true scale, and the one who gets to drink it
/* the shared workshop: turned parts, pipes and machines drawn the way the real ones are put together. World units; k scales a whole machine */
const lifeArc = (x,y,z,r,a,b,n = 12) => Array.from({length:n+1},(_,i) => { const t = (a+(b-a)*i/n)*Math.PI/180; return P(x+r*Math.cos(t),y+r*Math.sin(t),z); });
/* anything off a lathe: prof is [radius,height] from the foot up. wall leaves it open at the top, with `cap` sunk inside by `sink` */
function lifeTurn(x,y,z,prof,col,{cap = null,ink = .9,seam = true,wall = 0,sink = 4} = {}){
  for (let i = 0; i < prof.length-1; i++){ const [r0,z0] = prof[i], [r1,z1] = prof[i+1], a = z+z0, b = z+z1, band = (p,q,c,o) => out.push(`<path fill="${c}" opacity="${o}" d="${pathOf([...lifeArc(x,y,a,r0,p,q,8),...lifeArc(x,y,b,r1,q,p,8)])}Z"/>`);
    flat(hull([...lifeArc(x,y,a,r0,0,360,18),...lifeArc(x,y,b,r1,0,360,18)]),col); band(-45,-4,'#fffdf6',.24); band(86,135,'#4a4552',.17); if (seam && i) pen(lifeArc(x,y,a,r0,-45,135),ink*.6); }
  const sil = t => prof.map(([r,h]) => lifeArc(x,y,z+h,r,t,t,1)[0]), [rt,zt] = prof.at(-1), top = lifeArc(x,y,z+zt,rt,0,360,26).slice(0,-1);
  pen(sil(135),ink); pen(sil(-45),ink); pen(lifeArc(x,y,z+prof[0][1],prof[0][0],-45,135),ink);
  if (wall){ const inn = lifeArc(x,y,z+zt,rt-wall,0,360,26).slice(0,-1); flat(top,litOf(col)); flat(inn,shadeOf(col)); clipped(inn,() => { flat(lifeArc(x,y,z+zt-sink,rt-wall,0,360,26),cap || col); pen(lifeArc(x,y,z+zt-sink,rt-wall,-140,70),ink*.5); }); rim(inn,ink*.6,INK); }
  else flat(top,cap || litOf(col));
  rim(top,ink*.85,INK);
}
/* a drum lying down: the axis runs along +x from (x,y,z), so its far end is the plate you can see */
function lifeDrum(x,y,z,r,L,col,{cap = null,ink = 1,hoops = []} = {}){
  const ring = (u,a,b,n = 12) => Array.from({length:n+1},(_,i) => { const t = (a+(b-a)*i/n)*Math.PI/180; return P(x+u,y+r*Math.cos(t),z+r*Math.sin(t)); }), band = (a,b,c) => flat([...ring(0,a,b,8),...ring(L,b,a,8)],c);
  flat(hull([...ring(0,0,360,18),...ring(L,0,360,18)]),col); band(62,135,litOf(col)); band(-45,12,shadeOf(col));
  for (const u of hoops) pen(ring(u*L,-45,135),ink*.6);
  edge(ring(0,-45,-45,1)[0],ring(L,-45,-45,1)[0],ink,0); edge(ring(0,135,135,1)[0],ring(L,135,135,1)[0],ink,0);
  const E = ring(L,0,360,26).slice(0,-1); flat(E,cap || col); rim(E,ink,INK); return (v,w) => P(x+L,y+v,z+w);
}
/* a wheel on the +y side of a vehicle */
function lifeWheel(x,y,z,r,t,tyre = '#3f3a39',hub = '#a6a4a4'){
  const ring = (rr,yy) => Array.from({length:20},(_,i) => { const a = i/20*6.283; return P(x+rr*Math.cos(a),yy,z+rr*Math.sin(a)); }), R = ring(r,y);
  flat(hull([...ring(r,y-t),...R]),shadeOf(tyre)); flat(R,tyre); rim(R,.8,INK); const H = ring(r*.56,y); flat(H,hub); rim(H,.6,INK); rule(Array.from({length:6},(_,i) => { const a = i/6*6.283; return [P(x+r*.2*Math.cos(a),y,z+r*.2*Math.sin(a)),P(x+r*.5*Math.cos(a),y,z+r*.5*Math.sin(a))]; }),INK,.45); const c = P(x,y,z); out.push(`<circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${n1(r*.14)}" fill="${INK}"/>`);
}
const lifePipe = (pts,w,col = '#a6a4a4') => { const s = pts.slice(1).map((p,i) => [pts[i],p]); rule(s,INK,w+1.1); rule(s,col,w); rule(s.map(([a,b]) => [[a[0]-w*.18,a[1]-w*.18],[b[0]-w*.18,b[1]-w*.18]]),litOf(col),Math.max(.3,w*.28)); };
const lifeDots = (pts,rx,ry,col,ink = .4) => { if (pts.length) out.push(`<path fill="${col}" stroke="${INK}" stroke-width="${ink}" d="${pts.map(p => `M${n1(p[0]-rx)} ${n1(p[1])}a${rx} ${ry} 0 1 0 ${n1(2*rx)} 0a${rx} ${ry} 0 1 0 ${n1(-2*rx)} 0Z`).join('')}"/>`); };
const lifeLeaves = (list,col,ink = .5) => { if (list.length) out.push(`<path fill="${col}" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round" d="${list.map(([x,y,a,L,w]) => { const c = Math.cos(a), s = Math.sin(a), e = [x+c*L,y+s*L], m = [x+c*L*.5,y+s*L*.5]; return `M${n1(x)} ${n1(y)}Q${n1(m[0]-s*w*2)} ${n1(m[1]+c*w*2)} ${n1(e[0])} ${n1(e[1])}Q${n1(m[0]+s*w*2)} ${n1(m[1]-c*w*2)} ${n1(x)} ${n1(y)}Z`; }).join('')}"/>`); };
/* a coffee shrub: one upright stem with long laterals that droop under their own crop, leaves in opposite pairs, cherries hugging the wood at the nodes. All of it in a handful of paths, so forty stay cheap */
function lifeShrub(a,b,h){
  const r = h*.34, cy = b-h*.62, q = blob(a,cy,r,r*1.12,.07,9), hi = blob(a+r*.22,cy-r*.32,r*.56,r*.46,.08,7);
  line([[a,b],[a,cy+r*.7]],{w:Math.max(2.4,h*.05),col:'#8a6a4c',over:0}); fill(q,'#6fa77a',{dx:0,dy:0,amp:0}); fill(hi,'#8fc08e',{dx:0,dy:0,amp:0}); inkLoop(q,{w:Math.min(1.1,.7+h*.004),over:0});
  for (let i = 0; i < Math.round(h/10)+1; i++){ const t = rnd()*6.3, m = .2+.62*rnd(); out.push(`<circle cx="${n1(a+Math.cos(t)*r*m)}" cy="${n1(cy+Math.sin(t)*r*1.05*m)}" r="${n1(Math.max(2.3,h*.022))}" fill="#c8574a" stroke="${INK}" stroke-width=".5"/>`); }
}
function lifeSack(sx,sy,s = 1,col = PAL.tan,word = null){
  const O = (a,b) => [sx+a*s,sy+b*s], pts = [[-41,-73],[-31,-66],[-10,-69],[12,-73],[31,-71],[42,-80],[38,-62],[45,-32],[45,-7],[27,8],[0,14],[-30,8],[-47,-7],[-45,-35],[-34,-60]].map(p => O(...p)), c = spline(pts,true,3);
  ground(blob(sx-6*s,sy+6*s,50*s,16*s)); flat(c,col); clipped(c,() => { flat(spline([O(-60,-80),O(-8,-72),O(-4,-30),O(-2,20),O(-60,24)],true,4),shadeOf(col));
    const a = [], f = (u,v) => O(u+Math.sin(v*.03)*2,v); for (let v = -66; v < 14; v += 4*Math.max(1,1/(s*1.6))) a.push([f(-48,v+8),f(48,v-8)]); for (let u = -46; u < 46; u += 4.5*Math.max(1,1/(s*1.6))) a.push([f(u,-74),f(u+2,16)]); rule(a,trim(col),.35,.5);
    rule([[O(-48,-40),O(0,-36)],[O(0,-36),O(48,-46)],[O(-48,-35),O(0,-31)],[O(0,-31),O(48,-41)]],'#8e6d4f',Math.max(.8,1.7*s),.75); });
  line([O(-2,-68),O(-5,-34),O(-1,12)],{w:.7,over:0}); inkLoop(c,{w:1,over:0});
  rule(Array.from({length:Math.round(13*Math.min(1,s+.3))},(_,i) => { const t = i/12, q = O(lerp(-33,33,t),-66.5-3.6*Math.sin(t*3.1)-t*2); return [[q[0]-1.6*s,q[1]+2.4*s],[q[0]+1.6*s,q[1]-2.4*s]]; }),INK,Math.max(.5,.9*s));
  if (word) out.push(`<text x="${sx}" y="${sy-14}" text-anchor="middle" class="tt" font-size="12" fill="${INK}">${word}</text>`);
}
/* the same sack lying down, for stacks */
function lifeBag(x,y,z,l,w,h,col = '#cdb68e'){
  const A = P(x,y,z+h), B = P(x+l,y,z+h), D = P(x+l,y+w,z+h), E = P(x,y+w,z+h), F = P(x,y+w,z), G = P(x+l,y+w,z), K = P(x+l,y,z), c = spline([A,[lerp(A[0],B[0],.5),lerp(A[1],B[1],.5)-1],B,[lerp(B[0],K[0],.5)+1.4,lerp(B[1],K[1],.5)],K,G,[lerp(F[0],G[0],.5),lerp(F[1],G[1],.5)+1.4],F,[lerp(E[0],F[0],.5)-1.4,lerp(E[1],F[1],.5)],E],true,4), top = spline([A,B,D,E],true,4);
  flat(c,shadeOf(col)); flat(top.map(p => [p[0],p[1]]),litOf(col)); clipped(c,() => rule([[D,G],[D,[lerp(D[0],E[0],.25),lerp(D[1],E[1],.25)+2]]],INK,.45,.5)); rim(c,.85,INK);
  const a = P(x+l*.84,y+1,z+h), b = P(x+l*.84,y+w-1,z+h); rule(Array.from({length:6},(_,i) => { const t = (i+.5)/6, q = [lerp(a[0],b[0],t),lerp(a[1],b[1],t)]; return [[q[0]-1.3,q[1]-.3],[q[0]+1.3,q[1]+.3]]; }),INK,.55);
}
function lifePallet(x,y,z,w,d){ const T = '#b39b78'; for (const b of [0,d/2-2.5,d-5]) box(x,y+b,z,w,5,3,{left:T,top:'#c4ad8b',marks:false,ink:.8}); const q = [P(x,y,z+3),P(x+w,y,z+3),P(x+w,y+d,z+3),P(x,y+d,z+3)]; flat(q,'#c4ad8b'); rim(q,.8,INK); boards(q,Math.round(w/8),INK,.6); rule([[q[3],q[2]],[P(x+w,y+d,z+3),P(x+w,y,z+3)]],INK,.6); }
/* a washing channel: cast walls you can see over, a dividing wall, a sluice on a screw and the outfall */
function lifeTank(x,y,z,w,d,h){
  const WA = '#c6c3ba', W2 = '#b7cfd8', t = 8, m = x+w*.56, ym = y+d/2, zt = z+h, form = [];
  block(x,y,z,w,d,h,{wall:WA,deck:W2,t,sink:7,ink:1.4});
  for (let v = 12; v < h; v += 12) form.push([P(x,y+d,z+v),P(x+w,y+d,z+v)],[P(x+w,y+d,z+v),P(x+w,y,z+v)]);
  for (let u = 28; u < w; u += 28) form.push([P(x+u,y+d,z),P(x+u,y+d,zt)]); for (let u = 28; u < d; u += 28) form.push([P(x+w,y+u,z),P(x+w,y+u,zt)]); rule(form,trim(WA),.45,.7);
  rule(Array.from({length:18},() => { const q = P(x+t+6+rnd()*(w-2*t-14),y+t+8+rnd()*(d-2*t-14),zt), l = 3+rnd()*7; return [[q[0]-l,q[1]],[q[0]+l,q[1]]]; }),'#7f9db3',.5);
  const c = []; for (let i = 0; i < 26; i++) c.push(P(x+t+6+rnd()*(w*.5-t-8),y+t+8+rnd()*(d-2*t-16),zt)); lifeDots(c,2.9,2.3,'#c8574a',.45); const g = []; for (let i = 0; i < 8; i++) g.push(P(m+10+rnd()*(w*.3),y+t+8+rnd()*(d-2*t-16),zt)); lifeDots(g,2,1.5,'#b9a26a',.4);
  box(m,y+t,zt-7,5,d-2*t,7,{left:WA,top:litOf(WA),marks:false,ink:.9}); const q = [P(m+5,ym-9,zt-7),P(m+5,ym+9,zt-7),P(m+5,ym+9,zt),P(m+5,ym-9,zt)]; flat(q,'#8e7c68'); rim(q,.7,INK); boards(q,3,INK);
  const o = [P(x+w,ym+8,z+5),P(x+w,ym-8,z+5),P(x+w,ym-8,z+19),P(x+w,ym+8,z+19)]; flat(o,VOID); rim(o,.8,INK); box(x+w,ym-9,z,26,18,5,{left:'#b9b0a2',top:W2,marks:false,ink:1});
  const gate = [P(x+w+.5,ym+7,z+6),P(x+w+.5,ym-7,z+6),P(x+w+.5,ym-7,z+16),P(x+w+.5,ym+7,z+16)]; flat(gate,'#8e7c68'); rim(gate,.6,INK);
  for (const s of [-9,9]) lifePipe([P(x+w-4,ym+s,zt),P(x+w-4,ym+s,zt+24)],1.8,'#6b6660'); lifePipe([P(x+w-4,ym+10,zt+24),P(x+w-4,ym-10,zt+24)],2.2,'#6b6660'); lifePipe([P(x+w-4,ym,zt+6),P(x+w-4,ym,zt+32)],1,'#a6a4a4');
  lifeTurn(x+w-4,ym,zt+31,[[9,0],[9,1.6]],'#b5806f',{cap:'none',ink:.9,seam:false}); rule([[P(x+w-13,ym,zt+32),P(x+w+5,ym,zt+32)],[P(x+w-4,ym-9,zt+32),P(x+w-4,ym+9,zt+32)]],INK,.8);
}
/* a drying patio: a screeded slab with a kerb, cast bays, beans raked into long ridges */
function lifePatio(x,y,z,w,d,{ridges = 7,bay = 60,dense = 1} = {}){
  const F = '#dcd4c2', q = [P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)]; flat(q,F);
  const j = []; for (let u = bay; u < w; u += bay) j.push([P(x+u,y,z),P(x+u,y+d,z)]); for (let v = bay; v < d; v += bay) j.push([P(x,y+v,z),P(x+w,y+v,z)]); rule(j,trim(F),.5,.8);
  const b = [], c = []; for (let r = 0; r < ridges; r++){ const yy = y+8+(r+.5)*(d-16)/ridges, sp = (d-16)/ridges*.3, n = Math.round(w*.14*dense); flat([P(x+7,yy-sp,z),P(x+w-7,yy-sp,z),P(x+w-7,yy+sp,z),P(x+7,yy+sp,z)],'#cdb98c'); for (let i = 0; i < n; i++) (i%3 ? b : c).push(P(x+8+rnd()*(w-16),yy+(rnd()-.5)*sp*2,z)); }
  lifeDots(b,2.4,1.6,'#c9a568',.4); lifeDots(c,2.4,1.6,'#b8905a',.4); rim(q,.8,INK);
  const K = '#b9b0a2'; box(x,y+d-4,z,w,4,3.4,{left:K,top:'#d9d1c1',marks:false,ink:.9}); box(x+w-4,y,z,4,d-4,3.4,{left:K,top:'#d9d1c1',marks:false,ink:.9});
}
/* a tapered hopper of folded sheet, open at the top, seen from above */
function lifeHopper(x,y,z,rb,rt,h,col,fillC = '#7d4e2a'){
  const zt = z+h, c = (a,b,zz,r) => P(x+a*r,y+b*r,zz), L = [c(-1,1,z,rb),c(1,1,z,rb),c(1,1,zt,rt),c(-1,1,zt,rt)], R = [c(1,1,z,rb),c(1,-1,z,rb),c(1,-1,zt,rt),c(1,1,zt,rt)], T = [c(-1,-1,zt,rt),c(1,-1,zt,rt),c(1,1,zt,rt),c(-1,1,zt,rt)], I = [c(-1,-1,zt,rt-1.6),c(1,-1,zt,rt-1.6),c(1,1,zt,rt-1.6),c(-1,1,zt,rt-1.6)];
  flat(L,shadeOf(col)); flat(R,col); flat(T,litOf(col)); rim(L,.9,INK); rim(R,.9,INK); flat(I,fillC); rim(I,.7,INK); rim(T,.9,INK);
}
/* a shop drum roaster: burner cabinet, enamel drum with its hoops, hopper, faceplate, chaff cyclone and stack, cooling tray with stirring arms. Returns the top of the stack */
function lifeRoaster(x,y,z = 0,k = 1,{stack = 150,ink = 1.1} = {}){
  /* small on the sheet, so a few big light shapes: base, drum, hopper, flue and cooling tray */
  const Q = (a,b,c) => P(x+a*k,y+b*k,z+c*k), B = (a,b,c,w,d,h,left,top) => box(x+a*k,y+b*k,z+c*k,w*k,d*k,h*k,{left,top,marks:false,ink}), R = (a,b,c,pr,col,o) => lifeTurn(x+a*k,y+b*k,z+c*k,pr.map(([r,h]) => [r*k,h*k]),col,{ink:ink*.85,seam:false,...o});
  const EN = '#dd9c86', ST = '#dcd9d0', LT = '#efe7d8';
  ground(blob(...Q(60,34,0),128*k,48*k));
  R(-6,10,26,[[11,0],[11,50],[5,58],[5,stack-26]],ST,{cap:ST});
  B(5,8,0,74,46,32,EN,LT);
  lifeDrum(x+8*k,y+31*k,z+56*k,25*k,66*k,EN,{ink});
  R(38,31,80,[[7,0],[7,6]],ST,{cap:ST}); lifeHopper(x+38*k,y+31*k,z+86*k,8*k,20*k,24*k,ST,'#c9a27c');
  const D = lifeDrum(x+74*k,y+31*k,z+56*k,27*k,4*k,LT,{cap:LT,ink}), F = (v,w) => D(v*k,w*k), c = Array.from({length:18},(_,i) => { const t = i/18*6.283; return F(13*Math.cos(t),13*Math.sin(t)); }); flat(c,'#c9a27c'); rim(c,.8,INK);
  R(126,30,0,[[6,0],[6,24]],ST,{cap:ST}); R(126,30,24,[[28,0],[31,8]],ST,{cap:'#d9b48e'});
  return Q(-6,10,stack+10);
}
function lifeEspresso(x,y,z = 0,k = 1,{ink = 1,groups = [26,66]} = {}){
  const Q = (a,b,c) => P(x+a*k,y+b*k,z+c*k), B = (a,b,c,w,d,h,left,top) => box(x+a*k,y+b*k,z+c*k,w*k,d*k,h*k,{left,top,marks:false,ink}), R = (a,b,c,pr,col,o) => lifeTurn(x+a*k,y+b*k,z+c*k,pr.map(([r,h]) => [r*k,h*k]),col,{ink:ink*.8,seam:false,...o});
  const ST = '#a6a4a4', DK = '#6b6660', CR = '#d9cfbf', w1 = Math.max(.7,1.5*k);
  for (const [a,b] of [[3,3],[85,3],[3,43],[85,43]]) box(x+a*k,y+b*k,z,5*k,5*k,3*k,{left:DK,marks:false,ink:.7});
  B(0,0,3,96,50,7,ST,'#8e8f92'); rule(Array.from({length:Math.round(30*Math.min(1,k+.3))},(_,i) => { const u = 4+i*(88/Math.round(30*Math.min(1,k+.3))); return [Q(u,26,10),Q(u,47,10)]; }),INK,.5,.8);
  B(0,0,10,96,24,26,'#8e8f92',ST);
  for (const g of groups){ R(g,30,18,[[9,0],[9,16]],'#c4a25c',{cap:ST}); R(g,30,14,[[7.4,0],[8.4,4]],ST,{cap:ST}); rule([[Q(g-2,31,14),Q(g-3,31,10)],[Q(g+2,31,14),Q(g+3,31,10)]],INK,.7); lifePipe([Q(g,36,16),Q(g,56,12)],Math.max(1,2.4*k),'#3f3a39'); R(g,30,10,[[3.6,0],[5,7]],'#fffdf6',{wall:.8*k,sink:1*k,cap:'#5a3a22'}); }
  { const a = Q(90,34,34), b = Q(91,40,28), c = Q(87,50,12); lifePipe([a,b,c],Math.max(.6,1.2*k),ST); lifePipe([Q(10,34,34),Q(10,37,26)],Math.max(.6,1.6*k),ST); }
  B(0,0,34,96,44,24,ST,CR);
  { const q = [Q(4,44,37),Q(92,44,37),Q(92,44,54),Q(4,44,54)]; flat(q,'#8e8f92'); rim(q,.7,INK); const d = (u,c,r = 4) => { const e = Array.from({length:14},(_,i) => { const t = i/14*6.283; return Q(u+r*Math.cos(t),44,46+r*Math.sin(t)); }); flat(e,c); rim(e,.6,INK); }; d(48,'#fffdf6',6); rule([[Q(48,44,46),Q(51,44,50)]],'#c8372f',.6); for (const u of [groups[0]-6,groups[0]+6,groups[1]-6,groups[1]+6]) d(u,'#d9cfbf',2.6); }
  { const r = [P(x+96*k,y,z+34*k),P(x+96*k,y+44*k,z+34*k)]; rule(Array.from({length:8},(_,i) => [Q(96,8+i*4,38),Q(96,8+i*4,54)]),INK,.5,.7); }
  for (const a of [[6,6],[90,6],[90,38],[6,38]]) lifePipe([Q(a[0],a[1],58),Q(a[0],a[1],63)],Math.max(.5,1*k),ST); lifePipe([Q(6,38,63),Q(90,38,63),Q(90,6,63)],Math.max(.5,1*k),ST);
  for (const [a,b] of [[16,12],[29,12],[42,12],[55,12],[16,26],[29,26],[42,26],[68,18]]){ R(a,b,58,[[6,0],[4.4,6]],'#fffdf6',{cap:'#fffdf6'}); R(a,b,64,[[3.4,0],[2,2]],'#efe7d8',{cap:'#fffdf6'}); }
}
/* a cup on its saucer. s is the cup's radius in world units */
function lifeCup(x,y,z,s,drink = '#5a3a22'){
  ground(blob(...P(x,y,z).map((v,i) => v+(i ? s*.3 : -s*.3)),s*1.9,s*.8)); lifeTurn(x,y,z,[[s*.8,0],[s*1.55,s*.26]],'#efe7d8',{cap:'#fffdf6',ink:.9,seam:false}); const a = P(x+s*.82,y-s*.82,z+s*.9), b = [a[0]+s*.72,a[1]-s*.42], c = [a[0]+s*.56,a[1]+s*.2];
  const h = spline([P(x+s*.74,y-s*.74,z+s*1.25),[b[0],b[1]],[c[0],c[1]],P(x+s*.6,y-s*.6,z+s*.6)],false,2); out.push(`<path d="${pathOf(h)}" fill="none" stroke="${INK}" stroke-width="${n1(Math.max(1.4,s*.15)+1)}" stroke-linecap="round"/><path d="${pathOf(h)}" fill="none" stroke="#fffdf6" stroke-width="${n1(Math.max(1.4,s*.15))}" stroke-linecap="round"/>`);
  lifeTurn(x,y,z+s*.22,[[s*.5,0],[s*.6,s*.12],[s*.92,s*.9],[s,s*1.45]],'#fffdf6',{wall:s*.09,sink:s*.28,cap:drink,ink:1,seam:false}); }
/* a tall counter: recessed kick, boarded front, a real top with a nosing and a grain */
function lifeCounter(x,y,w,d,h,col,top,{n = 22} = {}){
  box(x+3,y+3,0,w-6,d-6,6,{left:'#6b6660',marks:false,ink:1}); box(x,y,6,w,d,h-11,{left:col,top,marks:false,ink:1.2});
  boards([P(x,y+d,8),P(x+w,y+d,8),P(x+w,y+d,h-5),P(x,y+d,h-5)],n,INK); boards([P(x+w,y+d,8),P(x+w,y,8),P(x+w,y,h-5),P(x+w,y+d,h-5)],Math.max(4,Math.round(n*d/w)),INK); rule([[P(x,y+d,8),P(x+w,y+d,8)],[P(x+w,y+d,8),P(x+w,y,8)]],INK,.7);
  box(x-4,y-4,h-5,w+8,d+8,5,{left:top,top,marks:false,ink:1.1}); rule(Array.from({length:7},() => { const v = y-2+rnd()*(d+4), u = x+rnd()*w*.6; return [P(u,v,h),P(u+30+rnd()*w*.4,v,h)]; }),trim(top),.45,.7);
}
/* a small container ship: flared bow, parallel body, boot-top and plating, a stacked deck, the house aft with funnel and mast. Bow to -x */
function lifeShip(x,y,z = 0,k = 1,{ink = 1} = {}){
  const hl = [[92,16],[62,16.5],[-52,16.5],[-80,11],[-98,4],[-106,0]], wl = [[88,15],[62,16],[-50,16],[-76,10],[-92,3.5],[-98,0]], zd = u => 22+(u < -40 ? (-40-u)*.13 : 0), Q = (u,v,c) => P(x+u*k,y+v*k,z+c*k), HU = '#4f5c6b', BT = '#a8564f', DK = '#b9b0a2', W2 = '#fbf4e2';
  ground(blob(...Q(-6,8,0),122*k,22*k));
  const deckY = hl.map(([u,v]) => Q(u,v,zd(u))), lowY = wl.map(([u,v]) => Q(u,v,0)), midY = hl.map(([u,v],i) => { const w = wl[i]; return Q(lerp(w[0],u,.28),lerp(w[1],v,.28),6); });
  flat([...deckY,...[...lowY].reverse()],HU); flat([...midY,...[...lowY].reverse()],BT); pen(midY,.7);
  const st = [Q(88,15,0),Q(88,-15,0),Q(92,-16,22),Q(92,16,22)]; flat(st,mixC(HU,'#fffdf6',.14)); rim(st,ink,INK); flat([Q(88,15,0),Q(88,-15,0),Q(89,-15.3,6),Q(89,15.3,6)],BT); rule([[Q(89,15.3,6),Q(89,-15.3,6)]],INK,.6);
  rule([-40,-20,0,20,40,60,76].map(u => [Q(u,16.5,7),Q(u,16.5,22)]),mixC(HU,'#fffdf6',.3),.45); rule([[Q(-40,16.5,14),Q(92,16.5,14)]],mixC(HU,'#fffdf6',.3),.45); lifeDots([Q(-74,12,zd(-74)-5)],1.4*k+.3,1.2*k+.3,'#3f3a39',.5);
  pen([...deckY],ink); pen([...lowY],ink);
  const deck = [...hl.map(([u,v]) => Q(u,v,zd(u))),...hl.slice(0,-1).reverse().map(([u,v]) => Q(u,-v,zd(u)))]; flat(deck,DK); rim(deck,.9,INK);
  const CC = ['#b5806f','#8fa382','#a9b6c6','#c4a25c','#b9a690','#8e9a8b'], rib = [];
  for (let b = 0; b < 5; b++){ const u = -66+b*23; for (let r = 0; r < 3; r++){ const v = -13.5+r*9, tiers = 2+((b*3+r*5)%3 === 0 ? 1 : 0)-(b === 0 ? 1 : 0); for (let t = 0; t < tiers; t++){ const c = CC[(b*5+r*3+t*7)%6]; box(x+u*k,y+v*k,z+(22+t*8.6)*k,21*k,8.6*k,8.6*k,{left:c,top:litOf(c),marks:false,ink:.8*ink}); if (r === 2) for (let i = 1; i < 7; i++) rib.push([Q(u+i*3,v+8.6,22+t*8.6),Q(u+i*3,v+8.6,30.6+t*8.6)]); if (b === 4) for (let i = 1; i < 3; i++) rib.push([Q(u+21,v+i*2.9,22+t*8.6),Q(u+21,v+i*2.9,30.6+t*8.6)]); } } }
  rule(rib,INK,.35,.6);
  box(x+52*k,y-13*k,z+22*k,30*k,26*k,14*k,{left:W2,top:'#e4dbcb',marks:false,ink}); box(x+56*k,y-11*k,z+36*k,24*k,22*k,12*k,{left:W2,top:'#e4dbcb',marks:false,ink}); box(x+58*k,y-20*k,z+48*k,14*k,40*k,8*k,{left:W2,top:'#d9cfbf',marks:false,ink});
  const win = (u,c,n,a,b) => rule(Array.from({length:n},(_,i) => [Q(u+i*a,c,b),Q(u+i*a+a*.6,c,b)]),'#4a5560',Math.max(.8,1.8*k));
  win(55,13,8,3.2,30); win(59,11,6,3.2,42); win(60,20,5,2.2,52);
  box(x+76*k,y-5*k,z+36*k,9*k,10*k,22*k,{left:'#6b6660',top:'#3f3a39',marks:false,ink}); { const q = [Q(76,5,48),Q(85,5,48),Q(85,5,52),Q(76,5,52)]; flat(q,'#b5806f'); rim(q,.5,INK); const e = [Q(85,5,48),Q(85,-5,48),Q(85,-5,52),Q(85,5,52)]; flat(e,'#c79a8c'); rim(e,.5,INK); }
  pen([Q(66,0,56),Q(66,0,74)],.9); rule([[Q(66,-6,70),Q(66,6,70)]],INK,.7); rule([[Q(-98,0,zd(-98)),Q(-98,0,zd(-98)+12)]],INK,.8);
  rule(Array.from({length:12},(_,i) => { const u = -92+i*16; return [Q(u,18+i%3,0),Q(u+9,19+i%3,0)]; }),'#fbfdfd',.8); rule([[Q(-98,2,0),Q(-84,15,0)],[Q(-96,5,0),Q(-72,20,0)]],'#fbfdfd',.9);
}
const lifeBoard = (x,y,w,d,h,top,side,r) => { const a = board(x,y,w,d,h,top,side,r,h); out.push(`<path d="M${a.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z" fill="${top}"/>`); inkLoop(a,{w:1.3,amp:.3,over:0}); };
function lifeDesk(x,y,c){
  const SAND = '#d9b878', W2 = '#a0683a'; lifeBoard(x,y,320,240,16,'#d9c39a','#a98a5e',22);
  rule(Array.from({length:5},(_,i) => [P(x,y+40*(i+1),16),P(x+320,y+40*(i+1),16)]),'#a98a5e',.7); rule(Array.from({length:16},(_,i) => { const v = y+rnd()*240, u = x+rnd()*190; return [P(u,v,16),P(u+40+rnd()*90,v,16)]; }),'#a98a5e',.4,.8); rule(Array.from({length:6},(_,i) => [P(x+320,y+40*i+.1,16),P(x+320,y+40*i+.1,0)]),'#a98a5e',.6);
  { const a = x+224, b = y+20, m = P(a+42,b+42,42), mx = `matrix(.866 -.5 .866 .5 ${n1(m[0])} ${n1(m[1])})`; box(a,b,16,84,84,26,{top:'#fffdf6',left:'#e3d3a0',ink:1.3}); rule(Array.from({length:7},(_,i) => [P(a,b+84,19+i*3),P(a+84,b+84,19+i*3)]),'#a98a5e',.45); rule(Array.from({length:7},(_,i) => [P(a+84,b+84,19+i*3),P(a+84,b,19+i*3)]),'#a98a5e',.45); const q = [P(a,b,42),P(a+18,b,42),P(a+18,b+84,42),P(a,b+84,42)]; flat(q,'#c8574a'); rim(q,.9,INK); for (const v of [16,42,68]){ const e = P(a+9,b+v,42); rule([[[e[0]-5,e[1]-3],[e[0]+5,e[1]+3]]],'#3f3a39',1.8); } out.push(`<g transform="${mx}"><text id="lifeDay" x="0" y="8" text-anchor="middle" class="tt" font-size="44" fill="${INK}">1</text><text x="0" y="30" text-anchor="middle" class="it" font-size="15" fill="${INK}">of ${c.stages.length}</text></g>`); }
  { const a = x+62, b = y+170, r = 40; c.watch = [a,b,r]; const ch = []; for (let i = 0; i < 15; i++){ const k = i/14; ch.push(P(a-r-5-k*38-Math.sin(k*3)*8,b-r*.62-k*52+Math.sin(k*5)*6,17)); } lifeDots(ch.filter((_,i) => i%2),2.5,1.7,'none',.9); lifeDots(ch.filter((_,i) => !(i%2)),1.7,2.4,'none',.9); lifeTurn(a-r-2,b-r*.62,16,[[2.4,0],[2.4,5]],'#c4a25c',{seam:false}); lifeTurn(a,b,16,[[r-2,0],[r,2],[r,5],[r-1.5,7]],'#c9b37a',{cap:'#fffdf6'}); rim(lifeArc(a,b,23,r-5,0,360,26),.6,INK); rule(Array.from({length:60},(_,i) => { const t = i/60*6.283; return [P(a+35*Math.cos(t),b+35*Math.sin(t),23),P(a+33.6*Math.cos(t),b+33.6*Math.sin(t),23)]; }),INK,.4); rule(Array.from({length:12},(_,i) => { const t = i/12*6.283; return [P(a+29*Math.cos(t),b+29*Math.sin(t),23),P(a+35*Math.cos(t),b+35*Math.sin(t),23)]; }),INK,1); rim(lifeArc(a+13,b+13,23,8,0,360,18),.5,INK); const o = P(a,b,23), e = P(a,b-30,23); out.push(`<line id="lifeHand" x1="${n1(o[0])}" y1="${n1(o[1])}" x2="${n1(e[0])}" y2="${n1(e[1])}" stroke="${RED}" stroke-width="2" stroke-linecap="round"/><circle cx="${n1(o[0])}" cy="${n1(o[1])}" r="3" fill="${INK}"/>`); }
  { const a = x+170, b = y+110, f = P(a,b,28), t = P(a,b,188), X = f[0], B = f[1], T = t[1], M = (T+B)/2, gl = `M${X-40} ${T}C${X-44} ${M-36} ${X-6} ${M-18} ${X-4} ${M}C${X-6} ${M+18} ${X-44} ${M+36} ${X-40} ${B}L${X+40} ${B}C${X+44} ${M+36} ${X+6} ${M+18} ${X+4} ${M}C${X+6} ${M-18} ${X+44} ${M-36} ${X+40} ${T}Z`, sp = [[3,0],[5.6,7],[3,14],[3.8,24],[2.6,40],[2.6,120],[3.8,136],[3,146],[5.6,153],[3,160]], post = d => lifeTurn(a+52*Math.cos(d*.01745),b+52*Math.sin(d*.01745),28,sp,'#c79a68',{ink:.8}); c.sand = {T:T+18,M,B,H:M-T-34};
    lifeTurn(a,b,16,[[60,0],[60,7],[55,9],[55,12]],W2,{cap:'#c79a68'}); post(225); out.push(`<clipPath id="lifeGlass"><path d="${gl}"/></clipPath><path d="${gl}" fill="#e9f0ea" fill-opacity=".75"/><g clip-path="url(#lifeGlass)"><rect id="lifeSandT" x="${X-48}" y="${T+18}" width="96" height="${n1(M-T-18)}" fill="${SAND}"/><rect id="lifeSandB" x="${X-48}" y="${B}" width="96" height="0" fill="${SAND}"/><line id="lifeFall" x1="${X}" y1="${M}" x2="${X}" y2="${B}" stroke="${SAND}" stroke-width="3" style="opacity:0"/></g><path d="${gl}" fill="none" stroke="${INK}" stroke-width="1.1"/><path d="M${X-30} ${T+24}C${X-32} ${M-40} ${X-16} ${M-28} ${X-11} ${M-14}" fill="none" stroke="#fffdf6" stroke-width="1.4" opacity=".7"/>`);
    post(-15); post(105); lifeTurn(a,b,188,[[55,0],[55,3],[60,5],[60,12]],W2,{cap:'#c79a68'}); rim(lifeArc(a,b,200,50,0,360,26),.5,'#a0683a'); }
}
function lifeRule(sx,sy,T2,c){
  const SS = c.stages, H = 8; box(sx,sy-16,0,T2,32,H,{top:'#f1e6bd',left:'#b79a68',ink:1.1});
  SS.forEach((s,i) => { if (s.t1-s.t0 < 2) return; fill([P(sx+s.t0,sy-16,H),P(sx+s.t1,sy-16,H),P(sx+s.t1,sy+16,H),P(sx+s.t0,sy+16,H)],i%2 ? '#e6d5a2' : '#f1e6bd',{amp:.1,dx:.1,dy:.1}); line([P(sx+s.t1,sy-16,H),P(sx+s.t1,sy+16,H)],{w:.8,amp:.05,over:0}); });
  rule(Array.from({length:Math.floor(T2/10)},(_,i) => [P(sx+i*10,sy+16,H),P(sx+i*10,sy+16-(i%5 ? 5 : 10),H)]),INK,.5);
  const t = Math.min(SS[c.from ?? 2].t0,T2-3); fill([P(sx+t,sy-16,H),P(sx+T2,sy-16,H),P(sx+T2,sy+16,H),P(sx+t,sy+16,H)],RED,{amp:.05,dx:0,dy:0});
  const p = P(sx+T2,sy+16); out.push(`<text x="${n1(p[0])}" y="${n1(p[1]+42)}" text-anchor="end" class="tt" font-size="25" fill="${INK}">the same tape, true to scale</text><text x="${n1(p[0])}" y="${n1(p[1]+70)}" text-anchor="end" class="it" font-size="20" fill="${RED}">${c.sliver}</text><path id="lifeMark" d="M0 0l-9 -16h18z" fill="${RED}" stroke="${INK}" stroke-width="1"/>`);
  { person(170,900,{hair:'bun',shirt:PAL.gold,arm:'up',look:1,size:.86,say:'all that, and only this'}); }
}
function lifeSip(x,y,c){
  lifeBoard(x,y,350,190,14,'#e7ddc4','#b98e62',20); const a = x+150, b = y+60, m = P(a,b,60), gr = [];
  for (let i = 1; i < 7; i++) gr.push([P(x+i*50,y,14),P(x+i*50,y+190,14)]); for (let i = 1; i < 4; i++) gr.push([P(x,y+i*190/4,14),P(x+350,y+i*190/4,14)]); rule(gr,'#b98e62',.5,.8);
  lifeTurn(a,b,14,[[26,0],[26,2],[13,5],[4.5,10],[3.4,16],[3.4,34],[5,38],[9,40]],'#6b6660',{cap:'#6b6660'}); lifeTurn(a,b,54,[[58,0],[62,3],[62,6]],'#d9b58a',{cap:'#efe0c0'}); rule(Array.from({length:5},() => { const q = P(a-40+rnd()*80,b-40+rnd()*80,60), l = 8+rnd()*12; return [q,[q[0]+l,q[1]+l*.3]]; }),'#d9b58a',.5);
  lifeCup(a,b,60,17,c.drink);
  for (let i = 0; i < 3; i++){ const q = [m[0]-10+i*10,m[1]-40]; out.push(`<path class="lifeWisp" data-x="${q[0]}" data-y="${q[1]}" d="M${q[0]} ${q[1]}q-6 -10 0 -20q6 -10 0 -20" fill="none" stroke="#9a8c7a" stroke-width="1.3" stroke-linecap="round"/>`); }
  { const s = a, t = b+96; for (const d of [100,220,340]) lifePipe([P(s+18*Math.cos(d*.01745),t+18*Math.sin(d*.01745),14),P(s+7*Math.cos(d*.01745),t+7*Math.sin(d*.01745),42)],2.4,'#a0683a'); lifeTurn(s,t,42,[[17,0],[20,3],[20,6]],'#a0683a',{cap:'#c79a68'}); const q = P(s,t,48); person(q[0],q[1],{hair:'short',shirt:PAL.sky,arm:'front',look:1,size:.76,sit:34,say:c.end}); }
  c.prop(x+286,y+70,14);
  out.push(`<text x="520" y="1236" class="tt" font-size="25" fill="${INK}">${c.close[0]}</text><text x="520" y="1270" class="tt" font-size="25" fill="${INK}">${c.close[1]}</text>`);
}
function lifeInit(ctx,c){
  const $ = id => document.getElementById(id), token = $('token'), SS = c.stages, X0 = c.X0, Y0 = c.Y0, marks = [...document.querySelectorAll('.lifeO,.lifeL')];
  let cur = 0, from = 0, to = 0, d = 1, moving = false, pause = 0, after = null, playing = false;
  const mark = $('lifeMark'), hand = $('lifeHand'), fall = $('lifeFall'), [wa,wb] = c.watch, sd = c.sand, wisps = [...document.querySelectorAll('.lifeWisp')]; let clock = 0;
  const seat = x => { const p = P(X0+x,Y0,4); token.setAttribute('transform',`translate(${n1(p[0])} ${n1(p[1]-24)})`); const s = SS.find(s => x <= s.b) || SS.at(-1), q = P(c.sx+lerp(s.t0,s.t1,s === SS[0] ? Math.max(0,(x-s.m)/(s.b-s.m)) : (x-s.a)/(s.b-s.a)),c.sy-16,8), f = Math.min(1,(x-SS[0].m)/(SS.at(-1).m-SS[0].m)), a = f*25.13-1.571, e = P(wa+30*Math.cos(a),wb+30*Math.sin(a),23); mark.setAttribute('transform',`translate(${n1(q[0])} ${n1(q[1])})`); hand.setAttribute('x2',n1(e[0])); hand.setAttribute('y2',n1(e[1])); $('lifeSandT').setAttribute('y',n1(lerp(sd.T,sd.M,f))); $('lifeSandT').setAttribute('height',n1(lerp(sd.M-sd.T,0,f))); $('lifeSandB').setAttribute('y',n1(sd.B-f*sd.H)); $('lifeSandB').setAttribute('height',n1(f*sd.H)); };
  const show = i => { cur = i; $('lifeDay').textContent = i+1; marks.forEach(m => m.classList.toggle('on',+m.dataset.i === i && m.classList.contains('lifeO'))); $('lifeT').textContent = SS[i].show; $('lifeN').textContent = `step ${i+1}: ${SS[i].tag}`; ctx.say(SS[i].say); };
  const go = i => { from = SS[cur].m; to = SS[i].m; cur = i; d = 0; moving = true; };
  const menu = () => { ctx.clear(); ctx.button(c.play,play); };
  function play(){ playing = true; ctx.clear(); token.style.display = ''; show(0); seat(SS[0].m); ctx.focus(...P(...SS[0].at),1.5); pause = 2; after = () => go(1); }
  ctx.hint('tap any step'); token.style.display = ''; seat(SS[0].m); show(0); menu();
  return {
    click(e){ if (playing) return false; const g = e.target.closest('.lifeO,.lifeL,.lifeS'); if (!g) return false; const i = +g.dataset.i; go(i); return true; },
    tick(t,dt){ clock += dt; wisps.forEach((w,j) => rising(w,(clock*.3+j/3)%1,4,-26,.8,1.2)); fall.style.opacity = moving ? 1 : 0; if (pause){ pause = Math.max(0,pause-dt); if (!pause){ const f = after; after = null; f?.(); } return; } if (!moving) return; d = Math.min(1,d+dt/1.1); const e = d*d*(3-2*d), x = lerp(from,to,e); seat(x); if (playing) ctx.focus(...P(X0+x,Y0-80),1.5); if (d >= 1){ moving = false; show(cur); if (playing){ if (cur < SS.length-1){ const n = cur+1; pause = 2; after = () => go(n); } else { pause = 2; after = () => { playing = false; ctx.focus(700,700,1.001,.05); ctx.say(c.end); menu(); }; } } } } };
}
