/* Hand-drawn isometric sheet. Nothing here is an SVG wobble over clean art: every line is
   drawn as a filled, pressure-varying stroke with a little overshoot at the corners, colour is
   laid separately and slightly off register, and shade is ink hatching rather than a darker fill. */
const INK = '#231e16', RED = '#c8372f', PENCIL = '#7f9db3', SHADOW = '#5d6c9c';
const PAL = {cream:'#fffdf6', tan:'#ecc98e', wood:'#c07f3f', pink:'#f3a6bb', rose:'#ef6a4c', sage:'#93d3b0', sky:'#a9c8ee', blue:'#76a0e2', gold:'#f4b829', steel:'#c6ccce', shade:'#e3e0d2'};
const mixC = (a,b,t) => { if (a.length !== 7) return a; const p = (c,i) => parseInt(c.substr(i,2),16); return '#'+[1,3,5].map(i => Math.round(p(a,i)*(1-t)+p(b,i)*t).toString(16).padStart(2,'0')).join(''); };
const dim = c => mixC(c,'#3b2f4a',.24), glow = c => mixC(c,'#ffffff',.22);
function hull(pts){ const q = [...pts].sort((a,b) => a[0]-b[0]||a[1]-b[1]), cr = (o,a,b) => (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]), half = l => { const h = []; for (const p of l){ while (h.length > 1 && cr(h.at(-2),h.at(-1),p) <= 0) h.pop(); h.push(p); } h.pop(); return h; }; return [...half(q),...half(q.reverse())]; }
const C = .866, S = .5;
let OX = 700, OY = 500, rnd, out;

const seedWith = a => { rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const P = (x,y,z=0) => [OX + (x-y)*C, OY + (x+y)*S - z];
const at = (sx,sy) => { const a = (sx-OX)/C, b = (sy-OY)/S; return [(a+b)/2, (b-a)/2]; };
const n1 = v => +v.toFixed(1);
const wob = () => { const a = rnd()*9, b = rnd()*9, c = rnd()*9, f = .012 + rnd()*.01; return t => .55*Math.sin(t*f + a) + .3*Math.sin(t*f*2.3 + b) + .15*Math.sin(t*f*5.1 + c); };

function resample(pts, step = 8){
  const o = [];
  for (let i = 0; i < pts.length-1; i++){
    const [a,b] = [pts[i], pts[i+1]], d = Math.hypot(b[0]-a[0], b[1]-a[1]), n = Math.max(1, Math.round(d/step));
    for (let k = 0; k < n; k++) o.push([a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n]);
  }
  o.push(pts.at(-1)); return o;
}
function hand(pts, amp, over = 0){
  // a straight ruler line is the giveaway of code, so the path drifts slowly and runs past its corner
  if (over){ const a = pts[0], b = pts[1], y = pts.at(-1), z = pts.at(-2), la = Math.hypot(a[0]-b[0],a[1]-b[1])||1, lz = Math.hypot(y[0]-z[0],y[1]-z[1])||1, oa = over*rnd(), oz = over*rnd();
    pts = [[a[0]+(a[0]-b[0])/la*oa, a[1]+(a[1]-b[1])/la*oa], ...pts.slice(1,-1), [y[0]+(y[0]-z[0])/lz*oz, y[1]+(y[1]-z[1])/lz*oz]]; }
  const r = resample(pts), f = wob(); let d = 0;
  return r.map((p,i) => { const q = r[Math.min(i+1,r.length-1)], e = r[Math.max(i-1,0)], dx = q[0]-e[0], dy = q[1]-e[1], l = Math.hypot(dx,dy)||1; d += 8; const m = f(d)*amp; return [p[0]-dy/l*m, p[1]+dx/l*m]; });
}
/* The pen is based on Kevin T. Ngo's statechart-art (MIT): the hand chases the points on a damped spring,
   so corners round and ends run on; slow bow and fine tremor sit on top; pressure swells at the start and eases at the end. */
const sway = (lo,hi,n) => { const A = [], W = [], P = []; let m = 0; for (let i = 0; i < n; i++){ const l = lo*Math.pow(hi/lo,(i+rnd()*.8)/n), v = Math.pow(l/hi,.35)*(.6+.8*rnd()); A.push(v); W.push(2*Math.PI/l); P.push(rnd()*6.28); m += v*v; } m = 1/Math.sqrt(m/2); return s => { let v = 0; for (let i = 0; i < n; i++) v += A[i]*Math.sin(s*W[i]+P[i]); return v*m*.5; }; };
function chase(t, L, ds, z = .72){
  const m = t.length; if (m < 3) return t;
  const w = Math.min(.5,ds/L), k = w*w, c = 2*z*w, lag = Math.round(2*z/w); let x = t[0][0], y = t[0][1], vx = t[1][0]-x, vy = t[1][1]-y; const o = [[x,y]];
  for (let i = 1, n = m-1+lag+Math.round(.35/w); i <= n; i++){ const q = t[Math.min(m-1,i+lag-1)]; vx += k*(q[0]-x)-c*vx; vy += k*(q[1]-y)-c*vy; x += vx; y += vy; o.push([x,y]); }
  return o;
}
const ease = (x,l) => { const t = Math.max(0,Math.min(1,x/l)); return t*t*(3-2*t); };
function line(pts, {w = 1.5, col = INK, amp = .7, over = 2.2} = {}){
  // the stroke is a filled outline so its width can change with pressure along the way
  if (over){ const a = pts[0], b = pts[1], y = pts.at(-1), z = pts.at(-2), la = Math.hypot(a[0]-b[0],a[1]-b[1])||1, lz = Math.hypot(y[0]-z[0],y[1]-z[1])||1, oa = over*rnd(), oz = over*rnd(); pts = [[a[0]+(a[0]-b[0])/la*oa, a[1]+(a[1]-b[1])/la*oa], ...pts.slice(1,-1), [y[0]+(y[0]-z[0])/lz*oz, y[1]+(y[1]-z[1])/lz*oz]]; }
  const t = chase(resample(pts,2.5),2.2,2.5), c = [0]; for (let i = 1; i < t.length; i++) c.push(c[i-1]+Math.hypot(t[i][0]-t[i-1][0],t[i][1]-t[i-1][1]));
  const len = c.at(-1)||.1, trem = amp/.7+.25, bow = sway(Math.max(45,len*.9),Math.max(150,len*3.5),2), mid = sway(19,108,3), fine = sway(4,20,3), press = sway(38,300,3), rad = sway(12,92,3);
  const bowA = Math.min(1.6,len*.0042)*trem, midA = .34*trem, hiA = .1*trem, swell = rnd() < .3 ? .38 : .2, step = Math.max(1.4,Math.min(6,len/7)), L = [], R = [];
  for (let s = 0, j = 0;; s = Math.min(len,s+step)){
    while (j < t.length-2 && c[j+1] < s) j++;
    const u = Math.min(1,(s-c[j])/((c[j+1]-c[j])||1e-6)), a = t[Math.max(0,j-1)], b = t[Math.min(t.length-1,j+2)]; let dx = b[0]-a[0], dy = b[1]-a[1]; const l = Math.hypot(dx,dy)||1; dx /= l; dy /= l;
    const off = bowA*bow(s)+midA*mid(s)+hiA*fine(s), x = t[j][0]+(t[j+1][0]-t[j][0])*u-dy*off, y = t[j][1]+(t[j+1][1]-t[j][1])*u+dx*off;
    const h = w/2*(1+.12*press(s)+.09*rad(s))*(.5+.5*Math.min(ease(s,3.6),ease(len-s,4.6)))*(1+swell*Math.exp(-s/3.5));
    L.push([x-dy*h,y+dx*h]); R.unshift([x+dy*h,y-dx*h]); if (s >= len) break; }
  out.push(`<path fill="${col}" d="M${[...L,...R].map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/>`);
}
/* Coloured pencil: flat colour under a tile of paper tooth baked by tooth.py. One pattern per colour, so grain moves with its part. */
const TOOTH = '@@TOOTH@@', TILE = 346;
let pencils = new Map();
const pencil = col => { if (col.length !== 7 || col[0] !== '#') return col; const v = parseInt(col.slice(1),16), lum = .3*(v>>16)+.59*(v>>8&255)+.11*(v&255); if (lum > 236) return col; if (!pencils.has(col)) pencils.set(col,pencils.size); return `url(#pc${pencils.get(col)})`; };
const pencilDefs = () => `<defs><image id="tooth" width="${TILE}" height="${TILE}" href="${TOOTH}"/>${[...pencils].map(([c,i]) => `<pattern id="pc${i}" patternUnits="userSpaceOnUse" width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" fill="${c}"/><use href="#tooth"/></pattern>`).join('')}</defs>`;
function fill(pts, col, {dx = 1.3, dy = .9, amp = 1} = {}){
  const r = hand([...pts, pts[0]], amp), area = Math.abs(pts.reduce((v,p,i) => { const q = pts[(i+1)%pts.length]; return v+p[0]*q[1]-q[0]*p[1]; },0))/2;
  out.push(`<path fill="${area > 150 ? pencil(col) : col}" d="M${r.map(p => n1(p[0]+dx)+' '+n1(p[1]+dy)).join('L')}Z"/>`);
}
function hatch(poly, {dir = [0,1], gap = 5.5, w = .7, col = INK, keep = .86, from = 0, to = 1} = {}){
  // engraver's shade: short parallel strokes, some missing, none quite reaching the edge
  const d = Math.hypot(...dir), u = [dir[0]/d, dir[1]/d], v = [-u[1], u[0]], pr = poly.map(p => p[0]*v[0]+p[1]*v[1]), lo = Math.min(...pr), hi = Math.max(...pr);
  for (let s = lo + (hi-lo)*from + gap*.5; s < lo + (hi-lo)*to; s += gap*(.82+.36*rnd())){
    if (rnd() > keep) continue;
    const hits = [];
    poly.forEach((a,i) => { const b = poly[(i+1)%poly.length], sa = a[0]*v[0]+a[1]*v[1]-s, sb = b[0]*v[0]+b[1]*v[1]-s; if (sa*sb < 0){ const t = sa/(sa-sb); hits.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]); } });
    if (hits.length < 2) continue;
    const [p,q] = hits, m = .06+.2*rnd(), e = .1+.16*rnd();
    line([[lerp(p[0],q[0],m),lerp(p[1],q[1],m)],[lerp(p[0],q[0],1-e),lerp(p[1],q[1],1-e)]], {w, col, amp:.25, over:0});
  }
}
const lerp = (a,b,t) => a + (b-a)*t;
const inkLoop = (pts, o) => line([...pts, pts[0], pts[1]], o);

