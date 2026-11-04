# Timeline

**Answers:** How long each step takes, to scale.

**Example:** `assets/examples/coffeeTime.js`: (One cup, timed), built on `lifeDraw` and `lifeInit` in `timekit.js`

## When to use it

The question is how long: some steps take minutes and some take years, and the person should see that at a glance.

## Layout

A tape pulled out in the order things happen. Each numbered stretch is one step, and a longer wait gets a longer stretch. Write the real duration on every stretch in red (3–4 years, 8–15 minutes). If the spans are too far apart to draw to scale (years against minutes), say "not to scale" in the subtitle, as the example does; if they fit, draw them to scale and say so. Props for each step stand beside the tape, and a playhead walks it.

## The statechart it suits

A straight chain of states, each with a duration. Rules worth checking are about order and time: nothing starts before the step it waits for has ended.

## Buttons

Play all runs the playhead; Next step jumps to the next state; the status line gives the real duration with its source.
