/* one square of a London street, cut as a slab and pulled apart downward: each layer is a tray with its two near faces cut, so it reads closed and open. Figures in SOURCES-under.md */
/* V() keeps these strong colours out of the build's soften(): this sheet alone runs brighter */
const V = h => '#'+h;
const SIDE = 300, SIZE = .46, YS = 232, XT = 232, SH0 = [100,160], SHY = 198, LAD = [104,120];
const TH = [30,64,124,136,70], ZS = [834,684,500,256,0], BOT = ZS.map((z,i) => z-TH[i]), SHIFT = [220,100,-20,-140,-260], IDS = ['u-street','u-pipes','u-sewer','u-tube','u-clay'], BIG = {k:1.5,x:-327.5,y:-329};
const ASPHALT = V('8492a1'), SAND = V('e6cf99'), BRICK = V('c37765'), CONC = V('a1b4bb'), OCHRE = V('d1a55c'), BLUEGREY = V('93aeb5'), CHALK = V('eee6d4'), WATER = V('89b7d2'), TERRA = V('c9835d'), ROOT = V('bd9666');
const LV = V('6f98bb'), GAS = V('e3bc5c'), POWER = V('c66957'), COMMS = V('988cbf');
const plL = (x,y,z,w,h,col,ink = .7) => { const p = [P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)]; flat(p,col); if (ink) rim(p,ink,INK); return p; };
const plR = (x,y,z,w,h,col,ink = .7) => { const p = [P(x,y,z),P(x,y-w,z),P(x,y-w,z+h),P(x,y,z+h)]; flat(p,col); if (ink) rim(p,ink,INK); return p; };
const plT = (x,y,z,w,d,col,ink = .7) => { const p = [P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)]; flat(p,col); if (ink) rim(p,ink,INK); return p; };
const pip = (p,r,col) => out.push(`<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="${r}" fill="${col}" stroke="${INK}" stroke-width=".4"/>`);
const poly = (pts,col,w = .9) => { flat(pts,col); if (w) rim(pts,w,INK); };
const heads = (p,c) => out.push(`<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="4.2" fill="${c}" stroke="${INK}" stroke-width=".5"/>`);
/* the egg stands on its small end, as Victorian sewers do */
const eggAt = (th,r,h) => { const s = Math.sin(th); return [r*Math.cos(th)*(1+.24*s),h*(.5+.5*s)]; };
const eggLoop = (fn,k = 1,n = 40,r = 46,h = 100) => Array.from({length:n},(_,i) => { const [u,v] = eggAt(i/n*6.283,r,h); return fn(u*k,h/2+(v-h/2)*k); });

/* layer 1: road, pavement, a kerb gully, the lifted manhole */
function car(x,y,z,B = V('8292a1')){ const L = 104, W = 36, y1 = y+W, Q = (u,v) => P(x+u,y1,z+v), Tt = (u,v) => P(x+u,y,z+v), wheel = (u,q,r) => ringAt((a,b) => q(u+a*r,9+b*r),22);
  const prof = [[0,11],[1,20],[14,22],[27,23],[40,35],[64,36],[80,24],[99,20],[104,15],[104,9]], kinds = ['','','','','roof','glass','bonnet','nose','front'];
  ground([P(x+4,y+4,z),P(x+L+6,y+4,z),P(x+L+6,y1+6,z),P(x+4,y1+6,z)]);
  { const c = wheel(84,Tt,9); flat(c,V('726863')); rim(c,.7,INK); }
  for (let i = 0; i < prof.length-1; i++){ const [a,b] = [prof[i],prof[i+1]], nx = -(b[1]-a[1]), nz = b[0]-a[0]; if (nx+nz <= .1) continue; const q = [Q(...a),Q(...b),Tt(...b),Tt(...a)]; flat(q,kinds[i] === 'glass' ? V('9eb2ba') : mixC(B,V('fefbf3'),kinds[i] === 'bonnet' ? .2 : .28)); rim(q,.7,INK);
    if (kinds[i] === 'glass') flat([Q(68,33),Q(72,30),Tt(72,30),Tt(68,33)],V('d0dde1'));
    if (kinds[i] === 'front'){ const l = u => [P(x+L,y+u,z+11),P(x+L,y+u+6,z+11),P(x+L,y+u+6,z+14.6),P(x+L,y+u,z+14.6)]; for (const u of [2,W-8]){ flat(l(u),V('eee6d4')); rim(l(u),.5,INK); } } }
  const side = [...prof,[100,6],[4,6]].map(p => Q(...p)); flat(side,B); rim(side,1,INK);
  for (const w of [[[30,24],[41,33],[53,33.5],[53,24]],[[55,24],[55,33.5],[63,33.5],[75,24]]]){ const q = w.map(p => Q(...p)); flat(q,V('9eb2ba')); rim(q,.7,INK); }
  flat([Q(34,25),Q(38,25),Q(44,32),Q(40,32)],V('d0dde1'));
  rule([[Q(54,34),Q(54,8)],[Q(3,16),Q(100,17)]],INK,.55,.8); flat([Q(0,14),Q(5,14),Q(5,18),Q(.6,18)],V('c66957'));
  for (const u of [22,84]){ const c = wheel(u,Q,9); flat(c,V('726863')); rim(c,.8,INK); const h = wheel(u,Q,5); flat(h,V('a8a6a6')); rim(h,.5,INK); }
}
const cone = (x,y,z) => { lifeTurn(x,y,z,[[8,0],[8,1.6]],V('898582'),{cap:V('a8a6a6'),ink:.8,seam:false}); lifeTurn(x,y,z+1.6,[[6,0],[1.6,17]],V('e08b60'),{cap:V('e08b60'),ink:.8,seam:false}); const a = P(x-3.6,y+3.6,z+9), b = P(x+3.6,y-3.6,z+9); rule([[a,b]],V('fefbf3'),2.2); };
function shop(z){ const x = 22, y = 8, w = 132, d = 70, f = y+d, W = V('e2ac91');
  block(x,y,z,w,d,86,{wall:W,deck:V('d2c7b6'),t:6,sink:7,ink:1.6});
  windowL(x+12,f,z+22,52,36); doorL(x+82,f,z,30,60,V('90a186')); windowR(x+w,y+50,z+28,30,28);
  for (let i = 0; i < 8; i++){ const a = x+6+i*15, b = a+15, q = [P(a,f,z+66),P(b,f,z+66),P(b,f+13,z+55),P(a,f+13,z+55)]; flat(q,i%2 ? V('f1e7d4') : V('d67262')); rim(q,.6,INK); }
  plL(x+22,f,z+68,86,14,V('f9f5ea'),.7); leftText(x+65,f,z+71,'corner shop',{size:12,anchor:'middle',track:.3}); }
