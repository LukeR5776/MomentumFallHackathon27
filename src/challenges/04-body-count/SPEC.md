# Challenge 4: Adjust numbers of bodies dynamically

| | |
|---|---|
| Folder | `src/challenges/04-body-count/` |
| Slug | `body-count` |
| Route | `#/challenge/body-count` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 4 (`04-body-count`) following CLAUDE.md and src/challenges/04-body-count/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: a crowd of mixed circles with a counter ("30") in the top right.*

**Minimum**
- A body count slider from 0 to 1000 with a large counter drawn top-right on the canvas.
- Moving the slider **adds or removes bodies incrementally** to match the target. Do not rebuild the world.
  - New bodies spawn from random points along the top.
  - When removing, take the most recently added bodies first.
- Controls:
  - Body size slider, which applies to new bodies only.
  - Mix (`select`): circles only, boxes only, or mixed.
  - +10, +100 and Remove all buttons.
- Readouts: FPS, which is a rolling average from `runner` or `requestAnimationFrame` deltas, and the actual body count.

**Stretch**
- An "Auto-cap" toggle that stops adding bodies when FPS drops below 45.
- Color bodies by speed: `slate` when slow and `accent` when fast.
- Show a small FPS-versus-body-count line in the panel.
