# Challenge 7: Connect bodies

Route: `#/challenge/connect` · Spec: [SPEC.md](SPEC.md).

**Status:** done. Minimum scenes plus both stretch goals.

## What it does

Four constraint scenes, plus a fifth Draw mode, share one tank and one mouse drag. Switching scenes clears and rebuilds only the scene (the tank and mouse stay). Strings, ropes, and springs are line constraints. The first cradle ball and the free end of the rope are accent; everything else is slate or slate light.

- **Cradle.** Five balls (3–7) hang from a sensor bar on hand-built constraints, the same idea as `Composites.newtonsCradle`. That factory is deprecated in matter-js 0.20 and cannot take a render style or a live restitution, so the cradle is built with `Constraint.create` instead. Pull back offsets the first 1, 2, or 3 balls by 60° and lets them go.
- **Chain.** `Composites.stack` of short planks, joined with `Composites.chain`, pinned at the left end. The accent free end can be dragged.
- **Bridge.** A chain of planks pinned at both ends. Drop boxes lets crates fall onto it.
- **Soft body.** `Composites.softBody` (a circle grid plus cross-braced springs) spawns above the floor and falls. The factory logs a deprecation warning, so the call runs with `Common.logLevel` set to 0 and restores the previous level immediately after.
- **Draw.** Click one body, then another, to add a constraint. Click empty space or the same body to cancel. Right-click a link, or use Remove last link, to delete it. Dragging still works; a pointer move under 8px counts as a click.

Planks in a chain or bridge, and the soft-body particles, share a negative collision group so they do not snag on each other. They still collide with the tank and with dropped boxes.

## Controls

- **Mode** — Cradle, Chain, Bridge, Soft body, Draw. Each mode loads a stiffness, damping, length, and stretch-color preset.
- **Stiffness, Damping, Length multiplier** — applied live to every scene constraint. The mouse tether is left alone. Length is `rest length × multiplier`.
- **Color by stretch** — line near rest, accent soft when slightly stretched, accent when stretched hard, slate light when compressed.
- **Ball count, Restitution** — cradle only. Count rebuilds the cradle. Restitution updates the balls immediately.
- **Pull back 1 / 2 / 3** — cradle only.
- **Drop boxes** — bridge only. Oldest crates are removed after 18.
- **Remove last link** — draw mode, including touch where right-click is awkward.

Pause, Step, and Reset are the shared shell controls. Reset rebuilds the cradle preset.

## Matter.js APIs used

`Composites.stack`, `Composites.chain`, `Composites.softBody`, `Constraint.create`, `Composite.create`, `Composite.add`, `Composite.remove`, `Bodies.circle`, `Bodies.rectangle`, `Body.setPosition`, `Body.setVelocity`, `Body.setAngularVelocity`, `Body.nextGroup`. Mouse dragging uses `helpers.addMouse` (`Mouse`, `MouseConstraint`).

## Stretch goals done

- [x] Draw your own: click two bodies to connect them, right-click a constraint to delete it (Remove last link is the touch fallback).
- [x] Color each constraint by its stretch.

## Known issues

- Resizing the stage rebuilds the current scene, so dropped boxes and drawn links are cleared.
- Switching modes restores that mode's constraint preset and overwrites the sliders.
- Newton's cradle is close, not perfect. Matter's sequential solver does not pass momentum the way an ideal cradle does, even with extra position and constraint iterations.
- `Composites.newtonsCradle` is not called. It is deprecated, warns, and does not accept the accent ball, line style, or restitution control the page needs.
- `Composites.softBody` is called, with Matter's logger silenced for that one call so the deprecation warning does not show up in the console.
