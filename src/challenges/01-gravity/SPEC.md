# Challenge 1: Create a world with gravity

| | |
|---|---|
| Folder | `src/challenges/01-gravity/` |
| Slug | `gravity` |
| Route | `#/challenge/gravity` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 1 (`01-gravity`) following CLAUDE.md and src/challenges/01-gravity/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: a small spout at the top pours balls that pile up in a tank.*

**Minimum**
- A tank built with `helpers.makeTank()`.
- An emitter near the top center that drops small circles (r ≈ 8–10) on an interval, with a little horizontal jitter. Most balls are `slate` and roughly 1 in 8 is `accent`.
- Controls:
  - Gravity X and Gravity Y sliders (−2 to 2).
  - Gravity scale slider.
  - Presets: Earth `(0, 1)`, Moon `(0, 0.17)`, Zero-G `(0, 0)`, Sideways `(1, 0)` and Upside-down `(0, −1)`.
  - Emitter on/off, spawn rate, and Clear balls.
- Cap the number of balls at about 300 by removing the oldest first.
- Readout: current gravity vector and ball count.

**Stretch**
- Click the canvas to move the emitter to that point.
- Draw a small gravity-direction arrow in the corner.
- Add a restitution slider for new balls.
