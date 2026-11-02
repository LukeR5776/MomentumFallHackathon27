# CLAUDE.md: Fall Hack-a-Thon 2026, Matter.js Simulations

A Vite + vanilla JS site (no framework) with a home grid and eight Matter.js challenge sandboxes. `matter-js` is pinned to exactly `0.20.0`. Do not add other libraries without the shell owner's approval.

- Run: `npm run dev` (http://localhost:5173). **Never** use VS Code Live Server or open `index.html` directly. Without Vite the page is blank.
- Build: `npm run build` produces a static `dist/` with a relative base.
- Full original spec: [docs/BUILD_PROMPT.md](docs/BUILD_PROMPT.md). Each challenge's own spec: `src/challenges/0X-<slug>/SPEC.md`.

## If you are asked to build a challenge

1. Read that challenge's `SPEC.md`. Implement **every Minimum item**, then whichever Stretch items fit.
2. **Edit only `src/challenges/0X-<slug>/`.** Never touch `src/shell/`, `src/main.js`, `registry.js`, `_template/`, other challenge folders, `index.html`, `package.json` or `styles.css`.
   - If you need a shared helper that doesn't exist, write it as a private module in the same folder (e.g. `0X-<slug>/trails.js`). Add `// TODO(shell): candidate for helpers` and mention it in your final summary.
   - Do not install npm packages. The one exception is challenge 2, which may use `poly-decomp` *if* the user approves. Otherwise keep the star convex.
3. Replace the stub `index.js` completely. Keep `slug` exactly as it is, since it must match `registry.js` and the URL.
4. Fill in `about` (2–3 sentences) and `apis` (the Matter calls you actually use).
5. Update `thumb.svg` if the scene differs from the placeholder (viewBox `0 0 240 160`, flat palette fills, `wall`-colored tank/floor lines).
6. Fill in the folder `README.md`: what the page does, its controls, the APIs used, known issues and the stretch goals done.
7. Finish by checking the **Definition of done** below. Then report the stretch goals completed and anything unfinished.

## Module contract

```js
export default {
  slug: 'gravity',
  title: 'Create a world with gravity',
  about: 'Shown under the canvas…',
  apis: ['Engine.create', 'engine.gravity'],
  setup(ctx) { /* build world, controls, events. Return nothing. */ },
};
```

`setup` runs on every mount **and on every Reset**, so all state must live inside `setup` (no module-level mutable state).

## `ctx` (from `src/shell/stage.js`)

| Field | Notes |
|---|---|
| `Matter` | Use this. Never `import 'matter-js'` in challenge code. |
| `engine`, `world`, `render`, `runner` | Already created and running. Gravity is `{x:0, y:1}`, scale 0.001. |
| `canvas`, `width`, `height` | `width`/`height` are **live getters** in CSS px. Read them when needed rather than caching. |
| `theme` | Palette keys: `bg wall ink slate slateLight accent accentSoft line`, plus `fonts.serif/sans`. `theme.body(kind)` gives a fresh render-options object (`kind` is a palette key, `'static'`, `'sensor'` or `'hidden'`). `theme.constraint(opts)` gives constraint render options. |
| `controls` | See below. |
| `helpers` | See below. |
| `onCleanup(fn)` | Teardown, run in reverse order on unmount/reset. Use it for `setInterval`, timeouts and audio contexts. |
| `on(target, name, fn)` | `Matter.Events.on`, auto-removed. Works on `engine`, `render` and the mouse constraint. |
| `listen(el, type, fn, opts)` | `addEventListener`, auto-removed. Use `ctx.canvas` or `window` as the target. |
| `onResize(fn)` | Called with `fn({width, height})`. Reposition your own static bodies here. |
| `onOverlay(fn)` | Called with `fn(g)` every frame after Matter draws. **Coordinates are CSS px**, since the transform is already set. Keeps drawing while paused. |
| `reset()`, `paused`, `setPaused(b)` | Shared Pause / Step / Reset bar. Pausing sets `runner.enabled = false`. Step calls `Engine.update(engine, 1000/60)`. |

### `controls`
`section(title)`, `slider({label,min,max,step,value,onInput,format?})`, `toggle({label,value,onChange})`, `select({label,options,value,onChange})`, `button({label,onClick})`, `segmented({label,options,value,onChange})`, `readout({label,value})`.
- Every one returns a handle with `.value`, `.set(v)` and `.el`.
- **`.set(v)` fires the callback.** Use `.set(v, { silent: true })` to update only the UI, for example when a preset moves sliders whose values you have already applied.
- `options` may be plain values or `{ label, value }` objects.
- Rows appear in the order you call them. Updating a readout with `.set` every frame is cheap, because it only touches the DOM when the text changes.

### `helpers`
- `makeTank({thickness=4, inset=0})` returns `{ bodies, floor, left, right, floorY, inner:{left,right,top,bottom} }`.
  - It is open-top, with invisible thick backstops behind the walls so bodies can't tunnel out.
  - **The tank bodies are recreated on resize.** Read `tank.floorY` / `tank.inner` / `tank.floor` fresh each time rather than caching them. On resize, dynamic bodies are moved back inside.
- `addMouse({stiffness=0.2, damping=0, showLine=true})` returns `{ mouse, constraint }`.
  - It handles fractional pixel ratios and touch, doesn't hijack the scroll wheel, and ends the drag on release outside the canvas.
  - Use `ctx.on(constraint, 'startdrag' | 'enddrag', e => e.body)`.
  - Its line style is `constraint.constraint.render`.
- `randomBetween(a,b)`; `spawnCircle(x,y,r,style='slate',options)`; `bodiesAt(point)` (non-static only).
- `drawArrow(g, from, vec, color=theme.line, {lineWidth, head})`; `drawLabel(g, text, x, y, {color, size, align, weight})`.

## Hard rules

- **No hex/rgb literals in challenge code.** Every color comes from `ctx.theme`. For translucency use `g.globalAlpha` or `body.render.opacity`, not new colors.
- No raw `addEventListener` or `Events.on`. Use `ctx.listen` / `ctx.on`. No `document.body` listeners.
- No gradients, glows, shadows or blur. The style is flat and lab-notebook-like. Bodies get a thin `wall` stroke or none.
- Static scenery (ramps, platforms) uses `theme.body('wall')`. Default dynamic bodies are `slate`, variation is `slateLight`, and the highlighted or selected body is `accent`.
- Matter units are pixels and ticks, not SI. Label derived values as "engine units".
- Cap body counts and per-frame work so the default settings hold 60fps.
- Keep everything that touches the world inside `setup`, because Reset re-runs it from scratch.

## Definition of done

- [ ] It loads at `#/challenge/<slug>` with **no console errors or warnings**.
- [ ] All Minimum features in SPEC.md work.
- [ ] It uses only `ctx`/`controls`/`helpers`/`theme`, with no hardcoded colors and no direct DOM/Matter listeners.
- [ ] Reset fully restores the initial state, and Pause and Step work.
- [ ] Leak check: in dev, every unmount logs `[stage] unmounted … engines 0 … DOM listeners 0 · Matter listeners 0` at the verbose/debug console level. If anything is non-zero it becomes a warning. Navigating away and back ten times must stay at 0. `window.__stageLeakStats` shows the live counts.
- [ ] It works from 360px to 1920px wide, and dragging works on touch.
- [ ] It holds 60fps at the default settings on a laptop.
- [ ] `thumb.svg`, the README, `about` and `apis` are all filled in.

## Workflow

- Branch: `challenge/0X-<slug>`. The PR touches only that folder. Squash-merge into `main`.
- Shell changes (`shell/<thing>` branches) go through the shell owner.

## Prompting Claude for a challenge (copy-paste)

> Build challenge 3 (`03-mouse-drag`) following CLAUDE.md and src/challenges/03-mouse-drag/SPEC.md. Only edit files in that folder.

Every `SPEC.md` contains this line, already filled in for its challenge.