/* text sits on the same three planes as everything else */
function text(str, m, {size = 20, cls = 'tt', col = INK, anchor = 'start', track = 1} = {}){
  out.push(`<text transform="matrix(${m.map(n1 === 0 ? String : v => +v.toFixed(3)).join(' ')})" class="${cls}" font-size="${size}" fill="${col}" text-anchor="${anchor}" letter-spacing="${track}">${str}</text>`);
}
const floorText = (x,y,z,s,o) => { const [a,b] = P(x,y,z); text(s,[C,S,-C,S,a,b],o); };
const leftText  = (x,y,z,s,o) => { const [a,b] = P(x,y,z); text(s,[C,S,0,1,a,b],o); };
const rightText = (x,y,z,s,o) => { const [a,b] = P(x,y,z); text(s,[C,-S,0,1,a,b],o); };

/* solids */
function box(x,y,z,w,d,h,{top,left = PAL.shade,shade = true,ink = 2} = {}){
  const a = P(x,y,z+h), b = P(x+w,y,z+h), c = P(x+w,y+d,z+h), e = P(x,y+d,z+h), f = P(x,y+d,z), g = P(x+w,y+d,z), k = P(x+w,y,z);
  const lit = left, low = [f,g,c,e];
  fill(low,dim(lit),{dx:.4,dy:.3,amp:.3}); fill([g,k,b,c],lit,{dx:.4,dy:.3,amp:.3}); fill([a,b,c,e],top || glow(lit),{dx:.4,dy:.3,amp:.3});
  if (shade) hatch(low,{dir:[0,1],gap:6,w:.45,keep:.32,from:.05,to:.95});
  line([e,c,b],{w:ink*.5,amp:.3}); line([c,g],{w:ink*.5,amp:.3});
  inkLoop([e,f,g,k,b,a],{w:ink,amp:.4,over:0});
}
/* the flat blue shadow of the Colorfigures sheets; collected, then laid before anything stands on it */
let shades = [];
const SH = [-.22,.44];
function cast(x,y,w,d,h,z = 0){ const base = [[x,y],[x+w,y],[x+w,y+d],[x,y+d]], up = base.map(([a,b]) => [a+SH[0]*h,b+SH[1]*h]); shades.push(hull([...base,...up].map(([a,b]) => P(a,b,z)))); }
function castDisc(x,y,r,h,z = 0){ const ring = Array.from({length:18},(_,i) => { const t = i/18*2*Math.PI; return [r*Math.cos(t),r*Math.sin(t)]; }), pts = []; for (const [a,b] of ring){ pts.push(P(x+a,y+b,z)); pts.push(P(x+a+SH[0]*h,y+b+SH[1]*h,z)); } shades.push(hull(pts)); }
function layShades(){ for (const p of shades) out.push(`<path fill="${pencil(SHADOW)}" d="M${p.map(q => n1(q[0])+' '+n1(q[1])).join('L')}Z"/>`); shades = []; }
function board(x,y,w,d,h,top,side,r = 30,z = 0){
  const rr = Array.from({length:40},(_,i) => { const q = Math.floor(i/10), t = (i%10)/9*Math.PI/2+q*Math.PI/2, cx = [x+w-r,x+r,x+r,x+w-r][q], cy = [y+d-r,y+d-r,y+r,y+r][q]; return [cx+r*Math.cos(t),cy+r*Math.sin(t)]; });
  const a = rr.map(p => P(p[0],p[1],z)), b = rr.map(p => P(p[0],p[1],z-h));
  const H = hull([...a,...b]); fill(H,side,{amp:.2,dx:.2,dy:.2}); inkLoop(H,{w:2.2,amp:.3,over:0});
  fill(a,top,{amp:.2,dx:.2,dy:.2}); inkLoop(a,{w:1.3,amp:.3,over:0});
  return a;
}
const ringAt = (fn,n=30) => Array.from({length:n}, (_,i) => { const t = i/n*2*Math.PI; return fn(Math.cos(t),Math.sin(t)); });
function cyl(x,y,z,r,h,col,{ink = 1.4, cap = null} = {}){
  const arc = (zz,a,b,n=16) => Array.from({length:n+1}, (_,i) => { const t = (a+(b-a)*i/n)*Math.PI/180; return P(x+r*Math.cos(t),y+r*Math.sin(t),zz); });
  const bottom = arc(z,-45,135), top = arc(z+h,135,-45);
  fill([...bottom,...top], col); { const band = (a,b,c) => { const lo = arc(z,a,b,6), hi = arc(z+h,b,a,6); fill([...lo,...hi],c,{dx:.1,dy:.1,amp:.15}); }; band(80,135,dim(col)); band(-45,-12,glow(col)); }
  fill(ringAt((c,s) => P(x+r*c,y+r*s,z+h)), cap || col, {dx:.5,dy:.4,amp:.4});
  line(arc(z,-45,135), {w:ink}); line([bottom[0],top[16]], {w:ink}); line([bottom[16],top[0]], {w:ink});
  inkLoop(ringAt((c,s) => P(x+r*c,y+r*s,z+h)), {w:ink*.8,amp:.4,over:0});
}
const dot = (x,y,r,col,ink=1.2) => { const c = ringAt((a,b) => [x+r*a,y+r*b],22); fill(c,col,{dx:.5,dy:.4,amp:.3}); inkLoop(c,{w:ink,amp:.35,over:0}); };

