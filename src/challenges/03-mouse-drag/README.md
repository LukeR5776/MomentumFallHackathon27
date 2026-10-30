# Challenge 3: Add mouse dragging

Route: `#/challenge/mouse-drag` · Spec: [SPEC.md](SPEC.md).

**Status:** done. Owner: shomarie.

## What it does
Static tank + shelf with boxes and circles. `helpers.addMouse()` wires a `MouseConstraint` so you can grab any dynamic body; the spring line shows while dragging. Stiffness and damping change how snappy or floaty the grab feels.

## Controls
- **Stiffness** / **Damping** — mouse-constraint spring feel
- **Show drag line** — toggle constraint render
- **Gravity Y**
- **Nudge all** — impulse on every dynamic body
- **Grabbed** readout — label of the body under the pointer

## Matter.js APIs used
`Mouse`, `MouseConstraint`, `Constraint`, `Bodies.rectangle`, `Bodies.circle`, `Composite.add`

## Stretch goals done
- [x] Tunable stiffness / damping
- [x] Grabbed-body readout + drag hint overlay

## Known issues
_None yet._
