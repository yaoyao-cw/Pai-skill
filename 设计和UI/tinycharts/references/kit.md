# The kit

Every drawing function, grouped by file. When a name appears in two files the later one wins (copic.js after lib.js): those are listed once, from the file that wins. The build loads lib.js, looks.js, timekit.js, pear.js, then copic.js.

Coordinates: `x, y, z` are isometric world units (`P(x,y,z)` → sheet point); `a, b` or `sx, sy` are sheet points. Colours are hex; the build softens every colour toward the marker palette.

Coordinates differ by function: `person`, `blob`, `dot`, `shape`, `line`, `fill`, `flat`, `rim` and `pen` take sheet points; `box`, `cyl`, `lifeTurn`, `board`, `cast`, `label`'s target and the animals (`cat`, `hen`, `duck`, `cow`, `sheep`, `dog`, `tree`, `pond`, `hive`) take world x, y. Convert with `P(x,y,z)` (world → sheet) and `at(sx,sy)` (sheet → world).

Also shared, and used by every example though not in the tables: `begin(seed)` (start `draw`), `rnd()` (the seeded random), `n1(v)` (round for SVG), `pathOf(pts)` (SVG path data), `ground(pts)` (a shadow laid in place), `litOf(c)`, `shadeOf(c)`, `trim(c)` (lighter, shaded and edge tones of a colour), `PAL` (named colours), `C`, `S` (the iso cosine and sine), `ROUTES` (every red arrow's points, for `onRoute`), `figure(x,y,o)` (a person without the tap bubble).

Most used: `box` (a solid), `board` (the ground slab), `cyl`, `lifeTurn` (anything off a lathe: cups, pots, bins), `flat`/`fill` (a wash), `rim`/`pen`/`line`/`rule` (ink), `group` (wrap a state), `label` (margin note), `person` (people), `blob`, `spline`, `put`/`flush`.


## lib.js

| function | what it does |
|---|---|
| `mixC(a,b,t)` | mix two hex colours, t from 0 to 1 |
| `hull(pts)` | convex hull of points |
| `P(x,y,z=0)` | world point (x,y,z) → sheet point |
| `at(sx,sy)` | sheet point → world (x,y) on the ground |
| `wob()` | a slow wobble function (internal) |
| `resample(pts, step = 8)` | evenly spaced points along a path (internal) |
| `hand(pts, amp, over = 0)` | a hand-drawn version of a path (internal) |
| `sway(lo,hi,n)` | (internal) slow drift for the pen |
| `chase(t, L, ds, z = .72)` | (internal) the pen following points |
| `ease(x,l)` | smoothstep from 0 to 1 over length l |
| `line(pts, {w = 1.5, col = INK, amp = .7, over = 2.2} = {})` | an ink stroke through sheet points, with pressure: {w, col} |
| `pencilDefs()` | (internal) the pencil patterns |
| `fill(pts, col, {dx = 1.3, dy = .9, amp = 1} = {})` | a marker wash over a polygon, with paper tooth |
| `hatch(poly, {dir = [0,1], gap = 5.5, w = .7, col = INK, keep = .86, from = 0, to = 1} = {})` | ink hatching inside a polygon |
| `lerp(a,b,t)` | linear interpolation |
| `inkLoop(pts, o)` | an ink outline round a closed polygon |
| `text(str, m, {size = 20, cls = 'tt', col = INK, anchor = 'start', track = 1} = {})` | text sits on the same three planes as everything else |
| `floorText(x,y,z,s,o)` | text lying flat on the floor plane at (x,y,z) |
| `rightText(x,y,z,s,o)` | text on a right-facing wall at (x,y,z) |
| `cast(x,y,w,d,h,z = 0)` | queue a shadow for a box |
| `castDisc(x,y,r,h,z = 0)` | queue a shadow for a cylinder |
| `ringAt(fn,n=30)` | points round a unit circle, mapped through fn(cos,sin) |
| `dot(x,y,r,col,ink=1.2)` | a small filled and inked circle at a sheet point |
| `ticket(x,y,label,{no,pin,enter = 'x',exit = null})` | a numbered ticket tag on the floor |
| `arrow(pts, o = {})` | a red arrow along world points on the floor |
| `say(x,y,s)` | hand lettering flat on the floor |
| `blob(cx,cy,rx,ry,bump = 0,k = 7)` | a soft round shape (sheet points) |
| `shape(pts,col,o = {})` | a washed and inked polygon |
| `person(bx,by,o)` | a person at a sheet point; o.say is what they say when tapped |
| `spline(c,closed = true,step = 1.4)` | The doll is based on Kevin T. Ngo's statechart-art (MIT): same head, limbs, shoes, blush and dot eyes. |
| `oval(cx,cy,rx,ry = rx)` | an ellipse as 16 points |
| `capsule(a,b,ra,rb = ra)` | a rounded bar between two points |
| `limbOf(pts,r)` | (internal) a limb outline |
| `who(x,y,o,z = 0)` | a person standing at a world point |
| `onAxis(x,y,z,rx,ry)` | an ellipse in a horizontal plane at height z |
| `hen(x,y,col = '#fffdf6',look = 1)` | a hen |
| `duck(x,y,look = 1)` | a duck |
| `cow(x,y)` | a cow |
| `sheep(x,y)` | a sheep |
| `dog(x,y)` | a dog |
| `cat(x,y,z = 0)` | a cat with a wagging tail |
| `panelL(x,y,z,w,h,col)` | a flat panel on a left-facing wall |
| `panelR(x,y,z,w,h,col)` | a flat panel on a right-facing wall |
| `tree(x,y,r = 52,apples = true,z = 0)` | a round tree, apples optional |
| `scarecrow(x,y)` | a scarecrow |
| `laundry(x0,y0,x1,y1)` | a washing line with clothes |
| `bee(a,b)` | a bee with its flight path |
| `put(x,y,fn)` | queue drawing; flush() draws by key, back to front |
| `onRoute(p,reach = 14)` | (internal) snap to a route |
| `route(a,b,horizontalFirst = true)` | a red route between two world points |
| `group(attrs,fn)` | wrap drawing in <g attrs>…</g>; use data-state="id" for states |
| `plus(x,y,r = 7)` | a small construction cross |
| `ticks(x,y,r,a0,a1,n = 4,L = 12)` | tick marks round an arc |
| `stipple(cx,cy,rx,ry,n = 26)` | random dots in an ellipse |
| `windpump(x,y)` | a wind pump |
| `rotorPath(x,y,a)` | (internal) its rotor |
| `wander(el,pts,t,speed,phase = 0)` | something on a beat: walks there and back along world points, bobbing as it goes |
| `rising(el,k,dx,dy,s0,s1)` | scale and lift an element (in tick) |
| `flush()` | draw everything queued with put() |
| `finish()` | end draw(): flush and write the SVG |
| `title(small, big, x = 72)` | the title block: kicker and title |
| `leaf(p,ang,L,wd,col = PAL.sage,rib = true)` | one leaf |
| `dash(a,b,col = '#7f9db3')` | a dashed line |

## copic.js

| function | what it does |
|---|---|
| `lookGrid()` | (internal) the faint construction grid |
| `handRing(c,r,col,w,paper)` | a hand-drawn ring |
| `leader(a,b,sx)` | a leader line with rings at both ends |
| `label(tx,ty,title,note,to,side = 'start')` | a margin note: title, note, leader line to a world point |
| `tag(x,y,w,text)` | a pinned paper tag |
| `rim(pts,w,col,o = 1)` | ink outline of a polygon (plain SVG stroke) |
| `flat(pts,col)` | a flat wash with no wobble |
| `edge(a,b,w = .9,o = 1.6)` | one ink edge |
| `pen(pts,w = 1)` | an ink line through points, no overshoot |
| `rule(pairs,col = INK,w = .6,o = 1)` | many fine lines as one path: courses, boards, tile joints |
| `clipped(pts,fn)` | draw fn clipped to a polygon |
| `cross(p,dirs,L = 15)` | the construction lines that run on past a corner |
| `box(x,y,z,w,d,h,{top,left = PAL.shade,ink = 2,marks = true} = {})` | a solid. `left` colours the +x face (the one facing down-right on the sheet); the +y face gets a shaded `left`, the top `top` or a lighter `left`. `marks:false` drops the construction ticks |
| `block(x,y,z,w,d,h,{wall = PAL.tan,deck = '#cfc6b8',t = 7,sink = 9,ink = 2} = {})` | a block with real walls: the roof is sunk behind a parapet you can see over |
| `openL(x,y,z,w,h,r,back,after)` | openings go into the wall: you see the jamb and the sill before the glass, as in a real reveal |
| `openR(x,y,z,w,h,r,back,after)` |  |
| `cill(a,b,c,col = '#d9cfbf')` | a window cill |
| `windowL(x,y,z,w,h,{r = 5} = {})` |  |
| `windowR(x,y,z,w,h,{r = 5} = {})` |  |
| `doorPanels(B,col)` | (internal) door panels |
| `doorL(x,y,z,w,h,col,{r = 4} = {})` |  |
| `doorR(x,y,z,w,h,col,{r = 4} = {})` |  |
| `flight(x,y,z,n,go,up,wd,axis = 'x',col = '#e4dbcb')` | a real flight: every tread and riser drawn, a stringer on the open side. Climbs along +run, `n` steps of `go` by `up` |
| `cyl(x,y,z,r,h,col,{ink = 1.4, cap = null} = {})` |  |
| `board(x,y,w,d,h,top,side,r = 30,z = 0)` | the ground is a cut slab with square corners, as in an architect's site model |
| `layShades()` |  |
| `sideOf(x,y)` | side-on contours: u runs along the x axis and v is height, so an animal stands in the plane of the drawing rather than as a stack of boxes |
| `contour(Q,pts,col,w = 1,step = 3)` |  |
| `puffRow(x0,x1,y,z,{hw = 18,h = 27} = {})` | plants stay round and friendly: a soft puff of leaf with one ink line, however exact the buildings around them are |
| `gable(x,y,w,d,h,rise,{wall = WALL,roof = ROOF,before = null,clad = null} = {})` | a roof of real tiles with a ridge cap, bargeboards and a gutter |
| `boards(pts,n,col = INK,o = .55)` | board joints across a face |
| `farmhouse(x,y)` | a whole farmhouse |
| `barn(x,y)` | a barn |
| `coop(x,y)` | a hen coop |
| `fence(pts)` | a fence along world points |
| `stones(list)` | stepping stones [[x,y,r]…] |
| `hay(x,y)` | a hay bale |
| `garden(x,y,w,d)` | a vegetable bed |
| `pond(x,y,rx,ry)` | a pond |
| `reeds(x,y)` | reeds |
| `hive(x,y)` | a beehive |
| `bucket(x,y,col = '#a6a4a4')` | a bucket |

## timekit.js

| function | what it does |
|---|---|
| `lifeDraw(seed,c)` | the Time view: a tape pulled out in the order things happen. Each numbered stretch is one step, a longer stretch is a longer wait, and each step stand |
| `lifeArc(x,y,z,r,a,b,n = 12)` | the shared workshop: turned parts, pipes and machines drawn the way the real ones are put together. World units; k scales a whole machine |
| `lifeTurn(x,y,z,prof,col,{cap = null,ink = .9,seam = true,wall = 0,sink = 4} = {})` | anything off a lathe: prof is [radius,height] from the foot up. wall leaves it open at the top, with `cap` sunk inside by `sink` |
| `lifeDrum(x,y,z,r,L,col,{cap = null,ink = 1,hoops = []} = {})` | a drum lying down: the axis runs along +x from (x,y,z), so its far end is the plate you can see |
| `lifeWheel(x,y,z,r,t,tyre = '#3f3a39',hub = '#a6a4a4')` | a wheel on the +y side of a vehicle |
| `lifePipe(pts,w,col = '#a6a4a4')` | a pipe along sheet points |
| `lifeDots(pts,rx,ry,col,ink = .4)` | many small ellipses in one path |
| `lifeLeaves(list,col,ink = .5)` | many leaves in one path |
| `lifeShrub(a,b,h)` | a coffee shrub: one upright stem with long laterals that droop under their own crop, leaves in opposite pairs, cherries hugging the wood at the nodes. |
| `lifeSack(sx,sy,s = 1,col = PAL.tan,word = null)` | a standing sack |
| `lifeBag(x,y,z,l,w,h,col = '#cdb68e')` | the same sack lying down, for stacks |
| `lifePallet(x,y,z,w,d)` | a pallet |
| `lifeTank(x,y,z,w,d,h)` | a washing channel: cast walls you can see over, a dividing wall, a sluice on a screw and the outfall |
| `lifePatio(x,y,z,w,d,{ridges = 7,bay = 60,dense = 1} = {})` | a drying patio: a screeded slab with a kerb, cast bays, beans raked into long ridges |
| `lifeHopper(x,y,z,rb,rt,h,col,fillC = '#7d4e2a')` | a tapered hopper of folded sheet, open at the top, seen from above |
| `lifeRoaster(x,y,z = 0,k = 1,{stack = 150,ink = 1.1} = {})` | a shop drum roaster: burner cabinet, enamel drum with its hoops, hopper, faceplate, chaff cyclone and stack, cooling tray with stirring arms. Returns  |
| `lifeEspresso(x,y,z = 0,k = 1,{ink = 1,groups = [26,66]} = {})` | an espresso machine |
| `lifeCup(x,y,z,s,drink = '#5a3a22')` | a cup on its saucer. s is the cup's radius in world units |
| `lifeCounter(x,y,w,d,h,col,top,{n = 22} = {})` | a tall counter: recessed kick, boarded front, a real top with a nosing and a grain |
| `lifeShip(x,y,z = 0,k = 1,{ink = 1} = {})` | a small container ship: flared bow, parallel body, boot-top and plating, a stacked deck, the house aft with funnel and mast. Bow to -x |
| `lifeBoard(x,y,w,d,h,top,side,r)` | a board slab (timeline sheets) |
| `lifeDesk(x,y,c)` | (timeline) the desk |
| `lifeRule(sx,sy,T2,c)` | (timeline) the ruler |
| `lifeSip(x,y,c)` | (timeline) a cup on the desk |
| `lifeInit(ctx,c)` | (timeline) init for lifeDraw sheets |

## looks.js

| function | what it does |
|---|---|
| `blockFigure(bx, by, { shirt = PAL.sky, pants = '#2f2925', hair = 'short', hairCol = '#2e2622', apron = null, arm = 'down', kid = false, hold = null, cap = null, size = 1, sit = 0 })` | (alternative people) blocks |
| `pawnFigure(bx, by, { shirt = PAL.sky, kid = false, hold = null, size = 1, sit = 0 })` | (alternative people) pawns |
| `figure(bx, by, o = {})` | (internal) the doll; use person() |

## pear.js

`pearFigure(x, y, {shirt, hair, arm, look, kid, size, sit, apron, cap})` draws the people; call it through `person(x, y, {…, say: 'hello'})` so a tap makes them speak. `hair`: short, bun, bob, long, wavy, hat, cap. `arm`: down, wave, up, out, front, hold, lap. `look`: -1 left, 1 right.

