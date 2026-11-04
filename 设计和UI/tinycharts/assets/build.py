#!/usr/bin/env python3
"""Tinycharts: wrap one or more sheets into one HTML page with the kit in this folder.

  python3 build.py sheet.js [more.js ...] -o page.html [--names "Library book,Bee"] [--logic]
  python3 build.py --standalone examples/cocoa/cocoa.template.html -o cocoa.html

Each sheet file defines draw(seed) and init(ctx) (see SKILL.md). Its key is the file name
without .js, so cat.js becomes SHEETS.cat. Tabs appear in the order given. The kit files
(lib.js, looks.js, timekit.js, pear.js, copic.js, app.js, marker.txt) are read from the
folder this script sits in. Trimmed from the Tinycharts site build.
"""
import argparse, colorsys, html, json, os, pathlib, re, subprocess
root = pathlib.Path(__file__).parent
read = lambda n: (root/n).read_text(encoding='utf8')
# one knob for how bright the whole book is: every colour in the drawings goes through here
SAT, LIFT = .8, .08
PIGMENTS = [(13,.56),(40,.74),(86,.34),(150,.28),(208,.3),(345,.42)]
PLAIN = '#frame::after{display:none}#sheet{background-image:none!important;background-color:#fbf7ec!important}#views button[aria-current=page]{--tab:#fbf7ec}'
COPIC = PLAIN.replace('#fbf7ec','#fbf6ec')+''':root{--mono:Gaegu,"DM Sans",sans-serif;--hand:Gaegu,"DM Sans",sans-serif}
.tt{font-family:var(--mono)}text.it{font-family:Gaegu,"DM Sans",sans-serif;font-style:normal!important;font-size-adjust:.5;letter-spacing:.5px}
.cap{font-family:Gaegu,"DM Sans",sans-serif;font-size-adjust:.5;letter-spacing:1.4px}
text.tt[font-size="74"],text.tt[font-size="70"],text.tt[font-size="72"],text.tt[font-size="68"],text.tt[font-size="66"]{font-family:"Young Serif",Georgia,serif;font-size:76px;letter-spacing:-1px}
text.tt[font-size="16"]{font-size:13px;letter-spacing:2.4px;text-transform:uppercase}
#views b{font-family:"Young Serif",Georgia,serif;font-weight:400;letter-spacing:0}
#pin{position:absolute;left:14px;top:14px;z-index:3;display:flex;flex-direction:column;gap:3px;background:var(--paper);border:1px solid var(--ink);border-radius:4px;padding:8px 12px;font-family:var(--hand);font-size-adjust:.5;line-height:1.15;pointer-events:none}#pin[hidden]{display:none}#pin b{font-weight:400;font-size:17px;letter-spacing:1.2px}#pin span{font-size:14px;opacity:.75}
#views small,#actions button,#actions::before,#status,#hint,#tabs button,#credit,footer,#side li{font-size-adjust:.5!important;font-style:normal!important}
@media (min-width:1px){#views small{white-space:nowrap}}
#actions{align-items:center}#actions button{font:500 15px/1 var(--mono);padding:10px 15px;border-radius:999px;background:transparent}
#actions button.run{order:-2;background:var(--red);border-color:var(--red);color:#fffdf6}#actions button.next{background:var(--paper);color:var(--ink);border-color:var(--ink)}
#actions:has(button:not(.run):not(.next) ~ button:not(.run):not(.next))::before{content:"Pick one";order:-1;width:100%;font:500 12px/1 var(--mono);letter-spacing:.8px;color:var(--ink);opacity:.72;text-transform:uppercase}'''
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gaegu&family=DM+Sans:wght@400;500&family=Young+Serif&display=swap">'
def soften(m):
    r,g,b = (int(m[0][i:i+2],16)/255 for i in (1,3,5))
    h,l,s = colorsys.rgb_to_hls(r,g,b)
    if l > .3: l += (.8-l)*LIFT
    if .2 < l < .58: l += (.62-l)*.42
    if s > .04:
        d,cap = min(PIGMENTS,key=lambda a: min(abs(a[0]-h*360),360-abs(a[0]-h*360)))
        e = (d-h*360+180)%360-180
        h = ((h*360+e*.6)%360)/360; s = min(cap,s*SAT)
    return '#'+''.join(f'{round(v*255):02x}' for v in colorsys.hls_to_rgb(h,l,s))
