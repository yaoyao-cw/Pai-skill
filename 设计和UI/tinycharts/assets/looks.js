/* Who stands on the sheet. The doll is Kevin's; block and pawn draw at the same size and take the same options. */
const PEOPLE = (typeof LOOK !== 'undefined' && LOOK.who) || new URLSearchParams(location.search).get('people') || 'doll';
function blockFigure(bx, by, { shirt = PAL.sky, pants = '#2f2925', hair = 'short', hairCol = '#2e2622', apron = null, arm = 'down', kid = false, hold = null, cap = null, size = 1, sit = 0 }){
  const k = 2.72*(kid ? .72 : 1)*size, skin = '#f0c8a0', ground = sit ? 4.4*k+sit : 0, liftZ = sit ? 12-sit/k : 0;
  { const c = blob(bx-9*size, by+2+ground, 18*size, 6.5*size); out.push(`<path fill="${SHADOW}" d="M${c.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/>`); }
  const Q = (x, y, z) => [bx+(x-y)*.866*k*1.12, by+(x+y)*.5*k*1.12-(z-liftZ)*k*.8], W = 1.1;
  const face = (pts, col) => { fill(pts, col, { amp:.08, dx:.15, dy:.1 }); inkLoop(pts, { w:W, amp:.12, over:0 }); };
  const cube = (x, y, z, w, d, h, col) => { const x1 = x+w, y1 = y+d, z1 = z+h;
    face([Q(x,y1,z),Q(x1,y1,z),Q(x1,y1,z1),Q(x,y1,z1)], mixC(col,'#3b2f4a',.2));
    face([Q(x1,y,z),Q(x1,y1,z),Q(x1,y1,z1),Q(x1,y,z1)], col);
    face([Q(x,y,z1),Q(x1,y,z1),Q(x1,y1,z1),Q(x,y1,z1)], mixC(col,'#ffffff',.22)); };
  const up = arm === 'wave' || arm === 'up';
  cube(-1.5,-5,0,4,4,1.6,'#fffdf6'); cube(-1.5,1,0,4,4,1.6,'#fffdf6');
  cube(-1.5,-5,1.6,3.4,4,10,pants); cube(-1.5,1,1.6,3.4,4,10,pants);
  cube(-1.2,-6.6,17,3,2.4,6,up ? skin : shirt);
  if (!up) cube(-1.2,-6.6,12.4,3,2.4,5,skin);
  cube(-2.5,-4.2,11.6,5,8.4,12.4,shirt);
  if (apron){ const x = 2.56; face([Q(x,-3.4,12),Q(x,3.4,12),Q(x,3.4,21),Q(x,-3.4,21)], apron); }
  if (up){ cube(-1.2,-6.6,23.4,3,2.4,6,shirt); cube(-1.2,-6.6,29.4,3,2.4,2.6,skin); }
  cube(-1.2,4.2,17,3,2.4,6.6,shirt); cube(-1.2,4.2,12.4,3,2.4,4.6,skin);
  cube(-4.6,-4.6,24,9.2,9.2,9.2,skin);
  const hx = 4.62; for (const s of [-1.9,1.9]) { const e = Q(hx,s,28.6); out.push(`<rect x="${n1(e[0]-.55*k)}" y="${n1(e[1]-.9*k)}" width="${n1(1.1*k)}" height="${n1(1.8*k)}" fill="${INK}"/>`); }
  for (const s of [-3.1,3.1]) { const e = Q(hx,s,26.6); out.push(`<ellipse cx="${n1(e[0])}" cy="${n1(e[1])}" rx="${n1(k)}" ry="${n1(.6*k)}" fill="#f2a3b3" opacity=".85"/>`); }
  if (hair === 'hat'){ cube(-6.2,-6.2,32.8,12.4,12.4,1.3,cap||PAL.gold); cube(-3.4,-3.4,34.1,6.8,6.8,3.2,cap||PAL.gold); }
  else if (hair === 'cap'){ cube(-4.6,-4.6,32.2,9.2,9.2,2.6,cap||PAL.rose); cube(4.6,-4.6,32.2,3.2,9.2,.9,cap||PAL.rose); }
  else { cube(-4.7,-4.7,32.2,9.4,9.4,1.8,hairCol); if (hair === 'bun') cube(-2,-2,34,4,4,3.4,hairCol); }
  if (hold) hold(bx, by-23*k);
}
function pawnFigure(bx, by, { shirt = PAL.sky, kid = false, hold = null, size = 1, sit = 0 }){
  const k = 2.72*(kid ? .72 : 1)*size, g = sit ? 4.4*k+sit : 0, y0 = by+g, dark = mixC(shirt,'#3b2f4a',.2), lit = mixC(shirt,'#ffffff',.26);
  { const c = blob(bx-9*size, y0+2, 18*size, 6.5*size); out.push(`<path fill="${SHADOW}" d="M${c.map(p => n1(p[0])+' '+n1(p[1])).join('L')}Z"/>`); }
  const base = oval(bx, y0-2.2*k, 7*k, 3.4*k), base0 = oval(bx, y0-.4*k, 7*k, 3.4*k); fill(hull([...base, ...base0]), dark, { amp:.05, dx:.1, dy:.1 }); inkLoop(hull([...base, ...base0]), { w:1.1, amp:.1, over:0 }); fill(base, shirt, { amp:.05, dx:.1, dy:.1 }); inkLoop(base, { w:1, amp:.1, over:0 });
  const body = [[bx-4.7*k,y0-3.4*k],[bx-1.9*k,y0-21*k],[bx+1.9*k,y0-21*k],[bx+4.7*k,y0-3.4*k]], side = [[bx-4.7*k,y0-3.4*k],[bx-1.9*k,y0-21*k],[bx-.7*k,y0-21*k],[bx-1.8*k,y0-3.4*k]];
  fill(body, shirt, { amp:.05, dx:.1, dy:.1 }); fill(side, dark, { amp:.05, dx:0, dy:0 }); inkLoop(body, { w:1.1, amp:.1, over:0 });
  const collar = oval(bx, y0-21*k, 3.5*k, 1.5*k); fill(collar, lit, { amp:.05, dx:.1, dy:.1 }); inkLoop(collar, { w:1, amp:.1, over:0 });
  const hy = y0-26.4*k, head = oval(bx, hy, 5.6*k, 5.6*k), light = oval(bx+1.5*k, hy-1.6*k, 2.2*k, 2.2*k); fill(head, shirt, { amp:.05, dx:.1, dy:.1 }); fill(light, lit, { amp:.05, dx:0, dy:0 }); inkLoop(head, { w:1.2, amp:.1, over:0 });
  if (hold) hold(bx, y0-21*k);
}
const figure = (bx, by, o = {}) => PEOPLE === 'block' ? blockFigure(bx, by, o) : PEOPLE === 'pawn' ? pawnFigure(bx, by, o) : dollFigure(bx, by, o);