function lamp(x,y,z){ const a = P(x,y,z), t = [a[0],a[1]-118], e = P(x+16,y+16,z+118); box(x-4,y-4,z,8,8,5,{left:V('919295'),marks:false,ink:.9}); rule([[a,t],[t,[e[0],e[1]-6]]],INK,3.2); rule([[a,t],[t,[e[0],e[1]-6]]],V('919295'),2); const c = blob(e[0],e[1]-3,8,5.4); flat(c,PAL.gold); inkLoop(c,{w:.9,over:0}); }
function street(z){ const R0 = 178, R1 = 284, zB = z-30;
  { const a = [[0,SIDE,z-11],[SIDE,SIDE,z-11]]; plL(0,SIDE,zB,SIDE,19,shadeOf(V('cdc1ab')),.8); plR(SIDE,SIDE,zB,SIDE,19,V('cdc1ab'),.8); plL(0,SIDE,z-11,SIDE,11,shadeOf(ASPHALT),.8); plR(SIDE,SIDE,z-11,SIDE,11,ASPHALT,.8); }
  plT(0,0,z,SIDE,SIDE,V('dcd2be'),1);
  { const l = []; for (let y = 42; y < R0; y += 42) l.push([P(0,y,z),P(SIDE,y,z)]); for (let i = 0, y = 0; y < R0-4; y += 42, i++) for (let x = i%2 ? 42 : 84; x < SIDE; x += 84) l.push([P(x,y,z),P(x,Math.min(R0,y+42),z)]); rule(l,V('988d7f'),.45,.7); }
  plT(0,R0,z,SIDE,R1-R0,ASPHALT,.9); plT(0,R0-4,z,SIDE,4,V('eee6d4'),.6); plT(0,R1,z,SIDE,4,V('eee6d4'),.6);
  for (let i = 0; i < 7; i++) plT(8,R0+6+i*14,z,48,7,V('eee6d4'),.3);
  for (const x of [84,162,240]) plT(x,R0+52,z,44,2.8,V('eee6d4'),0);
  plT(52,R0-2,z,24,12,V('a8a6a6'),.7); rule(Array.from({length:5},(_,i) => [P(55+i*4.4,R0-1,z),P(55+i*4.4,R0+9,z)]),INK,.8);
  /* the lifted cover: the shaft itself is drawn on the layers below */
  { const o = ringAt((a,b) => P(130+a*19,224+b*19,z),24), h = ringAt((a,b) => P(130+a*15,224+b*15,z),24); flat(o,V('a8a6a6')); rim(o,.8,INK); flat(h,V('b4836c')); rim(h,.8,INK); clipped(h,() => plL(112,212,z-20,36,20,V('d19584'),0)); const Cx = 170, Cy = 220, c = ringAt((a,b) => P(Cx+a*15,Cy+b*15,z+1),24); flat(c,V('a8a6a6')); rim(c,.9,INK); rule([[P(Cx-12,Cy,z+1),P(Cx+12,Cy,z+1)],[P(Cx,Cy-12,z+1),P(Cx,Cy+12,z+1)],[P(Cx-8,Cy-8,z+1),P(Cx+8,Cy+8,z+1)],[P(Cx+8,Cy-8,z+1),P(Cx-8,Cy+8,z+1)]],INK,.5); }
  put(101,202,() => cone(101,202,z)); put(150,238,() => cone(98,240,z));
  put(100,48,() => shop(z));
  plT(238,104,z,28,28,V('b6946d'),.7);
  put(250,116,() => tree(252,118,44,false,z));
  put(210,170,() => lamp(208,168,z));
  put(240,204,() => car(192,184,z,V('c38875')));
  who(92,134,{size:SIZE,hair:'bun',shirt:PAL.pink,arm:'front',look:-1,say:'is it safe to walk here?'},z);
  who(60,126,{size:SIZE,kid:true,hair:'short',shirt:PAL.sky,arm:'up',look:1,say:'where does the rain go?'},z);
  who(110,86,{size:SIZE,hair:'short',hairCol:V('d6ccbc'),shirt:PAL.sage,apron:V('f1e7d4'),arm:'down',look:1,say:'nice and quiet up here'},z);
  who(150,194,{size:SIZE,hair:'cap',cap:PAL.gold,shirt:V('e08b60'),arm:'wave',look:-1,say:'all clear down there?'},z);
  put(30,230,() => group('id="walker"',() => person(...P(30,232,z),{size:SIZE,hair:'long',hairCol:V('a1572f'),shirt:PAL.gold,arm:'down',look:1,say:'lovely day for it'})));
  put(600,600,() => { const hx = hull([P(0,R0,z),P(SIDE,R0,z),P(SIDE,R1,z),P(0,R1,z),P(0,R0,z+60),P(SIDE,R0,z+60),P(SIDE,R1,z+60),P(0,R1,z+60)]); out.push(`<clipPath id="uroad"><path d="M${hx.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/></clipPath><g clip-path="url(#uroad)"><g id="ucar">`); car(0,246,z,V('8ca8bc')); out.push('</g></g>'); });
  flush();
}

