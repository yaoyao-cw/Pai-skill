// <name>.check.mjs (copy this file next to <name>.mmd and rename it): the sheet's statechart as a small state machine, checked by visiting every reachable state
// (a plain breadth-first search, not a model checker). Run with `node <name>.check.mjs`; it writes <name>.json:
// {title, checked, rules:[{rule, says, path}]} for The logic panel.
//
// The states and arrows are READ FROM <name>.mmd, so the check can only test the machine you drew.
// You write three things: what each arrow label does to the data (EFFECT), the rules (RULES), and,
// for each rule's guard, the arrow(s) the guard keeps out (MUTANTS). Mutants are never part of the chart:
// they only show that taking the guard away really breaks the rule.
// This example is assets/examples/kettle.mmd. For a chart with parallel regions, keep one `at` per region.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NAME = fileURLToPath(import.meta.url).replace(/\.check\.mjs$/, "");
const MMD = readFileSync(NAME + ".mmd", "utf8"), BODY = MMD.slice(MMD.indexOf("stateDiagram"));
const TITLE = (MMD.match(/title:\s*"?([^"\n]+)"?/) || [, "Untitled"])[1];
const STATES = [...BODY.matchAll(/^\s*(\w+):\s/gm)].map(m => m[1]);
const ARROWS = [...BODY.matchAll(/^\s*(\w+|\[\*\])\s*-->\s*(\w+|\[\*\])(?::\s*(.+))?$/gm)].map(m => ({ from: m[1], to: m[2], label: (m[3] || "").trim() }));
const START_AT = ARROWS.find(a => a.from === "[*]").to;
const FINAL = new Set(ARROWS.filter(a => a.to === "[*]").map(a => a.from));

// the data the states don't hold on their own
const START = { at: START_AT, water: false };
// one entry per arrow label in the .mmd: `when` is its guard (must be able to be false), `set` changes the data
const EFFECT = {
  "fill it": { when: s => !s.water, set: { water: true } },
  "switch on [has water]": { when: s => s.water },
  "it boils": {},
  "pour": { set: { water: false } },
};
// the rules: each must hold in every reachable state, and names the guard it depends on
const RULES = {
  "Never boil dry": { says: "The kettle is never on without water in it.", ok: s => s.at === "cold" || s.water, guard: "has water" },
};
// for each guard: the arrow the chart would have without it. Never part of the chart.
const MUTANTS = {
  "has water": [{ from: "cold", to: "heating", label: "switch on, empty" }],
};

// ---- below here you shouldn't need to change anything ----
for (const a of ARROWS.filter(a => a.from !== "[*]" && a.to !== "[*]")) if (!EFFECT[a.label]) throw new Error(`.mmd arrow "${a.from} --> ${a.to}: ${a.label}" has no EFFECT`);
for (const l of Object.keys(EFFECT)) if (!ARROWS.some(a => a.label === l)) throw new Error(`EFFECT "${l}" is not an arrow in the .mmd`);
for (const [g, ms] of Object.entries(MUTANTS)) for (const m of ms) if (ARROWS.some(a => a.from === m.from && a.to === m.to && a.label === m.label)) throw new Error(`mutant "${m.label}" (${g}) is a real arrow in the .mmd`);
function moves(s, mutant = ""){
  const m = [];
  for (const a of ARROWS) if (a.from === s.at && a.to !== "[*]"){ const e = EFFECT[a.label]; if (!e.when || e.when(s)) m.push([a.label, { ...s, ...(e.set || {}), at: a.to }]); }
  for (const a of MUTANTS[mutant] || []) if (a.from === s.at) m.push([a.label, { ...s, ...(a.set || {}), at: a.to }]);
  return m;
}
const key = s => JSON.stringify(s);
function search(mutant){
  const seen = new Map([[key(START), null]]), q = [START]; let steps = 0; const bad = {};
  while (q.length){ const s = q.shift();
    for (const [r, R] of Object.entries(RULES)) if (!R.ok(s) && !bad[r]) bad[r] = s;
    for (const [ev, t] of moves(s, mutant)){ steps++; if (!seen.has(key(t))){ seen.set(key(t), [s, ev]); q.push(t); } } }
  const trail = s => { const p = []; for (let c = s; seen.get(key(c)); c = seen.get(key(c))[0]) p.unshift(seen.get(key(c))[1]); return p; };
  return { states: seen.size, steps, seen, bad: Object.fromEntries(Object.entries(bad).map(([r, s]) => [r, trail(s)])) };
}
const ok = search();
if (Object.keys(ok.bad).length) throw new Error("a rule breaks as built: " + JSON.stringify(ok.bad));
// every guard can be false somewhere it applies (a guard that is always true guards nothing)
for (const a of ARROWS) { const e = EFFECT[a.label]; if (!e || !e.when) continue;
  const here = [...ok.seen.keys()].map(k => JSON.parse(k)).filter(s => s.at === a.from);
  if (here.length && here.every(s => e.when(s))) throw new Error(`the guard on "${a.label}" is true in every reachable ${a.from}: it guards nothing`); }
// every state is reached, and from every reachable state an end (or, for a cycle, the start) can be reached
const reached = new Set([...ok.seen.keys()].map(k => JSON.parse(k).at));
const missing = STATES.filter(s => !reached.has(s));
if (missing.length) throw new Error("never reached: " + missing.join(", "));
// a chart that ends must be able to reach an end from every state; a cycle (no end) must be able to come back to its start
const GOAL = FINAL.size ? FINAL : new Set([START_AT]);
for (const k of ok.seen.keys()){ const s0 = JSON.parse(k), done0 = FINAL.size && GOAL.has(s0.at);
  const f = moves(s0).map(([, t]) => t), v = new Set(f.map(key)); let done = done0;
  while (f.length && !done){ const s = f.shift(); done = GOAL.has(s.at); for (const [, t] of moves(s)) if (!v.has(key(t))){ v.add(key(t)); f.push(t); } }
  if (!done) throw new Error("stuck: no way on from " + k); }
const shape = FINAL.size ? `every path can still reach its end (${[...FINAL].join(", ")})` : "from every state it comes back round to the start";
const rules = [{ rule: "Every step can happen, and none is a dead end", says: `Each of the ${STATES.length} states is reached from the start, and ${shape}.`, path: `Holds: all ${STATES.length} reached, none stuck.` },
  ...Object.entries(RULES).map(([rule, R]) => { const no = search(R.guard).bad[rule];
  if (!no) throw new Error(`adding the "${R.guard}" mutant does not break "${rule}": the guard may not be needed`);
  return { rule, says: R.says, path: `Take away the ${R.guard} guard and it breaks in ${no.length} step${no.length > 1 ? "s" : ""}: ${no.join(", ")}.` };  })];
const out = { title: TITLE, checked: `Every reachable state checked (${ok.states} states, ${ok.steps} steps). All ${rules.length} rules hold.`, rules };
writeFileSync(NAME + ".json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
