# Build Prompt: Matter.js "Eight Challenges" Exploratory Site

## 1. What we're building

This is a small website for exploring Matter.js, the 2D JavaScript physics engine. It is themed **Fall Hack-a-Thon 2026: Matter.js Simulations**. The site has a **home page** and **eight challenge pages**. Each challenge page shows one Matter.js feature as an interactive sandbox. Users should be able to change parameters and watch how the simulation responds.

The eight challenges, in order:

| # | Slug | Title | Core Matter.js concepts |
|---|------|-------|-------------------------|
| 1 | `gravity` | Create a world with gravity | `Engine`, `World/Composite`, `engine.gravity`, static walls |
| 2 | `object-types` | Add multiple types of objects | `Bodies.circle/rectangle/polygon/trapezoid/fromVertices`, chamfer, material props |
| 3 | `mouse-drag` | Add mouse dragging | `Mouse`, `MouseConstraint`, constraint stiffness |
| 4 | `body-count` | Adjust numbers of bodies dynamically | `Composite.add/remove`, performance scaling |
| 5 | `collisions` | Collision Detection | `Events` `collisionStart/Active/End`, `collisionFilter`, sensors |
| 6 | `forces` | Additional Forces | `Body.applyForce`, `Body.setVelocity`, custom attraction, impulses |
| 7 | `connect` | Connect bodies | `Constraint`, `Composites.chain/newtonsCradle/softBody`, stiffness/damping |
| 8 | `stats` | Show stats | Reading `body.velocity/speed/angle/position`, live readouts, graphs |

The project is set up so that **one dev owns the shared shell** and **each challenge is owned by one dev**. Everyone codes against a fixed module contract (section 4). A challenge dev should never need to edit any file outside their own folder.

---

## 2. Tech stack and constraints

- **Vite** with vanilla JavaScript (ES modules). No framework.
- **matter-js** from npm, pinned to one exact version. Use the current latest (0.20.0 at the time of writing; check npm) and put the exact version in `package.json`. Do not use a caret range.
- Use Matter's built-in `Render` with `wireframes: false`. Custom overlays (labels, rings, vectors, graphs) are drawn on the same canvas in an `afterRender` handler.
- Do not add libraries beyond matter-js unless the shell owner approves.
- The site must work in current Chrome, Firefox and Safari, and on touch devices for anything involving dragging.
- `npm run dev` and `npm run build` must both work. The build output is a static site that can be deployed to GitHub Pages or Netlify.

---

## 3. Visual design (match the reference image)

The style is flat, calm and lab-notebook-like. **Do not use gradients, glows, drop shadows or glassmorphism.**

**Palette** (export these from `src/shell/theme.js` and never hardcode hex values in challenge code):

| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#E9EEF1` | Page and canvas background |
| `wall` | `#B9C5CD` | Static walls, floors, ramps, divider lines |
| `ink` | `#1F2A33` | Text |
| `slate` | `#3E4B57` | Default dynamic bodies |
| `slateLight` | `#7D8B95` | Secondary bodies and variation |
| `accent` | `#8A4B12` | Highlighted or selected body, active state (the brown ball in the image) |
| `accentSoft` | `#C9A27E` | Collision rings, hover state |
| `line` | `#9AA6AE` | Constraints, vectors, graph lines |

**Typography**
- Headings use a serif font, for example *Libre Caslon Text* or *EB Garamond* with a Georgia fallback. The challenge titles look like the captions in the reference image.
- UI text, controls and stats use a clean sans-serif. Numbers in stats use `font-variant-numeric: tabular-nums`.

**Containers**
- Each simulation lives in an open-top "tank": a floor plus left and right walls in the `wall` color, about 4px thick, with no top. This matches the U-shaped containers in the image.
- Bodies have a small `wall`-colored stroke or none at all. Fill colors come only from the palette.

**Layout of a challenge page**
- Top bar: site title on the left (it links home), with ← Prev / Next → links and a `1–8` jump menu on the right.
- Main area: the canvas takes about 70% of the width. A **controls panel** sits on the right on desktop and stacks below the canvas on mobile.
- Below the canvas: an **"About this challenge"** section. It has two or three sentences explaining the feature, followed by a short list of the Matter.js APIs the page uses.

**Home page**
- It recreates the reference image: the heading **"Eight Challenges"** and a 3×3 grid of tiles.
- The center tile is the title card: "Fall Hack-a-Thon 2026" with "Matter.js Simulations" below it in `accent`.
- The other eight tiles each show a thumbnail (`thumb.svg` from the challenge folder) and a caption, and link to their challenge.
- The tiles are separated only by thin `wall`-colored rules, the way the reference image uses the floor lines.

---

## 4. Architecture and the module contract

### Folder structure

