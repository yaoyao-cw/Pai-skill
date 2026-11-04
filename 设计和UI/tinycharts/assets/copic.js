
/* the marker look: ruled ink over marker wash, a faint construction grid under everything, and leader-line annotations in place of paper tags */
const LEAD = '#6a6055';
const lookGrid = () => { const S = 40, R = 54, a = [], b = []; for (let i = -R; i <= R; i++){ const p = [P(i*S,-R*S),P(i*S,R*S),P(-R*S,i*S),P(R*S,i*S)], l = i%4 ? a : b; l.push(`M${n1(p[0][0])} ${n1(p[0][1])}L${n1(p[1][0])} ${n1(p[1][1])}M${n1(p[2][0])} ${n1(p[2][1])}L${n1(p[3][0])} ${n1(p[3][1])}`); }
  return `<defs><radialGradient id="gridFade" cx="700" cy="760" r="680" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="gridMask"><rect width="1400" height="1400" fill="url(#gridFade)"/></mask></defs><g fill="none" stroke="#d8ccb9" mask="url(#gridMask)"><path d="${a.join('')}" stroke-width=".5"/><path d="${b.join('')}" stroke-width=".9"/></g>`; };
/* notes are written by hand: the leader wavers, the rings are not quite round, the lettering is an architect's */
let LOOSE = 0;
const loose = fn => { LOOSE = .9; fn(); LOOSE = 0; };
const handRing = (c,r,col,w,paper) => { const p = ringAt((a,b) => [c[0]+r*a,c[1]+r*b],14); if (paper) out.push(`<path d="${pathOf(p)}Z" fill="${paper}"/>`); line([...p,p[0],p[1]],{w,col,over:0}); };
function leader(a,b,sx){ const dy = b[1]-a[1], run = Math.abs(dy)*.58, ex = b[0]-sx*run, e = sx*(ex-a[0]) > 0 ? [ex,a[1]] : a;
  loose(() => { line(e === a ? [a,b] : [a,e,b],{w:1.05,col:LEAD,over:0}); handRing(a,3.8,LEAD,1,'#fbf6ec'); handRing(b,3.8,LEAD,1); }); out.push(`<circle cx="${n1(b[0])}" cy="${n1(b[1])}" r="1.2" fill="${LEAD}"/>`); }
function label(tx,ty,title,note,to,side = 'start'){
  const q = P(...to), s = side === 'start' ? 1 : -1, w = Math.max(title.length*17,note.length*11)+16, a = [tx+s*w,ty+20];
  out.push(`<g class="note hit" data-to="${n1(q[0])},${n1(q[1])}">`);
  leader(a,q,Math.sign(q[0]-a[0]) || s);
  out.push(`<text x="${tx}" y="${ty+24}" text-anchor="${side}" class="cap" font-size="22" fill="${INK}">${title.toUpperCase()}</text><text x="${tx}" y="${ty+50}" text-anchor="${side}" class="it" font-size="19" fill="${LEAD}">${note}</text></g>`);
}
function tag(x,y,w,text){
  const h = 46, t = y+4, c = [[x,t],[x+w,t],[x+w,t+h],[x,t+h]]; out.push(`<path d="${pathOf(c)}Z" fill="#fffdf6"/>`);
  loose(() => { for (let i = 0; i < 4; i++) line([c[i],c[(i+1)%4]],{w:1.2,over:2.4}); });
  out.push(`<text x="${n1(x+w/2)}" y="${n1(t+30)}" text-anchor="middle" class="cap" font-size="18.5" fill="${INK}">${text.toUpperCase()}</text>`);
}