/* a state is a torn ticket lying flat on the floor */
const W = 176, D = 84, T = 7, M = D/2;
function ticket(x,y,label,{no,pin,enter = 'x',exit = null}){
  const n = 56, phase = rnd()*6, near = Array.from({length:n+1}, (_,i) => { const u = i/n; return [x + W*u, y + D + 2.5*Math.sin(u*W*.42 + phase) + 1.1*Math.sin(u*W*.17 + phase*2)]; });
  const band = near.map(p => P(p[0],p[1],0)), edge = near.map(p => P(p[0],p[1],T));
  const a = P(x,y,T), b = P(x+W,y,T), c = P(x+W,y+D,T), k = P(x+W,y,0), g = P(x+W,y+D,0);
  fill([edge[0],...edge,...[...band].reverse()], PAL.shade,{amp:.3,dx:.3,dy:.3}); fill([b,k,g,c], PAL.shade,{amp:.3,dx:.3,dy:.3});
  fill([a,b,...[...edge].reverse()], PAL.cream,{dx:.8,dy:.5,amp:.5});
  hatch([b,k,g,c], {dir:[C,-S], gap:4.2, w:.6});
  for (let i = 1; i < n; i += 2) if (rnd() < .72) line([edge[i], band[i]], {w:.55, amp:0, over:0});
  line([edge[0],a,b,c], {w:1.4,over:1.5}); line(edge, {w:1.25,amp:.1,over:0}); line(band, {w:1,amp:.1,over:0}); line([b,k,g], {w:1.1}); line([edge[0],band[0]], {w:1});
  line([P(x+7,y+21,T),P(x+W-7,y+21,T)], {w:.8,col:RED,amp:.35});
  floorText(x+W-13, y+16, T, 'No. '+no, {size:10,col:RED,track:.4,anchor:'end'});
  floorText(x+W/2+2, y+60, T, label, {size:27,anchor:'middle',track:.6});
  const [px,py] = enter === 'x' ? P(x,y+D/2,T) : P(x+W/2,y,T); dot(px,py,9.5,PAL[pin]); line([[px-3.5,py-3.5],[px-1,py-5.2]], {w:1.2,col:'#fff9',amp:0,over:0});
}
function arrow(pts, o = {}){
  line(pts.map(p => P(p[0],p[1],0)), {w:1.7,col:RED,amp:.55,over:0, ...o});
  const [a,b] = pts.slice(-2), l = Math.hypot(b[0]-a[0],b[1]-a[1]), u = [(b[0]-a[0])/l,(b[1]-a[1])/l], v = [-u[1],u[0]];
  fill([P(b[0],b[1]),P(b[0]-u[0]*15+v[0]*6.5,b[1]-u[1]*15+v[1]*6.5),P(b[0]-u[0]*15-v[0]*6.5,b[1]-u[1]*15-v[1]*6.5)], RED, {dx:0,dy:0,amp:.2});
}
const say = (x,y,s) => floorText(x,y,0,s,{size:19.5,cls:'it',track:.5});


const GRASS = '#b6dd8e', SOIL = '#b98655', WATER = '#8cc9ea', SKIN = '#f8dfc9', HAIR = '#4a382b', ROOF = '#ef6a4c', WALL = '#fffdf6';
const blob = (cx,cy,rx,ry,bump = 0,k = 7) => ringAt((a,b) => { const t = Math.atan2(b,a), r = 1 + bump*Math.sin(t*k); return [cx+rx*a*r, cy+ry*b*r]; },34);
const shape = (pts,col,o = {}) => { fill(pts,col,{dx:.4,dy:.3,amp:.4}); inkLoop(pts,{w:1.6,amp:.35,over:0,...o}); };

