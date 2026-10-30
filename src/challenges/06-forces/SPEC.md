# Challenge 6: Additional Forces

| | |
|---|---|
| Folder | `src/challenges/06-forces/` |
| Slug | `forces` |
| Route | `#/challenge/forces` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 6 (`06-forces`) following CLAUDE.md and src/challenges/06-forces/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: a large brown body in the center with small bodies scattered around it and short motion trails, like an orbit.*

**Minimum**
- World gravity set to `0`.
- A large central "attractor" body in `accent`, static by default.
- 15–30 small bodies placed around it with initial tangential velocities so they orbit.
- Each `beforeUpdate`, apply an inverse-square attraction force toward the attractor with `Body.applyForce`. Clamp the force to avoid singularities.
- Controls:
  - Attraction strength slider, including negative values for repulsion.
  - Wind (a constant force applied to all bodies): an X/Y slider pair.
  - Air friction slider.
  - "Show force vectors" toggle, drawn with `helpers.drawArrow`.
  - "Trails" toggle that draws fading polylines from each body's last N positions.
- Click anywhere to trigger an **explosion**: a radial impulse that falls off with distance.

**Stretch**
- Make the attractor draggable and dynamic.
- Add a second attractor.
- A "Mode" select:
  - Orbit.
  - Explosion sandbox.
  - Magnet: same-color bodies attract each other and different colors repel.