/* layer 2: the shallow services, their real colours, a chamber under the manhole, the tree's roots */
const pipeRun = (pts,w,col,z) => { lifePipe(pts.map(([x,y]) => P(x,y,z)),w,col); };
function collars(pts,w,col,z){ for (let i = 0; i < pts.length-1; i++){ const [a,b] = [pts[i],pts[i+1]], L = Math.hypot(b[0]-a[0],b[1]-a[1]), n = Math.floor(L/70); for (let k = 1; k <= n; k++){ const t = k/(n+1), x = lerp(a[0],b[0],t), y = lerp(a[1],b[1],t), ny = (b[0]-a[0])/L, nx = -(b[1]-a[1])/L, r = w*.62, q = [P(x-nx*r,y-ny*r,z),P(x+nx*r,y+ny*r,z)]; rule([q],INK,3.2); rule([q],litOf(col),2.2); } } }
function rootArm(pts,w0,z){ const c = spline(pts,false,6).map(p => P(p[0],p[1],z)), n = c.length; const seg = c.slice(1).map((p,i) => [c[i],p,w0*(1-.82*i/n)]); for (const [a,b,w] of seg) rule([[a,b]],INK,w+1.1); for (const [a,b,w] of seg) rule([[a,b]],ROOT,w); }
function pipes(z){ const zB = z-64, F = shadeOf(SAND);
  poly([P(0,SIDE,zB),P(SIDE,SIDE,zB),P(SIDE,SIDE,z),P(0,SIDE,z)],mixC(SAND,V('d5ae72'),.42),.9); poly([P(SIDE,SIDE,zB),P(SIDE,0,zB),P(SIDE,0,z),P(SIDE,SIDE,z)],mixC(SAND,V('d5ae72'),.22),.9);
  rule([[P(0,SIDE,z-28),P(SIDE,SIDE,z-24)],[P(SIDE,SIDE,z-52),P(SIDE,0,z-48)],[P(0,SIDE,z-50),P(SIDE,SIDE,z-54)]],V('ba955f'),.7,.7);
  plT(0,0,z,SIDE,SIDE,SAND,1);
  for (const [x,y,r] of [[208,250,24],[44,226,18],[250,40,22]]){ const q = ringAt((a,b) => P(x+a*r*1.5,y+b*r,z),18); flat(q,litOf(SAND)); }
  /* the runs dodge the chamber, as real services do */
  const C1 = [[0,181],[SIDE-5,181]], E1 = [[0,256],[152,256],[186,226],[SIDE-5,226]], G1 = [[0,269],[166,269],[200,252],[SIDE-5,252]], W1 = [[0,286],[182,286],[208,279],[SIDE-5,279]];
  for (const [p,w,c] of [[C1,5.5,COMMS],[E1,7,POWER],[G1,9,GAS],[W1,12,LV]]){ pipeRun(p,w,c,z); collars(p,w,c,z); }
  /* roots: wide near the trunk, thin fast, all near the surface */
  { const c = [252,118], arms = [[[252,118],[222,110],[196,124],[184,100]],[[252,118],[270,92],[262,56],[286,34]],[[252,118],[228,84],[206,70],[192,40]],[[252,118],[282,128],[292,156]],[[252,118],[238,146],[212,160],[188,166]],[[252,118],[256,76],[238,44],[244,18]]]; for (const a of arms) rootArm(a,8,z); const k = ringAt((a,b) => P(c[0]+a*9,c[1]+b*9,z),18); flat(k,ROOT); rim(k,.9,INK); }
  /* gully pot and its lateral into the chamber */
  lifePipe([P(64,198,z),P(92,222,z)],5,TERRA); { const q = k => ringAt((a,b) => P(64+a*k,196+b*k,z),18); flat(q(13),TERRA); rim(q(13),.9,INK); flat(q(8.5),V('b4836c')); rim(q(8.5),.7,INK); }
  /* the chamber: a brick box with a ladder, open at the top */
  { const x0 = SH0[0], x1 = SH0[1], y0 = SHY, y1 = 244, t = 9, dep = 64, O = [P(x0,y0,z),P(x1,y0,z),P(x1,y1,z),P(x0,y1,z)];
    plT(x0-t,y0-t,z,x1-x0+2*t,y1-y0+2*t,V('daa18f'),.8); flat(O,V('b4836c')); clipped(O,() => { plL(x0,y0,z-dep,x1-x0,dep,V('cc886f'),0); plR(x0,y1,z-dep,y1-y0,dep,V('c07b64'),0); plT(x0,y0,z-34,x1-x0,y1-y0,V('c0886b'),0); rule(Array.from({length:4},(_,i) => [P(x0,y0,z-7-i*7),P(x1,y0,z-7-i*7)]),INK,.45,.5); rule(Array.from({length:4},(_,i) => [P(x0,y0,z-7-i*7),P(x0,y1,z-7-i*7)]),INK,.45,.5); }); rim(O,1,INK);
    const r = (a,b) => [P(LAD[0],y0+2,a),P(LAD[0],y0+2,b)], s = (a,b) => [P(LAD[1],y0+2,a),P(LAD[1],y0+2,b)]; clipped(O,() => { rule([r(z-64,z+2),s(z-64,z+2)],INK,1.8); rule([r(z-64,z+2),s(z-64,z+2)],V('c7cbcd'),1); rule(Array.from({length:6},(_,i) => [P(LAD[0],y0+2,z-58+i*10),P(LAD[1],y0+2,z-58+i*10)]),INK,1); });
    rule(Array.from({length:7},(_,i) => [P(x0-t+i*14,y0-t,z),P(x0-t+i*14,y0,z)]),INK,.45,.6); }
  /* the near face: the same runs, cut across, sitting at their own depths */
  const dot2 = (y,zz,r,c) => { const q = ringAt((a,b) => P(SIDE,y+a*r,zz+b*r),18), i = ringAt((a,b) => P(SIDE,y+a*r*.55,zz+b*r*.55),14); flat(q,c); rim(q,1,INK); flat(i,mixC(c,V('f1e7d4'),.62)); rim(i,.6,INK); };
  dot2(181,z-12,7,COMMS); dot2(226,z-22,8.5,POWER); dot2(252,z-34,10.5,GAS); dot2(279,z-36,13,LV);
}

