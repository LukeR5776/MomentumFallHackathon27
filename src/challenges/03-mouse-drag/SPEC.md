# Challenge 3: Add mouse dragging

| | |
|---|---|
| Folder | `src/challenges/03-mouse-drag/` |
| Slug | `mouse-drag` |
| Route | `#/challenge/mouse-drag` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 3 (`03-mouse-drag`) following CLAUDE.md and src/challenges/03-mouse-drag/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: three boxes resting on a platform, one with a visible grab point.*

**Minimum**
- A floating static platform with three to five boxes of different sizes and densities resting on it, inside the tank.
- Dragging uses `helpers.addMouse()`.
- The body being dragged turns `accent`, and a `line`-colored line runs from the pointer to the grab point.
- Controls:
  - Constraint stiffness slider (0.01–1): low values feel like a rubber band and high values feel rigid.
  - Damping slider.
  - "Show grab line" toggle.
  - "Respawn boxes" button.
- Throwing works: releasing mid-drag keeps the body's velocity.
- Works with touch.

**Stretch**
- Show the dragged body's mass in a readout.
- Add a "Lock rotation while dragging" toggle (`inertia: Infinity` during the drag, restored on release).
- Shift-click a body to toggle it between static and dynamic.