/* people and animals are small flat figures, as in a storybook: they stand on the iso floor but face us */
const HI = ['hi!','oh, hello','nice day','morning!','hm?','one sec','hey','lovely'];
let hiN = 0;
function person(bx,by,o){ out.push(`<g class="who hit" data-say="${o.say || HI[hiN++%HI.length]}">`); figure(bx,by,o); out.push('</g>'); }
/* The doll is based on Kevin T. Ngo's statechart-art (MIT): same head, limbs, shoes, blush and dot eyes. */
const spline = (c,closed = true,step = 1.4) => { const n = c.length, o = [], Q = i => closed ? c[(i+n)%n] : c[Math.max(0,Math.min(n-1,i))]; for (let i = 0; i < (closed ? n : n-1); i++){ const a = Q(i-1), b = Q(i), d = Q(i+1), e = Q(i+2), m = Math.max(1,Math.ceil(Math.hypot(d[0]-b[0],d[1]-b[1])/step)); for (let k = 0; k < m; k++){ const t = k/m, t2 = t*t, t3 = t2*t; o.push([0,1].map(j => .5*(2*b[j]+(d[j]-a[j])*t+(2*a[j]-5*b[j]+4*d[j]-e[j])*t2+(3*b[j]-a[j]-3*d[j]+e[j])*t3))); } } if (!closed) o.push(c[n-1].slice()); return o; };
const oval = (cx,cy,rx,ry = rx) => Array.from({length:16},(_,i) => { const t = i/16*2*Math.PI; return [cx+Math.cos(t)*rx,cy+Math.sin(t)*ry]; });
const capsule = (a,b,ra,rb = ra) => { const g = Math.atan2(b[1]-a[1],b[0]-a[0]), o = []; for (let i = 0; i <= 6; i++){ const t = g+Math.PI/2+i/6*Math.PI; o.push([a[0]+Math.cos(t)*ra,a[1]+Math.sin(t)*ra]); } for (let i = 0; i <= 6; i++){ const t = g-Math.PI/2+i/6*Math.PI; o.push([b[0]+Math.cos(t)*rb,b[1]+Math.sin(t)*rb]); } return o; };
function limbOf(pts,r){ const A = [], B = []; pts.forEach((p,i) => { const a = pts[Math.max(0,i-1)], b = pts[Math.min(pts.length-1,i+1)], d = Math.hypot(b[0]-a[0],b[1]-a[1])||1, n = [-(b[1]-a[1])/d*r,(b[0]-a[0])/d*r]; A.push([p[0]+n[0],p[1]+n[1]]); B.push([p[0]-n[0],p[1]-n[1]]); }); const cap = (c,f,t) => Array.from({length:3},(_,k) => { const q = f+(t-f)*(k+1)/4; return [c[0]+Math.cos(q)*r,c[1]+Math.sin(q)*r]; }), n = pts.length-1, a0 = Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0]), a1 = Math.atan2(pts[n][1]-pts[n-1][1],pts[n][0]-pts[n-1][0]); return [...A,...cap(pts[n],a1+Math.PI/2,a1-Math.PI/2),...B.reverse(),...cap(pts[0],a0-Math.PI/2,a0-Math.PI*1.5)]; }
const STAND = {l:[[-6.6,-17.4],[-6.8,-11.6]],r:[[6.6,-17.4],[6.8,-11.6]]};
const ARMS = {down:STAND, wave:{l:STAND.l,r:[[9.2,-26.4],[10.6,-32.6]]}, up:{l:[[-9.4,-25.4],[-9.8,-31.6]],r:STAND.r}, out:{l:[[-9.6,-20.6],[-14.2,-17.6]],r:[[9.6,-20.6],[14.2,-17.6]]}, front:{l:[[-6.4,-17.8],[-2.4,-16.4]],r:[[6.4,-17.8],[2.4,-16.4]]}, lap:{l:[[-6.8,-16.8],[-3.2,-12.6]],r:[[6.8,-16.8],[3.2,-12.6]]}, hold:{l:[[-8.4,-19.4],[-10.6,-22]],r:STAND.r}};
function figure(bx,by,{shirt = PAL.sky,pants = '#2f2925',hair = 'short',hairCol = '#2e2622',apron = null,arm = 'down',look = 0,kid = false,hold = null,cap = null,size = 1,sit = 0}){
  // sit = seat height: (bx,by) is then the spot on the seat, hips rest on it, thighs come toward us and shins drop to the floor
  const K = 2.72*(kid ? .72 : 1)*size, lift = sit ? 10.4 : 0, ground = sit ? 4.4*K+sit : 0;
  { const c = blob(bx-9*(sit ? .3 : 1),by+2+ground,18*size*(kid?.7:1),6.5*size*(kid?.7:1)); out.push(`<path fill="${SHADOW}" d="M${c.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/>`); }
  const k = K, HY = -30.6, hr = 6.4, SY = -23.2, HIP = -11.6, paper = '#fffdf6', V = pts => pts.map(([x,y]) => [bx+x*k,by+(y+lift)*k]), pose = ARMS[arm] || STAND, inkW = {w:1.2,amp:.2,over:0};
  const part = (pts,col,o = {}) => { const p = V(pts); fill(p,col,{amp:.12,dx:.25,dy:.2}); inkLoop(p,{...inkW,...o}); };
  if (sit) for (const side of [-1,1]){ const x = side*3.2, foot = HIP+4.4+sit/k; part(limbOf([[x,HIP+3.4],[x,foot-1.6]],1.75),pants); part(limbOf(spline([[side*2.4,HIP],[side*3,HIP+1.8],[x,HIP+3.6]],false,2),2.05),pants); part(oval(x+side*.5,foot-.9,2.5,1.35),paper); }
  else for (const [side,fx] of [[-1,-2.7],[1,2.7]]){ const h = [side*2.4,HIP], knee = [(h[0]+fx)/2,(HIP-.9)/2]; part(limbOf(spline([h,knee,[fx,-2.5]],false,3),1.85),pants); part(oval(fx+side*.7,-1.1,2.5,1.35),paper); }
  const limb = (side,key) => { const sh = [side*4.9,SY+.6], [el,hd] = pose[key]; part(limbOf(spline([sh,el,hd],false,2.6),1.35),paper); part(capsule(sh,[sh[0]+(el[0]-sh[0])*.62,sh[1]+(el[1]-sh[1])*.62],2.15,2),shirt,{w:1.05}); };
  limb(-1,'l'); limb(1,'r');
  part(spline([[-5.7,SY-.8],[-6.2,-18.4],[-5.6,HIP-.8],[-4.6,HIP+1.2],[4.6,HIP+1.2],[5.6,HIP-.8],[6.2,-18.4],[5.7,SY-.8],[2.4,SY-2.1],[0,SY-1.7],[-2.4,SY-2.1]],true,2.4),shirt);
  if (apron){ part(spline([[-4.2,SY+1.4],[4.2,SY+1.4],[4.6,HIP-2],[5.6,HIP+4.6],[0,HIP+5.4],[-5.6,HIP+4.6],[-4.6,HIP-2]],true,2.4),apron,{w:1}); line(V([[-4.2,SY+1.4],[-3,SY-1.6]]),{w:.9,amp:.1,over:0}); line(V([[4.2,SY+1.4],[3,SY-1.6]]),{w:.9,amp:.1,over:0}); }
  part(capsule([0,SY-1.4],[0,HY+hr-1],1.6),paper,{w:1});
  const H = pts => pts.map(([x,y]) => [x,y+HY]), r = hr*k, cx = bx, hy = by+(HY+lift)*k;
  if (hair === 'long' || hair === 'bob'){ const d = hair === 'long' ? 9.6 : 4.2; part(H(spline([[-hr-.9,d],[-hr-1.2,-1],[-hr*.7,-hr-.6],[0,-hr-1.3],[hr*.7,-hr-.6],[hr+1.2,-1],[hr+.9,d],[hr-1.6,d+.6],[-hr+1.6,d+.6]],true,2.2)),hairCol,{w:1}); }
  part(H(oval(0,0,hr,hr*.97)),paper,{w:1.3});
  if (hair === 'short' || hair === 'bun' || hair === 'bob' || hair === 'long' || hair === 'wavy'){ const top = Array.from({length:13},(_,i) => { const t = Math.PI+.2+i/12*(Math.PI-.4); return [Math.cos(t)*(hr+.75),Math.sin(t)*(hr+.75)]; }), fr = hair === 'wavy' ? [[hr+.2,-.6],[hr-2.6,-1.6],[3.2,-3.4],[.4,-3.8],[-2.6,-3.6],[-hr+1.6,-2.6],[-hr-.2,-.4]] : [[hr+.2,-.4],[hr-1.6,-2.9],[2,-3.9],[-1.6,-3.6],[-hr+1.4,-2.6],[-hr-.2,-.2]]; part(H([...top,...spline(fr,false,2)]),hairCol,{w:1}); if (hair === 'bun') part(H(oval(.4,-hr-2.4,2.9,2.6)),hairCol,{w:1}); }
  if (hair === 'hat'){ const b = blob(cx,hy-r*.42,r*1.42,r*.3), t = blob(cx,hy-r*.74,r*.8,r*.5); fill(b,cap||PAL.gold,{amp:.2}); inkLoop(b,{w:1.1,amp:.2,over:0}); fill(t,cap||PAL.gold,{amp:.2}); inkLoop(t,{w:1.1,amp:.2,over:0}); line([[cx-r*.72,hy-r*.5],[cx+r*.72,hy-r*.5]],{w:2.2,col:RED,amp:.1,over:0}); }
  if (hair === 'cap'){ const c = []; for (let i = 0; i <= 12; i++){ const t = Math.PI*(1+i/12); c.push([cx+r*1.04*Math.cos(t),hy-.4*k+r*1.04*Math.sin(t)]); } fill(c,cap||PAL.rose,{amp:.2}); inkLoop(c,{w:1.1,amp:.2,over:0}); line([[cx+r*.5,hy-1*k],[cx+r*1.55,hy-.4*k]],{w:3.4,col:INK,amp:.1,over:0}); }
  for (const sd of [-1,1]){ out.push(`<ellipse cx="${n1(cx+(sd*3.6+look*.5)*k)}" cy="${n1(hy+2.1*k)}" rx="${n1(1.25*k)}" ry="${n1(.8*k)}" fill="#f2a3b3" opacity=".85"/><ellipse cx="${n1(cx+(sd*2.1+look*.5)*k)}" cy="${n1(hy+.4*k)}" rx="${n1(.62*k)}" ry="${n1(.66*k)}" fill="${INK}"/>`); }
  if (hold) hold(cx,by+(SY-1+lift)*k);
  for (const key of ['l','r']){ const c = pose[key][1]; part(oval(c[0],c[1],1.55,1.5),paper,{w:1}); }
}
const who = (x,y,o,z = 0) => put(x,y,() => person(...P(x,y,z),o));
const onAxis = (x,y,z,rx,ry) => Array.from({length:20},(_,i) => { const t = i/20*2*Math.PI; return P(x+rx*Math.cos(t),y+ry*Math.sin(t),z); });
function hen(x,y,col = '#fffdf6',look = 1){
  const s = look, [a,b] = P(x,y); for (const k of [-3,3]) line([P(x+k,y+2),P(x+k,y+2,9)],{w:1.3,col:'#d48a1e',amp:0,over:0});
  shape([P(x-11*s,y,16),P(x-20*s,y,28),P(x-6*s,y,24)],dim(col),{w:1.2});
  shape(onAxis(x,y,15,15,9),col,{w:1.5}); line([P(x-6,y+6,18),P(x+3*s,y+9,14),P(x+7,y+7,18)],{w:.9,amp:.1,over:0});
  out.push('<g class="peck">'); const h = P(x+12*s,y,28); dot(h[0],h[1]-8,3,RED,.8); dot(h[0],h[1],6.5,col,1.3); dot(h[0]+2*s,h[1]-1,1.1,INK,.3); shape([[h[0]+5*s,h[1]+1],[h[0]+11*s,h[1]+4],[h[0]+5*s,h[1]+5]],PAL.gold,{w:.9}); out.push('</g>');
}
function duck(x,y,look = 1){
  const s = look; shape(onAxis(x,y,4,17,10),'#fffdf6',{w:1.5}); shape([P(x-13*s,y,8),P(x-24*s,y,16),P(x-9*s,y,12)],'#e3e0d2',{w:1.1});
  const h = P(x+13*s,y,16); dot(h[0],h[1]-3,7,'#fffdf6',1.3); dot(h[0]+2*s,h[1]-4,1.1,INK,.3); shape([[h[0]+6*s,h[1]-3],[h[0]+14*s,h[1]+1],[h[0]+6*s,h[1]+2]],PAL.gold,{w:.9});
  inkLoop(onAxis(x,y,0,26,15),{w:.8,col:'#3f83ad',amp:.3,over:0});
}
function cow(x,y){
  const W = '#fffdf6', sp = (cx,cz,r) => { const c = Array.from({length:14},(_,i) => { const t = i/14*2*Math.PI, m = 1+.2*Math.sin(t*3+cx); return P(cx+r*m*Math.cos(t),y+30,cz+r*.8*m*Math.sin(t)); }); fill(c,'#3d3935',{amp:.2,dx:0,dy:0}); };
  for (const [a,b] of [[2,20],[50,20],[2,2],[50,2]]) box(x+a,y+b,0,9,9,20,{left:W,shade:false,ink:1.4});
  box(x-6,y-3,20,70,33,28,{left:W,top:W,shade:false,ink:1.9}); sp(x+14,34,10); sp(x+44,36,8);
  { const c = Array.from({length:12},(_,i) => { const t = i/12*2*Math.PI; return P(x+30+13*Math.cos(t),y+12+9*Math.sin(t),48); }); fill(c,'#3d3935',{amp:.2,dx:0,dy:0}); }
  const u = blob(...P(x+34,y+15,16),9,5); fill(u,PAL.pink,{amp:.1}); inkLoop(u,{w:1,amp:.1,over:0});
  out.push('<g class="tail">'); line([P(x-6,y+14,44),P(x-12,y+16,24),P(x-11,y+15,12)],{w:2.2,amp:.2,over:0}); out.push('</g>');
  out.push('<g class="nod">');
  box(x+60,y+2,34,26,24,24,{left:W,top:W,shade:false,ink:1.8}); box(x+84,y+5,32,10,18,14,{left:PAL.pink,shade:false,ink:1.4});
  for (const b of [8,18]) dot(...P(x+86,y+b,52),1.9,INK,.5);
  const h = P(x+74,y+6,58), g = P(x+74,y+22,58); line([h,[h[0]+7,h[1]-10]],{w:2.6,col:'#e3e0d2',amp:0,over:0}); line([g,[g[0]-7,g[1]-10]],{w:2.6,col:'#e3e0d2',amp:0,over:0});
  out.push('</g>');
}
function sheep(x,y){
  for (const [a,b] of [[0,12],[30,12],[0,0],[30,0]]) box(x+a,y+b,0,5,5,12,{left:'#3d3935',shade:false,ink:1.1});
  const p = [[0,0,23],[14,2,27],[28,0,23],[8,12,21],[24,12,21]], W = '#fffdf6';
  for (const [a,b,z] of p) { const c = blob(...P(x+a+2,y+b+2,z),17,14,.09,8); fill(c,W,{amp:.3,dx:.2,dy:.2}); inkLoop(c,{w:1.6,amp:.3,over:0}); }
  out.push('<g class="nod">'); box(x+36,y+4,20,17,12,13,{left:'#3d3935',shade:false,ink:1.2}); for (const b of [7,13]) dot(...P(x+53,y+b,28),1.1,'#fffdf6',.2); out.push('</g>');
}
function dog(x,y){
  for (const [a,b] of [[2,12],[30,12],[2,0],[30,0]]) box(x+a,y+b,0,5,5,10,{left:PAL.tan,shade:false,ink:1.1});
  box(x-2,y-1,10,42,18,15,{left:PAL.tan,shade:false,ink:1.7});
  out.push('<g class="wag">'); line([P(x-2,y+8,24),P(x-13,y+8,34)],{w:3,amp:.1,over:0}); out.push('</g>');
  box(x+32,y,22,15,16,15,{left:PAL.tan,shade:false,ink:1.6}); box(x+45,y+4,23,8,8,7,{left:'#fbe7c4',shade:false,ink:1.1});
  dot(...P(x+53,y+8,28),1.5,INK,.4); for (const b of [4,12]) dot(...P(x+47,y+b,33),1,INK,.3);
  box(x+36,y+15,26,7,2,10,{left:'#a0683a',shade:false,ink:1}); 
}
function cat(x,y,z = 0){ const [a,b] = P(x,y,z); out.push('<g class="wag">'); line([[a+8,b-3],[a+18,b-5],[a+18,b-14]],{w:2.8,col:'#8f8a86',amp:.2,over:0}); out.push('</g>'); shape(blob(a,b-9,9,11),'#8f8a86'); dot(a,b-23,7.5,'#8f8a86',1); shape([[a-7,b-27],[a-7,b-35],[a-1.5,b-29.5]],'#8f8a86',{w:.8}); shape([[a+7,b-27],[a+7,b-35],[a+1.5,b-29.5]],'#8f8a86',{w:.8}); for (const s of [-3,3]) dot(a+s,b-23,.9,INK,.4); line([[a+8,b-3],[a+18,b-5],[a+18,b-14]],{w:2.8,col:'#8f8a86',amp:.2,over:0}); }

