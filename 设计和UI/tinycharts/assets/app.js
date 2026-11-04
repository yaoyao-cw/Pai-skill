/* the shell: five sheets in one page, a shared click language, one animation loop */
const NS = 'http://www.w3.org/2000/svg', $ = id => document.getElementById(id);
const ORDER = [['farm','Farm'],['coffee','Coffee'],['metro','Metro'],['plants','Plants'],['saturday','Saturday'],['theatre','Theatre'],['brew','Tea'],['catday','Cat'],['letter','Letter'],['pottery','Pottery',1],['bakery','Bakery',1],['under','Under',1]];
const ICON = {Chart:'<circle cx="8" cy="8" r="5" fill="#fffdf6"/><rect x="23" y="3" width="11" height="10" rx="2" fill="#fffdf6"/><circle cx="28" cy="29" r="5" fill="#b23a38"/><path fill="none" d="M13 8h10M28.500 13v11"/>',Place:'<path fill="#a8c3a6" d="M2 30 14 11l8 11 5-6 7 14z"/><path fill="none" d="M8 24h12M6 28h22M12 18h6"/><circle cx="27" cy="8" r="4" fill="#b23a38"/>',Time:'<path fill="#fffdf6" d="M10 5h16c0 8-5 10-7 13 2 3 7 5 7 13H10c0-8 5-10 7-13-2-3-7-5-7-13z"/><path fill="#b23a38" d="M12.500 29c.5-4 4-6 5.500-8 1.500 2 5 4 5.500 8z"/><path fill="none" d="M7 4h22M7 32h22"/>'}, NOTE = {Chart:'every step',Place:'where it happens',Time:'how long it takes'};
const VIEWS = {coffee:[['coffee','Chart'],['coffeePlace','Place'],['coffeeTime','Time']],brew:[['brew','Chart'],['teaPlace','Place'],['teaTime','Time']],pottery:[['pottery','Chart'],['potteryPlace','Place'],['potteryTime','Time']],bakery:[['bakery','Chart'],['bakeryPlace','Place'],['bakeryTime','Time']]}, HOME = {}; for (const [h,l] of Object.entries(VIEWS)) for (const [k] of l) HOME[k] = h;
// coffee and tea share a story, not a look: coffee is warm kraft and roasted soil, tea is pale celadon and runs the other way across the sheet
const TINTS = {coffee:{'#b98e62':'#8f5f3e','#e7ddc4':'#efdcb8','#efe9da':'#f3e6c9','#c8bfa9':'#c8a878','#d9c39a':'#d4aa76','#a98a5e':'#7d5234','#f1e6bd':'#f3dfb0','#e6d5a2':'#e4bf84','#c9b37a':'#b98a52','#e3d3a0':'#deba84','#b79a68':'#96683f'},
  tea:{'#c8372f':'#2f7a5f','#b23a38':'#2f7a5f','#5d6c9c':'#5f8a86','#231e16':'#1f2a24','#b98e62':'#7f9c8b','#e7ddc4':'#dbe5d2','#efe9da':'#e4ecdd','#c8bfa9':'#aebfae','#c79a68':'#a9a77e','#d9c39a':'#c9d6bf','#a98a5e':'#7f9c8b','#a0683a':'#5f7f6e','#f1e6bd':'#e4edcf','#e6d5a2':'#cfe0b4','#c9b37a':'#a9bc9a','#e3d3a0':'#cfdcb8','#b79a68':'#8fa98f','#c07f3f':'#a8986a'}}, FLIPPED = new Set(['teaPlace','teaTime']), WHOLE = new Set(['coffee','brew','pottery','bakery']);
