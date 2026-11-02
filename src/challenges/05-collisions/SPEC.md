# Challenge 5: Collision Detection

| | |
|---|---|
| Folder | `src/challenges/05-collisions/` |
| Slug | `collisions` |
| Route | `#/challenge/collisions` |

**Prompt to build it (paste into Claude Code at the repo root):**

> Build challenge 5 (`05-collisions`) following CLAUDE.md and src/challenges/05-collisions/SPEC.md. Only edit files in that folder.

Rules, the `ctx` contract and the definition of done are in [CLAUDE.md](../../../CLAUDE.md). The full original spec is in [docs/BUILD_PROMPT.md](../../../docs/BUILD_PROMPT.md).

---

## Spec (verbatim from BUILD_PROMPT.md, section 5)

*Reference image: angled ramps, balls bouncing, and expanding rings where impacts happen.*

**Minimum**
- Two or three static angled ramps (`wall` color) that channel falling balls toward each other and the floor.
- Balls drop from the top on a timer or on click.
- `collisionStart` events:
  - Each contact point (`pair.collision.supports`) draws an expanding ring in `accentSoft` that fades out over about 400ms. Draw the rings in `onOverlay`.
  - Both bodies briefly flash `accent`.
- Readouts: total collisions and collisions in the last second.
- A collision log: a scrolling list of the last 10 pairs, for example `ball#12 ↔ ramp#2`, with the impact speed.

**Controls**
- Ring on/off.
- Minimum impact speed to count a collision, which filters out resting contacts.
- Collision filtering demo: a `segmented` control with three modes.
  - All collide.
  - Brown balls pass through slate balls, using `collisionFilter.category` and `mask`.
  - Balls ignore ramp 2.
- A sensor zone: a translucent rectangle with `isSensor: true`. It counts the balls that enter and exit it, using `collisionStart` and `collisionEnd`. Draw its outline dashed. Do not fill it with a gradient.

**Stretch**
- Play a soft click sound on collisions above a speed threshold, with a mute toggle.
- Make ring size proportional to impact speed.
