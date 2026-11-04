# Flow machine

**Answers:** A process built as a machine.

**Example:** `assets/examples/cocoa/`: (Bean to bar). It is a page of its own: build it with `python3 assets/build.py --standalone assets/examples/cocoa/cocoa.template.html -o cocoa.html`.

## When to use it

A process with stations that a thing moves through, where some stations loop back (tempering: too hot, go round again), or where the machine itself is the interesting part.

## Layout

A tail of small stations runs into one big working part (a ring, a drum, a belt). The thing travels along tracks whose lengths match the steps. A side panel lists the states with the current one filled, and a gauge shows the measurement the guards read (the temperature).

## The statechart it suits

A chain into a cycle: a few one-way states, then a loop with a guarded exit (`warmed > bar: [31°]`, `warmed > melted: [too hot]`). Rules worth checking: the loop always ends, the exit is taken only when the guard holds.

## Buttons

One main button runs the whole machine; a second causes the fault the loop is there for (overheat), so the loop is seen working.