soft = lambda js: re.sub(r'#[0-9a-fA-F]{6}\b',soften,js)
PAGE = '''<!doctype html><meta charset="utf-8"><title>Field Notes</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cutive+Mono&family=Courier+Prime:ital,wght@1,400&display=swap">
<style>
/* one sketchbook on a desk: the sheet fills the height, a torn-paper strip of controls sits under it */
:root{--desk:#e3dac8;--paper:#f4efe3;--ink:#2f261e;--red:#b23a38;--gold:#e5b45a;--mono:"Cutive Mono","Courier New",monospace;--hand:"Courier Prime","Courier New",monospace}
html,body{min-height:100%}
body{background:var(--desk);color:var(--ink);font-family:var(--mono);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:10px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;overflow-x:hidden}
#tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
#tabs button,#actions button{font:14px var(--mono);color:var(--ink);background:var(--paper);border:1px solid var(--ink);padding:6px 11px;cursor:pointer;border-radius:2px;white-space:pre}
#tabs button[aria-current=page]{background:var(--ink);color:var(--paper)}
#tabs .new::after{content:" new";color:#b23a38;font-size:11px}#tabs [aria-current=page].new::after{color:#e5b45a}
#actions button{border-color:var(--red);color:var(--red)}
/* the three ways of telling one story: index cards tucked behind the right edge of the sheet, so the sheet keeps its full height; the open one joins the paper */
body[data-fam=coffee]{--desk:#e4d0ab;--paper:#f5e9d2;--tabon:#efe1c8;--taboff:#d6bd92}
body[data-fam=pottery]{--desk:#e3cbbd;--paper:#f4e6dc;--red:#9c4a32;--tabon:#efdcd0;--taboff:#d3b3a2}
body[data-fam=bakery]{--desk:#d3dbe1;--paper:#e9eef1;--red:#3f5f7f;--tabon:#e1e8ec;--taboff:#bcc9d2}
body[data-fam=tea]{--desk:#d6dfcf;--paper:#eaf0e4;--red:#2f7a5f;--tabon:#e2e9dc;--taboff:#c3d0bb}
#holder{position:relative;width:min(100%,calc(100dvh - 172px));display:flex;flex-direction:column}
#views{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;order:-1;margin-bottom:-1px;position:relative;z-index:2;align-items:end}#views:empty{display:none}
#views button{--tab:var(--taboff,#d8ccb4);display:flex;align-items:center;justify-content:center;gap:7px;color:var(--ink);background:var(--tab);border:1px solid var(--ink);border-bottom:0;border-radius:9px 9px 0 0;padding:0 6px;cursor:pointer;height:36px;box-sizing:border-box}
#views svg{width:24px;height:24px;display:block;flex:none}
#views b{font:400 16px/1 var(--mono);letter-spacing:.3px}
#views small{display:none}
#views button:hover{--tab:var(--tabon,#e4d9c3)}
#views button[aria-current=page]{--tab:var(--tabon,#ece5d9);height:42px;border-top:3px solid var(--red)}
#views button[aria-current=page] b{color:var(--red)}
body:has(#views:not(:empty)) #holder{width:min(100%,calc(100dvh - 216px))}
@media (min-aspect-ratio:11/10) and (min-width:900px){
body:has(#views:not(:empty)) #holder{width:min(calc(100% - 320px),calc(100dvh - 172px))}
#views{position:absolute;left:100%;top:26px;width:172px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin:0 0 0 -1px}
#views button{flex-direction:column;align-items:flex-start;gap:5px;width:150px;height:auto;padding:11px 12px 10px 14px;border:1px solid var(--ink);border-left:0;border-radius:0 12px 12px 0;text-align:left}
#views button:hover{transform:translateX(3px)}
#views button[aria-current=page]{width:166px;height:auto;border-top:1px solid var(--ink);border-right:4px solid var(--red)}
#views svg{width:34px;height:34px}#views b{font-size:21px}#views small{display:block;font:italic 12px/1.15 var(--hand);opacity:.75}}
/* on a wide screen everything that is not the drawing lives in one column to its right, so the sheet takes the full height */
@media (min-aspect-ratio:11/10) and (min-width:1180px){
body #holder,body:has(#views:not(:empty)) #holder{width:min(calc(100% - 460px),calc(100dvh - 76px))}
#views button{padding:8px 12px 8px 14px;gap:3px}#views svg{width:28px;height:28px}#views b{font-size:19px}
body #panel{position:absolute;left:calc(100% + 18px);top:26px;width:200px;margin:0;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:flex-start;justify-content:flex-start;gap:12px}
body:has(#views:not(:empty)) #panel{top:334px}
body #status{flex:none;text-align:left;width:100%;font-size:16px;line-height:1.3}
body #credit{position:absolute;left:calc(100% + 18px);bottom:0;width:200px;margin:0;text-align:left;font-size:11.5px;line-height:1.35}}
#actions button:hover,#tabs button:hover{transform:translateY(-1px)}
button:focus-visible{outline:2px solid var(--red);outline-offset:2px}
#stage{width:100%;display:flex;justify-content:center}
#frame{position:relative;overflow:hidden;box-shadow:0 1px 0 #cdbfa8,3px 4px 0 #d4c9b4;width:100%;aspect-ratio:1;line-height:0}
#frame::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;background-size:320px;opacity:.5;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .22  0 0 0 0 .18  0 0 0 0 .14  1.1 0 0 0 -.56'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>")}
#sheet{display:block;width:100%;height:100%;background-color:var(--paper);background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .4  0 0 0 0 .34  0 0 0 0 .25  .14 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>");transform-origin:0 0}
#panel{margin-top:8px;width:min(900px,100%);display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;min-height:36px}
#status{font:italic 15px var(--hand);text-align:center;min-width:0;flex:1 1 280px}
#hint{font:12px var(--mono);opacity:.72}
#credit{font:12px var(--hand);font-style:italic;opacity:.72;text-align:center;margin:8px 0 0}#credit a{color:inherit}
#actions{display:flex;flex-wrap:wrap;gap:6px}
.tt{font-family:var(--mono)}.it{font-family:var(--hand);font-style:italic}
.hit{cursor:pointer}
.who,.spring{transform-box:fill-box;transform-origin:50% 100%}
.hop{animation:hop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes hop{0%{transform:translateY(0)}35%{transform:translateY(-14px) rotate(-2deg)}70%{transform:translateY(0) scale(1.03,.97)}100%{transform:none}}
.bubble{animation:pop 1.5s both}
@keyframes pop{0%{opacity:0;transform:translateY(8px)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0}}
.ping{fill:none;stroke:var(--red);stroke-width:2.4;animation:ping .9s ease-out both;transform-box:fill-box;transform-origin:center}
@keyframes ping{from{transform:scale(.5);opacity:1}to{transform:scale(3.2);opacity:0}}
#tint{pointer-events:none;mix-blend-mode:multiply;transition:opacity .8s,fill .8s}
.floor{transition:transform .8s cubic-bezier(.5,0,.2,1)}
.guide{transition:opacity .4s}
.on{animation:wig .7s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes wig{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg) translateY(-3px)}}
.cloth{transform-box:fill-box;transform-origin:50% 0;animation:sway 2.8s ease-in-out infinite alternate}
@keyframes sway{from{transform:skewX(-4deg)}to{transform:skewX(5deg)}}
.rain{animation:rain .7s ease-in both}
@keyframes rain{from{transform:translateY(-70px);opacity:0}30%{opacity:1}to{transform:translateY(0);opacity:0}}
.plant{transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.fall{animation:fall .9s cubic-bezier(.5,0,1,.7) both}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(var(--d,110px))}}
.lit{transition:opacity .4s}
.peck{transform-box:fill-box;transform-origin:50% 100%;animation:peck 2.6s ease-in-out infinite}
@keyframes peck{0%,70%,100%{transform:none}80%{transform:translateY(7px) rotate(24deg)}90%{transform:none}}
.bob{animation:bob 2s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-6px)}}
.swing{transform-box:fill-box;transform-origin:50% 0;animation:swing 3s ease-in-out infinite alternate}
@keyframes swing{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
.pulse{animation:pulse 1.2s ease-in-out infinite alternate}
@keyframes pulse{from{opacity:.55}to{opacity:1}}
.crown,.tail,.nod,.wag{transform-box:fill-box}
.crown{transform-origin:50% 100%;animation:crown 3.6s ease-in-out infinite alternate}
@keyframes crown{from{transform:rotate(-1deg)}to{transform:rotate(1.1deg)}}
.tail{transform-origin:50% 0;animation:tail 1.4s ease-in-out infinite alternate}
@keyframes tail{from{transform:rotate(-12deg)}to{transform:rotate(14deg)}}
.wag{transform-origin:0 100%;animation:tail .35s ease-in-out infinite alternate}
.nod{transform-origin:0 100%;animation:nod 3s ease-in-out infinite alternate}
@keyframes nod{0%,60%{transform:none}100%{transform:rotate(7deg)}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;transition-duration:.01s!important}}
@@LOOKCSS@@</style>
<nav id="tabs" aria-label="Sheets"></nav>
<div id="stage"><div id="holder"><nav id="views" aria-label="Views"></nav><div id="frame"><div id="pin" hidden></div><svg id="sheet" viewBox="0 0 1400 1400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactive hand-drawn isometric sheet"><g id="art"></g><rect id="tint" width="1400" height="1400" fill="#3b4a7a" opacity="0"/><g id="fx" pointer-events="none"></g></svg></div>
<div id="panel"><div id="actions"></div><div id="status" aria-live="polite"></div><div id="hint"></div></div>
<p id="credit">Inspired by <a href="https://github.com/kevintngo/statechart-art">statechart-art</a> by Kevin T. Ngo. <span id="ruled">Rules checked with <a href="https://github.com/cursor/plugins/tree/main/pstack">/statechart</a> by poteto.</span></p></div></div>
<script>
const SHEETS = {};
@@LIB@@
@@SCENES@@
@@APP@@
</script>
''' 
def lib():
    l = read('lib.js').replace('function figure(bx,by,{','function dollFigure(bx,by,{')
    l = l.replace("if (lum > 236) return col;","if (lum > 244) return col;")
    l = l.replace('function hand(pts, amp, over = 0){','function hand(pts, amp, over = 0){ amp = 0; over = 0;')
    l = l.replace('function line(pts, {w = 1.5, col = INK, amp = .7, over = 2.2} = {}){','function line(pts, {w = 1.5, col = INK, amp = .7, over = 2.2} = {}){ w *= .8; amp = LOOSE; over = Math.min(over,2.4);')
    l = l.replace('keep = .86, from = 0, to = 1} = {}){','keep = .86, from = 0, to = 1} = {}){ return;')
    l = l.replace("INK = '#231e16'","INK = '#2b2930'")
    l = l.replace("const h = pencilDefs()+out.join('');","const h = pencilDefs()+lookGrid()+out.join('').replace(/<text[^>]*>field notes[^<]*<\\/text>/gi,'').replaceAll('y=\"118\" class=\"tt\" font-size=\"16\"','y=\"100\" class=\"tt\" font-size=\"16\"');")
    return l + read('looks.js').replace("const figure = (bx, by, o = {}) => PEOPLE === 'block'","const figure = (bx, by, o = {}) => PEOPLE === 'doll' ? pearFigure(bx, by, o) : PEOPLE === 'block'") + read('timekit.js') + read('pear.js') + read('copic.js')
