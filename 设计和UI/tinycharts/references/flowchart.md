# Flowchart

**Answers:** Every step, and where it splits.

**Example:** `assets/examples/coffee.js`: (One cup: from the branch to the cup)

## When to use it

A process that goes one way, with one or two real branches (light roast or dark), where the person wants to see every step in order.

## Layout

The states run down the middle of the sheet as small boxed tags in capitals, joined by red arrows, each arrow with its event written beside it in hand lettering. A branch splits into two tags side by side with the guard on each arrow (`[if you like fruit]`), then joins again. Around the chain, small isometric doodles show each step happening (the tree, the drying beds, the roaster, the grinder, the cup), so the chain is the diagram and the doodles are the subject. The lit tag is the current state.

## The statechart it suits

A chain of simple states with one or two choice points. Guards on the branches (`[like fruit]`). A "break" path is worth drawing faintly: the wrong turn (bagged still wet → mouldy sack) as a dashed arrow to a lost state.

## Buttons

Next step walks the token one arrow; at a branch, two event buttons pick the side; a press that skips a step is refused.
