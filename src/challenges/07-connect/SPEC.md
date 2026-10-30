# Challenge 7: Connect bodies

| | |
|---|---|
| Folder | `src/challenges/07-connect/` |
| Slug | `connect` |
| Route | `#/challenge/connect` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 7 (`07-connect`) following CLAUDE.md and src/challenges/07-connect/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: a Newton's cradle with one ball pulled back.*

A mode selector (`segmented`) switches between four scenes. Switching scenes clears and rebuilds the world.

**Minimum**
1. **Newton's cradle.** Build it with `Composites.newtonsCradle` or manually with constraints. Controls:
   - Ball count (3–7).
   - Restitution.
   - "Pull back 1 / 2 / 3" buttons that offset the first N balls and release them.
   - Draw strings in `line` color and the balls in `slate`, with the first ball in `accent` (matching the image).
2. **Chain or rope.** Use `Composites.stack` with `Composites.chain`, pinned at one end. The free end can be dragged.
3. **Bridge.** A chain of planks pinned at both ends. Drop boxes onto it.
4. **Soft body.** Use `Composites.softBody`, a grid of circles joined by springs, and let it fall onto the floor.

Shared controls: constraint stiffness, damping and length multiplier. These apply live to the current constraints. Mouse dragging is enabled in every mode.

**Stretch**
- A "Draw your own" mode: click two bodies to connect them with a constraint, and right-click a constraint to delete it.
- Color each constraint by its stretch.
