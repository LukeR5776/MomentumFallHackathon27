# Challenge 8: Show stats

| | |
|---|---|
| Folder | `src/challenges/08-stats/` |
| Slug | `stats` |
| Route | `#/challenge/stats` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 8 (`08-stats`) following CLAUDE.md and src/challenges/08-stats/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: a tilted ramp, a ball with a small speed label above it ("1.0"), and a squiggly live graph in the corner.*

**Minimum**
- A tilted ramp. A ball (`accent`) rolls down it onto the floor, and a second ramp sends it back. Include a Relaunch button.
- A **floating label** above the tracked body showing its speed to one decimal place, drawn in `onOverlay`.
- A **live sparkline** in the top-right of the canvas showing speed over the last 5 seconds. Draw it as a `line`-colored polyline with no fill.
- A stats panel with readouts for:
  - position (x, y)
  - velocity (vx, vy)
  - speed
  - angle (in degrees)
  - angular velocity
  - mass
  - kinetic energy `½mv²`
  - potential energy `m·g·h` relative to the floor
  - total energy
- Engine stats: body count, FPS and collisions per second.
- Click any dynamic body to make it the tracked body. The tracked body has a thin `accent` outline.

**Controls**
- Graph metric (`select`): speed, height, kinetic energy, or total energy.
- Ramp angle slider (rebuilds the ramp).
- Friction slider.
- "Show velocity vector" toggle.

**Stretch**
- An "Export CSV" button that downloads the recorded time series.
- Pin up to three bodies and graph them as separate series.

**Note:** Matter's units are pixels and ticks, not SI units. Say so in the About text and label values as "engine units".