/* layer 3: the brick egg, opened along its length so you can see into it */
function sewer(z){ const zB = BOT[2]+12, H = 100, R = 46, zW = zB+24, zC = zB+H, yc = YS, x0 = 18, x1 = 268, uw = 34, FACE = shadeOf(BRICK), TOP = V('daa18f'), Q = (u,v) => P(SIDE,yc+u,zB+v);
  plT(0,0,z,SIDE,yc,TOP,1);
  for (const [x,y,r] of [[40,210,18],[250,40,22]]){ const q = ringAt((a,b) => P(x+a*r*1.5,y+b*r,z),18); flat(q,mixC(TOP,V('f1e7d4'),.24)); }
  plT(176,74,z,SIDE-176,44,V('e1a689'),.8); rule(Array.from({length:3},(_,i) => [P(176,85+i*11,z),P(SIDE,85+i*11,z)]),INK,.45,.55); rule(Array.from({length:5},(_,i) => [P(190+i*24,74+(i%2)*11,z),P(190+i*24,85+(i%2)*11,z)]),INK,.4,.45);
  plL(x0,yc,zW,x1-x0,z-zW,mixC(BRICK,V('f1e7d4'),.1),0);
  /* the opening, with the shaft notched out of its top */
  const O = [P(SH0[0],SHY,z),P(SH0[1],SHY,z),P(SH0[1],yc,z),P(SH0[1],yc,zC),P(x1,yc,zC),P(x1,yc,zW),P(x0,yc,zW),P(x0,yc,zC),P(SH0[0],yc,zC),P(SH0[0],yc,z)]; flat(O,V('cc886f'));
  clipped(O,() => {
    const ths = Array.from({length:12},(_,i) => (211-i*11)*Math.PI/180).map(t => eggAt(t,R,H));
    for (let i = 0; i < ths.length-1; i++){ const [u1,v1] = ths[i], [u2,v2] = ths[i+1], dy = u2-u1, dz = v2-v1, L = Math.hypot(dy,dz); let ny = -dz/L, nz = dy/L; if (ny*(0-u1)+nz*(H/2-v1) < 0){ ny = -ny; nz = -nz; }
      const k = Math.max(0,Math.min(1,(ny+nz+.6)/1.7)), c = mixC(V('bf7a68'),V('dda68e'),k), Y = a => yc+a; flat([P(-60,Y(u1),zB+v1),P(330,Y(u1),zB+v1),P(330,Y(u2),zB+v2),P(-60,Y(u2),zB+v2)],c); rule([[P(-60,Y(u2),zB+v2),P(330,Y(u2),zB+v2)]],INK,.45,.42);
      for (let x = i%2 ? 0 : 19; x < 310; x += 38) rule([[P(x,Y(u1),zB+v1),P(x,Y(u2),zB+v2)]],INK,.4,.32); }
    plL(SH0[0],SHY,zC-12,SH0[1]-SH0[0],z-zC+12,V('d59072'),0); plR(SH0[0],yc,zC-12,yc-SHY,z-zC+12,V('c07b64'),0); rule(Array.from({length:3},(_,i) => [P(SH0[0],SHY,zC-4+i*8),P(SH0[1],SHY,zC-4+i*8)]),INK,.4,.45);
    plT(-60,yc-uw,zW,400,uw,WATER,0);
    /* a side drain dribbling in */
    { const c = [214,196,zW+34], q = k => ringAt((a,b) => P(c[0]+a*k,c[1],c[2]+b*k),18); flat(q(10),TERRA); rim(q(10),.9,INK); flat(q(6.4),V('b4836c')); rim(q(6.4),.6,INK); const a = P(c[0],c[1],c[2]-5); rule([[a,[a[0],a[1]+23]]],V('dbe9ef'),2.2); }
    const r = u => [P(u,SHY+3,zW-2),P(u,SHY+3,z+2)]; rule([r(LAD[0]),r(LAD[1])],INK,2); rule([r(LAD[0]),r(LAD[1])],V('c7cbcd'),1.1); rule(Array.from({length:11},(_,i) => [P(LAD[0],SHY+3,zW+6+i*10),P(LAD[1],SHY+3,zW+6+i*10)]),INK,1.1);
    out.push('<g id="climber">'); person(...P(112,SHY+6,zW+15),{size:.42,hair:'cap',cap:PAL.gold,shirt:V('e08b60'),pants:V('778797'),arm:'up',look:1,say:'mind the rat'}); out.push('</g>');
    rule([[P(x0,yc,zC),P(SH0[0],yc,zC),P(SH0[0],yc,z)],[P(SH0[1],yc,z),P(SH0[1],yc,zC)],[P(SH0[1],yc,zC),P(x1,yc,zC)]].flatMap(l => l.slice(1).map((p,i) => [l[i],p])),INK,1);
  });
  /* water, and the bank in front of it */
  plT(x0,yc,zW,x1-x0,uw,WATER,0); rule([[P(x0,yc+uw,zW),P(x1,yc+uw,zW)]],INK,.8);
  plT(x0,yc+uw,zW,x1-x0,SIDE-yc-uw,V('daa18f'),.7);
  { const W = [P(x0,yc-uw,zW),P(x1,yc-uw,zW),P(x1,yc+uw,zW),P(x0,yc+uw,zW)], a = (y,o) => `<path class="flow" d="M${P(x0,y,zW).map(n1).join(' ')}L${P(x1,y,zW).map(n1).join(' ')}" fill="none" stroke="#e6f0f2" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${o}"/>`; clipped(W,() => out.push(a(yc-20,'26 44'),a(yc-4,'40 60'),a(yc+14,'20 50'))); }
  rule([[P(x0,yc,z),P(x1,yc,z)]],INK,.9);
  plT(92,SHY-8,z,SH0[1]-SH0[0]+16,yc-SHY+8,V('e1a689'),0); plT(SH0[0],SHY,z,SH0[1]-SH0[0],yc-SHY,V('cc886f'),0);
  /* re-lay the shaft mouth so the collar reads, then the rat, then the end pieces */
  clipped([P(SH0[0],SHY,z),P(SH0[1],SHY,z),P(SH0[1],yc,z),P(SH0[0],yc,z)],() => { plL(SH0[0],SHY,zC-12,SH0[1]-SH0[0],z-zC+12,V('d59072'),0); plR(SH0[0],yc,zC-12,yc-SHY,z-zC+12,V('c07b64'),0); const r = u => [P(u,SHY+3,zC-20),P(u,SHY+3,z+2)]; rule([r(LAD[0]),r(LAD[1])],INK,2); rule([r(LAD[0]),r(LAD[1])],V('c7cbcd'),1.1); });
  rim([P(SH0[0],SHY,z),P(SH0[1],SHY,z),P(SH0[1],yc,z),P(SH0[0],yc,z)],1,INK);
  rat(196,272,zW);
  /* the two ends: full egg on the right, half an egg on the stub at the left */
  { const S1 = (u,v) => P(x0,yc+u,zB+v), half = k => { const o = []; for (let i = 0; i <= 18; i++){ const [u,v] = eggAt(((-31+i*(121/18))*Math.PI/180),R,H); o.push(S1(u*k,H/2+(v-H/2)*k)); } o.push(S1(0,H/2-24*0+50*k),S1(0,24)); return o; };
    plT(0,yc,z,x0,SIDE-yc,TOP,.8); plR(x0,SIDE,zW,SIDE-yc,z-zW,mixC(BRICK,V('f1e7d4'),.18),.8); poly(half(1.14),V('daa18f'),.8); poly(half(1),V('cc886f'),.7); }
  poly([P(0,SIDE,BOT[2]),P(SIDE,SIDE,BOT[2]),P(SIDE,SIDE,z),P(x1,SIDE,z),P(x1,SIDE,zW),P(x0,SIDE,zW),P(x0,SIDE,z),P(0,SIDE,z)],FACE,1);
  rule(Array.from({length:3},(_,i) => [P(x0,SIDE,zW-14-i*14),P(x1,SIDE,zW-14-i*14)]),trim(FACE),.5,.5);
  plT(x1,yc,z,SIDE-x1,SIDE-yc,TOP,.9);
  plR(SIDE,SIDE,BOT[2],SIDE,TH[2],BRICK,1);
  { const outer = eggLoop(Q,1.13), inner = eggLoop(Q,1); flat(outer,V('dd9c83')); rim(outer,1,INK); rule(Array.from({length:26},(_,i) => { const t = i/26*6.283, [u,v] = eggAt(t,R,H), a = Q(u,v), b = Q(u*1.13,50+(v-50)*1.13); return [a,b]; }),INK,.55,.7); flat(inner,V('cc886f'));
    { const b = k => ringAt((a,c) => P(SIDE,96+a*k,zB+50+c*k),30), o2 = b(32), i2 = b(23); flat(o2,V('dd9c83')); rim(o2,1,INK); rule(Array.from({length:16},(_,i) => { const t = i/16*6.283; return [P(SIDE,96+23*Math.cos(t),zB+50+23*Math.sin(t)),P(SIDE,96+32*Math.cos(t),zB+50+32*Math.sin(t))]; }),INK,.55,.7); flat(i2,V('dda68e')); rim(i2,1,INK); clipped(i2,() => plR(SIDE,130,zB+20,70,14,WATER,0)); }
    clipped(inner,() => { const B = eggLoop((u,v) => P(SIDE-44,yc+u,zB+v),1); flat(B,V('dda68e')); inkLoop(B,{w:.6,over:0}); plR(SIDE,yc+60,zB-8,120,32,WATER,0); plT(SIDE-60,yc-uw,zW,60,2*uw,WATER,0); rule([[P(SIDE,yc-30,zW),P(SIDE-44,yc-30,zW)],[P(SIDE,yc+6,zW),P(SIDE-44,yc+6,zW)]],V('e3eff2'),1.6); }); inkLoop(inner,{w:1,over:0}); }
}
/* the rat: in the spirit of the farm's animals, round and side-on */
function rat(x,y,z,k = 1.45){ const Q = (u,v) => P(x+u*k,y,z+v*k); out.push('<g class="who hit" data-say="squeak">');
  ground([P(x-14,y-2,z),P(x+16,y-2,z),P(x+16,y+7,z),P(x-14,y+7,z)]);
  line(spline([[-12,6],[-22,4],[-30,9],[-36,5]],false,3).map(p => Q(...p)),{w:1.8,col:V('cd9787'),amp:.1,over:0});
  contour(Q,[[-14,5],[-10,13],[0,17],[10,14],[17,8],[22,4],[15,1],[-6,0]],V('ad9a8f'),1,2);
  { const e = ringAt((a,b) => { const q = Q(7,17); return [q[0]+a*6,q[1]+b*6.6]; },14); flat(e,V('dfada0')); rim(e,.8,INK); pip(Q(22.5,4.4),2,V('d48779')); pip(Q(14,9),1.5,INK); rule([[Q(20,5),Q(27,8)],[Q(20,4),Q(28,3)]],INK,.4,.8); }
  out.push('</g>'); }

