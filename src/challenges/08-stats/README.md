# Challenge 8: Show stats

Route: `#/challenge/stats` · Spec: [SPEC.md](SPEC.md).

**Status:** done. Minimum readouts plus both stretch goals.

## What it does

Two static ramps sit in the tank. Their top faces meet the floor, so Ball A (accent, tracked by default) can roll down the left ramp, across the gap, and up the right ramp, which sends it back. Ball B and Ball C rest on a small shelf so they can be clicked without blocking that run. Click any ball to track it. The tracked body gets an accent outline just outside its edge and a speed label to one decimal place.

A sparkline in the top-right shows the selected metric over the last 5 seconds. With nothing pinned, the line uses the constraint color. Pin up to three bodies to graph those series in accent, slate, and slate light.

Every value is an engine unit. Positions are pixels, velocity is pixels per tick, and energy is not joules. Potential energy is `m · g · h`, where `h` is the body center's height above the floor and `g` is `engine.gravity.y * engine.gravity.scale` (0.001 at the default gravity).

## Controls

- **Ramp angle** — 8° to 36°. Rebuilds both ramps and relaunches the balls so they start on the new slope.
- **Friction** — applied to the balls, both ramps, and the tank floor. Starts at 0.03 so Ball A can climb the return ramp. Static friction is a little higher than kinetic friction.
- **Relaunch** — puts the balls back at the top of the left ramp with zero velocity.
- **Metric** — speed, height, kinetic energy, or total energy.
- **Show velocity vector** — a line-colored arrow from the edge of the tracked body. Long arrows are capped so they stay on screen.
- **Pin tracked body / Clear pins** — up to three graphed series. The sparkline follows the pins when any are set, and the tracked body otherwise.
- **Export CSV** — downloads `matter-stats.csv` with `time_ms, body, speed, height, kinetic, potential, total` for the bodies currently being graphed. The buffer keeps the newest 5400 rows (about a minute at 60fps for one body).

Readouts: position, velocity, speed, angle in degrees (wrapped to ±180), angular velocity in degrees per tick, mass, kinetic energy, potential energy, total energy, visible body count, a 30-frame FPS average, and collision starts in the last engine-second.

Pause, Step, and Reset are the shared shell controls. The sparkline uses engine time, so it holds while paused and advances on Step.

## Matter.js APIs used

`Bodies.circle`, `Bodies.rectangle`, `Body.setPosition`, `Body.setVelocity`, `Body.setAngularVelocity`, `Composite.add`, `Composite.remove`, `Composite.allBodies`, `Events` `collisionStart`, `body.position`, `body.velocity`, `body.speed`, `body.angle`, `body.angularVelocity`, `body.mass`, `engine.gravity`, `engine.timing`.

## Stretch goals done

- [x] Export CSV of the recorded time series.
- [x] Pin up to three bodies and graph them as separate series.

## Known issues

- Dragging the ramp-angle slider relaunches on every tick, so the balls jump back to the start while the slider is moving.
- Energies stay small because gravity scale is 0.001 and velocity is per tick. That is expected for engine units.
- The floor friction changes with the slider. A resize rebuilds the tank, and the page reapplies the current friction afterward.
- FPS is the average physics delta, not a separate display-frame counter. A background tab makes that number drop until the rolling window clears.