/* the drawing kit: every plane is a marker wash with ruled ink edges that run a little past their corners */
const TONE = '#4a4552', litOf = c => mixC(c,'#fffdf6',.22), shadeOf = c => mixC(c,TONE,.17), trim = c => mixC(c,TONE,.34);
const pathOf = pts => 'M'+pts.map(p => n1(p[0])+' '+n1(p[1])).join('L');
const rim = (pts,w,col,o = 1) => out.push(`<path d="${pathOf(pts)}Z" fill="none" stroke="${col}" stroke-width="${w}" opacity="${o}"/>`);
const flat = (pts,col) => fill(pts,col,{dx:0,dy:0,amp:0});
const edge = (a,b,w = .9,o = 1.6) => line([a,b],{w,over:o});
const pen = (pts,w = 1) => line(pts,{w,over:0});
/* many fine lines as one path: courses, boards, tile joints */
const rule = (pairs,col = INK,w = .6,o = 1) => { if (pairs.length) out.push(`<path d="${pairs.map(([a,b]) => `M${n1(a[0])} ${n1(a[1])}L${n1(b[0])} ${n1(b[1])}`).join('')}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${o}" stroke-linecap="round"/>`); };
const clipped = (pts,fn) => { const id = 'cl'+(clipN++); out.push(`<clipPath id="${id}"><path d="${pathOf(pts)}Z"/></clipPath><g clip-path="url(#${id})">`); fn(); out.push('</g>'); };
let clipN = 0;
/* the construction lines that run on past a corner */
const cross = (p,dirs,L = 15) => rule(dirs.map(([a,b]) => { const l = Math.hypot(a,b)||1; return [[p[0]+a/l*3,p[1]+b/l*3],[p[0]+a/l*L,p[1]+b/l*L]]; }),'#8d8478',.55);
function box(x,y,z,w,d,h,{top,left = PAL.shade,ink = 2,marks = true} = {}){
  const a = P(x,y,z+h), b = P(x+w,y,z+h), c = P(x+w,y+d,z+h), e = P(x,y+d,z+h), f = P(x,y+d,z), g = P(x+w,y+d,z), k = P(x+w,y,z), T = top || litOf(left), it = Math.max(.6,ink*.4), ot = Math.min(1.4,ink*.68);
  flat([f,g,c,e],shadeOf(left)); flat([g,k,b,c],left); flat([a,b,c,e],T);
  edge(e,c,it); edge(c,b,it); edge(c,g,it);
  for (const [p,q] of [[e,f],[f,g],[g,k],[k,b],[b,a],[a,e]]) edge(p,q,ot,1.4);
  if (marks && h >= 60 && w >= 64 && d >= 64){ cross(a,[[0,-1],[C,-S],[-C,-S]],18); cross(b,[[C,-S],[C,S],[0,-1]],14); cross(e,[[-C,-S],[-C,S],[0,-1]],14); }
}
/* a block with real walls: the roof is sunk behind a parapet you can see over */
function block(x,y,z,w,d,h,{wall = PAL.tan,deck = '#cfc6b8',t = 7,sink = 9,ink = 2} = {}){
  box(x,y,z,w,d,h,{left:wall,top:litOf(wall),ink});
  const zt = z+h, O = [P(x+t,y+t,zt),P(x+w-t,y+t,zt),P(x+w-t,y+d-t,zt),P(x+t,y+d-t,zt)];
  flat(O,deck);
  clipped(O,() => { flat([P(x+t,y+t,zt),P(x+t,y+d-t,zt),P(x+t,y+d-t,zt-sink),P(x+t,y+t,zt-sink)],shadeOf(wall)); flat([P(x+t,y+t,zt),P(x+w-t,y+t,zt),P(x+w-t,y+t,zt-sink),P(x+t,y+t,zt-sink)],wall); rule([[P(x+t,y+t,zt-sink),P(x+w-t,y+t,zt-sink)],[P(x+t,y+t,zt-sink),P(x+t,y+d-t,zt-sink)]],INK,.7); });
  rim(O,.9,INK);
}
/* openings go into the wall: you see the jamb and the sill before the glass, as in a real reveal */
function openL(x,y,z,w,h,r,back,after){
  const O = [P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)], B = [P(x,y-r,z),P(x+w,y-r,z),P(x+w,y-r,z+h),P(x,y-r,z+h)];
  flat(O,back); clipped(O,() => { after(B); });
  flat([P(x,y,z),P(x,y,z+h),P(x,y-r,z+h),P(x,y-r,z)],mixC(back,'#efe7d8',.62)); flat([P(x,y,z),P(x+w,y,z),P(x+w,y-r,z),P(x,y-r,z)],'#efe7d8');
  line([O[3],O[0],O[1]],{w:.9,over:1}); line([O[1],O[2],O[3]],{w:.9,over:1}); edge(O[0],B[0],.55,0); edge(O[3],B[3],.55,0);
}
function openR(x,y,z,w,h,r,back,after){
  const O = [P(x,y,z),P(x,y-w,z),P(x,y-w,z+h),P(x,y,z+h)], B = [P(x-r,y,z),P(x-r,y-w,z),P(x-r,y-w,z+h),P(x-r,y,z+h)];
  flat(O,back); clipped(O,() => { after(B); });
  flat([P(x,y-w,z),P(x,y-w,z+h),P(x-r,y-w,z+h),P(x-r,y-w,z)],mixC(back,'#efe7d8',.62)); flat([P(x,y,z),P(x,y-w,z),P(x-r,y-w,z),P(x-r,y,z)],'#efe7d8');
  line([O[3],O[0],O[1]],{w:.9,over:1}); line([O[1],O[2],O[3]],{w:.9,over:1}); edge(O[1],B[1],.55,0); edge(O[2],B[2],.55,0);
}
const GLASS = '#c5d1d4', VOID = '#6f6a6c';
const pane = B => { const L = (t,u) => [lerp(lerp(B[0][0],B[1][0],t),lerp(B[3][0],B[2][0],t),u),lerp(lerp(B[0][1],B[1][1],t),lerp(B[3][1],B[2][1],t),u)];
  rule([[L(.5,0),L(.5,1)],[L(0,.5),L(1,.5)]],INK,1.1); rule([[L(.5,0),L(.5,1)],[L(0,.5),L(1,.5)]],'#efe7d8',.5); rim(B,.7,INK); flat([L(.1,.56),L(.24,.56),L(.42,.94),L(.28,.94)],'#e3ebec'); };
