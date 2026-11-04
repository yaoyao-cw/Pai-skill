
/* Soft Pear: the people of the marker look. Pose hands reuse ARMS so anything held still lines up; head, hair, skin and clothes are chosen from who the person is, so a crowd never repeats */
const pearFigure = (() => {
const I = '#231e16', W = '#fffdf6', SH = '#3a2a30'; let INKW = 1, GHOST = false, uid = 0;
const f = c => c === W || c === 'none' ? c : pencil(c);
const st = (w = 1.4) => `stroke="${I}" stroke-width="${(w*INKW).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"`;
const E = (x,y,rx,ry,c,w) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f(c)}" ${st(w)}/>`;
const R = (x,y,a,b,r,c,w) => `<rect x="${x-a/2}" y="${y}" width="${a}" height="${b}" rx="${r}" fill="${f(c)}" ${st(w)}/>`;
const Pa = (d,c,w) => `<path d="${d}" fill="${f(c)}" ${st(w)}/>`;
const Li = (d,w = 1.4,c = I) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${(w*INKW).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const Do = (x,y,r = 2,c = I) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const SHAPES = {round:[1,1,2,0],oval:[.88,1.14,2.1,0],square:[1,1,3.6,0],wide:[1.16,.88,2.3,0],egg:[.92,1.08,2.1,-.14],pear:[1,1,2.2,.2],long:[.76,1.3,2.5,0],heart:[1.04,1.02,2.1,-.28]};
const ring = (hr,sh) => { const [a,b,n,t] = SHAPES[sh], o = []; for (let i = 0; i < 40; i++){ const u = i/40*2*Math.PI, c = Math.cos(u), s = Math.sin(u), y = b*hr*Math.sign(s)*Math.abs(s)**(2/n), k = 1+t*(-y/(b*hr))*-1*-1; o.push([a*hr*Math.sign(c)*Math.abs(c)**(2/n)*(1-t*y/(b*hr)*-1),y]); } return o; };
const poly = pts => 'M'+pts.map(p => p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
const dark = (s) => { const v = parseInt(s.slice(1),16); return .3*(v>>16)+.59*(v>>8&255)+.11*(v&255) < 120; };
function hairBack(h,hr,sh,c){ const [a,b] = SHAPES[sh], w = a*hr, t = b*hr;
  if (h === 'bob') return Pa(`M${-w-3} ${t*.75}V${-t*.2}A${w+3} ${t+3} 0 0 1 ${w+3} ${-t*.2}V${t*.75}Q0 ${t*1.05} ${-w-3} ${t*.75}Z`,c);
  if (h === 'long') return Pa(`M${-w-4} ${t*1.9}V${-t*.2}A${w+4} ${t+4} 0 0 1 ${w+4} ${-t*.2}V${t*1.9}Q0 ${t*2.1} ${-w-4} ${t*1.9}Z`,c);
  if (h === 'afro') return E(0,-t*.3,w*1.5,t*1.42,c);
  if (h === 'bun') return E(0,-t-hr*.42,hr*.46,hr*.44,c);
  if (h === 'pony') return Pa(`M${w-2} ${-t*.5}C${w+15} ${-t*.5} ${w+15} ${t*.9} ${w+6} ${t*1.5}C${w+2} ${t*.8} ${w+1} ${t*.2} ${w-3} ${-t*.1}Z`,c);
  if (h === 'pigtails') return E(-w-5,t*.25,6,9,c)+E(w+5,t*.25,6,9,c);
  if (h === 'twin') return E(-w*.72,-t*.98,hr*.38,hr*.38,c)+E(w*.72,-t*.98,hr*.38,hr*.38,c);
  return ''; }
function hairFront(h,hr,sh,c){ const [a,b] = SHAPES[sh], w = a*hr, t = b*hr, top = ring(hr,sh).filter(p => p[1] < -t*.12).sort((p,q) => Math.atan2(p[1],p[0])-Math.atan2(q[1],q[0])), o = top.map(p => [p[0]*1.05,p[1]*1.05]), cap = fr => Pa(poly(o)+'',c,1.2).replace(/Z"/,`${fr}Z"`);
  if (h === 'bald') return Li(`M${-w*.4} ${-t*.72}Q${-w*.1} ${-t*.86} ${w*.1} ${-t*.8}`,1,'#fff8');
  if (h === 'short' || h === 'bun' || h === 'twin' || h === 'pigtails' || h === 'bob' || h === 'long' || h === 'pony') return cap(`Q0 ${-t*.46} ${o[0][0].toFixed(1)} ${o[0][1].toFixed(1)}`);
  if (h === 'side') return cap(`L${(w*.3).toFixed(1)} ${(-t*.6).toFixed(1)}Q${(-w*.5).toFixed(1)} ${(-t*.3).toFixed(1)} ${o[0][0].toFixed(1)} ${o[0][1].toFixed(1)}`);
  if (h === 'spike'){ let z = `M${-w} ${-t*.3}`; for (let i = 0; i < 6; i++) z += `L${-w+(i+.5)*w/3} ${-t*1.42-(i%2)*2}L${-w+(i+1)*w/3} ${-t*.72}`; return Pa(z+'Z',c,1.2); }
  if (h === 'curly'){ let z = ''; for (let i = 0; i < 7; i++){ const u = Math.PI*(1.04+i/6*.92); z += E((w*1.02*Math.cos(u)).toFixed(1),(t*1.0*Math.sin(u)).toFixed(1),hr*.34,hr*.34,c,1.1); } return z; }
  if (h === 'afro') return '';
  if (h === 'beanie') return Pa(`M${-w-1} ${-t*.3}C${-w} ${-t*1.5} ${w} ${-t*1.5} ${w+1} ${-t*.3}Z`,c,1.2)+R(0,-t*.42,w*2.2,hr*.34,hr*.1,c,1.2);
  if (h === 'cap') return Pa(`M${-w} ${-t*.36}C${-w} ${-t*1.36} ${w} ${-t*1.36} ${w} ${-t*.36}Z`,c,1.2)+Pa(`M${w*.1} ${-t*.36}H${w*1.7}Q${w*1.7} ${-t*.16} ${w*.1} ${-t*.2}Z`,c,1.2);
  if (h === 'straw') return E(0,-t*.42,w*1.62,hr*.28,c,1.2)+Pa(`M${-w*.72} ${-t*.46}C${-w*.7} ${-t*1.32} ${w*.7} ${-t*1.32} ${w*.72} ${-t*.46}Z`,c,1.2);
  return ''; }

const mixH = (a,b,t) => { const h = s => [1,3,5].map(i => parseInt(s.slice(i,i+2),16)), A = h(a), B = h(b); return '#'+A.map((v,i) => Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); };
const SKIN = ['#f6e2cc','#e9c49e','#c98f63','#8d5a3c','#f0d2b4','#b57a50'], HAIRC = ['#2f2520','#5a3a28','#a8683a','#b9b3a8','#c9a24e','#2f2520','#7a3b30'], SHOE = ['#3a2f28','#7d4a2c','#3a2f28','#c9806a'], LEGS = ['#3a2f28','#55607a','#6a5a4a'], SH_K = ['oval','square','round','wide','egg','long','heart','pear'];
const HAIRS = {short:['short','side','curly','afro','bald','short','side'],bun:['bun','pony','pigtails','twin','bun'],bob:['bob','long','curly'],long:['long','bob','pony'],wavy:['curly','side'],hat:['straw'],cap:['cap']}, WEAR = ['stripe','plain','cardigan','overall','knit','coat','dress','plain'];
const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h*31+s.charCodeAt(i))>>>0; return h; };
return (bx,by,{shirt = '#a9c8ee',pants = '#2f2925',hair = 'short',apron = null,arm = 'down',look = 0,kid = false,hold = null,cap = null,size = 1,sit = 0} = {}) => {
  const s = size*(kid ? .72 : 1), n = hash(`${hair}${shirt}${Math.round(bx/5)}${Math.round(by/5)}${arm}`), pick = (a,k) => a[(n>>>k)%a.length], id = 'pb'+(uid++), hr = 15.5, c = shirt, top = -60, hem = -16, yoff = sit ? 28 : 0, foot = sit ? (12+sit)/s-yoff : 0;
  const q = {sh:pick(SH_K,1),hair:pick(HAIRS[hair] || HAIRS.short,4),hc:hair === 'hat' ? (cap || '#e4c27a') : hair === 'cap' ? (cap || '#c9806a') : pick(HAIRC,7),skin:pick(SKIN,10),bot:pants === '#2f2925' ? pick(LEGS,13) : pants,shoe:pick(SHOE,15),wear:apron ? 'apron' : pick(WEAR,17),acc:apron || pick(['#fffdf6','#6f86a3','#e4c27a','#a9bc9a'],20)};
  const roll = (m,k) => (n>>>k)%m === 0, grown = !kid; if (q.hair === 'bald') q.beard = true; else if (grown && ['short','side'].includes(q.hair) && roll(5,6)) q.beard = true; q.glasses = roll(5,9); q.tache = grown && !q.beard && roll(7,12); q.freckle = roll(5,14); q.flat = roll(6,18);
  const sk = q.skin, ink = dark(sk) ? '#1a120d' : I; INKW = .8/Math.max(.6,s);
  const pose = ARMS[arm] || STAND, K = 2.72, Y = y => y;
  const armOf = (side,key) => { const [el,hd] = pose[key], stand = pose[key] === STAND[key], sx = side*11, sy = top+6, e = stand ? [side*21,top+18] : [el[0]*K,el[1]*K], h = stand ? [side*24,top+37] : [hd[0]*K,hd[1]*K], d = `M${sx} ${sy}Q${e[0].toFixed(1)} ${e[1].toFixed(1)} ${h[0].toFixed(1)} ${(h[1]-side*0).toFixed(1)}`, col = mixH(c,SH,side > 0 ? .1 : 0);
    return E(h[0].toFixed(1),h[1].toFixed(1),3.700,4,sk,1.3)+`<path d="${d}" fill="none" stroke="${I}" stroke-width="${(8+2*INKW*.7).toFixed(2)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${f(col)}" stroke-width="8" stroke-linecap="round"/>`; };
  const across = key => { const [,hd] = pose[key]; return hd[1]*K > top && Math.abs(hd[0]*K) < 16; };
  const T = `M-10 ${top}C-6 ${top-3} 6 ${top-3} 10 ${top}C15 ${top+10} 20 ${top+26} 22.500 ${hem-5}C23.500 ${hem} 20 ${hem+2} 15 ${hem+2}Q0 ${hem+5}-15 ${hem+2}C-20 ${hem+2}-23.500 ${hem}-22.500 ${hem-5}C-20 ${top+26}-15 ${top+10}-10 ${top}Z`;
  let o = `<defs><clipPath id="${id}"><path d="${T}"/></clipPath></defs>`;
  if (q.hair === 'long') o += `<g transform="translate(0 ${top-hr-3})">`+hairBack('long',hr,q.sh,q.hc)+'</g>';
  for (const d of [-1,1]) { const fy = foot; o += Pa(`M${d*4} ${hem}H${d*12}L${d*11} ${fy-5}H${d*5}Z`,q.bot,1.3)+Pa(`M${d*4.500} ${fy}H${d*14}Q${d*15} ${fy-5} ${d*9} ${fy-6.500}H${d*4.500}Z`,q.shoe,1.3); }
  for (const [d,k] of [[-1,'l'],[1,'r']]) if (!across(k)) o += armOf(d,k);
  o += R(0,top-7,7.500,10,2,sk,1.2)+Pa(T,c,1.5)+`<g clip-path="url(#${id})"><path d="M8 ${top-6}C14 ${top+12} 13 ${top+32} 10 ${hem+6}H28V${top-6}Z" fill="${SH}" opacity=".14"/>`;
  const w = q.wear;
  if (w === 'stripe') for (let y = top+12; y < hem; y += 9) o += Li(`M-30 ${y}Q0 ${y+3} 30 ${y}`,3,mixH(c,'#fffdf6',.62));
  if (w === 'apron') o += Pa(`M-9 ${top+15}H9L16 ${hem+6}H-16Z`,q.acc,1)+Li(`M-9 ${top+15}L-6 ${top}M9 ${top+15}L6 ${top}`,2,q.acc);
  if (w === 'overall') o += Pa(`M-9 ${top+13}H9L13 ${top+27}L23 ${hem+6}H-23L-13 ${top+27}Z`,q.acc,1)+Li(`M-7 ${top+13}L-5 ${top-1}M7 ${top+13}L5 ${top-1}`,2.6,q.acc);
  if (w === 'cardigan') o += Pa(`M-5 ${top-3}H5L3 ${hem+6}H-3Z`,q.acc,1);
  if (w === 'coat') o += Pa(`M-7 ${top-3}L0 ${top+11}L7 ${top-3}Z`,q.acc,1)+Li(`M0 ${top+11}V${hem+6}`,1);
  if (w === 'knit') o += Li(`M-30 ${hem-2}H30`,1)+Li(`M-7 ${top+1}Q0 ${top+7} 7 ${top+1}`,1);
  if (w === 'dress') o += `<path d="M-30 ${hem-6}H30V${hem+8}H-30Z" fill="${q.acc}" opacity=".85"/>`+Li(`M-30 ${hem-6}H30`,1);
  o += '</g>'+Pa(T,'none',1.5);
  for (const [d,k] of [[-1,'l'],[1,'r']]) if (across(k)) o += armOf(d,k);
  const sh = q.sh, g = hr*SHAPES[sh][0]*.4+look*.4, ey = -1.200, lift = ['cap','straw','beanie'].includes(q.hair) ? '<g transform="translate(0 -3.500)">' : '<g>'; let fr = hairFront(q.hair,hr,sh,q.hc); if (q.hair === 'bob' || q.hair === 'long') fr = fr.replace(/stroke="[^"]*" stroke-width="[^"]*"/,'stroke="none"');
  o += `<g transform="translate(0 ${top-hr-3})">`+(q.hair === 'long' ? '' : hairBack(q.hair,hr,sh,q.hc))+E(-SHAPES[sh][0]*hr,1.500,2.200,3.100,sk,1.1)+E(SHAPES[sh][0]*hr,1.500,2.200,3.100,sk,1.1)+Pa(poly(ring(hr,sh)),sk,1.3)+lift+fr+'</g>';
  const lx = look*1.200; o += Do(-hr*SHAPES[sh][0]*.4+lx,ey,1.700,ink)+Do(hr*SHAPES[sh][0]*.4+lx,ey,1.700,ink)+`<ellipse cx="${-g-1.500}" cy="${ey+4.500}" rx="2.700" ry="1.500" fill="#eeb0a8" opacity=".8"/><ellipse cx="${g+1.500}" cy="${ey+4.500}" rx="2.700" ry="1.500" fill="#eeb0a8" opacity=".8"/>`;
  if (q.beard){ const t = SHAPES[sh][1]*hr, a = SHAPES[sh][0]*hr; o += Pa(`M${-a*.96} ${t*.1}C${-a*.92} ${t*1.34} ${a*.92} ${t*1.34} ${a*.96} ${t*.1}Q${a*.5} ${t*.5} 0 ${t*.4}Q${-a*.5} ${t*.5} ${-a*.96} ${t*.1}Z`,q.hc === '#b9b3a8' || hair === 'hat' || hair === 'cap' ? '#5a3a28' : q.hc,1); } else o += q.flat ? Li(`M${lx-2.200} ${ey+7.500}h4.400`,1,ink) : Li(`M${lx-2.800} ${ey+7}q2.800 2.600 5.600 0`,1,ink);
  if (q.glasses){ const gg = hr*SHAPES[sh][0]*.4; for (const d of [-1,1]) o += `<circle cx="${d*gg+lx}" cy="${ey}" r="4.200" fill="none" stroke="${ink}" stroke-width="${(1*INKW).toFixed(2)}"/>`; o += Li(`M${-gg+4.200+lx} ${ey}H${gg-4.200+lx}`,1,ink); }
  if (q.tache) o += Pa(`M0 ${ey+4.600}C-3 ${ey+4} -5.500 ${ey+6} -6 ${ey+7}C-3 ${ey+7.500} 0 ${ey+6.500} 0 ${ey+5.500}C0 ${ey+6.500} 3 ${ey+7.500} 6 ${ey+7}C5.500 ${ey+6} 3 ${ey+4} 0 ${ey+4.600}Z`,q.hc === '#b9b3a8' ? '#857e74' : q.hc,.8);
  o += '</g>';
  const shadowY = sit ? foot*s+yoff*s : 0;
  out.push(`<ellipse cx="${n1(bx-2*s)}" cy="${n1(by+shadowY+1)}" rx="${n1(25*s)}" ry="${n1(6.500*s)}" fill="${SHADOW}"/><g transform="translate(${n1(bx)} ${n1(by+yoff*s)}) scale(${s.toFixed(3)})">${o}</g>`);
  if (hold) hold(bx,by+(-24.2+(sit ? 10.4 : 0))*K*s);
}; })();
