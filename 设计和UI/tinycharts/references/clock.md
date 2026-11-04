# Clock

**Answers:** A whole day, round once.

**Example:** `assets/examples/catday.js`: (A cat's day)

## When to use it

Something that repeats every day: a cat, a bakery, a bee, a market stall, a lighthouse.

## Layout

A clock face laid flat on the ground, with the day's places arranged round it like the hours. A hand points at the time; each state is a sector of the dial and a place on the rim. The clock is the axis the whole picture moves along: as the hand turns, the light and the scene change.

## The statechart it suits

A cycle of states, one per part of the day, back to the first at midnight. Some transitions are timed (at 7 am), some are events (the bowl rattles). Rules worth checking: the day always comes back round, and timed states happen in clock order.

## Buttons

Play all turns the hand through the day; Next step jumps to the next state; one event button causes the day's surprise.
