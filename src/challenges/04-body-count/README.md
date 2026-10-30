# Challenge 4: Adjust numbers of bodies dynamically

Route: `#/challenge/body-count` · Spec: section 5, Challenge 4, of the build prompt.

**Status:** done. Owner: shomarie.

## What it does
Open-top tank filled with circles. A **Bodies** slider (0–80) adds or removes balls live. Mouse dragging stays available so you can poke the pile while scaling it.

## Controls
- **Bodies** — live target count (adds/removes without Reset)
- **+10 / −10 / Clear** — quick population edits
- **Live count** readout
- **Gravity Y** / **Restitution** — applied to current bodies

## Matter.js APIs used
`Bodies.circle`, `Composite.add`, `Composite.remove`, `MouseConstraint`

## Stretch goals done
- [x] Live add/remove without Reset
- [x] Mouse drag enabled while adjusting count

## Known issues
_None yet._