function gable(x,y,w,d,h,rise,{wall = WALL,roof = ROOF,side,before = null} = {}){
  box(x,y,0,w,d,h,{left:wall,top:wall,shade:false});
  const o = 11, ridge = y+d/2, H = h+rise, lo = h-o*rise/(d/2);
  const t = [P(x+w,y,h),P(x+w,y+d,h),P(x+w,ridge,H)]; fill(t,wall,{amp:.3}); inkLoop(t,{w:1.6,amp:.3,over:0});
  if (before) before();
  const rA = P(x-o,ridge,H), rB = P(x+w+o,ridge,H), fA = P(x-o,y+d+o,lo), fB = P(x+w+o,y+d+o,lo), bB = P(x+w+o,y-o,lo);
  const end = [rB,bB,P(x+w+o,y-o,lo-5),P(x+w+o,ridge,H-6),P(x+w+o,y+d+o,lo-5),fB]; fill(end,dim(roof),{amp:.2}); inkLoop(end,{w:1.6,amp:.3,over:0});
  const lip = [fA,fB,P(x+w+o,y+d+o,lo-5),P(x-o,y+d+o,lo-5)]; fill(lip,dim(roof),{amp:.2}); inkLoop(lip,{w:1.3,amp:.2,over:0});
  const face = [rA,rB,fB,fA]; fill(face,roof,{amp:.3}); 
  for (let i = 1; i < 8; i++){ const k = i/8, l = [lerp(rA[0],fA[0],k),lerp(rA[1],fA[1],k)], r = [lerp(rB[0],fB[0],k),lerp(rB[1],fB[1],k)]; line([l,r],{w:.8,amp:.3,over:0}); for (let j = 1+(i%2)*.5; j < 17; j += 2){ const u = j/17, q = [lerp(l[0],r[0],u),lerp(l[1],r[1],u)]; line([q,[q[0]-(rA[0]-fA[0])/8,q[1]-(rA[1]-fA[1])/8]],{w:.6,amp:0,over:0}); } }
  fill([rA,rB,[lerp(rB[0],fB[0],.05),lerp(rB[1],fB[1],.05)],[lerp(rA[0],fA[0],.05),lerp(rA[1],fA[1],.05)]],glow(roof),{amp:.1,dx:0,dy:0});
  inkLoop(face,{w:2,amp:.3,over:0});
}
const panelL = (x,y,z,w,h,col) => { const p = [P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)]; fill(p,col,{amp:.3,dx:.4,dy:.4}); inkLoop(p,{w:1.05,amp:.3,over:1}); return p; };
const panelR = (x,y,z,w,h,col) => { const p = [P(x,y,z),P(x,y-w,z),P(x,y-w,z+h),P(x,y,z+h)]; fill(p,col,{amp:.3,dx:.4,dy:.4}); inkLoop(p,{w:1.05,amp:.3,over:1}); return p; };
function windowL(x,y,z,w,h){ panelL(x,y,z,w,h,'#cfe1ea'); line([P(x+w/2,y,z),P(x+w/2,y,z+h)],{w:.8,amp:.1,over:0}); line([P(x,y,z+h/2),P(x+w,y,z+h/2)],{w:.8,amp:.1,over:0}); panelL(x-4,y,z-5,w+8,5,PAL.wood); }

