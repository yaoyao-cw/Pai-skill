# Annotated scene

**Answers:** Everything happening in one place.

**Example:** `assets/examples/farm.js`: (A small farm)

## When to use it

Many things happen in one place at the same time, each with its own small state: hens, an orchard, a gate, a pond.

## Layout

One isometric place drawn in full, with numbered margin labels on leader lines pointing at each thing that has a state. Tapping a thing (a hen, a tree) fires its event. The place itself is the furniture.

## The statechart it suits

Several small statecharts in parallel regions, one per thing (`coop → yard → laying → yard`), sharing a clock (morning, dusk). Rules: the parallel parts never block each other; everything is home at dusk.

## Buttons

Tap a thing to fire its event; one button moves the shared clock on (dusk); the status line counts what has happened.