/* layer 4: a tube tunnel, opened along its length, a small train on a loop */
function coach(y,z,tail){ const X = 256, D = 44, H0 = 8, Hh = 60, L = 112, Q = (u,v) => P(X,y-u,z+v), Rf = (a,b,c,col) => { const q = [Q(a,b),Q(c,b),P(X-D,y-c,z+b),P(X-D,y-a,z+b)]; flat(q,col); rim(q,.7,INK); };
  plL(X-D-2,y-L+6,z-1,D+4,2,V('7b7771'),0);
  /* roof first, then the side */
  Rf(4,Hh+2,L-4,V('e7dcc7')); { const q = [Q(0,Hh-8),Q(4,Hh+2),P(X-D,y-4,z+Hh+2),P(X-D,y,z+Hh-8)]; }
  const side = [[0,H0],[L,H0],[L,Hh-8],[L-4,Hh+2],[4,Hh+2],[0,Hh-8]].map(p => Q(...p)); flat(side,V('eee6d4')); rim(side,1.1,INK);
  { const skirt = [[0,H0],[L,H0],[L,H0+11],[0,H0+11]].map(p => Q(...p)); flat(skirt,V('8292a1')); rim(skirt,.6,INK); }
  for (const [a,w] of [[10,18],[64,36]]){ const q = [[a,28],[a+w,28],[a+w,50],[a,50]].map(p => Q(...p)); flat(q,GLASS); rim(q,.8,INK); const c = Q(a+w*.5,34); if (w > 20){ heads([c[0]-9,c[1]],SKIN); heads([c[0]+8,c[1]+1],SKIN); } else heads(c,SKIN); }
  for (const a of [34,L-20]){ const q = [[a,H0+3],[a+18,H0+3],[a+18,54],[a,54]].map(p => Q(...p)); flat(q,V('d67262')); rim(q,.8,INK); rule([[Q(a+9,H0+3),Q(a+9,54)]],INK,.8); const g = [[a+3,32],[a+7,32],[a+7,48],[a+3,48]].map(p => Q(...p)); flat(g,GLASS); const g2 = [[a+11,32],[a+15,32],[a+15,48],[a+11,48]].map(p => Q(...p)); flat(g2,GLASS); }
  for (const c of [20,L-20]) { const r = ringAt((a,b) => Q(c+a*7,6+b*7),18); flat(r,V('919295')); rim(r,.9,INK); pip(Q(c,6),1.8,V('c7cbcd')); }
  /* the end that faces us */
  const e = [P(X,y,z+H0),P(X-D,y,z+H0),P(X-D,y,z+Hh-8),P(X-D+4,y,z+Hh+2),P(X-4,y,z+Hh+2),P(X,y,z+Hh-8)]; flat(e,tail ? V('e7dcc7') : V('d67262')); rim(e,1,INK); plL(X-D+8,y,z+28,D-16,20,GLASS,.7); if (!tail) for (const u of [X-8,X-D+8]) pip(P(u,y,z+16),2.2,V('eee6d4')); }
