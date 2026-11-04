---
name: tinycharts
description: Draw a process or a place as an interactive, hand-drawn statechart sheet, in one of nine diagram types (flowchart, flow machine, comic strip, timeline, clock, exploded view, annotated scene, game board, catalogue). Use when someone asks to show how something works, happens or changes ("how a letter gets delivered", "a cat's day", "what's under the street") as a playable illustrated diagram, a Tinycharts sheet, or a statechart drawn as a picture. Every sheet has a real statechart behind it, its buttons fire that statechart's events, and its rules are checked by searching every path.
---

# Tinycharts

A Tinycharts sheet is one HTML file: a 1400 × 1400 hand-drawn sheet in a marker-and-pencil look, a few buttons under it, and one status line. Behind it is a statechart. The picture shows the states, the buttons are the events, and a press the statechart doesn't allow is refused in plain words.

The kit in `assets/` draws everything: the pen, the marker washes, isometric boxes and turned parts, people, plants and animals. Nine example sheets, one per diagram type, show how it is used. Read the example for the type you pick before you draw.

## The workflow

### 1. Write the real process as states and events

Before any drawing, write the process down as a list:

- **States**: where the thing can be, in plain words ("asleep", "in the sorting office", "too much water"). Five to ten is a good number.
- **Events**: what moves it on ("the alarm goes", "collected at five", "watered"). These become the buttons.
- **Guards**: the conditions that make an event allowed or not ("only with dry paws", "only after the board calls the number").
- Where facts come in (times, temperatures, depths), note the source. Anything you can't source is marked **illustrative** on the sheet.

Pick a subject that is plain and warm: food, homes, animals, streets, gardens, small trades. Never technical systems, crypto or finance.

### 2. Pick the type

| Type | What it answers | Example in `assets/examples/` | Reference |
|---|---|---|---|
| Flowchart | Every step, and where it splits | `coffee.js` | `references/flowchart.md` |
| Flow machine | A process built as a machine | `cocoa/` (a page of its own) | `references/flow-machine.md` |
| Comic strip | A story, one panel at a time | `letter.js` | `references/comic-strip.md` |
| Timeline | How long each step takes, to scale | `coffeeTime.js` | `references/timeline.md` |
| Clock | A whole day, round once | `catday.js` | `references/clock.md` |
| Exploded view | What is inside, layer by layer | `under.js` | `references/exploded-view.md` |
| Annotated scene | Everything happening in one place | `farm.js` | `references/annotated-scene.md` |
| Game board | What chance decides | `saturday.js` | `references/game-board.md` |
| Catalogue | One set of states, many things at once | `plants.js` | `references/catalogue.md` |

How to choose:

- A process with **branches** (light roast or dark, wet or dry) → **flowchart**.
- A process with **stations and a loop back** (temper again if too hot) → **flow machine**.
- A **story** with characters, where each step is a scene → **comic strip**.
- The question is **how long** → **timeline**, drawn to scale.
- It **repeats every day** → **clock**.
- The question is **what is inside or underneath** → **exploded view**.
- **Many things happen in one place at once** → **annotated scene**.
- **Chance** decides what comes next → **game board**.
- **Many of the same thing**, each in its own state → **catalogue**.

If the person names a type, use it. If two fit, pick the one whose question matches theirs, and say why in one line.

### 3. Write the statechart

