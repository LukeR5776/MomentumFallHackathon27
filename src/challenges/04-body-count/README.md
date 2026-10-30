# Challenge 4: Adjust numbers of bodies dynamically

Route: `#/challenge/body-count`

**Status:** playable.

## What it does

A slider from 0 to 1000 sets how many bodies are in the tank. The world is not rebuilt: new bodies spawn from random points along the top, and removals delete the most recently added bodies first. The default target is 30. A large counter in the top-right of the canvas shows the live count.

Body size and mix apply only to bodies spawned after the change. Each new body varies a little around that size, and about one in five is `slateLight`. Fast bodies (speed above 8) turn accent and return to their own color when they slow down.

Adds are spread across frames (20 per tick) so a jump to 1000 does not freeze the page. Removes run up to 400 per tick, and Remove all clears immediately.

## Controls

- Bodies (0–1000).
- +10, +100, and Remove all.
- Body count and FPS readouts. FPS is a rolling average of the last 45 frame deltas.
- Spawning: idle, adding, removing, or capped.
- Body size (4–26), for new bodies only.
- Mix: circles, boxes, or mixed.
- Auto-cap below 45 FPS. Adds pause under 45 and resume once FPS climbs past 52. Removes are never blocked.
- FPS vs body count: a line of the latest FPS sample for each 10-body bucket.

## Matter.js APIs used

`Bodies.circle`, `Bodies.rectangle`, `Composite.add`, `Composite.remove`, `body.speed`.

## Stretch goals done

- [x] Auto-cap when FPS drops below 45
- [x] Color by speed (slate when slow, accent when fast)
- [x] FPS-versus-body-count line in the panel

## Known issues

The body count ignores the tank walls, so it matches the slider rather than `Composite.allBodies`. Auto-cap can overshoot 45 FPS by about one batch (20 bodies) before the rolling average catches the drop. Default size and circle mix hold 60 FPS at the starting count of 30; 1000 bodies will not.