function tube(z){ const zB = BOT[3]+8, Rr = 56, zc = zB+Rr, zL = zB+14, zC = zB+2*Rr, xc = XT, y0 = 18, y1 = 268, TOP = V('c5d2d5'), IN = V('ddd0b1'), FACE = CONC;
  plT(0,0,z,xc,SIDE,TOP,1); plT(xc,0,z,SIDE-xc,y0,TOP,.8);
  /* the second of the twin tunnels, its crown running to the near face */
  plT(28,150,z,104,SIDE-150,V('b5c5cb'),.8); rule(Array.from({length:6},(_,i) => [P(28,168+i*24,z),P(132,168+i*24,z)]),INK,.55,.55); rule([[P(80,150,z),P(80,SIDE,z)]],INK,.4,.35);
  plR(xc,y1,zL,y1-y0,z-zL,mixC(CONC,V('f1e7d4'),.12),0);
  const O = [P(xc,y1,zL),P(xc,y1,zC),P(xc,y0,zC),P(xc,y0,zL)]; flat(O,IN);
  clipped(O,() => { const a0 = 229, n = 12, pt = i => { const t = (a0-i*(139/n))*Math.PI/180; return [Rr*Math.cos(t),Rr*Math.sin(t)]; };
    for (let i = 0; i < n; i++){ const [u1,v1] = pt(i), [u2,v2] = pt(i+1), mx = -(u1+u2)/2/Rr, mz = -(v1+v2)/2/Rr, k = Math.max(0,Math.min(1,(mx+mz+.5)/1.8)), c = mixC(V('c0ae91'),V('e7dbc1'),k), Q = (y,u,v) => P(xc+u,y,zc+v); flat([Q(-40,u1,v1),Q(330,u1,v1),Q(330,u2,v2),Q(-40,u2,v2)],c); if (i%3 === 2) rule([[Q(-40,u2,v2),Q(330,u2,v2)]],INK,.4,.35); }
    /* lining rings, cables */
    rule(Array.from({length:12},(_,r) => { const y = 8+r*25; return Array.from({length:n},(_,i) => { const [u1,v1] = pt(i), [u2,v2] = pt(i+1); return [P(xc+u1,y,zc+v1),P(xc+u2,y,zc+v2)]; }); }).flat(),INK,.55,.5);
    const [cu,cv] = pt(5); rule([[P(xc+cu,-40,zc+cv),P(xc+cu,330,zc+cv)]],INK,2); rule([[P(xc+cu,-40,zc+cv),P(xc+cu,330,zc+cv)]],V('988cbf'),1.1);
    const lamp2 = y => { const q = P(xc+cu+2,y,zc+cv+12); pip(q,3.4,PAL.gold); }; lamp2(70); lamp2(190);
  });
  rule([[P(xc,y1,zC),P(xc,y0,zC)]],INK,1); plT(xc-46,y0,zL,SIDE-xc+46,y1-y0,V('d4c5a6'),.6);
  /* sleepers and rails */
  for (let y = y0+6; y < y1; y += 22) plT(214,y,zL+1,48,8,V('b6946d'),.45);
  for (const x of [222,250]){ plT(x,y0,zL+3,3,y1-y0,V('7b7771'),.4); }
  { const hx = hull([202,266].flatMap(x => [y0,SIDE].flatMap(y => [zL-14,zL+80].map(zz => P(x,y,zz))))); out.push(`<clipPath id="utube"><path d="M${hx.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/></clipPath><g clip-path="url(#utube)"><g id="utrain">`); coach(132,zL,true); coach(252,zL,false); rule([[P(234,132,zL+24),P(234,140,zL+24)]],INK,1.4); out.push('</g></g>'); }
  /* the two ends: half a ring at the far stub, a full ring at the near face */
  { const C1 = (u,v) => P(xc+u,y0,zc+v), half = r => { const o = []; for (let i = 0; i <= 16; i++){ const t = (-49+i*(139/16))*Math.PI/180; o.push(C1(r*Math.cos(t),r*Math.sin(t))); } o.push(C1(0,0),C1(0,-44)); return o; };
    plL(xc,y0,zL,SIDE-xc,z-zL,mixC(CONC,V('f1e7d4'),.28),.8); poly(half(62),V('b5c5cb'),.8); poly(half(Rr),IN,.7); }
  plT(xc,y1,z,SIDE-xc,SIDE-y1,TOP,.9);
  poly([P(SIDE,SIDE,BOT[3]),P(SIDE,0,BOT[3]),P(SIDE,0,z),P(SIDE,y0,z),P(SIDE,y0,zL),P(SIDE,y1,zL),P(SIDE,y1,z),P(SIDE,SIDE,z)],FACE,1);
  plL(0,SIDE,BOT[3],SIDE,TH[3],shadeOf(FACE),1);
  { const Q = (u,v) => P(xc+u,SIDE,zc+v), loop = (r,n = 40) => ringAt((a,b) => Q(a*r,b*r),n), o = loop(62), i = loop(Rr); flat(o,V('c5d2d5')); rim(o,1,INK); rule(Array.from({length:12},(_,k) => { const t = k/12*6.283; return [Q(Rr*Math.cos(t),Rr*Math.sin(t)),Q(62*Math.cos(t),62*Math.sin(t))]; }),INK,.8,.8); flat(i,IN);
    { const q = r => ringAt((a,b) => P(80+a*r,SIDE,zc+b*r),40), o2 = q(62), i2 = q(Rr); flat(o2,V('c5d2d5')); rim(o2,1,INK); rule(Array.from({length:12},(_,k) => { const t = k/12*6.283; return [P(80+Rr*Math.cos(t),SIDE,zc+Rr*Math.sin(t)),P(80+62*Math.cos(t),SIDE,zc+62*Math.sin(t))]; }),INK,.8,.8); flat(i2,IN); clipped(i2,() => { const B = ringAt((a,b) => P(80+a*Rr,SIDE-40,zc+b*Rr),36); flat(B,V('c9b89b')); inkLoop(B,{w:.6,over:0}); plL(20,SIDE,zL-30,120,30,V('d4c5a6'),0); plT(20,SIDE-44,zL,120,44,V('d4c5a6'),0); for (const x of [70,98]) plT(x,SIDE-44,zL+3,3,44,V('7b7771'),.4); }); inkLoop(i2,{w:1,over:0}); }
    clipped(i,() => { const B = ringAt((a,b) => P(xc+a*Rr,SIDE-40,zc+b*Rr),36); flat(B,V('c9b89b')); inkLoop(B,{w:.6,over:0}); plL(xc-60,SIDE,zL-30,120,30,V('d4c5a6'),0); plT(xc-60,SIDE-44,zL,120,44,V('d4c5a6'),0); for (const x of [222,250]) plT(x,SIDE-44,zL+3,3,44,V('7b7771'),.4); /* through the hole only the last stretch of bore shows; the side walls hide the rest, and the train ends at the face */ clipped(hull([208,260].flatMap(x => [256,SIDE].flatMap(y => [zL-4,zL+68].map(zz => P(x,y,zz))))),() => out.push('<use href="#utrain"/>')); }); inkLoop(i,{w:1,over:0}); }
}