page = lambda sc,ap: PAGE.replace('<style>',FONTS+'<style>',1).replace('@@LOOKCSS@@',COPIC).replace('@@LIB@@',soft(lib()).replace('@@TOOTH@@','data:image/png;base64,'+read('marker.txt'))).replace('@@SCENES@@',soft(sc)).replace('@@APP@@',ap)

def build(files, out, names=None, logic=False):
    files = [pathlib.Path(f) for f in files]
    keys = [f.stem for f in files]
    names = names or [k[:1].upper()+k[1:] for k in keys]
    sc = ''.join(f"SHEETS.{k} = (() => {{\n{f.read_text(encoding='utf8')}\nreturn {{draw, init: typeof init === 'function' ? init : () => ({{}})}};\n}})();\n" for k,f in zip(keys,files))
    app = re.sub(r"(?<=')#[0-9a-f]{6}(?=':)",soften,read('app.js'))
    app = re.sub(r"const ORDER = \[.*?\]\];", lambda _: 'const ORDER = '+json.dumps([[k,n] for k,n in zip(keys,names)],ensure_ascii=False)+';', app, count=1, flags=re.S)
    app = re.sub(r"const VIEWS = \{.*?\}, HOME = \{\};", "const VIEWS = {}, HOME = {};", app, count=1, flags=re.S)
    app = app.replace(": 'farm';", f": '{keys[0]}';")
    if logic: app += logic_block(files, keys)
    doc = page(sc,app).replace('Pen, pencil and people adapted','Pen and people adapted').replace('<title>Field Notes</title>',f'<title>{html.escape(names[0]) if len(names) == 1 else "Tinycharts"}</title>')
    pathlib.Path(out).write_text(doc,encoding='utf8'); return out

