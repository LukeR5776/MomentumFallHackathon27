# Challenge 3: Add mouse dragging

Route: `#/challenge/mouse-drag`

**Status:** playable.

## What it does

Five boxes of different sizes and densities rest on a static platform inside the tank. Pointer and touch drags use `helpers.addMouse()`: the grabbed box turns accent, and a line-colored spring runs from the pointer to the grab point. Releasing mid-drag keeps the box's velocity, so a fast release throws it.

Shift-click toggles a box between dynamic and static. Pinned boxes are drawn in the wall color and stay put until you shift-click them again or respawn.

## Controls

- Stiffness (0.01–1). Low values lag like a rubber band; 1 is rigid.
- Damping (0–1).
- Show grab line.
- Lock rotation while dragging (sets inertia to Infinity for the drag, then restores it).
- Mass of the body currently held, in engine units.
- Respawn boxes. Puts the original five back on the platform.

Shared Pause, Step, and Reset still apply. Reset rebuilds the page.

## Matter.js APIs used

`MouseConstraint`, `Constraint.stiffness`, `Constraint.damping`, `Bodies.rectangle`, `Body.setStatic`, `Body.setInertia`, `Composite.add`, `Composite.remove`.

## Stretch goals done

- [x] Dragged mass readout
- [x] Lock rotation while dragging
- [x] Shift-click toggles static / dynamic

## Known issues

Shift-click is a mouse shortcut, so touch can drag but cannot pin a box. Respawn clears pins. The platform is rebuilt on resize; boxes already in the air stay where they are.
