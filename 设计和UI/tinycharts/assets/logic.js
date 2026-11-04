/* "The logic": an optional panel under the sheet with two tabs, Rules (from <name>.json, written by <name>.check.mjs) and
   Flow chart (the <name>.mmd statechart drawn by pele). Tap a state or an arrow in the flow chart and the parts of the picture
   drawn inside data-state="<id>" light up. build.py puts PELE and LOGICDATA in front of this file when you pass --logic. */
/* everything is kept in one block, so its names never meet the sheet code's */
(() => {
/* one entry per sheet, gathered from models/new-charts/<key>.json; the flow charts are pele renders of <key>.mmd */
const LOGIC = Object.fromEntries(Object.entries(LOGICDATA).map(([k,v]) => [k,{...v,chart:() => PELE[k] || ''}]));
/* the panel: a button under the actions opens Rules and the flow chart for the sheet that is open */
{
  const css = document.createElement('style'); css.textContent = `#lgBtn{font:500 15px/1 var(--mono);padding:10px 15px;border-radius:999px;border:1px solid var(--ink);background:var(--paper);color:var(--ink);cursor:pointer}
#lg{position:fixed;inset:0;z-index:60;background:rgba(47,38,30,.35);display:flex;align-items:center;justify-content:center;padding:16px}#lg[hidden]{display:none}
#lgCard{background:var(--paper);border:1px solid var(--ink);border-radius:12px;width:min(980px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:18px 20px 22px;box-sizing:border-box;font-family:var(--hand)}
#lgHead{display:flex;align-items:center;gap:12px}#lgHead b{font:400 26px "Young Serif",Georgia,serif;flex:1}#lgX{all:unset;cursor:pointer;font-size:22px;width:40px;height:40px;text-align:center}
#lgTabs{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--ink);border-radius:8px;overflow:hidden;margin:12px 0 16px}#lgTabs button{all:unset;text-align:center;padding:10px;cursor:pointer;font:500 15px var(--mono)}#lgTabs button[aria-selected=true]{background:var(--ink);color:var(--paper)}
.lgRule{border-top:1px solid #d8ccb4;padding:12px 0}.lgRule b{display:block;font-size:20px}.lgRule p{margin:4px 0;font-size:17px;line-height:1.35}.lgRule p.p{opacity:.72}.lgCheck{font-size:15px;opacity:.72;margin-top:6px}
#lgChart{--pele-accent:#b23a38;--pele-bg:#fbf7ec;--pele-border:#8a7c68;--pele-fg:#2f261e;--pele-font:"DM Sans",system-ui,sans-serif;--pele-line:#2f261e;--pele-muted:#6f6150;--pele-surface-alt:#f1eadb;--pele-surface:#fffdf6}#lgChart svg{width:100%;height:auto;max-height:calc(100dvh - 220px)}
.lgTip{font:500 15px var(--mono);margin:0 0 8px;opacity:.8}#lgNote{font:16px var(--hand);color:var(--red);min-height:1.3em;margin:4px 0 0}
#lgChart .lgHas{cursor:pointer}#lgChart .lgHas:hover>rect,#lgChart .lgHas:hover>path{stroke:#b23a38;stroke-width:2.4}#lgChart .lgNone{cursor:help}#lgChart .pele-transition{cursor:pointer}#lgChart .pele-transition:hover path{stroke:#b23a38;stroke-width:2.6}
#lgChip{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:10px;background:var(--paper);border:1px solid var(--ink);border-radius:999px;padding:7px 8px 7px 16px;font:500 15px/1.2 var(--mono);color:var(--ink);box-shadow:0 2px 0 #d4c9b4;max-width:calc(100% - 28px)}#lgChip[hidden]{display:none}#lgChip b{color:var(--red);font-weight:500}#lgChip button{all:unset;cursor:pointer;border:1px solid var(--ink);border-radius:999px;padding:5px 11px;font:500 14px/1 var(--mono)}`;
  document.head.append(css);
  const wrap = document.createElement('div'); wrap.id = 'lg'; wrap.hidden = true; wrap.innerHTML = `<div id="lgCard" role="dialog" aria-label="The logic"><div id="lgHead"><b>The logic</b><button id="lgX" aria-label="Close">✕</button></div><div id="lgTabs" role="tablist"><button data-t="rules" role="tab">Rules</button><button data-t="chart" role="tab">Flow chart</button></div><div id="lgRules"></div><div id="lgChart"></div></div>`;
  const chip = document.createElement('div'); chip.id = 'lgChip'; chip.hidden = true; chip.innerHTML = '<span>Showing <b id="lgWhat"></b></span><button type="button" id="lgBack">chart</button><button type="button" id="lgClear" aria-label="Clear">✕</button>'; document.getElementById('frame').append(chip);
  document.body.append(wrap);
  const $ = id => document.getElementById(id), keyNow = () => location.hash.slice(1) || Object.keys(LOGIC)[0];
  const tab = t => { document.querySelectorAll('#lgTabs button').forEach(b => b.setAttribute('aria-selected',b.dataset.t === t)); $('lgRules').hidden = t !== 'rules'; $('lgChart').hidden = t !== 'chart'; };
  /* tap a state (or an arrow) in the flow chart: the parts of the picture drawn inside data-state="<id>" are copied above a paper veil with a red glow, so they stand out and everything else fades */
  const NS = 'http://www.w3.org/2000/svg', parts = id => id && id !== '[*]' ? [...$('art').querySelectorAll(`[data-state="${CSS.escape(id)}"]`)] : [];
  const nameOf = id => $('lgChart').querySelector(`.pele-state[data-id="${CSS.escape(id)}"] text`)?.textContent || id;
  let lit = null;
  function clearLit(){ $('lgHL')?.remove(); chip.hidden = true; lit = null; }
  function light(ids,what){ clearLit(); const els = ids.flatMap(parts); if (!els.length) return false;
    const g = document.createElementNS(NS,'g'), veil = document.createElementNS(NS,'rect'), base = $('art').getCTM().inverse(); g.id = 'lgHL';
    veil.setAttribute('width',1400); veil.setAttribute('height',1400); veil.setAttribute('fill','#fbf6ec'); veil.setAttribute('opacity','.74'); g.append(veil);
    for (const el of els){ const m = base.multiply(el.parentNode.getCTM()), w = document.createElementNS(NS,'g'), c = el.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      w.setAttribute('transform',`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`); w.style.filter = 'drop-shadow(0 0 4px #c66756) drop-shadow(0 0 1.5px #c66756)'; w.append(c); g.append(w); }
    $('fx').append(g); lit = ids.join('|'); $('lgWhat').textContent = what; chip.hidden = false; wrap.hidden = true;
    const f = $('frame').getBoundingClientRect(); if (f.top < 0 || f.bottom > innerHeight) $('frame').scrollIntoView({behavior:'smooth',block:'center'}); return true; }
  function pick(e){ const L = LOGIC[keyNow()], node = e.target.closest('.pele-state[data-id]'), edge = e.target.closest('.pele-transition[data-id], .pele-edge-label[data-id]');
    if (node){ const id = node.dataset.id; if (lit === id){ clearLit(); return; } if (!light([id],nameOf(id))) $('lgNote').textContent = `"${nameOf(id)}" has no single place in the picture: it is a step in the logic only.`; return; }
    if (edge){ const [a,b] = (L.edges || [])[+edge.dataset.id.replace('edge','')] || []; if (!a) return; const what = `${a === '[*]' ? 'start' : nameOf(a)} → ${nameOf(b)}`; if (!light([a,b],what)) $('lgNote').textContent = `The arrow ${what} has no place in the picture.`; } }
  function show(){ const L = LOGIC[keyNow()]; if (!L) return; $('lgRules').innerHTML = L.rules.map(r => `<div class="lgRule"><b>${r.rule}</b><p>${r.says}</p><p class="p">${r.path}</p></div>`).join('') + (L.checked ? `<p class="lgCheck">${L.checked} Checked by a small search over the model, not by TLC.</p>` : '');
    $('lgChart').innerHTML = `<p class="lgTip">Tap a state or an arrow to see it in the picture.</p>${L.chart()}<p id="lgNote"></p>`;
    $('lgChart').querySelectorAll('.pele-state[data-id]').forEach(n => n.classList.add(parts(n.dataset.id).length ? 'lgHas' : 'lgNone')); wrap.hidden = false; }
  $('lgChart').addEventListener('click',pick); $('lgClear').onclick = clearLit; $('lgBack').onclick = () => { clearLit(); show(); tab('chart'); };
  addEventListener('hashchange',clearLit); addEventListener('keydown',e => { if (e.key === 'Escape') clearLit(); });
  document.querySelectorAll('#lgTabs button').forEach(b => b.onclick = () => tab(b.dataset.t)); tab('rules');
  $('lgX').onclick = () => wrap.hidden = true; wrap.addEventListener('click',e => { if (e.target === wrap) wrap.hidden = true; }); addEventListener('keydown',e => { if (e.key === 'Escape') wrap.hidden = true; });
  const btn = document.createElement('button'); btn.id = 'lgBtn'; btn.type = 'button'; btn.textContent = 'The logic'; btn.onclick = show;
  const place = () => { const a = $('actions'); if (a && a.lastElementChild !== btn) a.append(btn); }; place(); new MutationObserver(place).observe($('actions'),{childList:true});   // last in the button row, not alone above it
}
})();