def standalone(template, out):
    """A sheet that brings its own page (like examples/cocoa): its template holds @@KIT@@ where the kit goes."""
    t = pathlib.Path(template).read_text(encoding='utf8')
    kit = soft(lib()).replace('@@TOOTH@@','data:image/png;base64,'+read('marker.txt'))
    pathlib.Path(out).write_text(t.replace('@@KIT@@',kit),encoding='utf8'); return out

def logic_block(files, keys):
    """The Logic panel: for each sheet, <name>.json (rules, written by <name>.check.mjs) and <name>.mmd (drawn by pele, if installed)."""
    pele, data = {}, {}
    for f,k in zip(files,keys):
        mmd, js = f.with_suffix('.mmd'), f.with_suffix('.json')
        data[k] = json.loads(js.read_text(encoding='utf8')) if js.exists() else {'rules':[]}
        if mmd.exists():
            src = mmd.read_text(encoding='utf8')
            data[k]['edges'] = [list(m) for m in re.findall(r'^\s*([^\s:]+)\s*-->\s*([^\s:]+)', src, re.M)]
            try:
                r = subprocess.run(['node','-e',"import('pele').then(({render})=>process.stdout.write(render(require('fs').readFileSync(0,'utf8')).svg))"], input=src, capture_output=True, text=True, timeout=60)
                if r.returncode == 0 and r.stdout.startswith('<svg'): pele[k] = r.stdout
                else: print(f'note: {mmd.name}: flow chart not drawn (npm install pele, then run build.py from that folder)')
            except FileNotFoundError: print('note: node not found, flow chart not drawn')
    return '\nconst PELE = '+json.dumps(pele,ensure_ascii=False)+';\nconst LOGICDATA = '+json.dumps(data,ensure_ascii=False)+';\n'+read('logic.js')

def standalone(template, out):
    """A sheet that brings its own page (like examples/cocoa): its template holds @@KIT@@ where the kit goes."""
    t = pathlib.Path(template).read_text(encoding='utf8')
    kit = soft(lib()).replace('@@TOOTH@@','data:image/png;base64,'+read('marker.txt'))
    pathlib.Path(out).write_text(t.replace('@@KIT@@',kit),encoding='utf8'); return out

if __name__ == '__main__':
    a = argparse.ArgumentParser(description='Wrap Tinycharts sheets into one HTML page.')
    a.add_argument('sheets', nargs='+'); a.add_argument('-o','--out', default='tinycharts.html'); a.add_argument('--names', default=None); a.add_argument('--logic', action='store_true', help='add The logic panel (rules from <name>.json, flow chart from <name>.mmd)'); a.add_argument('--standalone', action='store_true', help='the one input is a page template with @@KIT@@')
    o = a.parse_args(); print('wrote', standalone(o.sheets[0], o.out) if o.standalone else build(o.sheets, o.out, o.names.split(',') if o.names else None, o.logic))
