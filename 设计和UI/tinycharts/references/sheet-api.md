# The sheet contract

A sheet is one `.js` file. `build.py` wraps it as `SHEETS.<file name> = (() => { …your file… return {draw, init}; })();`, so everything you declare stays private to the sheet. The kit's names (`P`, `OX`, `OY`, `INK`, `RED`, `out`, `line`, `box`…) are shared: don't redeclare them.

`assets/examples/minimal.js` is the smallest working sheet. Copy it to start, then grow it toward the example for your type.

## draw(seed)

```js
function draw(seed){ begin(seed); OX = 700; OY = 560;      // OX, OY: where world (0,0,0) lands on the 1400 × 1400 sheet
  title('a clock · statechart','A bee\'s day');            // kicker (font 16) and title (font 70)
  put(x+y, 0, () => box(...));                            // queue solids; flush() draws them back to front by key
  group('data-state="asleep"', () => { ... });           // every state's part of the picture
  label(72, 980, 'the hive', 'where she sleeps', [wx, wy, wz], 'start');  // margin note with a leader line to a world point
  finish(); }                                             // flushes, lays shadows, writes the SVG into #art
```

- World coordinates are isometric: `P(x, y, z)` gives the screen point. x runs down-right, y down-left, z up.
- `put(key, 0, fn)` queues drawing so nearer things cover farther ones; the key is usually `x + y`. Anything drawn after `flush()` sits on top of everything (overlays, the travelling token).
- Hidden parts that a press reveals: draw them in `draw` inside `group('id="steam" style="display:none"', …)` and switch `display` in `init`.
- Plain text on the flat sheet: push an SVG `<text>` with class `it` (hand lettering), `cap` (small capitals) or `tt`.
- `const PHONE = matchMedia('(max-width:820px)').matches` and a helper `sz = (desktop, phone) => PHONE ? phone : desktop` give phone text sizes (phones show the sheet at about a quarter size).
- Use `title(kicker, title)` for the title block. The build deletes any `<text>` that begins with "field notes" (the examples' own kickers vanish that way), so don't start a kicker with those words.
- Wall and floor text: `floorText` lies on the ground, `rightText` sits on a box's +x face (the one `box` colours with `left`). In raw SVG the matrices are `matrix(C S -C S x y)` (floor) and `matrix(C -S 0 1 x y)` (+x face).

## init(ctx)

Called after `draw`. Returns `{tick(t, dt), click(e), stop()}`, all optional.

| ctx | does |
|---|---|
| `ctx.say(text)` | the status line under the sheet: one sentence per press |
| `ctx.button(label, fn)` | adds a button and returns it. `'play it in order'` shows as "▶ Play all", `'next stop'` as "Next step →" |
| `ctx.hint(text)` | a small grey hint under the status |
| `ctx.clear()` | removes all buttons (to rebuild them) |
| `ctx.focus(x, y, zoom = 1.7, hold = 0)` | moves the camera to a sheet point; `hold` seconds later it eases back out |
| `ctx.bubble(x, y, text)` | a speech bubble at a sheet point for 1.5 s |
| `ctx.hop(el)` | a little hop on an element |

- `tick(t, dt)` runs every frame. Move things with `el.setAttribute('transform', …)`. Never redraw ink in `tick`.
- `click(e)` gets clicks on the sheet first; return `true` if you handled it. Anything drawn with `person()` says its `say` text in a bubble when tapped.
- Keep one `anim` object at a time; a press during an animation finishes it (or is refused with a reason), never starts a second.

## The page

`build.py` gives every sheet the same page: tabs (if more than one sheet), the sheet, the buttons, the status line, and the credit line. The CSS classes `.pulse`, `.bob`, `.swing`, `.steam`-style keyframes and `.hop` are there for small loops. `.on` gets a small wiggle: use `lit` for "lit" on large groups.

- Wrap each state's margin `label()` in `group('class="stag"', …)` and toggle `on` on the current one: when the camera zooms and that label is off screen, the shell pins its text in the frame's corner (catday does this).
- `#tint` is a full-sheet multiply rectangle at opacity 0, above the art: set `document.getElementById('tint').style.opacity` (about .05–.1) for dusk and night on a clock. `open()` resets it.