const cill = (a,b,c,col = '#d9cfbf') => { flat([a,b,c,[a[0]+c[0]-b[0],a[1]+c[1]-b[1]]],col); pen([a,b,c],.8); };
function windowL(x,y,z,w,h,{r = 5} = {}){ openL(x,y,z,w,h,r,GLASS,pane); const a = P(x-3,y,z-3), b = P(x+w+3,y,z-3), c = P(x+w+3,y,z); flat([a,b,c,P(x-3,y,z)],'#d9cfbf'); rim([a,b,c,P(x-3,y,z)],.75,INK); }
function windowR(x,y,z,w,h,{r = 5} = {}){ openR(x,y,z,w,h,r,GLASS,pane); const a = P(x,y+3,z-3), b = P(x,y-w-3,z-3), c = P(x,y-w-3,z); flat([a,b,c,P(x,y+3,z)],'#d9cfbf'); rim([a,b,c,P(x,y+3,z)],.75,INK); }
const doorPanels = (B,col) => { const L = (t,u) => [lerp(lerp(B[0][0],B[1][0],t),lerp(B[3][0],B[2][0],t),u),lerp(lerp(B[0][1],B[1][1],t),lerp(B[3][1],B[2][1],t),u)]; flat(B,col); rim(B,.7,INK); for (const [a,b] of [[.08,.42],[.52,.72]]) for (const [c,e] of [[.14,.46],[.54,.86]]) rim([L(c,a),L(e,a),L(e,b),L(c,b)],.55,trim(col)); rule([[L(.5,.8),L(.5,.92)]],trim(col),.5); dot(...L(.86,.46),1.5,'#c4a25c',.5); };
function doorL(x,y,z,w,h,col,{r = 4} = {}){ openL(x,y,z,w,h,r,VOID,B => doorPanels(B,col)); }
function doorR(x,y,z,w,h,col,{r = 4} = {}){ openR(x,y,z,w,h,r,VOID,B => doorPanels(B,col)); }
/* a real flight: every tread and riser drawn, a stringer on the open side. Climbs along +run, `n` steps of `go` by `up` */
function flight(x,y,z,n,go,up,wd,axis = 'x',col = '#e4dbcb'){
  const Q = axis === 'x' ? (a,b,c) => P(x+a,y+b,z+c) : (a,b,c) => P(x+b,y+a,z+c);
  for (let i = n-1; i >= 0; i--){ const u = i*go, v = (i+1)*up;
    flat([Q(u,0,v),Q(u+go,0,v),Q(u+go,wd,v),Q(u,wd,v)],litOf(col)); flat([Q(u,0,v),Q(u,wd,v),Q(u,wd,v-up),Q(u,0,v-up)],shadeOf(col));
    rule([[Q(u,0,v),Q(u,wd,v)],[Q(u,0,v-up),Q(u,wd,v-up)]],INK,.7); }
  const s = [Q(0,wd,0)]; for (let i = 0; i < n; i++){ s.push(Q(i*go,wd,(i+1)*up)); s.push(Q((i+1)*go,wd,(i+1)*up)); } s.push(Q(n*go,wd,0)); flat(s,col); pen([...s,s[0]],.9);
}
function cyl(x,y,z,r,h,col,{ink = 1.4, cap = null} = {}){
  const arc = (zz,a,b,n = 16) => Array.from({length:n+1},(_,i) => { const t = (a+(b-a)*i/n)*Math.PI/180; return P(x+r*Math.cos(t),y+r*Math.sin(t),zz); });
  const band = (a,b,c) => flat([...arc(z,a,b,8),...arc(z+h,b,a,8)],c);
  band(-45,135,col); band(-45,-5,litOf(col)); band(80,135,shadeOf(col));
  const T = ringAt((c,s) => P(x+r*c,y+r*s,z+h)), C2 = cap || litOf(col), wi = Math.min(1.2,ink*.72);
  flat(T,C2); if (r > 12) rim(ringAt((c,s) => P(x+(r-3.5)*c,y+(r-3.5)*s,z+h)),.6,trim(C2));
  const b = arc(z,-45,135), t = arc(z+h,135,-45); pen(b,wi); edge(b[0],t[16],wi,0); edge(b[16],t[0],wi,0); inkLoop(T,{w:wi*.8,over:0});
}
/* the ground is a cut slab with square corners, as in an architect's site model */
function board(x,y,w,d,h,top,side,r = 30,z = 0){
  const a = [P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)], L = [P(x,y+d,z),P(x+w,y+d,z),P(x+w,y+d,z-h),P(x,y+d,z-h)], R = [P(x+w,y+d,z),P(x+w,y,z),P(x+w,y,z-h),P(x+w,y+d,z-h)];
  flat(L,shadeOf(side)); flat(R,side); flat(a,top);
  for (const [p,q] of [[L[3],L[2]],[L[2],R[2]],[L[0],L[3]],[R[1],R[2]],[L[1],L[2]]]) edge(p,q,1.1,1.6);
  rim(a,1,INK); for (const q of [a[3],a[1]]) cross(q,[[0,1],[q === a[3] ? -C : C,-S]],22); cross(a[2],[[0,1]],h+20);
  return a;
}
function layShades(){ for (const p of shades) out.push(`<path fill="#8f8796" opacity=".17" d="${pathOf(p)}Z"/>`); shades = []; }
/* a shadow laid in place, for things drawn after the ground has been done */
const ground = pts => out.push(`<path fill="#8f8796" opacity=".17" d="${pathOf(pts)}Z"/>`);
/* side-on contours: u runs along the x axis and v is height, so an animal stands in the plane of the drawing rather than as a stack of boxes */
const sideOf = (x,y) => (u,v) => P(x+u,y,v);
const contour = (Q,pts,col,w = 1,step = 3) => { const c = spline(pts,true,step).map(p => Q(...p)); flat(c,col); inkLoop(c,{w,over:0}); return c; };
/* plants stay round and friendly: a soft puff of leaf with one ink line, however exact the buildings around them are */
function puffRow(x0,x1,y,z,{hw = 18,h = 27} = {}){
  ground([P(x0,y+hw-2,z),P(x1+6,y+hw-2,z),P(x1+6,y+hw+9,z),P(x0,y+hw+9,z)]);
  const n = Math.max(2,Math.round((x1-x0)/(hw*1.5)));
  for (let i = 0; i <= n; i++){ const p = P(lerp(x0,x1,i/n),y,z), r = hw*(1.16+rnd()*.12), q = blob(p[0],p[1]-h*.5,r,r*.68,.05,9); fill(q,'#7cae80',{dx:0,dy:0,amp:0}); inkLoop(q,{w:1,over:0}); const hi = blob(p[0]+r*.16,p[1]-h*.5-r*.2,r*.5,r*.26,.05,7); fill(hi,'#a8cf9c',{dx:0,dy:0,amp:0}); if (i%2) line([[p[0]-5,p[1]-h*.5+3],[p[0],p[1]-h*.5-1],[p[0]+5,p[1]-h*.5+2]],{w:.7,over:0}); }
}
/* a roof of real tiles with a ridge cap, bargeboards and a gutter */
function gable(x,y,w,d,h,rise,{wall = WALL,roof = ROOF,before = null,clad = null} = {}){
  box(x,y,0,w,d,h,{left:wall,top:wall,marks:false});
  const o = 11, ridge = y+d/2, H = h+rise, lo = h-o*rise/(d/2);
  const t = [P(x+w,y,h),P(x+w,y+d,h),P(x+w,ridge,H)]; flat(t,wall); pen([t[0],t[2],t[1]],.8);
  if (clad) clad();
  if (before) before();
  const rA = P(x-o,ridge,H), rB = P(x+w+o,ridge,H), fA = P(x-o,y+d+o,lo), fB = P(x+w+o,y+d+o,lo), bB = P(x+w+o,y-o,lo);
  const end = [rB,bB,P(x+w+o,y-o,lo-6),P(x+w+o,ridge,H-7),P(x+w+o,y+d+o,lo-6),fB]; flat(end,'#e4dbcb'); rim(end,1,INK);
  const lip = [fA,fB,P(x+w+o,y+d+o,lo-6),P(x-o,y+d+o,lo-6)]; flat(lip,'#e4dbcb'); rim(lip,.8,INK);
  const face = [rA,rB,fB,fA]; flat(face,roof);
  const rows = Math.max(6,Math.round(Math.hypot(rA[1]-fA[1],rA[0]-fA[0])/13)), cols = Math.round((x+w+2*o-(x-o))/13), L = (u,v) => [lerp(lerp(rA[0],rB[0],u),lerp(fA[0],fB[0],u),v),lerp(lerp(rA[1],rB[1],u),lerp(fA[1],fB[1],u),v)], joints = [], courses = [];
  for (let i = 1; i < rows; i++){ courses.push([L(0,i/rows),L(1,i/rows)]); }
  for (let i = 0; i < rows; i++) for (let j = (i%2)*.5; j < cols; j++) joints.push([L(j/cols,i/rows),L(j/cols,(i+1)/rows)]);
  rule(courses,trim(roof),.7); rule(joints,trim(roof),.45);
  const cap = [rA,rB,L(1,.035),L(0,.035)]; flat(cap,mixC(roof,'#efe7d8',.3)); rule([[L(0,.035),L(1,.035)]],INK,.7);
  rim(face,1.1,INK);
  const gut = [P(x-o,y+d+o,lo-6),P(x+w+o,y+d+o,lo-6),P(x+w+o,y+d+o+2,lo-9),P(x-o,y+d+o+2,lo-9)]; flat(gut,'#8e8f92'); rim(gut,.6,INK);
}
const boards = (pts,n,col = INK,o = .55) => { const [a,b,c,e] = pts; rule(Array.from({length:n-1},(_,i) => { const t = (i+1)/n; return [[lerp(a[0],b[0],t),lerp(a[1],b[1],t)],[lerp(e[0],c[0],t),lerp(e[1],c[1],t)]]; }),col,.5,o); };
function farmhouse(x,y){
  const w = 186, d = 118, cx = x+132, cy = y+66, fy = y+d, fx = x+w, W2 = '#ede6d8', STONE = '#b9b0a2';
  gable(x,y,w,d,86,64,{wall:W2,before:() => {
    box(cx,cy,110,26,26,110,{top:'#6b6660',left:'#b5806f',marks:false,ink:1.6}); rule(Array.from({length:12},(_,i) => [P(cx+26,cy,114+i*8),P(cx+26,cy+26,114+i*8)]),trim('#b5806f'),.5); rule(Array.from({length:12},(_,i) => [P(cx,cy+26,114+i*8),P(cx+26,cy+26,114+i*8)]),trim('#b5806f'),.5);
    box(cx-3,cy-3,214,32,32,5,{top:'#d9cfbf',left:'#d9cfbf',marks:false,ink:1.3}); for (const [a,b] of [[8,8],[18,18]]) cyl(cx+a,cy+b,219,4,9,'#b5806f',{ink:.9,cap:'#3c3734'});
  },clad:() => { const a = [P(x,fy,0),P(fx,fy,0),P(fx,fy,12),P(x,fy,12)], b = [P(fx,fy,0),P(fx,y,0),P(fx,y,12),P(fx,fy,12)]; flat(a,shadeOf(STONE)); flat(b,STONE); rule([[a[3],a[2]],[b[3],b[2]],[P(x,fy,6),P(fx,fy,6)],[P(fx,fy,6),P(fx,y,6)]],INK,.55); rule(Array.from({length:30},(_,i) => { const u = i/30, z = i%2 ? 0 : 6; return [P(x+w*u,fy,z),P(x+w*u,fy,z+6)]; }),INK,.4,.6); rule(Array.from({length:20},(_,i) => { const u = i/20, z = i%2 ? 0 : 6; return [P(fx,fy-d*u,z),P(fx,fy-d*u,z+6)]; }),INK,.4,.6); }});
  doorL(x+78,fy,12,32,56,'#8c9c86'); const g = P(x+94,fy,76); box(x+70,fy,0,48,16,4,{top:'#d9cfbf',left:'#b9b0a2',ink:1.1}); box(x+74,fy+2,4,40,10,4,{top:'#e4dbcb',left:'#c6bdaf',ink:1}); box(x+72,fy,76,44,5,4,{top:'#d9cfbf',left:'#c6bdaf',ink:.9});
  for (const wx of [x+24,x+130]){ windowL(wx,fy,34,34,32); for (const s of [-1,1]){ const u = s < 0 ? wx-13 : wx+35, q = [P(u,fy,34),P(u+12,fy,34),P(u+12,fy,66),P(u,fy,66)]; flat(q,'#8c9c86'); rim(q,.7,INK); rule(Array.from({length:7},(_,i) => [P(u+1,fy,38+i*4),P(u+11,fy,38+i*4)]),trim('#8c9c86'),.5); } }
  windowR(fx,y+78,34,38,32); windowR(fx,y+48,104,20,16,{r:3});
  for (const px of [x+24,x+130]){ box(px-3,fy,26,40,6,6,{top:'#7a7169',left:'#a98b6d',marks:false,ink:.9}); for (let i = 0; i < 9; i++){ const q = P(px+i*4.4,fy+3,32+rnd()*3); out.push(`<circle cx="${n1(q[0])}" cy="${n1(q[1])}" r="${n1(1.6+rnd())}" fill="${['#b65f50','#8fa382','#d8b878'][i%3]}" stroke="${INK}" stroke-width=".4"/>`); } }
  const dp = [P(x+2,fy+1,78),P(x+2,fy+1,0)]; rule([dp],INK,2.4); rule([dp],'#a6a4a4',1.5);
  const s = P(cx+13,cy+13,232); for (let i = 0; i < 6; i++){ out.push(`<g class="puff" data-i="${i}" data-x="${n1(s[0])}" data-y="${n1(s[1])}">`); out.push(`<path d="M${n1(s[0]-5)} ${n1(s[1]+4)}q5-7 1-11t4-9" fill="none" stroke="#8d8478" stroke-width=".8"/></g>`); }
}
function barn(x,y){
  const w = 168, d = 128, fy = y+d, fx = x+w, R = '#b5806f', DK = '#a5705f';
  gable(x,y,w,d,92,58,{wall:R,roof:'#7f8b98',clad:() => { boards([P(x,fy,0),P(fx,fy,0),P(fx,fy,92),P(x,fy,92)],32,INK); boards([P(fx,fy,0),P(fx,y,0),P(fx,y,92),P(fx,fy,92)],24,INK); rule(Array.from({length:23},(_,i) => { const Y = y+d*(i+1)/24, H2 = 92+58*(1-Math.abs(Y-(y+d/2))/(d/2)); return [P(fx,Y,92),P(fx,Y,H2)]; }),INK,.5,.55); const f = [P(x,fy,0),P(fx,fy,0),P(fx,fy,7),P(x,fy,7)], g = [P(fx,fy,0),P(fx,y,0),P(fx,y,7),P(fx,fy,7)]; flat(f,'#a39a8c'); flat(g,'#b9b0a2'); rim(f,.7,INK); rim(g,.7,INK); }});
  const q = [P(x+44,fy,7),P(x+124,fy,7),P(x+124,fy,74),P(x+44,fy,74)]; flat(q,'#e4dbcb'); rim(q,1,INK); boards(q,14,INK,.5); rule([[P(x+84,fy,7),P(x+84,fy,74)]],INK,1); for (const a of [44,84]) rule([[P(x+a,fy,7),P(x+a+40,fy,74)],[P(x+a+40,fy,7),P(x+a,fy,74)]],INK,.9); const rl = [P(x+36,fy+1,76),P(x+132,fy+1,76),P(x+132,fy+1,79),P(x+36,fy+1,79)]; flat(rl,'#6b6660'); rim(rl,.6,INK);
  doorR(fx,y+84,7,38,50,'#b9a690'); doorR(fx,y+76,84,22,26,'#b9a690',{r:3}); const hb = [P(fx,y+65,116),P(fx+20,y+65,116)]; rule([hb],INK,2.2); rule([hb],'#8e7c68',1.2); pen([P(fx+18,y+65,116),P(fx+18,y+65,100)],.6);
  const c = [x+w/2-10,y+d/2-10]; box(c[0],c[1],146,20,20,12,{left:'#e4dbcb',top:'#7f8b98',marks:false,ink:1.2}); boards([P(c[0],c[1]+20,146),P(c[0]+20,c[1]+20,146),P(c[0]+20,c[1]+20,158),P(c[0],c[1]+20,158)],5,INK); const tp = [P(c[0]-2,c[1]+10,158),P(c[0]+10,c[1]+10,168)]; pen([P(c[0]+10,c[1]+10,158),P(c[0]+10,c[1]+10,172)],1);
}
function coop(x,y){
  const fy = y+58, fx = x+70, T = '#c4ad8b';
  for (const [a,b] of [[0,0],[64,0],[0,52],[64,52]]) box(x+a,y+b,0,6,6,14,{left:'#8e7c68',marks:false,ink:1});
  OY -= 14; gable(x,y,70,58,30,22,{wall:T,roof:'#8e9a8b',clad:() => boards([P(x,fy,0),P(fx,fy,0),P(fx,fy,30),P(x,fy,30)],12,INK)}); doorL(x+24,fy,0,18,20,'#6e6052',{r:3}); OY += 14;
  const a = P(x+32,fy+34,0), b = P(x+33,fy,14), m = [[a[0]-8,a[1]+4],[a[0]+8,a[1]-4],[b[0]+8,b[1]-4],[b[0]-8,b[1]+4]]; flat(m,'#c4ad8b'); rim(m,.8,INK); boards([m[0],m[3],m[2],m[1]],6,INK);
}
function fence(pts){ for (let i = 0; i < pts.length-1; i++){ const [a,b] = [pts[i],pts[i+1]], n = Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/30); for (const z of [13,25]){ const q = [P(a[0],a[1],z),P(b[0],b[1],z),P(b[0],b[1],z+3.4),P(a[0],a[1],z+3.4)]; flat(q,'#c4ad8b'); rim(q,.7,INK); } for (let k = 0; k <= n; k++){ const t = k/n, X = lerp(a[0],b[0],t), Y = lerp(a[1],b[1],t); box(X-1.8,Y-1.8,0,3.6,3.6,33,{left:'#b39b78',marks:false,ink:1}); } } }
function stones(list){ for (const [x,y,r] of list){ const c = ringAt((a,b) => { const m = 1+.14*Math.sin(Math.atan2(b,a)*3+x); return P(x+r*a*m,y+r*b*.8*m); },14); flat(c,'#d9d1c1'); inkLoop(c,{w:.8,over:0}); rule([[c[2],[c[2][0]-4,c[2][1]+3]]],trim('#d9d1c1'),.5); } }
function hay(x,y){ cyl(x,y,0,26,34,'#d3b67c',{cap:'#e0cb9c'}); for (const r of [6,12,18]) rim(ringAt((a,b) => P(x+r*a,y+r*b,34),20),.45,trim('#e0cb9c')); }
function garden(x,y,w,d){
  const p = [P(x,y),P(x+w,y),P(x+w,y+d),P(x,y+d)]; flat(p,'#9c7a5c'); rim(p,1,INK);
  for (let r = 0; r < 6; r++){ const yy = y+18+r*(d-30)/5, R = [P(x+6,yy-9),P(x+w-6,yy-9),P(x+w-6,yy+11),P(x+6,yy+11)]; flat(R,'#8a6a50'); rule([[P(x+6,yy+11),P(x+w-6,yy+11)]],INK,.6);
    for (let i = 0; i < 9; i++){ const q = P(x+16+i*(w-30)/8,yy); if (r%2){ for (let k = 0; k < 6; k++){ const c = [q[0]+(rnd()-.5)*11,q[1]-4+(rnd()-.5)*7]; out.push(`<circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="3.2" fill="${k%2 ? '#a3b08f' : '#8fa382'}" stroke="${INK}" stroke-width=".4"/>`); } } else { rule([-5,-2,1,4].map(s => [q,[q[0]+s,q[1]-12]]),'#5f7355',.9); dot(q[0],q[1],1.8,'#c28a5e',.4); } } }
}
function pond(x,y,rx,ry){
  const ring = k => ringAt((a,b) => { const t = Math.atan2(b,a), m = 1+.1*Math.sin(t*3+1)+.05*Math.sin(t*7); return P(x+rx*a*m*k,y+ry*b*m*k); },40), c = ring(1), g = ring(1.05);
  flat(g,'#c9bfa8'); inkLoop(g,{w:.8,over:0}); flat(c,'#a9bcc8'); clipped(c,() => { flat(ring(.74),'#b7c8d2'); rule(Array.from({length:18},() => { const q = P(x+(rnd()-.5)*rx*1.5,y+(rnd()-.5)*ry*1.5), l = 8+rnd()*18; return [[q[0]-l,q[1]],[q[0]+l,q[1]]]; }),'#6f8a9c',.5); }); inkLoop(c,{w:1,over:0});
  for (const [dx,dy] of [[-58,18],[-30,50],[-46,36]]){ const q = P(x+dx,y+dy), l = blob(q[0],q[1],9,4.5); flat(l,'#8fa382'); inkLoop(l,{w:.6,over:0}); }
}
function reeds(x,y){ const q = P(x,y); for (const [s,h] of [[-9,44],[-5,34],[-2,56],[3,46],[6,40],[12,50]]){ pen([[q[0]+s,q[1]],[q[0]+s*1.4,q[1]-h]],.8); if (h > 45){ const c = blob(q[0]+s*1.4,q[1]-h-1,2,7); flat(c,'#8e6d4f'); inkLoop(c,{w:.6,over:0}); } } }
function hive(x,y){ for (const [a,b] of [[4,4],[26,4],[4,26],[26,26]]) box(x+a,y+b,0,4,4,8,{left:'#8e7c68',marks:false,ink:.9}); for (let i = 0; i < 3; i++) box(x+1,y+1,8+i*14,32,32,14,{top:'#e4dbcb',left:['#e4dbcb','#d3c8b6','#e4dbcb'][i],marks:false,ink:1}); box(x-3,y-3,50,40,40,5,{top:'#a6a4a4',left:'#8e8f92',marks:false,ink:1}); const q = [P(x+8,y+33,8),P(x+26,y+33,8),P(x+26,y+33,11),P(x+8,y+33,11)]; flat(q,VOID); rim(q,.5,INK); }
function bucket(x,y,col = '#a6a4a4'){ cyl(x,y,0,10,15,col,{ink:1,cap:'#7d8b96'}); const a = P(x-10,y+10,15), b = P(x+10,y-10,15); pen([a,[lerp(a[0],b[0],.5),a[1]-14],b],.7); }
