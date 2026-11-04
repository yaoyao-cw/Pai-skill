# Game board

**Answers:** What chance decides.

**Example:** `assets/examples/saturday.js`: (A slow Saturday)

## When to use it

Chance decides what comes next: a lazy day at home, a walk with a dog, a garden in uncertain weather. The order is loose, and the fun is in not knowing.

## Layout

The board is the place itself: nine rooms cut open at waist height in a 3 × 3 grid, each room one square and one state, with a numbered path of stepping stones running through them. A die decides how far the little person moves. The current room is lit; the path behind stays drawn.

## The statechart it suits

A chain of states with random transitions: the event is "roll", the guard is the number on the die. Rules worth checking: from every square the end can still be reached; no roll leaves you stuck.

## Buttons

Roll is the main button; each press says what was rolled and where the counter went; Start again resets.