/* layer 5: London Clay, its fossils, and water held in the chalk under it */
function strata(z){ const zB = BOT[4], W = (u,a) => a+3*Math.sin(u*.021+a), band = (a,b,col,face) => { const up = Array.from({length:16},(_,i) => { const u = i*20; return face(u,zB+W(u,b)); }), dn = Array.from({length:16},(_,i) => { const u = (15-i)*20; return face(u,zB+W(u,a)); }); flat([...up,...dn],col); };
  const L = (u,v) => P(u,SIDE,v), R = (u,v) => P(SIDE,SIDE-u,v);
  for (const [f,sh] of [[L,1],[R,0]]){ const m = c => sh ? shadeOf(c) : c; flat(sh ? [P(0,SIDE,zB),P(SIDE,SIDE,zB),P(SIDE,SIDE,z),P(0,SIDE,z)] : [P(SIDE,SIDE,zB),P(SIDE,0,zB),P(SIDE,0,z),P(SIDE,SIDE,z)],m(OCHRE)); flat(sh ? [P(0,SIDE,zB),P(SIDE,SIDE,zB),P(SIDE,SIDE,zB+8),P(0,SIDE,zB+8)] : [P(SIDE,SIDE,zB),P(SIDE,0,zB),P(SIDE,0,zB+8),P(SIDE,SIDE,zB+8)],m(CHALK)); band(0,18,m(CHALK),f); band(18,28,m(WATER),f); band(28,50,m(BLUEGREY),f); }
  rim([P(0,SIDE,zB),P(SIDE,SIDE,zB),P(SIDE,SIDE,z),P(0,SIDE,z)],1,INK); rim([P(SIDE,SIDE,zB),P(SIDE,0,zB),P(SIDE,0,z),P(SIDE,SIDE,z)],1,INK);
  for (const [u,v] of [[50,10],[120,7],[210,11],[270,8]]){ const q = blob(...P(u,SIDE,zB+v),6,3.4); flat(q,V('a8a6a6')); inkLoop(q,{w:.7,over:0}); const r = blob(...P(SIDE,SIDE-u+24,zB+v+1),6,3.4); flat(r,V('a8a6a6')); inkLoop(r,{w:.7,over:0}); }
}
function clay(z){ strata(z); const TOP = V('e1bc72'), dep = 56;
  plT(0,0,z,SIDE,SIDE,TOP,1);
  for (const [x,y,r] of [[226,242,30],[60,210,20]]){ const q = ringAt((a,b) => P(x+a*r*1.5,y+b*r,z),18); flat(q,mixC(TOP,V('f1e7d4'),.3)); }
  /* a pit down to the chalk, where the groundwater lies */
  { const x0 = 192, x1 = 284, y0 = 44, y1 = 166, O = [P(x0,y0,z),P(x1,y0,z),P(x1,y1,z),P(x0,y1,z)]; flat(O,WATER); clipped(O,() => { for (const [a,b,c] of [[0,24,OCHRE],[24,40,BLUEGREY],[40,dep+6,CHALK]]){ plL(x0,y0,z-b,x1-x0,b-a,mixC(c,V('fefbf3'),.06),0); plR(x0,y1,z-b,y1-y0,b-a,shadeOf(c),0); } plT(x0,y0,z-dep,x1-x0,y1-y0,WATER,0); const r = [[x0+30,y0+48],[x0+62,y0+78]]; for (const [a,b] of r){ const q = ringAt((c,d) => P(a+c*16,b+d*7,z-dep),16); inkLoop(q,{w:.6,col:V('e3eff2'),over:0}); } const k = blob(...P(x0+24,y0+84,z-dep),7,4); flat(k,V('a8a6a6')); inkLoop(k,{w:.7,over:0}); }); rim(O,1.1,INK); }
  /* the nautiloid: one coil, its chambers ticked on the outer whorl */
  { const x = 96, y = 240, Rn = 42, Q = (a,b) => P(x+a,y+b,z), T = 3.1*6.283, K = .19, rad = t => Rn*Math.exp(-K*(T-t)), at = (t,r) => Q(r*Math.cos(t),r*Math.sin(t)); out.push('<g class="who hit" data-say="about 50 million years old">');
    const s = Array.from({length:48},(_,i) => at(T-6.283+i/48*6.283,rad(T-6.283+i/48*6.283))); flat(s.map(p => [p[0]+4,p[1]+5]),V('918c9d')); flat(s,V('f1e3c5')); const inner = Array.from({length:40},(_,i) => at(T-2*6.283+i/40*6.283,rad(T-2*6.283+i/40*6.283))); flat(inner,V('e6cb97'));
    rule(Array.from({length:17},(_,i) => { const t = T-.2-i*.36; return [at(t,rad(t)),at(t-.18,rad(t-6.283))]; }),V('a57f53'),.9,.85); inkLoop(s,{w:1.2,over:0}); line(Array.from({length:150},(_,i) => { const t = T*.3+i/149*T*.7; return at(t,rad(t)); }),{w:1,amp:.1,over:0}); out.push('</g>'); }
  /* a shark's tooth */
  { const x = 226, y = 250, Q = (a,b) => P(x+a,y+b,z); out.push('<g class="who hit" data-say="an old shark tooth">'); const pts = [[-20,8],[-10,0],[-4,-20],[2,-32],[6,-18],[12,-2],[22,6],[10,14],[2,9],[-8,14]], c = contour(Q,pts,V('f1e7d4'),1,2.5); clipped(c,() => { const b = [Q(-30,3),Q(30,3),Q(30,22),Q(-30,22)]; flat(b,V('ba955f')); }); inkLoop(c,{w:1,over:0}); rule([[Q(-1,-6),Q(2,-22)]],V('a8a6a6'),.8); out.push('</g>'); }
}

function draw(seed){
  begin(seed); OX = 785; OY = 1003; const [Z1,Z2,Z3,Z4,Z5] = ZS, B = BOT;
  const guide = i => { out.push('<g class="guide" style="opacity:0">'); for (const [x,y] of [[0,SIDE],[SIDE,SIDE],[SIDE,0]]) dash(P(x,y,B[i]),P(x,y,ZS[i+1])); if (i < 2) dash(P(112,200,B[i]),P(112,200,ZS[i+1]),V('c66957')); if (i === 0) dash(P(64,186,B[0]),P(64,196,ZS[1]),V('c66957')); out.push('</g>'); };
  out.push(`<g id="u-all" style="cursor:pointer;transition:transform .8s cubic-bezier(.5,0,.2,1);transform:translate(${BIG.x}px,${BIG.y}px) scale(${BIG.k})">`);
  const layer = (i,fn,labels) => { out.push(`<g class="floor" id="${IDS[i]}" style="transform:translateY(${SHIFT[i]}px)">`); fn(ZS[i]); out.push('<g class="u-labs-open" style="opacity:0;pointer-events:none;transition:opacity .4s">'); labels(); out.push('</g></g>'); };
  layer(4,clay,() => label(72,1170,'London Clay','up to 130 m thick',[60,SIDE,-34]));
  guide(3);
  layer(3,tube,() => label(1340,980,'the Tube','3.6 m bore, 20 m down',[SIDE,150,Z4-124],'end'));
  guide(2);
  layer(2,sewer,() => label(72,740,'brick egg','1.2 m tall, Whitechapel',[120,SIDE,Z3-104]));
  guide(1);
  layer(1,pipes,() => label(1340,540,'services','gas, water 750 mm down',[SIDE,226,Z2-22],'end'));
  guide(0);
  layer(0,street,() => { label(72,300,'a street','one slab of London',[40,250,Z1]); label(1340,258,'roots','most in the top 60 cm',[252,118,Z1+1],'end'); });
  out.push('</g>');
  /* closed, the slab takes the right of the sheet and every label sits on the left, level with its band */
  { const on = (q,i) => [...at(BIG.x+BIG.k*q[0],BIG.y+BIG.k*(q[1]+SHIFT[i])),0];
    out.push('<g id="u-labs-closed" style="cursor:pointer;transition:opacity .4s">');
    label(72,402,'a street','one slab of London',on(P(36,262,Z1),0));
    label(72,540,'services','gas, water 750 mm down',on(P(36,SIDE,Z2-30),1));
    label(72,682,'brick egg','1.2 m tall, Whitechapel',on(P(36,SIDE,Z3-60),2));
    label(72,878,'the Tube','3.6 m bore, 20 m down',on(P(24,SIDE,Z4-40),3));
    label(72,1036,'London Clay','up to 130 m thick',on(P(36,SIDE,-34),4));
    out.push('</g>'); }
  title('field notes · going under','Under your street');
  out.push(`<text x="72" y="232" class="it" font-size="19" fill="${LEAD}">London figures, not to scale.</text><text x="72" y="256" class="it" font-size="19" fill="${LEAD}">Every city differs.</text>`);
  plus(1160,110); plus(1200,150,5); plus(250,1320); plus(1230,1300,5);
  finish();
}