function farmhouse(x,y){
  const w = 186, d = 118, cx = x+132, cy = y+66;
  gable(x,y,w,d,86,64,{before:() => { box(cx,cy,110,26,26,110,{top:'#55504a',left:PAL.rose,shade:false}); for (let i = 1; i < 8; i++) line([P(cx+26,cy,110+i*13),P(cx+26,cy+26,110+i*13)],{w:.7,amp:.2,over:0}); box(cx-3,cy-3,220,32,32,7,{top:'#6d675f',left:'#e3e0d2',shade:false,ink:1.5}); }});
  const fy = y+d; panelL(x+78,fy,0,32,60,PAL.sage); panelL(x+84,fy,28,20,24,'#cfe1ea'); dot(...P(x+103,fy,22),2.4,PAL.gold,.8); box(x+70,fy,0,48,16,4,{top:'#e3e0d2',left:'#c6ccce',shade:false,ink:1.2});
  windowL(x+24,fy,32,34,32); windowL(x+130,fy,32,34,32);
  for (const [px,col] of [[x+24,PAL.rose],[x+130,PAL.pink]]) for (let i = 0; i < 5; i++) dot(...P(px+4+i*6.5,fy,31+rnd()*4),2.8,i%2?col:PAL.sage,.7);
  panelR(x+w,y+78,28,38,34,'#cfe1ea'); line([P(x+w,y+59,28),P(x+w,y+59,62)],{w:.9,amp:.1,over:0}); line([P(x+w,y+40,45),P(x+w,y+78,45)],{w:.9,amp:.1,over:0});
  const s = P(cx+13,cy+13,228); for (let i = 0; i < 6; i++){ out.push(`<g class="puff" data-i="${i}" data-x="${n1(s[0])}" data-y="${n1(s[1])}">`); const c = blob(s[0],s[1],10,8,.08,6); fill(c,'#fffdf6',{amp:.3}); inkLoop(c,{w:1.1,amp:.4,over:0}); out.push('</g>'); }
}
function barn(x,y){
  const w = 168, d = 128;
  gable(x,y,w,d,92,58,{wall:'#e8604a',roof:'#6f88a8'});
  const fy = y+d; panelL(x+48,fy,0,72,70,'#fffdf6'); line([P(x+84,fy,0),P(x+84,fy,70)],{w:1,amp:.2,over:0}); for (const a of [48,84]){ line([P(x+a,fy,0),P(x+a+36,fy,70)],{w:.9,amp:.2,over:0}); line([P(x+a+36,fy,0),P(x+a,fy,70)],{w:.9,amp:.2,over:0}); }
  windowL(x+70,fy,76,28,13);
  for (let i = 0; i < 12; i++){ const q = P(x+w-16+i*1.2,y+100-i*3,92+rnd()*1); }
}
function coop(x,y){
  gable(x,y,70,58,40,26,{wall:PAL.tan,roof:'#6fb58f'});
  panelL(x+24,y+58,0,22,24,'#4c3f38');
}
function tree(x,y,r = 52,apples = true,z = 0){
  const [a,b] = P(x,y,z); box(x-5,y-5,z,10,10,50,{left:'#a0683a',shade:false,ink:1.6});
  out.push('<g class="crown">');
  const G = '#6fc07d', c = blob(a,b-80,r,r*.92,.07,9); fill(c,G,{dx:.3,dy:.3,amp:.4});
  const hi = blob(a+r*.22,b-92,r*.6,r*.5,.08,7); fill(hi,glow(G),{dx:0,dy:0,amp:.3}); const lo = blob(a-r*.42,b-58,r*.5,r*.4,.08,7); fill(lo,dim(G),{dx:0,dy:0,amp:.3});
  inkLoop(c,{w:2,amp:.5,over:0});
  for (let i = 0; i < 5; i++){ const t = rnd()*6, q = [a+Math.cos(t)*r*.55,b-80+Math.sin(t)*r*.5]; line([[q[0]-6,q[1]+3],[q[0],q[1]-3],[q[0]+6,q[1]+2]],{w:.9,amp:.3,over:0}); }
  if (apples) for (let i = 0; i < 8; i++){ const t = rnd()*6.3, m = .25+.6*rnd(); dot(a+Math.cos(t)*r*m,b-80+Math.sin(t)*r*m,4.2,PAL.rose,1); }
  out.push('</g>');
}
function garden(x,y,w,d){
  const p = [P(x,y),P(x+w,y),P(x+w,y+d),P(x,y+d)]; fill(p,SOIL); inkLoop(p,{w:1.3,amp:.8,over:2});
  for (let r = 0; r < 6; r++){ const yy = y+18+r*(d-30)/5; line([P(x+8,yy+9),P(x+w-8,yy+9)],{w:.7,amp:.6,over:0});
    for (let i = 0; i < 8; i++){ const q = P(x+16+i*(w-30)/7,yy); if (r%2){ dot(q[0],q[1]-4,7,PAL.sage,.9); line([[q[0]-3,q[1]-5],[q[0]+3,q[1]-2]],{w:.6,amp:0,over:0}); } else { for (const s of [-4,0,4]) line([q,[q[0]+s,q[1]-11]],{w:1,col:'#6f8e5c',amp:.1,over:0}); dot(q[0],q[1],2,'#e7985a',.6); } } }
}
function scarecrow(x,y){ const [a,b] = P(x,y); line([[a,b],[a,b-70]],{w:3.2,col:PAL.wood,amp:.3,over:0}); line([[a-30,b-50],[a+30,b-50]],{w:3,col:PAL.wood,amp:.3,over:0}); shape([[a-17,b-58],[a+17,b-58],[a+15,b-22],[a-15,b-22]],PAL.rose); line([[a-29,b-52],[a-17,b-52]],{w:6,col:PAL.rose,amp:.1,over:0}); line([[a+17,b-52],[a+29,b-52]],{w:6,col:PAL.rose,amp:.1,over:0}); dot(a,b-72,12,'#ecdcb9',1.1); shape(blob(a,b-80,20,5),PAL.gold); shape(blob(a,b-86,10,7),PAL.gold); for (const s of [-1,1]){ line([[a+s*5-2,b-74],[a+s*5+2,b-71]],{w:.9,amp:0,over:0}); line([[a+s*5+2,b-74],[a+s*5-2,b-71]],{w:.9,amp:0,over:0}); } }
function laundry(x0,y0,x1,y1){
  const A = P(x0,y0,74), B = P(x1,y1,74), sag = t => [lerp(A[0],B[0],t),lerp(A[1],B[1],t)+22*4*t*(1-t)*.6];
  for (const q of [[x0,y0],[x1,y1]]){ const a = P(...q); line([a,[a[0],a[1]-78]],{w:2.8,col:PAL.wood,amp:.3,over:0}); }
  line(Array.from({length:17},(_,i) => sag(i/16)),{w:.9,amp:.1,over:0});
  [[.14,PAL.sky,'shirt'],[.36,'#fbf7ec','sheet'],[.62,PAL.pink,'shirt'],[.84,PAL.gold,'sock']].forEach(([t,col,kind]) => { out.push('<g class="cloth">'); const c = sag(t), w = kind==='sheet'?20:kind==='sock'?7:14, h = kind==='sheet'?38:kind==='sock'?16:29, sl = S/C;
    shape([[c[0]-w,c[1]-w*sl],[c[0]+w,c[1]+w*sl],[c[0]+w,c[1]+w*sl+h],[c[0]-w,c[1]-w*sl+h]],col); if (kind==='shirt'){ line([[c[0]-w,c[1]-w*sl+4],[c[0]-w-8,c[1]-w*sl+12]],{w:4,col:INK,amp:0,over:0}); line([[c[0]-w,c[1]-w*sl+4],[c[0]-w-7,c[1]-w*sl+12]],{w:2.6,col,amp:0,over:0}); } out.push('</g>'); });
}
function pond(x,y,rx,ry){
  const c = ringAt((a,b) => { const t = Math.atan2(b,a), m = 1+.1*Math.sin(t*3+1)+.05*Math.sin(t*7); return P(x+rx*a*m,y+ry*b*m); },40);
  fill(c,WATER,{dx:1.5,dy:1,amp:.7}); inkLoop(c,{w:1.4,amp:.7,over:0});
  for (const [dx,dy,l] of [[-40,-30,44],[28,14,38],[-10,36,30],[44,-34,28]]){ const q = P(x+dx,y+dy); line([[q[0]-l,q[1]],[q[0]-l/3,q[1]-1.5],[q[0]+l/3,q[1]+1.5],[q[0]+l,q[1]]],{w:.7,col:'#5f8ea3',amp:.2,over:0}); }
  for (const [dx,dy] of [[-58,18],[-30,50]]){ const q = P(x+dx,y+dy), l = blob(q[0],q[1],11,5.5); fill(l,PAL.sage,{amp:.2}); inkLoop(l,{w:.9,amp:.2,over:0}); dot(q[0]+1,q[1]-2,2.6,PAL.pink,.6); }
}
function reeds(x,y){ const q = P(x,y); for (const [s,h] of [[-9,44],[-2,56],[6,40],[12,50]]){ line([[q[0]+s,q[1]],[q[0]+s*1.4,q[1]-h]],{w:1.2,col:'#6f8e5c',amp:.2,over:0}); if (h>45) shape(blob(q[0]+s*1.4,q[1]-h-1,2.6,8),PAL.wood,{w:.8}); } }
function hive(x,y){ box(x,y,0,34,34,8,{top:PAL.wood,left:PAL.wood,right:PAL.wood,shade:false,ink:1.1}); for (let i = 0; i < 2; i++) box(x+2,y+2,8+i*20,30,30,20,{top:'#fbf7ec',left:'#fbf7ec',right:'#efe3cc',shade:false,ink:1.1}); box(x-2,y-2,48,38,38,6,{top:PAL.gold,left:PAL.gold,right:PAL.gold,shade:false,ink:1.1}); const q = P(x+12,y+33,14); line([[q[0]-5,q[1]-2],[q[0]+5,q[1]+3]],{w:2.2,amp:0,over:0}); }
function bee(a,b){ line(Array.from({length:9},(_,i) => [a-30+i*3.5,b+8*Math.sin(i*1.2)]),{w:.55,amp:0,over:0}); dot(a,b,2.5,PAL.gold,.6); line([[a-1,b-2.2],[a-1,b+2.2]],{w:.9,amp:0,over:0}); }
function fence(pts){ for (let i = 0; i < pts.length-1; i++){ const [a,b] = [pts[i],pts[i+1]], n = Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/42); for (const z of [14,27]) line([P(a[0],a[1],z),P(b[0],b[1],z)],{w:1.6,col:PAL.wood,amp:.5,over:1}); for (let k = 0; k <= n; k++){ const t = k/n, q = [lerp(a[0],b[0],t),lerp(a[1],b[1],t)], m = P(q[0],q[1]); line([m,[m[0],m[1]-34]],{w:5,col:INK,amp:.1,over:0}); line([m,[m[0],m[1]-34]],{w:3,col:PAL.tan,amp:.1,over:0}); } } }
function stones(list){ for (const [x,y,r] of list){ const c = ringAt((a,b) => P(x+r*a,y+r*b*.75),14); fill(c,'#eadfc9',{amp:.5,dx:.5,dy:.4}); inkLoop(c,{w:.9,amp:.4,over:0}); } }
function hay(x,y){ const q = P(x,y); cyl(x,y,0,26,34,PAL.gold,{cap:'#efcf85'}); for (let t = 0; t < 2; t++) line(ringAt((a,b) => P(x+16*a,y+16*b,34),18),{w:.6,amp:.3,over:0}); }
function bucket(x,y,col = PAL.steel){ cyl(x,y,0,10,15,col,{ink:1,cap:'#7ba7bb'}); }

