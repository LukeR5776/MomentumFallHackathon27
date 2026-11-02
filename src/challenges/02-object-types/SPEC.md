# Challenge 2: Add multiple types of objects

| | |
|---|---|
| Folder | `src/challenges/02-object-types/` |
| Slug | `object-types` |
| Route | `#/challenge/object-types` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 2 (`02-object-types`) following CLAUDE.md and src/challenges/02-object-types/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: squares, circles and rectangles of different sizes, plus a small triangle falling.*

**Minimum**
- A shape picker (`segmented`) with these options: Circle, Rectangle, Square, Triangle, Polygon (choose 5–8 sides), Trapezoid, Chamfered box, and a Custom star built with `Bodies.fromVertices`.
- Click or tap the canvas to spawn the selected shape at the pointer.
- A size slider.
- A material preset (`select`) that sets `density`, `friction`, `frictionAir` and `restitution`:
  - Rubber (bouncy)
  - Wood (default)
  - Ice (frictionless)
  - Metal (heavy)
  - Balloon (light, high air friction)
- Each material has its own fill color taken from the palette.
- Static toggle: when it is on, the next spawned body is static, drawn in `wall` color.
- Clear All button.

**Stretch**
- Hover a body to show a small label with its shape and material.
- Add a "Rain" button that spawns 30 random shapes.

**Note:** `Bodies.fromVertices` needs `poly-decomp` for concave shapes. Either install `poly-decomp` and call `Common.setDecomp(require('poly-decomp'))`, or keep the custom shape convex. Document which one you chose in the README.