Write it as Mermaid `stateDiagram-v2` in `<name>.mmd` beside the sheet, using the same ids you will use in the drawing (wrap each state's part of the picture in `data-state="<id>"`, so the logic panel can light it):

```
stateDiagram-v2
  [*] --> asleep
  asleep: asleep
  zoomies: zoomies
  asleep --> zoomies: no reason
  zoomies --> breakfast: the bowl rattles
  breakfast --> asleep: [full] a long nap
```

- Use composite states (`state "indoors" as indoors { ... }`) for places inside places, and parallel regions (`--`) for things that run at once.
- Use a choice (`state check <<choice>>`) for a guarded split.
- Keep labels short. They are read on the sheet too.

### 4. Draw the sheet with the kit

Start from the example for your type, and keep its skeleton: `draw(seed)` builds the picture, `init(ctx)` wires it. See `references/sheet-api.md` for the full contract and `references/kit.md` for every drawing function.

- **The picture is the statechart.** Every state is a visible, named part of the picture. Wrap it in `group('data-state="<id>"', fn)` so tools can find it. Every transition is something you can see: a path, a door, a step, a panel.
- **The current state is lit**: a red ring, a red pin, a highlighted panel. A stranger should be able to name it without reading the status line.
- Draw real materials: boards, tiles, brick, enamel, cloth. Buildings are real (the kit's `box`, `gable`, `block`, `flight`, windows and doors). Animals and plants stay cute and round (`cat`, `hen`, `puffRow`, `lifeShrub`).
- One look: the kit's marker washes, ruled ink and pencil tooth. Don't add gradients, glows or new fonts.
- **Labels go in the margins** with leader lines (`label(x, y, title, note, [wx, wy, wz], side)`), short: a title in capitals and a note of a few words.
- Title block at the top left (a small kicker line, then the title; `title(kicker, big)` in lib.js does both), a one-line subtitle, and a footnote at the bottom naming the sources or saying "illustrative".
- Text must not fall off the 1400 × 1400 sheet or overlap. Hand lettering (`it`) runs about 0.7 × its font size per character after the build's font settings, so a 14.5 px line across the sheet holds about 120 characters: break long footnotes into lines.
- Phones show the whole sheet at about a quarter size. The examples don't scale text for phones; if you do, use `PHONE` (`references/sheet-api.md`) only where there is room (cards, tallies): bigger chain and guard words collide.

### 5. Wire the buttons as events

- **At most four buttons.** Name them as events ("rain", "next customer", "post it"). `ctx.button('play it in order', fn)` becomes the solid "▶ Play all"; `ctx.button('next stop', fn)` becomes "Next step →".
- The first status line says what to press.
- Every press says, in one sentence, what happened.
- A press the statechart does not allow is **refused, with a one-line reason** ("Not yet: the board hasn't called 42."). Don't hide the button; let it explain itself.
- Pressing anything in the middle of an animation must be safe: finish or skip the animation, never stack two.

### 6. Check the rules

Write `<name>.check.mjs` beside the sheet: a small breadth-first search over every reachable state of the `.mmd`. Copy `assets/examples/kettle.check.mjs`: it reads the states and arrows from the `.mmd` itself, so you only say what each arrow label does (`EFFECT`) and which arrows the guards keep shut (`MUTANTS`).

- State the two or three rules that matter ("the noodles go in last", "nothing is served before three answers").
- Search every path and confirm each rule holds.
- Take each guard away and confirm the search finds the shortest path that breaks the rule. That path is the story of why the guard is there.
- Write the result to `<name>.json` (`{title, checked, rules:[{rule, says, path}]}`), so it can be shown beside the sheet.

Keep it simple: a plain search over a small model, not a model checker.

### 7. Build one HTML file

```bash
python3 assets/build.py my-sheet.js -o my-sheet.html --names "A bee's day"
```

Add `--logic` for **The logic** button under the sheet. It opens two tabs: **Rules** (from `<name>.json`) and **Flow chart** (the `.mmd` drawn by `pele`). Tapping a state or an arrow lights its part of the picture. Drawing the flow chart needs `pele` from npm (`npm i pele` in the folder you run build.py from, or a parent of it). Without it, the panel still shows the rules.

Several sheets in one page get tabs: `python3 assets/build.py a.js b.js -o both.html --names "One,Two"`. The page works offline apart from the Google fonts. Open it, press every button once in a wrong order, and look at it on a 390 px wide screen.

To check it headless, open the file in a browser (Playwright works), press the buttons and read `#status`. Watch the console for errors. Headless Chromium draws few frames a second and `tick` caps `dt` at 0.05 s, so moves take two or three times longer than on screen: wait about 3 s after a press that moves something, and 30–45 s after Play all.

## Rules learned on the live sheets

- **One marker look**, with real buildings but cute animals and plants.
- **Hand-drawn labels in the margins** with leader lines, never boxes floating over the drawing.
- **Plain, warm subjects.** Never technical, crypto or finance.
- **Facts only from named sources**; anything else is marked illustrative on the sheet.
- **At most four buttons**, worded as events.
- **A refused press explains itself** in one line.
- **Moving parts sit in their own groups**, moved with `transform` in `tick`. Ink is drawn once in `draw`; it is never redrawn every frame.
- The shell gives any element with class `on` a small wiggle. Use another class name (`lit`) for "lit" on large groups, or switch it off in your sheet's `<style>`.
- Don't name a constant `RED`, `INK`, `P`, `C` or `S` in a sheet: they are kit names, and a sheet constant hides them.
- Measure text after the web font loads (`document.fonts.ready`), or it measures short.

## Files

- `assets/lib.js`, `copic.js`, `timekit.js`, `pear.js`, `looks.js`: the kit (pen, marker, solids, turned parts, people).
- `assets/marker.txt`, `tooth.txt`: the paper-tooth tiles, as base64 PNG.
- `assets/app.js`: the page shell (tabs, buttons, status line, camera, speech bubbles).
- `assets/build.py`: wraps sheets into one page (`--logic` adds the logic panel).
- `assets/logic.js`: the logic panel.
- `assets/examples/`: one sheet per type, plus `kettle.mmd` with `kettle.check.mjs` (the check to copy).
- `references/`: one note per type, `sheet-api.md` and `kit.md`.
- `LICENSE`, `NOTICE.md`.
