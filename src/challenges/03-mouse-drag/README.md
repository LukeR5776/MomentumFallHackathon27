# Challenge 3: Zen rearrange (wellbeing demo)

Route: `#/challenge/mouse-drag`

**Status:** playable wellbeing companion.

## What it does
Thought-stones (`worry`, `plan`, `idea`, `rest`, `thanks`) sit on a ledge. Drag with a spring tether; Shift-click pins a stone. Soft grip = rubber band; firm grip = snappy. Gentle breeze nudges the pile — messy is fine.

## Controls
- **Grip** / **Softness** — mouse-constraint stiffness / damping
- **Show tether**
- **Steady hand (no spin)** — lock inertia while dragging
- **Holding** readout
- **Reset stones** / **Gentle breeze**

## Matter.js APIs used
`MouseConstraint`, `Constraint.stiffness`, `Constraint.damping`, `Bodies.rectangle`, `Body.setStatic`, `Body.setInertia`, `Composite.add`, `Composite.remove`

## Stretch goals done
- [x] Wellbeing labels + calm copy
- [x] Dragged mass → holding label
- [x] Lock rotation / pin / breeze

## Known issues
Shift-click pin is mouse-only (touch can drag but not pin).