let items;
const put = (x,y,fn) => items.push({k:x+y,fn});
let pinN = 0;
function tag(x,y,w,text,no){
  const h = 54, n = Math.round(w/4), near = Array.from({length:n+1},(_,i) => [x+w*i/n, y+h+2*Math.sin(i*1.25)+rnd()*.7]);
  const p = [[x,y],[x+w,y],...[...near].reverse()], pin = [PAL.gold,PAL.blue,PAL.rose][pinN++%3];
  const sh = [[x+w,y+3],[x+w+5,y+6],[x+w+5,y+h+3],[x+w,y+h+1]]; hatch(sh,{dir:[C,S],gap:2.8,w:.5,keep:.9});
  for (let i = 1; i < n; i += 1) { const q = near[i]; line([[q[0]+2,q[1]+1],[q[0]+4,q[1]+4]],{w:.45,amp:0,over:0}); }
  fill(p,'#fbf7ec',{dx:.3,dy:.3,amp:.2}); line([[x,y+h],[x,y],[x+w,y],[x+w,y+h]],{w:1.25,amp:.35,over:1}); line(near,{w:1.1,amp:.1,over:0});
  line([[x+6,y+11],[x+w-6,y+11]],{w:.7,col:RED,amp:.2,over:0});
  out.push(`<text x="${x+7}" y="${y+9}" class="tt" font-size="7.5" fill="${RED}">No. ${no}</text>`);
  out.push(`<text x="${x+w/2}" y="${y+40}" text-anchor="middle" class="tt" font-size="23" fill="${INK}" letter-spacing=".8">${text}</text>`);
  dot(x+w/2,y-1,7.5,pin,1.1); line([[x+w/2-3,y-3.5],[x+w/2-1,y-5]],{w:1,col:'#fff9',amp:0,over:0});
}
let tagN = 12;
/* every arrow on a chart is remembered, so a token and its trail can sit exactly on the line that was drawn */
let ROUTES = [];
const onRoute = (p,reach = 14) => { let best = p, gap = reach; for (const r of ROUTES) for (let i = 1; i < r.length; i++){ const [a,b] = [r[i-1],r[i]], dx = b[0]-a[0], dy = b[1]-a[1], t = Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy || 1))), q = [a[0]+dx*t,a[1]+dy*t], g = Math.hypot(q[0]-p[0],q[1]-p[1]); if (g < gap){ gap = g; best = q; } } return best; };
function route(a,b,horizontalFirst = true){
  // red route with a soft corner, as if the pen turned without lifting
  const c = horizontalFirst ? [b[0],a[1]] : [a[0],b[1]], R = Math.min(22,Math.hypot(c[0]-a[0],c[1]-a[1])/2,Math.hypot(c[0]-b[0],c[1]-b[1])/2);
  const pre = [lerp(c[0],a[0],R/(Math.hypot(c[0]-a[0],c[1]-a[1])||1)),lerp(c[1],a[1],R/(Math.hypot(c[0]-a[0],c[1]-a[1])||1))], post = [lerp(c[0],b[0],R/(Math.hypot(c[0]-b[0],c[1]-b[1])||1)),lerp(c[1],b[1],R/(Math.hypot(c[0]-b[0],c[1]-b[1])||1))];
  const curve = Array.from({length:7},(_,i) => { const t = i/6, u = 1-t; return [u*u*pre[0]+2*u*t*c[0]+t*t*post[0],u*u*pre[1]+2*u*t*c[1]+t*t*post[1]]; });
  const l = Math.hypot(b[0]-post[0],b[1]-post[1])||1, u = [(b[0]-post[0])/l,(b[1]-post[1])/l], end = [b[0]-u[0]*9,b[1]-u[1]*9];
  ROUTES.push([a,...curve,b]); line([a,...curve,end],{w:1.55,col:RED,amp:.45,over:0});
  fill([b,[end[0]-u[1]*5.5,end[1]+u[0]*5.5],[end[0]+u[1]*5.5,end[1]-u[0]*5.5]],RED,{dx:0,dy:0,amp:.1});
}
function label(tx,ty,title,note,to,side = 'start',first = true){
  const w = Math.max(92,title.length*14.6+30), x = side === 'start' ? tx : tx-w, q = P(...to);
  const a = side === 'start' ? [x+w+5,ty+26] : [x-1,ty+26];
  out.push(`<g class="note hit" data-to="${n1(q[0])},${n1(q[1])}">`);
  route(a,q,first);
  tag(x,ty,w,title,tagN++);
  out.push(`<text x="${side === 'start' ? x+2 : x+w-2}" y="${ty+83}" text-anchor="${side}" class="it" font-size="18.5" fill="${INK}" letter-spacing=".5">${note}</text></g>`);
}
const group = (attrs,fn) => { out.push(`<g ${attrs}>`); fn(); out.push('</g>'); };
const plus = (x,y,r = 7) => { line([[x-r,y],[x+r,y]],{w:.95,amp:.1,over:0}); line([[x,y-r],[x,y+r]],{w:.95,amp:.1,over:0}); };
const ticks = (x,y,r,a0,a1,n = 4,L = 12) => { for (let i = 0; i < n; i++){ const t = lerp(a0,a1,n>1?i/(n-1):0); line([[x+Math.cos(t)*r,y+Math.sin(t)*r],[x+Math.cos(t)*(r+L),y+Math.sin(t)*(r+L)]],{w:.9,amp:.2,over:0}); } };
const stipple = (cx,cy,rx,ry,n = 26) => { for (let i = 0; i < n; i++){ const t = rnd()*6.3, m = Math.sqrt(rnd()); out.push(`<circle cx="${n1(cx+Math.cos(t)*rx*m)}" cy="${n1(cy+Math.sin(t)*ry*m)}" r="${n1(.5+rnd()*.5)}" fill="${INK}"/>`); } };
function windpump(x,y){ const c = P(x,y,170); for (const [a,b] of [[-16,-16],[16,-16],[16,16],[-16,16]]) line([P(x+a,y+b),P(x+a*.18,y+b*.18,162)],{w:2.2,col:'#6d675f',amp:.2,over:0}); for (const z of [50,100,140]){ const k = 1-z/162*.82; inkLoop([P(x-16*k,y-16*k,z),P(x+16*k,y-16*k,z),P(x+16*k,y+16*k,z),P(x-16*k,y+16*k,z)],{w:1.1,amp:.1,over:0}); }
  out.push(`<path id="rotor" fill="#c9c6be" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`); dot(c[0],c[1],4,'#7f7c78',.9); const v = [P(x-30,y,170),P(x-74,y,178),P(x-74,y,158)]; shape(v,'#b5806f',{w:.9}); line([c,v[0]],{w:2,amp:.1,over:0}); }
