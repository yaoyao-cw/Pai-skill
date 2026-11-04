# Catalogue

**Answers:** One set of states, many things at once.

**Example:** `assets/examples/plants.js`: (Nine house plants)

## When to use it

Many of the same kind of thing, each in its own state of one small statechart: house plants, hens, loaves, jars of jam.

## Layout

A grid of plates like a field guide, one thing per tile, each drawn to its kind. Every tile shows its own state with the same visual code (a gauge, a colour, a droop). A legend explains the code once.

## The statechart it suits

One small statechart (thirsty → happy → too much → thirsty) applied to every item, with item-specific guards (a cactus wants less). Rules: every item can reach the good state; the shared event (a week later) moves them all at once.

## Buttons

Tap an item to fire its event; one shared button (a week later) moves every item; the status line counts how many are in the good state.