function init(ctx){
  const floors = IDS.map(id => document.getElementById(id)), guides = [...document.querySelectorAll('.guide')], train = document.getElementById('utrain'), car = document.getElementById('ucar'), walker = document.getElementById('walker'), climber = document.getElementById('climber'), flows = [...document.querySelectorAll('.flow')], all = document.getElementById('u-all'), closedLabs = document.getElementById('u-labs-closed'), openLabs = [...document.querySelectorAll('.u-labs-open')], closedNotes = [...closedLabs.querySelectorAll('.note')];
  const REST = 'One slab of a London street. '+(matchMedia('(hover:hover)').matches ? 'Hover a layer, click to open it.' : 'Tap a layer to open it.'), SAY = ['The street: road, pavement, and most roots in the top 60 cm.','Services: gas and water about 750 mm down.','The brick egg: 1.2 m tall at Whitechapel.','The Tube: a 3.6 m bore, about 20 m down.','London Clay: up to 130 m thick, under the Tube.'];
  let open = false, cur = -1, hover = -1, tx = -40;
  /* open = the button's full pull-apart; cur = the one layer clicked; hover = a small lift, so the layer under the pointer never moves away from it */
  const lay = () => { const wide = open || cur >= 0; all.style.transform = wide ? 'translate(0px,0px) scale(1)' : `translate(${BIG.x}px,${BIG.y}px) scale(${BIG.k})`; closedLabs.style.opacity = wide ? 0 : 1; closedLabs.style.pointerEvents = wide ? 'none' : ''; openLabs.forEach(g => { const on = wide && cur < 0; g.style.opacity = on ? 1 : 0; g.style.pointerEvents = on ? '' : 'none'; });
    floors.forEach((f,i) => { const lift = hover < 0 ? 0 : wide ? (i === hover ? -12 : 0) : (i < hover ? -26 : 0); f.style.transform = `translateY(${(wide ? 0 : SHIFT[i])+lift}px)`; }); guides.forEach(g => g.style.opacity = wide ? 1 : 0); closedNotes.forEach((n,i) => n.style.opacity = hover < 0 || i === hover ? 1 : .4); tog.textContent = wide ? 'press together' : 'pull apart'; };
  const home = () => ctx.say(cur >= 0 ? SAY[cur] : open ? 'Road, pipes, sewer, Tube, clay. Layers not to scale.' : REST);
  const pick = i => { cur = i; hover = -1; floors.forEach(f => f.style.transition = ctx.calm ? 'none' : ''); lay(); if (i >= 0){ const q = P(150,150,ZS[i]-TH[i]); ctx.focus(q[0],q[1],1.5); } else ctx.focus(700,700,1,.01); home(); };
  const peek = i => { if (i === hover || cur >= 0) return; hover = i; floors.forEach(f => f.style.transition = ctx.calm ? 'none' : 'transform .28s ease-out'); lay(); if (i >= 0) ctx.say(SAY[i]); else home(); };
  const layerOf = el => { const n = el.closest('.note'), c = closedNotes.indexOf(n); if (c >= 0) return c; return floors.indexOf(el.closest('.floor')); };
  closedNotes.forEach(n => n.classList.remove('hit'));
  const over = e => { if (e.pointerType === 'mouse') peek(layerOf(e.target)); }, away = e => { if (e.pointerType === 'mouse') peek(-1); };
  for (const g of [all,closedLabs]){ g.addEventListener('pointerover',over); g.addEventListener('pointerleave',away); }
  if (ctx.calm) [...floors,all].forEach(f => f.style.transition = 'none');
  /* zoomed in, any click off the layers closes it */
  const sheet = document.getElementById('sheet'), off = e => { if (cur >= 0 && !e.target.closest('.floor,.note,[data-say]')) pick(-1); };
  sheet.addEventListener('click',off);
  ctx.hint('tap people and labels');
  const tog = ctx.button('pull apart',() => { open = !(open || cur >= 0); pick(-1); });
  home();
  const lane = t => { const c = t%16, w = c < 4.6 ? c/4.6 : c >= 8.4 && c < 13 ? (c-8.4)/4.6 : -1; if (w < 0) car.style.opacity = 0; else { const x = lerp(0,196,w); car.style.opacity = Math.min(1,w/.1,(1-w)/.1).toFixed(2); car.setAttribute('transform',`translate(${n1(x*C)} ${n1(x*S)})`); }
    const k = c < 5 ? 1 : c < 8 ? (8-c)/3 : c < 13 ? 0 : (c-13)/3, d = lerp(-68,50,k); walker.setAttribute('transform',`translate(${n1(-d*C)} ${n1(d*S)})`); };
  if (ctx.calm){ tx = 20; train.setAttribute('transform',`translate(${n1(-tx*C)} ${n1(tx*S)})`); car.setAttribute('transform',`translate(${n1(90*C)} ${n1(90*S)})`); walker.setAttribute('transform',`translate(${n1(58*C)} ${n1(-58*S)})`); }
  return { tick(t,dt){
    if (ctx.calm) return; tx += dt*104; if (tx > 300) tx = -250; train.setAttribute('transform',`translate(${n1(-tx*C)} ${n1(tx*S)})`); flows.forEach((f,i) => f.setAttribute('stroke-dashoffset',n1(-(t*(46+i*9))))); lane(t); climber.setAttribute('transform',`translate(0 ${n1(3*Math.sin(t*1.1))})`);
  }, click(e){ if (e.target.closest('[data-say]')) return false; const i = layerOf(e.target); if (i < 0){ if (cur >= 0) pick(-1); return false; } pick(i === cur ? -1 : i); return true; }, stop(){ sheet.removeEventListener('click',off); ctx.focus(700,700,1,.01); }};
}