function rotorPath(x,y,a){ let d = ''; for (let i = 0; i < 8; i++){ const t = a+i/8*2*Math.PI, q = r => [P(x+4,y+r*Math.cos(t),170+r*Math.sin(t)),P(x+4,y+r*Math.cos(t+.28),170+r*Math.sin(t+.28))]; const [p1,p2] = q(14), [p3,p4] = q(46); d += `M${n1(p1[0])} ${n1(p1[1])}L${n1(p3[0])} ${n1(p3[1])}L${n1(p4[0])} ${n1(p4[1])}L${n1(p2[0])} ${n1(p2[1])}Z`; } return d; }
/* something on a beat: walks there and back along world points, bobbing as it goes */
function wander(el,pts,t,speed,phase = 0){ const seg = pts.slice(1).map((p,i) => Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1])), L = seg.reduce((a,b) => a+b,0), u = ((t*speed+phase)%(2*L)+2*L)%(2*L), d = u < L ? u : 2*L-u; let i = 0, r = d; while (i < seg.length-1 && r > seg[i]){ r -= seg[i]; i++; } const k = r/(seg[i]||1), x = lerp(pts[i][0],pts[i+1][0],k), y = lerp(pts[i][1],pts[i+1][1],k), a = P(pts[0][0],pts[0][1]), b = P(x,y); el.setAttribute('transform',`translate(${n1(b[0]-a[0])} ${n1(b[1]-a[1]-Math.abs(Math.sin(t*7+phase))*3)})`); }
function rising(el,k,dx,dy,s0,s1){ const x = +el.dataset.x, y = +el.dataset.y, s = lerp(s0,s1,k); el.setAttribute('transform',`translate(${n1(x+dx*k)} ${n1(y+dy*k)}) scale(${s.toFixed(2)}) translate(${-x} ${-y})`); el.style.opacity = k < .7 ? 1 : ((1-k)/.3).toFixed(2); }
const flush = () => { layShades(); items.sort((a,b) => a.k-b.k).forEach(i => i.fn()); items = []; };
const begin = s => { seedWith(s); pencils = new Map(); out = []; items = []; shades = []; pinN = 0; tagN = 12; hiN = 0; ROUTES = []; };
let TINT = null;
const finish = () => { flush(); const h = pencilDefs()+out.join(''); document.getElementById('art').innerHTML = TINT ? h.replace(/#[0-9a-f]{6}/gi,c => TINT[c.toLowerCase()] || c) : h; };
function title(small, big, x = 72){
  out.push(`<text x="${x}" y="118" class="tt" font-size="16" fill="${INK}" letter-spacing="1.5">${small}</text>`);
  out.push(`<text x="${x-4}" y="196" class="tt" font-size="74" fill="${INK}" letter-spacing="-1">${big}</text>`);
}
const leaf = (p,ang,L,wd,col = PAL.sage,rib = true) => { const u = [Math.cos(ang),Math.sin(ang)], v = [-u[1],u[0]];
  const c = Array.from({length:18},(_,k) => { const t = k/18*2*Math.PI, a = (1-Math.cos(t))/2*L, b = Math.sin(t)*wd*Math.sin(Math.PI*Math.min(1,a/L)**.7); return [p[0]+u[0]*a+v[0]*b, p[1]+u[1]*a+v[1]*b]; });
  fill(c,col,{amp:.3,dx:.6,dy:.5}); inkLoop(c,{w:.95,amp:.25,over:0}); if (rib) line([p,[p[0]+u[0]*L*.82,p[1]+u[1]*L*.82]],{w:.6,amp:.2,over:0}); };
const dash = (a,b,col = '#7f9db3') => { const n = Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/13); for (let i = 0; i < n; i++) if (i%2===0) line([[lerp(a[0],b[0],i/n),lerp(a[1],b[1],i/n)],[lerp(a[0],b[0],(i+1)/n),lerp(a[1],b[1],(i+1)/n)]],{w:.9,col,amp:.1,over:0}); };