```
/index.html
/package.json
/src/
  main.js                  # bootstraps shell + router         (SHELL OWNER)
  shell/
    router.js              # hash router: #/ and #/challenge/<slug>
    stage.js               # creates/destroys engine, render, runner per page
    controls.js            # control-panel UI helpers
    helpers.js             # shared physics helpers (tank, spawners, mouse)
    theme.js               # palette + fonts + body style presets
    home.js                # home grid
    styles.css
  challenges/
    registry.js            # ordered list of all 8 (pre-filled by shell owner)
    _template/             # copy this to start a challenge
      index.js
    01-gravity/
      index.js             # REQUIRED – default export per contract below
      thumb.svg            # REQUIRED – home-page thumbnail
      README.md            # REQUIRED – what it does, controls, known issues
      *.js                 # optional extra modules, private to this folder
    02-object-types/
    03-mouse-drag/
    04-body-count/
    05-collisions/
    06-forces/
    07-connect/
    08-stats/
```

**Ownership rule:** challenge devs touch only their own `challenges/0X-*/` folder. `registry.js` is filled in with all eight entries on day one, so nobody needs to edit it later. If a challenge needs a new shared helper, the dev opens an issue for the shell owner. While waiting, they can write a local version inside their own folder.

### Challenge module contract

Every `challenges/0X-*/index.js` default-exports this shape:

```js
export default {
  slug: 'gravity',                      // must match registry + URL
  title: 'Create a world with gravity',
  about: 'Short explanation shown under the canvas…',
  apis: ['Engine.create', 'engine.gravity', 'Bodies.circle', 'Composite.add'],

  /**
   * Called once when the page mounts. Build the world, add controls, wire events.
   * Return nothing; register any teardown via ctx.onCleanup.
   */
  setup(ctx) { /* … */ },
};
```

### The `ctx` object (provided by `stage.js`)

The shell creates a fresh context for each page visit. Everything on it is cleaned up automatically on unmount.

| Field / method | Description |
|---|---|
| `Matter` | The Matter namespace. Import it from here rather than directly so every page uses the same instance. |
| `engine`, `world`, `render`, `runner` | Already created and running. Gravity defaults to `y: 1`. |
| `canvas`, `width`, `height` | The canvas and its current CSS-pixel size. |
| `theme` | The palette and `theme.body(kind)` style presets, for example `theme.body('slate')` returns a `render` options object. |
| `controls` | The control-panel builder (see below). |
| `helpers` | Shared helpers (see below). |
| `onCleanup(fn)` | Registers a teardown function. |
| `on(target, eventName, fn)` | Wraps `Matter.Events.on`. The listener is removed on unmount. |
| `listen(domEl, type, fn, opts)` | Wraps `addEventListener`. The listener is removed on unmount. |
| `onResize(fn)` | Called with `{ width, height }` after the stage resizes. |
| `onOverlay(fn)` | Called every frame with `(ctx2d)` after Matter renders, for custom drawing. |
| `reset()` | Tears down the page and calls `setup` again. It is wired to the shared Reset button. |
| `paused` / `setPaused(bool)` | Wired to the shared Pause button. |

### `controls` API (built by the shell owner)

Each method appends a row to the panel and returns a handle with `.value` and `.set(v)`:

```js
controls.section('Gravity');
controls.slider({ label: 'Gravity Y', min: -2, max: 2, step: 0.05, value: 1, onInput: v => … });
controls.toggle({ label: 'Show vectors', value: false, onChange: v => … });
controls.select({ label: 'Preset', options: ['Earth','Moon','Zero-G'], value: 'Earth', onChange: v => … });
controls.button({ label: 'Drop 20 balls', onClick: () => … });
controls.segmented({ label: 'Shape', options: ['Circle','Box','Polygon'], value: 'Circle', onChange: v => … });
controls.readout({ label: 'Bodies', value: '0' });   // .set('42') to update
```

The shell always adds **Pause**, **Reset** and **Step one frame** buttons at the top of the panel.

### `helpers` API (built by the shell owner)

```js
helpers.makeTank({ thickness: 4, inset: 0 })   // floor + walls, auto-repositions on resize; returns { bodies, floorY }
helpers.addMouse({ stiffness: 0.2, showLine: true }) // MouseConstraint wired to render, pixel-ratio safe,
                                                // wheel scroll NOT hijacked, touch works; returns { mouse, constraint }
helpers.randomBetween(a, b)
helpers.spawnCircle(x, y, r, style?)            // adds a themed circle to world, returns body
helpers.bodiesAt(point)                         // Matter.Query.point over non-static bodies
helpers.drawArrow(ctx2d, from, vec, color)      // used by forces + stats overlays
helpers.drawLabel(ctx2d, text, x, y)            // small sans label, tabular nums
```

### `stage.js` lifecycle (shell owner, required behavior)

1. **Mount.** Create the engine, a render sized to the container (`pixelRatio: window.devicePixelRatio`, `background: theme.bg`, `wireframes: false`) and a runner. Build `ctx`, call `challenge.setup(ctx)`, build the control panel, and render the About section.
2. **Resize.** Use a ResizeObserver on the canvas container. Update the render's size and pixel ratio, then fire the `onResize` callbacks. `makeTank` repositions itself.
3. **Unmount.** This runs on route change or `reset()`. Run the cleanups in reverse order, then `Render.stop`, `Runner.stop`, `Events.off` for the engine and render, `Composite.clear(world, false)`, `Engine.clear`, remove the mouse listeners, remove the canvas, and empty the controls panel.
4. **Leak check.** In dev mode, log the number of active engines and listeners after unmount. Navigating between all eight pages ten times must not grow memory or listener counts.

