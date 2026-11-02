# Challenge 4: Day Jar (wellbeing demo)

Route: `#/challenge/body-count`

**Status:** playable wellbeing sandbox.

## What it does
Live body-count sim rethemed as a jar of tiny wins (`rest`, `move`, `connect`, `create`, `laugh`). Slider adds/removes without rebuild; mouse drag lets you poke the pile. Shake it off / Fresh start for emotional reset. Fast wins flash accent; FPS calm-meter stays for the hackathon stretch goals.

## Controls
- **How full?** (0–1000) · **+ a win / +10 / +100 / Shake it off / Fresh start**
- **Wins in jar** · **Vibe** · **Flow** · **FPS**
- **Win size** · **Mix** (circles / boxes / mixed day)
- **Auto-ease when FPS dips** · calm-meter plot

## Matter.js APIs used
`Bodies.circle`, `Bodies.rectangle`, `Composite.add`, `Composite.remove`, `Body.setVelocity`, `body.speed`, `MouseConstraint`

## Stretch goals done
- [x] Wellbeing framing on top of playable body-count
- [x] Shake / fresh-start + mouse drag
- [x] Auto-cap + FPS-vs-wins plot kept

## Known issues
Same as the playable body-count base: large counts will drop FPS; auto-cap can overshoot by one batch.