let flipped = false, whole = false;
const mirror = on => { flipped = on; const art = $('art'); if (!on){ art.removeAttribute('transform'); return; } art.setAttribute('transform','translate(1400 0) scale(-1 1)'); art.querySelectorAll('text').forEach(t => { const x = +t.getAttribute('x') || 0, a = t.getAttribute('text-anchor') || 'start'; t.setAttribute('text-anchor',a === 'start' ? 'end' : a === 'end' ? 'start' : 'middle'); t.setAttribute('transform',`${t.getAttribute('transform') || ''} translate(${2*x} 0) scale(-1 1)`); }); };
const RUN = {'next stop':'Next step →','play it all':'▶ Play all','play it in order':'▶ Play all'};
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = null, active = null, seedNow = 11, last = 0, aim = null, aimOut = 0, nowT = 0, camX = 700, camY = 700, camZ = 1;
const ctx = {
  say: t => { $('status').textContent = t; },
  hint: t => { $('hint').textContent = t; },
  // the main action is solid and says what it does; choices are plain, and read as a choice when there are two or more
  button(label,fn,id){ const b = document.createElement('button'), run = RUN[label]; b.type = 'button'; b.textContent = run || label; if (run) b.className = label === 'next stop' ? 'next' : 'run'; if (id) b.id = id; b.onclick = fn; $('actions').append(b); return b; },
  clear(){ $('actions').replaceChildren(); },
  bubble(x,y,text){
    if (flipped) x = 1400-x;
    const w = Math.max(54,text.length*10.5+24), g = document.createElementNS(NS,'g'); g.setAttribute('class','bubble');
    const X = Math.min(1390-w,Math.max(10,x-w/2)), Y = Math.max(44,y-46);
    g.innerHTML = `<path d="M${X+7} ${Y}Q${X+w/2} ${Y-3} ${X+w-7} ${Y}Q${X+w} ${Y+1} ${X+w} ${Y+8}L${X+w} ${Y+24}Q${X+w} ${Y+31} ${X+w-7} ${Y+31}L${x+9} ${Y+31}L${x} ${Y+43}L${x-3} ${Y+31}L${X+7} ${Y+31}Q${X} ${Y+31} ${X} ${Y+24}L${X} ${Y+8}Q${X} ${Y+1} ${X+7} ${Y}Z" fill="#fffdf6" stroke="#2f261e" stroke-width="1.5"/><text x="${X+w/2}" y="${Y+21}" text-anchor="middle" class="it" font-size="17" fill="#2f261e">${text}</text>`;
    $('fx').append(g); setTimeout(() => g.remove(),1500);
  },
  hop(el){ el.classList.remove('hop'); el.getBBox(); el.classList.add('hop'); },
  // the camera: move in on what is happening; with hold, ease back out that many seconds later
  focus(x,y,z = 1.7,hold = 0){ if (calm || whole) return; if (flipped) x = 1400-x; aim = {x,y,z}; aimOut = hold ? nowT+hold : 0; },
  point(e){ const p = $('sheet').createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform($('sheet').getScreenCTM().inverse()); },
  calm
};
function open(key,keepHash){
  aim = null; camZ = 1; camX = camY = 700; $('sheet').style.transform = ''; current?.stop?.(); ctx.clear(); $('fx').replaceChildren(); $('tint').style.opacity = 0; ctx.say(''); ctx.hint('');
  $('ruled').hidden = !['farm','coffee','metro','plants','saturday'].includes(key); whole = WHOLE.has(key); const fam = {coffee:'coffee',brew:'tea',pottery:'pottery',bakery:'bakery'}[HOME[key]] || ''; document.body.dataset.fam = fam; TINT = TINTS[fam] || null; active = SHEETS[key]; active.draw(seedNow); mirror(FLIPPED.has(key)); fitPills(); current = active.init(ctx) || {}; current.key = key;
  const home = HOME[key] || key; document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current',b.dataset.key === home ? 'page' : 'false'));
  $('views').replaceChildren(...(VIEWS[home] || []).map(([k,n]) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true" stroke="#2f261e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg><b>${n}</b><small>${NOTE[n]}</small>`; b.setAttribute('aria-current',k === key ? 'page' : 'false'); b.onclick = () => open(k); return b; }));
  if (!keepHash) try { history.replaceState(null,'','#'+key); } catch {}
}
ORDER.forEach(([key,name,isNew],i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.key = key; if (isNew) b.className = 'new'; b.textContent = `${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i]}  ${name}`; b.onclick = () => open(key); $('tabs').append(b); });
/* a pill (diaKit's pill()) is sized from its letter count when drawn; once the hand lettering is on screen, refit it to the
   measured text with even padding, so no label spills past its outline or sits cramped in it */
function fitPills(){ document.querySelectorAll('#art path.pl').forEach(pa => { const t = pa.nextElementSibling; if (!t || t.tagName !== 'text') return;
  const tw = t.getBBox().width, b = pa.getBBox(); if (!tw || !b.width) return; const h = b.height, r = h/2-1, w = Math.max(h,tw+Math.max(16,h*.75)), x = b.x+b.width/2-w/2, y = b.y;
  pa.setAttribute('d',`M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`); }); }
if (document.fonts) document.fonts.ready.then(() => fitPills());
/* one chart on the page: nothing to switch to, so no tab bar */
if (ORDER.length < 2) document.getElementById('tabs').style.display = 'none';
$('art').addEventListener('click',e => {
  if (current?.click?.(e)) return;
  const who = e.target.closest('[data-say]');
  if (who){ ctx.hop(who); /* measured on screen, so scaling, pulled-apart layers and the camera all count */ const r = who.getBoundingClientRect(), f = $('sheet').getBoundingClientRect(), k = 1400/f.width, x = (r.left+r.width/2-f.left)*k, y = (r.top-f.top)*k; ctx.bubble(flipped ? 1400-x : x,y,who.dataset.say); return; }
  const note = e.target.closest('.note');
  if (note){ ctx.hop(note); const [x,y] = note.dataset.to.split(',').map(Number), m = $('art').getCTM().inverse().multiply(note.getCTM()), r = document.createElementNS(NS,'circle'); r.setAttribute('cx',flipped ? 1400-x-m.e : x+m.e); r.setAttribute('cy',y+m.f); r.setAttribute('r',10); r.setAttribute('class','ping'); $('fx').append(r); setTimeout(() => r.remove(),900); }
});
addEventListener('keydown',e => { if (e.target.closest('input,button')) return; const i = ORDER.findIndex(o => o[0] === (HOME[current?.key] || current?.key)); if (e.key === 'ArrowRight') open(ORDER[(i+1)%ORDER.length][0]); if (e.key === 'ArrowLeft') open(ORDER[(i+ORDER.length-1)%ORDER.length][0]); });
/* a zoomed camera can leave the lit label off the sheet: then it is pinned to the corner of the frame */
const pinLabel = () => { const on = camZ > 1.05 && document.querySelector('.stag.on'), f = $('frame').getBoundingClientRect(), t = on ? [...on.querySelectorAll('text')] : [], off = t.some(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < f.left || r.right > f.right || r.top < f.top || r.bottom > f.bottom); }); $('pin').hidden = !off; if (off) $('pin').innerHTML = `<b>${t[0].textContent}</b>`+(t[1] ? `<span>${t[1].textContent.trim()}</span>` : ''); };
function camera(dt){ pinLabel(); if (aimOut && nowT > aimOut){ aim = null; aimOut = 0; } const z = aim ? aim.z : 1, cx = aim ? aim.x : 700, cy = aim ? aim.y : 700, k = 1-Math.pow(.05,dt);
  camZ += (z-camZ)*k; camX += (cx-camX)*k; camY += (cy-camY)*k;
  const half = 700/camZ, x = Math.max(half,Math.min(1400-half,camX)), y = Math.max(half,Math.min(1400-half,camY)), sc = $('frame').clientWidth/1400;
  $('sheet').style.transform = camZ < 1.002 ? '' : `translate(${(-(x-half)*camZ*sc).toFixed(1)}px,${(-(y-half)*camZ*sc).toFixed(1)}px) scale(${camZ.toFixed(4)})`; }
function frame(t){ const dt = Math.min(.05,(t-last)/1000); last = t; nowT = t/1000; if (!document.hidden){ current?.tick?.(t/1000,dt); camera(dt); } requestAnimationFrame(frame); }
const first = SHEETS[location.hash.slice(1)] ? location.hash.slice(1) : 'farm';
open(first,true);
requestAnimationFrame(frame);