---

## 5. Challenge specs

Each spec lists the **minimum** (required for "done") and **stretch** goals. Everything uses the shared theme and controls.

### Challenge 1: Create a world with gravity (`01-gravity`)

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

### Challenge 2: Add multiple types of objects (`02-object-types`)

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

### Challenge 3: Add mouse dragging (`03-mouse-drag`)

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

### Challenge 4: Adjust numbers of bodies dynamically (`04-body-count`)

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

### Challenge 5: Collision Detection (`05-collisions`)

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

### Challenge 6: Additional Forces (`06-forces`)

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

### Challenge 7: Connect bodies (`07-connect`)

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

### Challenge 8: Show stats (`08-stats`)

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

---

## 6. Definition of done (every challenge)

- [ ] It loads at `#/challenge/<slug>` with no console errors or warnings.
- [ ] All minimum features in its spec work.
- [ ] It uses only `ctx`, `controls`, `helpers` and `theme`, with no hardcoded colors and no direct `document.body` listeners.
- [ ] Reset fully restores the initial state, and Pause and Step work.
- [ ] Navigating away and back ten times leaves no leaked listeners or engines (check the dev-mode leak log).
- [ ] It resizes correctly from 360px mobile width up to 1920px desktop width.
- [ ] It runs at 60fps on a typical laptop at its default settings.
- [ ] `thumb.svg` follows the home-grid style: flat palette colors, a simple drawing of the scene and a `wall`-colored floor line.
- [ ] The README covers what the page does, its controls, the Matter APIs used, known issues and which stretch goals were done.
- [ ] The About text and APIs list are filled in.

---

## 7. How to split the work

### Roles
- **Shell owner (1 dev):** `main.js`, everything in `shell/`, `registry.js`, the `_template`, the home page, global styles, deployment, and reviewing all PRs for contract compliance.
- **Challenge owners:** one challenge folder each. With fewer devs, pair challenges by shared skills:

| Devs | Suggested assignment |
|------|----------------------|
| 8 + shell | One challenge each |
| 4 + shell | (1 Gravity + 4 Body count) · (2 Object types + 3 Mouse drag) · (5 Collisions + 8 Stats) · (6 Forces + 7 Connect) |
| 2 + shell | (1, 2, 3, 4) · (5, 6, 7, 8) |

### Sequencing

1. **Hour 0–2, shell owner.** Ship a **stub shell** to `main` that includes:
   - The router.
   - `stage.js` with a working mount and unmount.
   - `controls.slider`, `button` and `toggle`.
   - `helpers.makeTank` and `addMouse`.
   - `theme.js`.
   - `registry.js` with all eight entries pointing at copies of `_template`.

   Every challenge page should load showing "Coming soon" plus a tank.
2. **Challenge devs.** Start right away by copying `_template/index.js` into their folder. If a shell feature isn't ready yet, stub it locally and leave a `// TODO(shell)` comment.
3. **Midpoint integration.** Merge everything into `main`. The shell owner runs the leak and navigation check across all pages.
4. **Polish pass.** Thumbnails, About text, responsive fixes and stretch goals.

### Git workflow
- Branch names: `shell/<thing>` and `challenge/0X-<slug>`.
- A PR may touch only its own folder. If CI or a reviewer sees changes outside it, the PR is sent back. Shared changes go through the shell owner.
- Squash-merge. Every merge to `main` auto-deploys a preview.

---

## 8. `_template/index.js` (shell owner provides this verbatim)

```js
export default {
  slug: 'REPLACE-ME',
  title: 'Challenge title',
  about: 'One to three sentences on what this page demonstrates.',
  apis: [],

  setup(ctx) {
    const { Matter, world, theme, controls, helpers } = ctx;
    const { Bodies, Composite } = Matter;

    helpers.makeTank();

    const ball = Bodies.circle(ctx.width / 2, 80, 20, { render: theme.body('accent') });
    Composite.add(world, ball);

    controls.section('Example');
    controls.slider({
      label: 'Gravity Y', min: -2, max: 2, step: 0.05, value: 1,
      onInput: v => { ctx.engine.gravity.y = v; },
    });

    ctx.onOverlay(g => helpers.drawLabel(g, 'Hello Matter.js', 16, 24));
  },
};
```

---

## 9. Instructions for an AI coding agent using this prompt

- If you are building **the shell**, implement sections 2–4 and 8 exactly, including the home page. Leave every challenge as the template.
- If you are building **one challenge**, implement only that challenge's spec from section 5 inside its folder. Code against the `ctx` contract in section 4. Do not modify shell files, `registry.js` or other challenge folders. If a helper you need is missing, write it as a private module in your own folder.
- Before finishing, check your work against the definition of done in section 6. Then list the stretch goals you completed and anything you could not finish.
