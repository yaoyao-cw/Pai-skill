# Comic strip

**Answers:** A story, one panel at a time.

**Example:** `assets/examples/letter.js`: (One letter: from the desk to Gran)

## When to use it

A story with characters, where each state is a scene in a different place: a letter going through the post, a parcel, a lost glove finding its way home.

## Layout

A grid of panels read left to right, top to bottom, each a small isometric scene with its own frame and caption. The thing that travels is drawn in every panel. The current panel is lit; past panels stay, future ones are faint.

## The statechart it suits

A mostly linear chain with one guarded detour (`sorted > train: [reads it]`, else back to the sorting office). Each panel is one state; the arrows between panels are the transitions, drawn as small numbered arrows in the gutters.

## Buttons

Next step turns the page to the next panel; one event button sets up the detour (smudge the address) so the story can go the other way.
